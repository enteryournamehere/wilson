const commando = require('discord.js-commando');

module.exports = class UnknownCommandCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'unknown-command',
			group: 'fun',
			memberName: 'unknown-command',
			description: 'Displays help information for when an unknown command is used.',
			examples: ['unknown-command'],
			unknown: true,
			hidden: true
		});
	}

	run(msg) {
		return null;
	}
};