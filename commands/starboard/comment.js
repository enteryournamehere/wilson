const { Command } = require('discord.js-commando');
const starboard = require('../../utils/models/starboard.js');
const createStarboardEmbed = require('../../utils/createStarboardEmbed.js');
const secure = require('../../secure.json');

module.exports = class CommentCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'comment',
			group: 'starboard',
			memberName: 'comment',
			aliases: ['c'],
			description: 'Disable or enable comment.',
			examples: ['.comment 132 This is being worked on, see [here](https://example.com)'],
			guildOnly: true,
			args: [
				{
					key: 'idea',
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
        if (msg.member.roles.cache.some(role => secure.starboardCommentRoles.includes(role.id))) return true;
		if (msg.member.hasPermission('ADMINISTRATOR')) return true;
		return 'Your role does not have permission to create idea vault comments.';
	}

	async run(msg, {idea, comment}) {
		const starpost = starboard.getStarpostById(msg.guild.id, idea);
        if (!starpost) return msg.say('I couldn\'t find that idea, sorry!');
        starboard.addStarComment(msg.guild.id, idea, comment, msg.author.id).then((isNew) => {
			msg.say(isNew ? 'Comment added!' : 'Comment edited!');
			msg.guild.channels.cache.get(starpost.starchannel).messages.fetch(starpost.starpost).then(async starboardMessage => {
				const oldEmbed = starboardMessage.embeds[0];
				if (!oldEmbed) return; //should never happen
				oldEmbed.addField('💬 Comment from ' + msg.member.displayName, comment);
				starboardMessage.edit({ embed: oldEmbed });
			}).catch(e => console.log(e));
		});
	} 
};
