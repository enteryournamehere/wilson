const { Command } = require('discord.js-commando');
const starboard = require('../../utils/models/starboard.js');
const channelType = new (require('discord.js-commando/src/types/channel.js'))(this);
const integerType = new (require('discord.js-commando/src/types/integer.js'))(this);

module.exports = class StarboardThresholdCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'starboard-threshold',
			group: 'starboard',
			memberName: 'starboard-threshold',
			aliases: ['sb-t'],
			description: 'Starboard posts messages with a certain number of 💡 reactions to a threshold. Use this command to set it up.',
			details: 'Set the required number of 💡 reactions: `starboard-threshold <number>`.\n'
				+ 'View the current threshold using `starboard-threshold`.\n'
				+ 'Use `starboard-channel <channel>` to specify the channel where starboard posts should be sent.\n'
				+ 'To enable or disable starboard, use `starboard enable` and `starboard disable`.',
			examples: ['starboard-threshold 5', 'starboard-threshold #coolmessages', 'starboard enable'],
			format: '<action> [limit or threshold]',
			guildOnly: true,
			args: [
				{
				// 	key: 'action',
				// 	prompt: 'Please specify one of: threshold, channele, enable, disable.',
				// 	type: 'string',
				// 	validate: (val, msg, currArg, prevArgs) => {
				// 		return ['limit', 'threshold', 'channel', 'enable', 'disable'].includes(val);
				// 	},
				// }, {
					key: 'threshold',
					prompt: 'What is the threshold?',
					type: 'integer',
					default: '',
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
        if (args.threshold === '') return msg.say('The threshold is ' + starboard.getLimit(msg));
        if (args.threshold > 2147483647) return msg.say('hah, no');
        starboard.setLimit(msg, args.channel);
        return msg.say(`Starboard threshold set to ${args.threshold}.` + (starboard.getChannel(msg) ? starboard.isEnabled(msg) ? '' : '\n*Starboard is disabled, use `' + px + 'starboard enable`*' : '\n*Please set a channel using `' + px + 'starboard channel ...`*'));
	}
};
