const { Command } = require('discord.js-commando');
const starboard = require('../../utils/models/starboard.js');
const channelType = new (require('discord.js-commando/src/types/channel.js'))(this);
const integerType = new (require('discord.js-commando/src/types/integer.js'))(this);

module.exports = class StarboardTierCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'starboard-tier',
			group: 'starboard',
			memberName: 'starboard-tier',
			aliases: ['sb-tier'],
			description: 'Starboard tiers, different reaction counts to different channel!',
			examples: ['starboard-tier add 10 #channel', 'starboard-tier list', 'starboard-tier remove 10'],
			format: '<action> [action arguments]',
			guildOnly: true,
			args: [{
					key: 'action',
					prompt: 'list/set/remove?',
					type: 'string',
					validate: (val) => {
                        return ['list', 'set', 'remove'].includes(val);
					},
				},{
					key: 'threshold',
					prompt: 'threshold?',
					type: 'integer',
                    default: '0',
                    min: 1,
				},{
					key: 'channel',
					prompt: 'channel?',
					type: 'channel',
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

	async run(msg, {action, threshold, channel}) {
		const px = msg.guild.commandPrefix;
        switch (action) {
			case 'list':
				let tiers = starboard.getTiers(msg.guild.id).sort((a, b) => a.limit - b.limit);
				let response = 'Here are the current tiers';
				for (let i = 0; i<tiers.length; i++) {
					response += `\n ${tiers[i].limit} 💡 - <#${tiers[i].channel}>`;
				}
				msg.say(response);
				break;
			case 'set':
				starboard.setTier(msg.guild.id, threshold, channel.id).then(x=>msg.say(x ? 'added' : 'edited')).catch(e=>msg.say(e.error));
				break;
			case 'remove':
				starboard.removeTier(msg.guild.id, threshold).then(x=>msg.say('Removed it!')).catch(e=>msg.say(e.error))
		}
	}
};
