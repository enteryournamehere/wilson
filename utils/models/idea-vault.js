/* eslint-disable new-cap */
const Sequelize = require('sequelize');
const { db } = require('../../database.js');
const { MessageEmbed } = require('discord.js');

const ideas = db.define('ideas', {
	id: {
		type: Sequelize.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	guild: Sequelize.STRING(25),
	message: {
		type: Sequelize.STRING(25),
		unique: true,
	},
	post: {
		type: Sequelize.STRING(25),
	},
	post_channel: Sequelize.STRING(25),
}, { timestamps: false, charset: 'utf8mb4' });

const guilds = db.define('ideaguilds', {
	id: {
		type: Sequelize.STRING(25),
		primaryKey: true,
	},
	enabled: {
		type: Sequelize.BOOLEAN,
		defaultValue: false,
	},
});

const tiers = db.define('ideatiers', {
	guild: Sequelize.STRING(25),
	channel: {
		type: Sequelize.STRING(25),
		primaryKey: true,
	},
	treshold: Sequelize.INTEGER,
}, {
	uniqueKeys: {
		'ideatiers_unique': {
			fields: ['guild', 'treshold'],
		},
	},
});

const comments = db.define('ideacomments', {
	// Specifying mutliple columns as primary key will make it a composite primary key
	idea: {
		type: Sequelize.STRING(25),
		primaryKey: true,
	},
	author: {
		type: Sequelize.STRING(25),
		primaryKey: true,
	},
	value: Sequelize.STRING(1024),
});

db.sync();

function getTiers(guild) {
	return tiers.findAll({
		where: {
			guild: guild,
		},
	});
};

function setTier(guild, channel, treshold) {
	return tiers.upsert({
		guild: guild,
		channel: channel,
		treshold: treshold,
	});
};

function removeTier(channel) {
	return tiers.destroy({
		where: {
			channel: channel,
		},
	});
};

function insertIdea(msg, post) {
	return ideas.create({
		guild: msg.guild.id,
		message: msg.id,
		post: post.id,
		post_channel: post.channel.id,
	});
};

function upsertComment(id, author, value) {
	return comments.upsert({
		idea: id,
		author: author,
		value: value,
	});
};

function getIdeaByMsg(msg) {
	return ideas.findOne({
		where: {
			message: msg,
		},
	});
};

function getIdeaByPost(msg) {
	return ideas.findOne({
		where: {
			post: msg,
		},
	});
};

function getIdeaByID(id) {
	return ideas.findOne({
		where: {
			id: id,
		},
	});
};

function enable(guild) {
	return guilds.upsert({
		id: guild,
		enabled: true,
	});
};

function disable(guild) {
	return guilds.upsert({
		id: guild,
		enabled: false,
	});
};

function isEnabled(guild) {
	return guilds.findOne({
		attributes: ['enabled'],
		where: {
			id: guild,
		},
	}).then(result => {
		// Undefined evaluates to false. If it is undefined
		// we assume it's disabled, otherwise return the result.
		return result ? result.enabled : false
	});
};

async function generatePostEmbed(id, msg, count, comments = []) {
	const embed = new MessageEmbed({
		author: {
			name: `${msg.author.username} in #${msg.channel.name}`,
			icon_url: msg.author.avatarURL(),
		},
		description: msg.content,
		footer: {
			icon_url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
			text: `${count} | Idea #${id}`,
		},
		timestamp: msg.createdAt,
	});

	embed.addField('Original message', '[Here](' + msg.url + ')');

	if (msg.attachments.size) {
		const att = msg.attachments.first();
		const imgtypes = ['jpg', 'jpeg', 'png', 'gif'];
		if (imgtypes.includes(att.name.split('.').slice(-1)[0]).toLowerCase()) {
			embed.setImage(att.url);
		} else {
			embed.addField('Attachments', att.url);
		}
	} else if (msg.embeds.length) {
		const msgEmbed = msg.embeds[0];
		switch (msgEmbed.type) {
			case 'gifv':
				embed.setImage(msgEmbed.url);
				break;
			case 'video':
				embed.setTitle(msgEmbed.title);
				break;

			case 'link':
				embed.setTitle(msgEmbed.title);
				embed.setURL(msgEmbed.url);
				embed.setThumbnail(msgEmbed.thumbnail.url);
				break;

			case 'rich':
				if (msgEmbed.title) embed.setTitle(msgEmbed.title);
				if (msgEmbed.description) embed.addField('Embed', msgEmbed.description);

				embed.fields.push(...msgEmbed.fields);

				if (msgEmbed.thumbnail) embed.setThumbnail(msgEmbed.thumbnail.url);
				if (msgEmbed.image) embed.setImage(msgEmbed.image.url);
				break;
		}
	}
	for (const comment of comments) {
		const author = await msg.guild.members.fetch(comment.author);
		embed.addField('💬 Comment from ' + author.displayName, comment.value);
	}

	embed.setColor(msg.guild.me.displayColor || 16741829);
	return embed;
};

async function messageReactionAdd(reaction, user) {
	if (reaction.emoji.name !== '💡') return;

	await reaction.fetch();
	if (!isEnabled(reaction.message.guild.id)) return;

	// People may try to react on posts instead of their linked message
	if (await getIdeaByPost(reaction.message.id)) return;

	// sorted in descending order.
	const tier = await getTiers(reaction.message.guild.id).then(tiers => {
		return tiers.sort((a, b) => b.treshold - a.treshold).find(tier => reaction.count >= tier.treshold);
	});
	if (!tier) return;

	const idea = await getIdeaByMsg(reaction.message.id);

	if (!idea || idea.post === '0') {
		// We reached the first tier, and this is a new or reserved idea
		const post = await reaction.message.guild.channels.cache.get(tier.channel).send(
			{ embed: await generatePostEmbed('[loading]', reaction.message, reaction.count) },
		);
		// We don't know the ID until after inserting, and we can't insert without a post message
		// This ternary expression handles if this is a reserved idea and we already have an id.
		const id = !idea ? (await insertIdea(reaction.message, post)).id : idea.id;

		// If this is a reserved idea update the post
		if (idea) {
			await ideas.upsert({
				id: idea.id,
				post: post.id,
				post_channel: post.channel.id,
			});
		};

		post.edit({ embed: await generatePostEmbed(id, reaction.message, reaction.count) });
	} else {
		const post = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
		if (!post) return;

		post.embeds[0].setFooter(
			`${reaction.count} | Idea #${idea.id}`,
			'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
		);

		// We have reached a new tier, we need to move the message.
		if (idea.post_channel !== tier.channel) {
			const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: post.embeds[0] });

			await post.delete();

			await ideas.upsert({
				id: idea.id,
				post: newPost.id,
				post_channel: newPost.channel.id,
			});
		} else {
			// We have not reached a new tier, we need to update the count.
			await post.edit({ embed: post.embeds[0] });
		};
	};
};

