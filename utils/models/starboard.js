const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const { db } = require('../../database.js');

const starposts = db.define('starposts', {
	guild: Sequelize.STRING(25),
	message: {
		type: Sequelize.STRING(25),
		unique: true,
	},
	starpost: Sequelize.STRING(25),
	starchannel: Sequelize.STRING(25),
}, { timestamps: false, charset: 'utf8mb4' });

const starguilds = db.define('starguilds', {
	guild: {
		type: Sequelize.STRING(25),
		unique: true,
	},
	limit: Sequelize.INTEGER,
	channel: Sequelize.STRING(25),
	enabled: {
		type: Sequelize.BOOLEAN,
		defaultValue: false,
	},
});

const startiers = db.define('startiers', {
	guild: Sequelize.STRING(25),
	limit: Sequelize.INTEGER,
	channel: Sequelize.STRING(25),
}, {
	uniqueKeys: {
		"startier_unique": {
			fields: ['guild', 'limit']
		}
	}
});

const starcomments = db.define('starcomments', {
	starpost: Sequelize.STRING(25),
	comment: Sequelize.STRING(2000),
	author: Sequelize.STRING(25),
}, {
	uniqueKeys: {
		"starcomment_unique": {
			fields: ['starpost', 'author']
		}
	}
});

db.sync();

const starboardCache = {};
const starguildCache = {};
const startierCache = {};


function getTiers(guild) {
	return starguildCache[guild].tiers;
};

async function setTier(guild, limit, channel) {
	const existing = starguildCache[guild].tiers.find(tier => (tier.limit === limit));
	if (existing) existing.channel = channel;
	else starguildCache[guild].tiers.push({
		guild: guild,
		limit: limit,
		channel: channel,
	});
	return startiers.upsert({
		guild: guild,
		limit: limit,
		channel: channel,
	});
};

async function removeTier(guild, limit) {
	const existing = starguildCache[guild].tiers.findIndex(tier => (tier.limit === limit));
	if (existing === -1) return new Promise((resolve, reject) => {
		reject({error: 'This tier does not exist'});
	});
	starguildCache[guild].tiers.splice(existing, 1);
	return startiers.destroy({where: {
		guild: guild,
		limit: limit,
	}})
};

async function buildStarboardCache(guildList) {
	guildList.forEach(id => {
		starboardCache[id] = [];
	});
	starguilds.findAll({
		where: {
			guild: { [Op.in]: guildList },
		},
	}).then(x => {
		x.forEach(async p => {
			const tiers = await startiers.findAll({ where: { guild: p.guild } });
			starguildCache[p.guild] = { limit: p.limit, channel: p.channel, enabled: p.enabled, tiers: tiers };
		});
	});
	return starposts.findAll({
		where: {
			guild: { [Op.in]: guildList },
		},
	}).then(x => {
		let count = 0;
		x.forEach(p => {
			count++;
			starcomments.findAll({where: {starpost: p.id}}).then(comments => {
				starboardCache[p.guild].push({ message: p.message, starpost: p.starpost, starchannel: p.starchannel, id: p.id, comments: comments});
			});
		});
		return count;
	});
};

async function addStarpost(msg, starpost, starchannel) {
	let existing = starboardCache[msg.guild.id].find(starpost => starpost.message === msg.id);
	if (existing) {
		existing.starpost = starpost;
		existing.starchannel = starchannel;
		return starposts.upsert({
			guild: msg.guild.id,
			message: msg.id,
			starpost: starpost,
			starchannel: starchannel,
		});
	}
	else {
		return starposts.create({
			guild: msg.guild.id,
			message: msg.id,
			starpost: starpost,
			starchannel: starchannel,
		}).then(newStarpost => {
			starboardCache[msg.guild.id].push({ id: newStarpost.id, message: msg.id, starpost: starpost, starchannel: starchannel, comments: [] });
			return newStarpost;
		})

		// kinda ugly to separate upsert & create like this, but I need the ID of the inserted row when creating
	}
};

async function addStarComment(guild, starId, comment, author) {
	const currentComment = starboardCache[guild].find(m => m.id === starId).comments.find(c => c.author == author);
	
	if (currentComment) {
		// edit currentComment in the cache
	}
	else {
		starboardCache[guild].find(m => m.id === starId).comments.push({author: author, comment: comment});
	}

	// this SHOULD not allow multiple comments by 1 author on 1 idea, see table definition at top of file. doesn't seem to work though
	return await starcomments.upsert({
		starpost: starId,
		comment: comment,
		author: author,
	}).then(() => {
		return !currentComment;
	})
	// todo
	// x add comment here
	// x load comment when loading star embed
	// / allow editing comments
	// x auto reload star embed after commenting
}

function getEntryByMsg(msg) {
	return starboardCache[msg.guild.id].find(m => m.message === msg.id);
};

function getEntryByPost(msg) {
	return starboardCache[msg.guild.id].find(m => m.starpost === msg.id);
};

function getLimit(msg) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	return starguildCache[msg.guild.id].limit;
};

