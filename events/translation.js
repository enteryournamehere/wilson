const { MessageEmbed } = require('discord.js');
const translation = require('../utils/translation.js');
const secure = require('../secure.json');

function createTranslateEmbed(msg, language) {
	const embed = new MessageEmbed({
		description: '[Original message](' + msg.url + ') ' + language,
	});
	embed.setColor(msg.member.displayColor || 16777215);
	return embed;
}


module.exports = async (msg) => {
	if (msg.webhookID) return;
	if (msg.channel.id !== secure.translation.from) return;
	const toChannel = await msg.guild.channels.cache.get(secure.translation.to);
	toChannel.fetchWebhooks().then(async webhooks => {
		if (webhooks.first()) return webhooks.first();
		else {
			return await toChannel.createWebhook('Translation', {});
		}
	}).then(async (webhook) => {
		if (!webhook) return console.error('No Translation Webhook');
		const translated = await translation.translateText(msg.content);
		const language = await translation.detectLanguage(msg.content);

		const embed = createTranslateEmbed(msg, `(${translation.emoji(language[0][0].split('-')[0])} ${language[0][1]})`);
		webhook.send(translated[0], {
			username: msg.member.nickname ? `${msg.member.nickname} (${msg.author.username}#${msg.author.discriminator})` : `${`${msg.author.username}#${msg.author.discriminator}`}`,
			avatarURL: msg.author.avatarURL(),
			embeds: [embed, ...msg.embeds],
			files: msg.attachments.array(),
			allowedMentions: {
				parse: [],
			},
		});
	});
};
