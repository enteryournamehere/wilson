const commando = require('discord.js-commando');
const sticky = require('../../models/sticky.js');

module.exports = class StickyCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'sticky',
			group: 'mod',
			memberName: 'sticky',
			description: 'Make a message stick to the bottom of the channel',
			aliases: ['stick'],
			guildOnly: true,
			args: [
				{
					key: 'text',
					prompt: 'Which text?',
					type: 'string',
					required: true,
				}
			],
		});
	}

	hasPermission(msg) {
		if (this.client.isOwner(msg.author)) return true;
		if (msg.member.hasPermission('MANAGE_MESSAGES')) return true;
		return 'sorry, you need the Manage Messages permission to do this.';
	}

	async run(msg, {text}) {
		if (text == 'remove') {
			await sticky.deleteSticky(msg.channel.id);
			msg.say("I've removed the stickied message.")
			return;
		}

		await sticky.setSticky(msg.channel.id, text);
		msg.say(text).then(sent => sticky.setPost(msg.channel.id, sent.id));
	}
};