async function setLimit(msg, limit) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	starguildCache[msg.guild.id].limit = limit;
	return starguilds.upsert({
		guild: msg.guild.id,
		limit: limit,
	});
};

function getChannel(msg) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	return starguildCache[msg.guild.id].channel;
};

function setChannel(msg, channel) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	starguildCache[msg.guild.id].channel = channel.id;
	return starguilds.upsert({
		guild: msg.guild.id,
		channel: channel.id,
	});
};

function enable(msg) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	starguildCache[msg.guild.id].enabled = true;
	return starguilds.upsert({
		guild: msg.guild.id,
		enabled: true,
	});
};

function disable(msg) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	starguildCache[msg.guild.id].enabled = false;
	return starguilds.upsert({
		guild: msg.guild.id,
		enabled: false,
	});
};

function isEnabled(msg) {
	starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
	return starguildCache[msg.guild.id].enabled;
};

function generateStarboardEntry(msg, count) {
	const embed = new MessageEmbed({
		author: {
			name: `${msg.author.username} in #${msg.channel.name}`,
			icon_url: msg.author.avatarURL(),
		},
		description: msg.content,
		footer: {
			icon_url: 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png',
			text: count
		},
		timestamp: msg.createdAt
	});

	embed.addField('Original message', '[Here](' + msg.url + ')')

	if (msg.attachments.size) {
		const att = msg.attachments.first();
		const imgtypes = ['jpg', 'jpeg', 'png', 'gif'];
		if (imgtypes.includes(att.name.split('.').slice(-1)[0])) {
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

				embed.fields.push(...msgEmbed.fields)

				if (msgEmbed.thumbnail) embed.setThumbnail(msgEmbed.thumbnail.url);
				if (msgEmbed.image) embed.setImage(msgEmbed.image.url);
				break;
		}
	}

	embed.setColor(msg.guild.me.displayColor || 16741829);
	return embed;
};

async function messageReactionAdd(reaction, user) {
	if (reaction.emoji.name !== '💡') return;

	await user.fetch();
	const message = await reaction.message.fetch()
	if (!message) return;
	const channel = await message.channel.fetch() || await user.createDM();

	if (!channel.parent || channel.parent.id !== secure.starboardCategory) return;

	if (!starboard.isEnabled(message)) return;

	const existingStarpost = starboard.getEntryByMsg(message);
	if (existingStarpost) return;

	// sorted in descending order.
	const tier = starboard.getTiers(message.guild.id).sort((a, b) => b.limit - a.limit).find(tier => reaction.count >= tier.limit);
	if (!tier) return;

	// if (starboard.getLimit(reaction.message) > reaction.count) return;

	const channelID = tier.channel;

	if (existingStarpost) {
		oldTier = tiers.find(tier => {
			return tier.channel === existingStarpost.starchannel;
		})
		if (existingStarpost.starchannel != channelID && (!oldTier || oldTier.limit < tier.limit)) {
			message.guild.channels.cache.get(existingStarpost.starchannel).messages.fetch(existingStarpost.starpost).then(msg => {
				msg.delete();
			}).catch(e => console.log(e));
			message.guild.channels.cache.get(channelID).send({ embed: await generateStarboardEntry(message, reaction.count, existingStarpost.id, existingStarpost.comments) }).then(msg => {
				starboard.addStarpost(message, msg.id, channelID);
			}).catch(e => console.log(e));;
		}
		else {
			return message.guild.channels.cache.get(existingStarpost.starchannel).messages.fetch(existingStarpost.starpost).then(async msg => {
				msg.edit({ embed: await generateStarboardEntry(message, reaction.count, existingStarpost.id, existingStarpost.comments) });
				}).catch(e => console.log(e));;
		}
	}
	else {
		message.guild.channels.cache.get(channelID).send({ embed: generateStarboardEntry(message, reaction.count, ' [loading]') }).then(msg => {
			starboard.addStarpost(message, msg.id, channelID).then(async newStarpost => {
				msg.edit({ embed: await generateStarboardEntry(message, reaction.count, newStarpost.id) });
			});
		}).catch(e => console.log(e));;
	}
};

async function messageReactionRemove(reaction, user) {
	if (reaction.emoji.name !== '💡') return;

	await user.fetch();
	const message = await reaction.message.fetch()
	if (!message) return;
	const channel = await message.channel.fetch() || await user.createDM();

	if (!channel.parent || channel.parent.id !== secure.starboardCategory) return;

	if (!starboard.isEnabled(message)) return;

	const existingStarpost = starboard.getEntryByMsg(message);
	if (!existingStarpost) return;

	const channelID = existingStarpost.starchannel;

	message.guild.channels.cache.get(channelID).messages.fetch(existingStarpost.starpost).then(async msg => {
		msg.edit({ embed: await generateStarboardEntry(message, reaction.count) });
	}).catch(e => console.log(e));;
};

module.exports = {
	starboardCache,
	starguildCache,
	startierCache,
	getTiers,
	setTier,
	removeTier,
	buildStarboardCache,
	setLimit,
	getLimit,
	getChannel,
	setChannel,
	enable,
	disable,
	isEnabled,
	messageReactionAdd,
	messageReactionRemove,
};
