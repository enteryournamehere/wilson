const { Command } = require('discord.js-commando');
const ideaVault = require('../../utils/models/idea-vault.js');

module.exports = class IdeaVaultTierCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'ideavault-tier',
			group: 'ideavault',
			memberName: 'ideavault-tier',
			aliases: ['sb-tier'],
			description: 'Idea Vault tiers, different reaction counts to different channel!',
			examples: ['ideavault-tier add #channel 10', 'ideavault-tier list', 'ideavault-tier remove #channel'],
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
		return 'You need permission to manage messages in order to manage the idea vault.';
	}

	async run(msg, {action, channel, threshold}) {
        switch (action) {
			case 'list':
				let tiers = ideaVault.getTiers(msg.guild.id).sort((a, b) => a.treshold - b.treshold);
				let response = 'The current tiers for the idea vault:\n';
				for (let i = 0; i<tiers.length; i++) {
					response += `   <#${tiers[i].channel}> - ${tiers[i].treshold} 💡`;
				};
				msg.say(response);
				break;
			case 'set':
				ideaVault.setTier(msg.guild.id, channel.id, threshold).then(tier => msg.say(tier ? 'added' : 'edited')).catch(e=>msg.say(e.error));
				break;
			case 'remove':
				ideaVault.removeTier(msg.guild.id, channel).then(x=>msg.say('Removed it!')).catch(e=>msg.say(e.error))
		}
	}
};
