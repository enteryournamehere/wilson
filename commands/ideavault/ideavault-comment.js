const { Command } = require('discord.js-commando');
const ideaVault = require('../../utils/models/idea-vault.js');
const secure = require('../../secure.json');

module.exports = class CommentCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'ideavault-comment',
			group: 'ideavault',
			memberName: 'comment',
			aliases: ['c'],
			description: 'Comment on an idea',
			examples: ['.comment 132 This is being worked on, see [here](https://example.com)'],
			guildOnly: true,
			args: [
				{
					key: 'id',
                    prompt: 'What\'s the idea ID? Please do not include the # sign.',
					type: 'integer',
                },
                {
                    key: 'comment',
                    prompt: 'What\'s your comment?',
                    type: 'string',
                }
			],
		});
	}

	hasPermission(msg) {
        if (this.client.isOwner(msg.author)) return true;
        if (msg.member.roles.cache.some(role => secure.ideaVaultCommentRoles.includes(role.id))) return true;
		if (msg.member.hasPermission('ADMINISTRATOR')) return true;
		return 'Your role does not have permission to comment on ideas.';
	}

	async run(msg, {id, comment}) {
		const idea = ideaVault.getIdeaByID(id);
		if (!idea) return msg.say('I couldn\'t find that idea, sorry!');
		
		await ideaVault.upsertComment(id, msg.author.id, comment);

		const post = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
		const embed = post.embeds[0];

		const index = embed.fields.indexOf(embed.fields.find(item => item.name === '💬 Comment from ' + msg.member.displayName));

		if (index !== -1) {
			// Replace the field
			embed.spliceFields(index, 1, {name: '💬 Comment from ' + msg.member.displayName, value: comment});
		} else {
			// Add a new field
			embed.addField('💬 Comment from ' + msg.member.displayName, comment);
		};

		post.edit({ embed: embed });
	}
};
