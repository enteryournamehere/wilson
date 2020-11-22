const { MessageEmbed } = require('discord.js');

module.exports = async function createStarboardEmbed(msg, count, id, comments = []) {
	const embed = new MessageEmbed({
		author: {
			name: msg.author.username + ' in #' + msg.channel.name,
			icon_url: msg.author.avatarURL(),
		},
		description: msg.content,
		footer: {
			icon_url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
			text: count + ' | idea #' + id,
		},
		timestamp: msg.createdAt
	});
	embed.addField('Original message', '[Here](' + msg.url + ')')
	if (msg.attachments.size) {
		const att = msg.attachments.first();
		const imgtypes = ['jpg', 'jpeg', 'png', 'gif'];
		if (att.name.includes('.') && imgtypes.includes(att.name.slice(att.name.lastIndexOf('.') + 1, att.name.length).toLowerCase())) {
			embed.setImage(att.url);
		} else {
			embed.addField('Attachments', msg.attachments.first().url);
		}
	} else if (msg.embeds.length) {
		const msgEmbed = msg.embeds[0];
		switch (msgEmbed.type) {
			case 'image':
			case 'gifv':
				embed.setImage(msgEmbed.url);
				break;
			case 'link':
				embed.setTitle(msgEmbed.title);
				embed.setURL(msgEmbed.url);
				embed.setThumbnail(msgEmbed.thumbnail.url);
				break;
			case 'rich':
				if (msgEmbed.title) embed.setTitle(msgEmbed.title);
				if (msgEmbed.description) embed.addField('Embed', msgEmbed.description);
				/* eslint-disable guard-for-in */
				for (const fieldIndex in msgEmbed.fields) {
					const field = msgEmbed.fields[fieldIndex];
					embed.addField(field.name, field.value, field.inline);
				}
				if (msgEmbed.thumbnail) embed.setThumbnail(msgEmbed.thumbnail.url);
				if (msgEmbed.image) embed.setImage(msgEmbed.image.url);
				break;
			case 'video':
				embed.setTitle(msgEmbed.title);
				embed.setThumbnail(msgEmbed.thumbnail.url);
		}
	}
	for (const comment of comments) {
		author = await msg.guild.members.fetch(comment.author);
		embed.addField('💬 Comment from ' + author.displayName, comment.comment);
	}
	embed.setColor(msg.guild.me.displayColor || 16741829);
	return embed;
}