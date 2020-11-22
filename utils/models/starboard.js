const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const Database = require('../../database.js');

const db = Database.db;

const starposts = db.define('starposts', {
	guild: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
	message: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
		unique: true,
	},
	starpost: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
	starchannel: Sequelize.STRING(25),
}, { timestamps: false, charset: 'utf8mb4' });

const starguilds = db.define('starguilds', {
	guild: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
		unique: true,
	},
	limit: {
		type: Sequelize.INTEGER,
	},
	channel: {
		/* eslint-disable-next-line */
		type: Sequelize.STRING(25),
	},
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
})

db.sync();

const starboardCache = {};
const starguildCache = {};
const startierCache = {};

module.exports = {
	starboardCache,
	starguildCache,
	startierCache,

	getTiers: function (guild) {
		return starguildCache[guild].tiers;
	},

	setTier: async function (guild, limit, channel) {
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
	},

	removeTier: async function (guild, limit) {
		const existing = starguildCache[guild].tiers.findIndex(tier => (tier.limit === limit));
		if (existing === -1) return new Promise((resolve, reject) => {
			reject({error: 'This tier does not exist'});
		});
		starguildCache[guild].tiers.splice(existing, 1);
		return startiers.destroy({where: {
			guild: guild,
			limit: limit,
		}})
	},

	buildStarboardCache: async function (guildList) {
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
				starboardCache[p.guild].push({ message: p.message, starpost: p.starpost, starchannel: p.starchannel });
			});
			return count;
		});
	},

	addStarpost: async function (msg, starpost, starchannel) {
		let existing = starboardCache[msg.guild.id].find(starpost => starpost.message === msg.id);
		if (existing) {
			existing.starpost = starpost;
			existing.starchannel = starchannel;
		}
		else starboardCache[msg.guild.id].push({ message: msg.id, starpost: starpost, starchannel: starchannel });
		return starposts.upsert({
			guild: msg.guild.id,
			message: msg.id,
			starpost: starpost,
			starchannel: starchannel,
		});
	},

	isStarposted: function (msg) {
		return starboardCache[msg.guild.id].find(m => m.message === msg.id);
	},

	isStarpost: function (msg) {
		return starboardCache[msg.guild.id].find(m => m.starpost === msg.id);
	},

	setLimit: async function (msg, limit) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		starguildCache[msg.guild.id].limit = limit;
		return starguilds.upsert({
			guild: msg.guild.id,
			limit: limit,
		});
	},

	getLimit: function (msg) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		return starguildCache[msg.guild.id].limit;
	},

	getChannel: function (msg) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		return starguildCache[msg.guild.id].channel;
	},

	setChannel: function (msg, channel) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		starguildCache[msg.guild.id].channel = channel.id;
		return starguilds.upsert({
			guild: msg.guild.id,
			channel: channel.id,
		});
	},

	getStarpost: function (msg) {
		return starboardCache[msg.guild.id].find(m => m.message === msg.id).starpost;
	},

	enable: function (msg) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		starguildCache[msg.guild.id].enabled = true;
		return starguilds.upsert({
			guild: msg.guild.id,
			enabled: true,
		});
	},

	disable: function (msg) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		starguildCache[msg.guild.id].enabled = false;
		return starguilds.upsert({
			guild: msg.guild.id,
			enabled: false,
		});
	},

	isEnabled: function (msg) {
		starguildCache[msg.guild.id] = starguildCache[msg.guild.id] || {};
		return starguildCache[msg.guild.id].enabled;
	},
};
