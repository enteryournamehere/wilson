/* eslint-disable new-cap */
const Sequelize = require('sequelize');
const { db } = require('../utils/database.js');

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

		where: {
		},
	});
};

async function getIdeaByPost(msg) {
	return backfillMissing(ideas.findOne({
		where: {
			post: msg,
		},
	}));
};

async function getIdeaByID(id) {
	return backfillMissing(ideas.findOne({
		where: {
			id: id,
		},
	}));
};

	return guilds.upsert({
		enabled: true,
	});
};

	return guilds.upsert({
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

		},
	});
};

const airtableSynchronizingPending = {}; // For retry logic, we will not retry currently pending updates.
async function synchronizeAirtableIdea({ idea, msg, post, reactionCount }) {
	if (!idea && post) idea = await getIdeaByPost(post.id);
	if (!idea && msg) idea = await getIdeaByMsg(msg.id);

	if (idea.id in airtableSynchronizingPending && airtableSynchronizingPending[idea.id]) return;
	airtableSynchronizingPending[idea.id] = true;

	try {
		if (!msg) msg = await Wilson
			.guilds.cache.get(idea.guild)
			.channels.cache.get(idea.message_channel)
			.messages.fetch(idea.message);
	} catch (ex) { return; }

	const embedThumbnails = msg.embeds?.map((e) => e.thumbnail?.url).filter(Boolean) || [];
	const attachments = msg.attachments?.map((m) => m.url).filter(Boolean) || [];

	await upsertAirtableIdea({
		ideaNumber: idea.id,
		bulbCount: reactionCount || await getReactionCount(msg),
		postDateTime: msg.createdAt,
		postedBy: msg.author?.username,
		postedById: msg.author?.id,
		postText: msg.content,
		postImageUrls: [...embedThumbnails, ...attachments],
		originalMessageLink: msg.url,
		initialIssueCategory: secure.ideaVaultUncategorizedChannels?.includes(msg.channel.id) ? null : msg.channel.name,
	});
};




		}
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