async function messageReactionRemove(reaction, user) {
	if (reaction.emoji.name !== '💡') return;

	await reaction.fetch();
	if (!isEnabled(reaction.message.guild.id)) return;

	const idea = await getIdeaByMsg(reaction.message.id);
	if (!idea) return;

	const post = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
	if (!post) return;

	post.embeds[0].setFooter(
		`${reaction.count} | Idea #${idea.id}`,
		'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
	);

	// Sorted in descending order.
	const tier = await getTiers(reaction.message.guild.id).then(tiers => {
		return tiers.sort((a, b) => b.treshold - a.treshold).find(tier => reaction.count >= tier.treshold);
	});
	if (!tier) {
		// Let's remove, but reserve the idea.
		await ideas.upsert({
			id: idea.id,
			post: '0',
			post_channel: '0',
		});
		await post.delete();
	} else if (idea.post_channel !== tier.channel) {
		const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: post.embeds[0] });

		await post.delete();

		await ideas.upsert({
			id: idea.id,
			post: newPost.id,
			post_channel: newPost.channel.id,
		});
	} else {
		await post.edit({ embed: post.embeds[0] });
	};
};

module.exports = {
	getTiers,
	setTier,
	removeTier,
	upsertComment,
	getIdeaByMsg,
	getIdeaByPost,
	getIdeaByID,
	enable,
	disable,
	isEnabled,
	messageReactionAdd,
	messageReactionRemove,
};
