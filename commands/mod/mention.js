const commando = require('discord.js-commando');
const mentionaccess = require('../../models/mentionaccess.js');

module.exports = class MentionCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'mention',
			group: 'mod',
			memberName: 'mention',
			description: 'Mentions a role',
			aliases: ['m'],
			guildOnly: true,
			args: [
				{
					key: 'role',
					prompt: 'which role',
					type: 'role',
				},
				{
					key: 'text',
					prompt: 'What do you want the message to say?',
					type: 'string',
					default: '',
				},
			],
		});
	}

	async run(msg, {role, text}) {
		for (let i = 0; i<msg.member._roles.length; i++) {
			const perm = await mentionaccess.checkPermission(msg.member._roles[i], role.id);
			if (perm || this.client.isOwner(msg.author) || msg.member.hasPermission('ADMINISTRATOR')) {
				msg.say('_From ' + msg.author.tag + ' to <@&' + role.id + '>:_\n' + text, { files: msg.attachments.map(x=>x.url) }).then(() => {
					msg.delete();
				});
				return null;
			}
		}

		return msg.say('Sorry, you don\'t have permission to do that.');
	}
};
