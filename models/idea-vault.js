/* eslint-disable new-cap */
const Sequelize = require('sequelize');
const { db } = require('../utils/database.js');

/**
 * Main Idea table
 * @type {Sequelize.Model}
 */
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
	message_channel: Sequelize.STRING(25),
	post: {
		type: Sequelize.STRING(25),
	},
	post_channel: Sequelize.STRING(25),
	tagged_channel: Sequelize.STRING(25), // Defaults to the same as the post channel, but can be changed later
	airtable_updated: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
}, { timestamps: false, charset: 'utf8mb4' });

/**
 * Table to remember if the Idea Vault is enabled for a specific guild
 * @type {Sequelize.Model}
 */
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

/**
 * Table containing all channel tiers and their treshold
 * @type {Sequelize.Model}
 */
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

/**
 * Table containing comments on ideas made by the MMX Team
 * @type {Sequelize.Model}
 */
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

/**
 * Get an inserted Idea by its message ID
 * @param {string} msg_id - Idea message ID
 */
async function getIdeaByMsg(msg_id) {
	return ideas.findOne({
		where: {
			message: msg_id,
		},
	});
};

/**
 * Get an inserted Idea by its post message ID
 * @param {string} msg_id - Idea post ID
 */
async function getIdeaByPost(msg_id) {
	return backfillMissing(ideas.findOne({
		where: {
			post: msg_id,
		},
	}));
};

/**
 * Get an inserted Idea by its incremental ID
 * @param {number} id - Incremental ID of the Idea
 */
async function getIdeaByID(id) {
	return backfillMissing(ideas.findOne({
		where: {
			id: id,
		},
	}));
};

/**
 * Enable the Idea Vault for the specified guild
 * @param {string} guild_id - ID of the guild to enable the Idea Vault for
 */
function enable(guild_id) {
	return guilds.upsert({
		id: guild_id,
		enabled: true,
	});
};

/**
 * Disable the Idea Vault for the specified guild
 * @param {string} guild_id - ID of the guild to disable the Idea Vault for
 */
function disable(guild_id) {
	return guilds.upsert({
		id: guild_id,
		enabled: false,
	});
};

/**
 * Check if the Idea Vault is enabled
 * @param {string} guild_id - ID of the guild to check for
 * @returns {boolean} - If the Idea Vault is enabled
 */
function isEnabled(guild_id) {
	return guilds.findOne({
		attributes: ['enabled'],
		where: {
			id: guild_id,
		},
	}).then(result => {
		// Undefined evaluates to false. If it is undefined
		// we assume it's disabled, otherwise return the result.
		return result ? result.enabled : false
	});
};

/**
 * Get all tiers for the specified guild
 * @param {string} guild_id - Guild ID to get all tiers for
 * @returns {Array} An Array of tier objects
 */
async function getTiers(guild_id) {
	return tiers.findAll({
		where: {
			guild: guild_id,
		},
	});
};

/**
 * Set the treshold of a channel tier
 * @param {string} guild_id - Guild ID for the channel
 * @param {string} channel_id - ID of the channel to post to
 * @param {number} threshold - The treshold to put the tier at
 */
async function setTier(guild_id, channel_id, threshold) {
	return tiers.upsert({
		guild: guild_id,
		channel: channel_id,
		threshold: threshold,
	});
};

/**
 * Remove a tier from the Idea Vault
 * @param {string} channel_id - ID of the channel tier
 */
async function removeTier(channel_id) {
	return tiers.destroy({
		where: {
			channel: channel_id,
		},
	});
};

/**
 * Insert a new idea into the Idea Vault
 * @param {Object} msg - Discord.js message to insert as an idea
 * @param {Object} post - The idea post embed message
 */
function insertIdea(msg, post) {
	return ideas.create({
		guild: msg.guild.id,
		message: msg.id,
		message_channel: msg.channel.id,
		post: post.id,
		post_channel: post.channel.id,
		// Only idea vault categories are pre-tagged.
		tagged_channel: secure.ideaVaultUncategorizedChannels?.includes(msg.channel.id) ? null : msg.channel.id,
	});
};

/**
 * Upsert a comment on an idea
 * @param {number} id - Idea ID to comment on
 * @param {string} author_id - ID of the author of the comment
 * @param {string} value - Value of the comment, the content
 */
function upsertComment(id, author_id, value) {
	return comments.upsert({
		idea: id,
		author: author_id,
		value: value,
		visible: true,
	});
};

/**
 * Toggle the visibility of comments
 * @param {number} id - Idea ID
 * @param {string} author_id - ID of the comment's author
 */
function toggleCommentVisibility(id, author_id) {
	return comments.findOne({
		where: {
			idea: id,
			author: author_id
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

module.exports = {
	getIdeaByMsg,
	getIdeaByPost,
	getIdeaByID,
	enable,
	disable,
	isEnabled,
	getTiers,
	setTier,
	removeTier,
	insertIdea,
	upsertComment,
	toggleCommentVisibility
}
