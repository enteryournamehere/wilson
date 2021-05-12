const { Command } = require('discord.js-commando');
const ideaVault = require('../../models/idea-vault.js');
const secure = require('../../secure.json');

module.exports = class CommentCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'ideavault-hidecomment',
			group: 'ideavault',
			memberName: 'ideavault-hidecomment',
			aliases: ['iv-hidecomment', 'hc', 'hidecomment'],
			description: 'Hide or unhide a comment on an idea',
			examples: ['.hidecomment 132 @zaop#0003'],
			guildOnly: true,
			args: [
				{
					key: 'id',
					prompt: 'What\'s the idea ID? Please do not include the # sign.',
					type: 'integer',
				},
				{
					key: 'user',
					prompt: 'Whose comment should be (un)hidden?',
					type: 'user',
				},
			],
		});
	}

	hasPermission(msg) {
		if (this.client.isOwner(msg.author)) return true;
		if (msg.member.roles.cache.some(role => secure.ideaVaultCommentRoles.includes(role.id))) return true;
		if (msg.member.hasPermission('ADMINISTRATOR')) return true;
		return 'Your role does not have permission to hide comments on ideas.';
	}

	async run(msg, {id, user}) {
		const idea = await ideaVault.getIdeaByID(id);
		if (!idea || idea.guild !== msg.guild.id) return msg.say('I couldn\'t find that idea, sorry!');

		const comment = await ideaVault.toggleCommentVisibility(id, user.id).catch(e => {
			msg.say(e.message);
		});
		if (!comment) return;

		const post = await msg.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
		const embed = post.embeds[0];

		const commenterName = (await msg.guild.members.fetch(user)).displayName;

		const index = embed.fields.indexOf(embed.fields.find(item => item.name === '💬 Comment from ' + commenterName));

		if (index !== -1) {
			// Delete the field
			embed.spliceFields(index, 1);
		} else {
			// Add a new field
			embed.addField('💬 Comment from ' + commenterName, comment.value);
		};

		await post.edit({ embed: embed });

		msg.say('Comment ' + (comment.visible ? 'un' : '') + 'hidden!');
	}
};
