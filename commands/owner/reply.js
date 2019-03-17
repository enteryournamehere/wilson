const {Command} = require('discord.js-commando');
const GatewayCommand = require('../../utils/classes/GatewayCommand.js');

// broken

module.exports = class ReplyCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'reply',
			group: 'owner',
			memberName: 'reply',
			description: 'replies',
			details: 'Replies to a DM message.',
			examples: ['!reply 1 ok', '!reply 23 no i dont'],
			format: '[ID] [content]',
			guildOnly: true,
			args: [
				{
					key: 'id',
					prompt: 'Which message would you like to reply to?',
					type: 'integer',
				},
				{
					key: 'content',
					prompt: 'What would you like to say?',
					type: 'string',
					default: '',
				},
			],
		});
	}

	hasPermission(msg) {
		return this.client.isOwner(msg.author);
	}

	async run(msg, { id, content }) {
		if (!content && !(msg.attachments.first() && msg.attachments.first().height)) return msg.say('You must include content or an image.');
		const remoteMsg = {
			replyID: id,
			msg: content,
			opts: {
				image: msg.attachments.first() && msg.attachments.first().height ? msg.attachments.first().url : null,
			},
		};

		return this.client.gateway.sendMessage(new GatewayCommand(
			this.client.shard.count,
			this.client.shard.id,
			'acceptDM',
			[0],
			remoteMsg,
			null,
		)).then((b) => b.some((l) => l) ? msg.react('✅') : msg.react('❌')).then(() => undefined);
	}
};
