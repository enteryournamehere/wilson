
const TOTAL_CACHE_COUNT = 10;
const DM_SERVER = '324918057346662401';
const DM_SERVER_CHANNEL = '452805784255070208';
const PERM_SERVER_INVITE = 'https://discord.gg/aaaaaaaa';

// dm replies are not working!
// this is also copied from github.com/aeioubot/aeiou, I think

class DmManager {
	constructor(client) {
		this.client = client;
		this.messages = [];
		this.id = 0;
	}

	async newMessage(msg) {
		if (!this.messages.find((m) => msg.author.id == m.author.id)) {
			msg.replyID = this.id;
			this.id += 1;
			if (this.messages.push(msg) > TOTAL_CACHE_COUNT) this.messages.splice(0, 1);
		}
		const embed = {
			color: 0x4286F4,
			author: {
				name: `${msg.author.username}#${msg.author.discriminator}`,
				icon_url: msg.author.avatarURL() ? msg.author.avatarURL() : 'https://cdn.drawception.com/images/panels/2016/12-10/Q4Zcfan1X5-4.png',
			},
			image: {
				url: msg.attachments.first() && msg.attachments.first().height ? msg.attachments.first().url : '',
			},
			fields: [],
			footer: {text: `ID: ${this.messages.find((m) => msg.author.id == m.author.id).replyID}`},
			timestamp: new Date(msg.createdTimestamp).toISOString(),
		};
		if (msg.content && msg.content.length < 1024) embed.fields.push({name: 'Content', value: msg.content});
		if (msg.content && msg.content.length > 1024 ) {
			embed.fields.push({name: 'Content', value: msg.content.substring(0, 1024)});
			embed.fields.push({name: 'Content overflow', value: msg.content.substring(1024)});
		}
		if (msg.attachments.size > 0) {
			if (msg.attachments.first().url.match(/\.(jpe?g|png|gif|webp$)/)) {
				embed.image = {
					url: msg.attachments.first().url,
				};
			} else {
				embed.fields.push({
					name: 'Attachment',
					value: msg.attachments.first().url,
				});
			}
		}
		this.client.guilds.get(DM_SERVER).channels.get(DM_SERVER_CHANNEL).send('Received DM:', {embed});
	}

	async reply(replyID, content, attachment) {
		const replyMsg = this.messages.find((m) => replyID == m.replyID);
		if (!replyMsg) return false;
		return replyMsg.reply(content.replace('{s}', PERM_SERVER_INVITE), attachment.image ? {embed: {image: {url: attachment.image}}} : '').then(() => true);
	}
}

module.exports = DmManager;
