const GatewayCommand = require('../classes/GatewayCommand.js');

// todo: fix replying to dms
// this is copied from github.com/aeioubot/aeiou

class Gateway {
	constructor(client) {
		this.pending = {};
		this.client = client;
		this.commands = require('require-all')({
			dirname: __dirname,
			filter: (n) => n == 'Gateway.js' ? false : n.slice(0, -3),
		});
	}

	sendMessage(gcmd) {
		if (!gcmd instanceof GatewayCommand) throw new Error('A gateway command must use the GatewayCommand class.');
		return new Promise((resolve, reject) => {
			this.pending[gcmd.time] = {data: new Array(gcmd.totalDestinations).fill(undefined), resolve: resolve, reject: reject};
			process.send(gcmd);
			setTimeout(() => { // Shards that are dead or take too long to respond, we continue without them.
				if (this.pending[gcmd.time]) {
					this.pending[gcmd.time].resolve(this.pending[gcmd.time].data);
					delete this.pending[gcmd.time];
				}
			}, 5000);
		});
	}

	async processMessage(gcmd) {
		// Response handler
		if (gcmd.command == 'response') { // If receiving data from a command
			if (!this.pending[gcmd.time]) return; // Honestly if your data is too late just forget it.
			const thisCommand = this.pending[gcmd.time].data;
			thisCommand[gcmd.source] = gcmd.payload;
			if (thisCommand.some((d) => d === undefined)) return; // Returns if the responses are not all here yet.
			this.pending[gcmd.time].resolve(thisCommand);
			return delete this.pending[gcmd.time];
		}

		// Response sender
		return this.commands[gcmd.command](this.client, gcmd.payload).then(data => {
			process.send(new GatewayCommand(
				this.client.shard.count,
				this.client.shard.id,
				'response',
				[gcmd.source], // Reverse the sources and destinations, and send data.
				data,
				gcmd.time,
			));
		}).catch(e => {
			process.send(new GatewayCommand(
				this.client.shard.count,
				this.client.shard.id,
				'response',
				[gcmd.source],
				null, // If the command errors send null AKA falsey value.
				gcmd.time,
			));
		});
	}
}

module.exports = Gateway;
