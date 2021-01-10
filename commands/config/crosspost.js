const commando = require('discord.js-commando');
const crosspostconf = require('../../utils/models/crosspostconf.js');

module.exports = class CrosspostCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'crosspost',
			group: 'config',
			memberName: 'crosspost',
			description: 'Enables/Disables if Wilson will crosspost webhook messages in channels.',
			details: 'Enables/Disables if Wilson will crosspost webhook messages in channels.',
			guildOnly: true,
			args: [
				{
					key: 'action',
					prompt: 'enable or disable',
					type: 'string',
					validate: (value, message, argument) => {
						return ['enable', 'disable'].includes(value);
					},
				},
				{
					key: 'channel',
					prompt: 'What is the channel?',
					type: 'channel',
					default: '',
					validate: (val, msg, currArg, prevArgs) => {
						let validated = false;
						validated = channelType.validate(val, msg);
						if (typeof validated === 'string' && validated.indexOf('Multiple channels found') === 0) {
							currArg.reprompt = validated;
							return false;
						}
						return validated;
					},
				},
			],
		});
	}

	hasPermission(msg) {
		if (msg.member.hasPermission('ADMINISTRATOR') || this.client.isOwner(msg.author.id)) return true;
		return 'You need to be an adminstrator for this.';
	}

	async run(msg, {action, channel}) {
		 switch(action){
			case 'disable':
				crosspostconf.disableCrosspost(channel.id);
				break;
			case 'enable':
				crosspostconf.enableCrosspost(channel.id);
				break;
		 }
	}
};
