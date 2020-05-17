const { Command } = require('discord.js-commando');
const starboard = require('../../utils/models/starboard.js');
const channelType = new (require('discord.js-commando/src/types/channel.js'))(this);
const integerType = new (require('discord.js-commando/src/types/integer.js'))(this);

module.exports = class StarboardChannelCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'starboard-channel',
			group: 'fun',
			memberName: 'starboard-channel',
			aliases: ['sb-c'],
			description: 'Starboard posts messages with a certain number of ⭐ reactions to a channel. Use this command to set it up.',
			details: 'Set the required number of ⭐ reactions: `starboard-threshold <number>`.\n'
				+ 'View the current threshold using `starboard-threshold`.\n'
				+ 'Use `starboard-channel <channel>` to specify the channel where starboard posts should be sent.\n'
				+ 'To enable or disable starboard, use `starboard enable` and `starboard disable`.',
			examples: ['starboard-threshold 5', 'starboard-channel #coolmessages', 'starboard enable'],
			format: '<channel>',
			guildOnly: true,
			args: [{
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
		if (this.client.isOwner(msg.author)) return true;
		if (msg.member.hasPermission('MANAGE_MESSAGES')) return true;
		return 'You need permission to manage messages in order to manage the starboard.';
	}

	async run(msg, args) {
		const px = msg.guild.commandPrefix;
        starboard.setChannel(msg, args.channel);
        return msg.say(`Starboard channel set to <#${args.channel.id}>.` + (starboard.getLimit(msg) ? starboard.isEnabled(msg) ? '' : '\n*Starboard is disabled, use `' + px + 'starboard enable`*' : '\n*Please set a threshold using `' + px + 'starboard threshold ...`*'));
	}
};
