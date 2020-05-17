const { Command } = require('discord.js-commando');
const starboard = require('../../utils/models/starboard.js');
const channelType = new (require('discord.js-commando/src/types/channel.js'))(this);
const integerType = new (require('discord.js-commando/src/types/integer.js'))(this);

module.exports = class StarboardCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'starboard',
			group: 'fun',
			memberName: 'starboard',
			aliases: ['sb'],
			description: 'Disable or enable starboard.',
			examples: ['starboard enable'],
			format: '<action>',
			guildOnly: true,
			args: [
				{
					key: 'action',
					prompt: 'Please specify one of: enable, disable.',
					type: 'string',
					validate: (val, msg, currArg, prevArgs) => {
						return ['enable', 'disable'].includes(val);
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
		switch (args.action) {
			case 'enable':
				starboard.enable(msg);
				return msg.say('Starboard is now enabled.');
			case 'disable':
				starboard.disable(msg);
				return msg.say('Starboard is now disabled.');
		}
	}
};
