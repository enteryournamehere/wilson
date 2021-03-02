/* eslint-disable new-cap */
const Sequelize = require('sequelize');
const { db } = require('../../database.js');
const secure = require('../../secure.json');
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
}, { timestamps: false, charset: 'utf8mb4' });

const posts = db.define('ideaposts', {
	idea_id: {
		type: Sequelize.INTEGER,
		references: {
			model: ideas,
			key: 'id',
		},
	},
	message: {
		type: Sequelize.STRING(25),
		unique: true,
	},
	channel: {
		type: Sequelize.STRING(25),
	},
})

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
	threshold: Sequelize.INTEGER,
}, {
	uniqueKeys: {
		'ideatiers_unique': {
			fields: ['guild', 'threshold'],
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
	visible: {
		type: Sequelize.BOOLEAN,
		defaultValue: true,
	},
	value: Sequelize.STRING(1024),
});

db.sync();

function getTiers(guild) { // 
	return tiers.findAll({
		where: {
			guild: guild,
		},
	});
};

function setTier(guild, channel, threshold) {
	return tiers.upsert({
		guild: guild,
		channel: channel,
		threshold: threshold,
	});
};

function removeTier(channel) {
	return tiers.destroy({
		where: {
			channel: channel,
		},
	});
};

function insertIdea(msg) {
	return ideas.create({
		guild: msg.guild.id,
		message: msg.id,
	});
};

function insertPost(id, msg) {
	return posts.create({
		idea_id: id,
		message: msg.id,
		channel: msg.channel.id
	})
}

function upsertComment(id, author, value) {
	return comments.upsert({
		idea: id,
		author: author,
		value: value,
		visible: true,
	});
};

function toggleCommentVisibility(id, author) {
	return comments.findOne({
		where: {
			idea: id,
			author: author
		}
	}).then(comment => {
		if (comment === null) throw new Error('That user hasn\'t commented on that idea.');
		comment.dataValues.visible = !comment.dataValues.visible;
		return comments.upsert({
			...comment.dataValues
		}).then(() => {
			return comment.dataValues;
		})
	})
}


function getIdeaByMsg(msg) {
	return ideas.findOne({
		where: {
			message: msg,
		},
	});
};

async function getIdeaByPost(msg) {
	const post = (await posts.findOne({
		where: {
			message: msg,
		},
	}));
	if (!post) return;

	return await ideas.findOne({
		where: {
			id: post.idea_id,
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

function getPostsByID(id) {
	return posts.findAll({
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
		if (imgtypes.includes(att.name.split('.').slice(-1)[0].toLowerCase())) {
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
				embed.setURL(msgEmbed.url);
				if (msgEmbed.thumbnail) embed.setThumbnail(msgEmbed.thumbnail.url);
				break;

			case 'link':
			case 'article':
				embed.setTitle(msgEmbed.title);
				embed.setURL(msgEmbed.url);
				if (msgEmbed.thumbnail) embed.setThumbnail(msgEmbed.thumbnail.url);
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
	// TODO: Make channel configurable per guild
	if (!reaction.message.channel.parent || reaction.message.channel.parent.id !== secure.ideaVaultCategory) return;
	// People may try to react on posts instead of their linked message
	if (await getIdeaByPost(reaction.message.id)) return;

	// sorted in descending order.
	const tier = await getTiers(reaction.message.guild.id).then(tiers => {
		return tiers.sort((a, b) => b.threshold - a.threshold).find(tier => reaction.count >= tier.threshold);
	});
	if (!tier) return;
	const idea = await getIdeaByMsg(reaction.message.id);

	if (!idea) {
		// A new idea that reached the first tier
		const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send(
			{ embed: await generatePostEmbed('[loading]', reaction.message, reaction.count) },
		);

		const id = (await insertIdea(reaction.message)).id;
		await insertPost(id, newPost);

		// We don't know the ID until after inserting
		newPost.edit({ embed: await generatePostEmbed(id, reaction.message, reaction.count) });
	} else {
		let posts = await getPostsByID(idea.id); // We overwrite this for the case of reserved ideas
		if (!posts) {	
			// This is a reserved idea that reached the first tier
			posts = [await reaction.message.guild.channels.cache.get(tier.channel).send(
				{ embed: await generatePostEmbed(idea.id, reaction.message, reaction.count) },
			)];
		}

		for (const post in posts) {
			// Update the embed count
			const postMsg = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);

			postMsg.embeds[0].setFooter(
				`${reaction.count} | Idea #${idea.id}`,
				'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
			);

			const isTier = await getTiers(reaction.message.guild.id).then(tiers => {
				return tiers.find(element => element.channel == post.channel);
			});
			if (isTier && isTier.channel != tier.channel) {
				// We have reached a new tier
				const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: post.embeds[0] });

				await post.delete(); // Delete the old post

				await insertPost(idea.id, newPost);
			} else {
				// Let's just update the count
				await post.edit({ embed: post.embeds[0] });
			};
		};
	};
};

async function messageReactionRemove(reaction, user) {
	if (reaction.emoji.name !== '💡') return;

	await reaction.fetch();
	if (!isEnabled(reaction.message.guild.id)) return;
	// TODO: Make channel configurable per guild
	if (!reaction.message.channel.parent || reaction.message.channel.parent.id !== secure.ideaVaultCategory) return;

	const idea = await getIdeaByMsg(reaction.message.id);
	if (!idea) return;

	for (const post in await getPostsByID(idea.id)) {

	}

	const post = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
	if (!post) return;

	post.embeds[0].setFooter(
		`${reaction.count} | Idea #${idea.id}`,
		'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
	);

	// Sorted in descending order.
	const tier = await getTiers(reaction.message.guild.id).then(tiers => {
		return tiers.sort((a, b) => b.threshold - a.threshold).find(tier => reaction.count >= tier.threshold);
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
	toggleCommentVisibility,
	getIdeaByMsg,
	getIdeaByPost,
	getIdeaByID,
	enable,
	disable,
	isEnabled,
	messageReactionAdd,
	messageReactionRemove,
};
