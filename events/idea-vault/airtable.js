const utils = require('./utils.js');
const secure = require('../../secure.json');
const airTable = require('../../utils/airtable');

// Lockkeeper singleton
const locks = new (require('../../utils/lockkeeper'))();

async function synchronize(idea, options) {
	idea.airtable_updated = false;
	idea.save();

	const lock = locks.get(idea.id) || locks.create(
		idea.id, async (...args) => {
			await airTable.upsertAirtableIdea(...args);
			idea.airtable_updated = true;
			idea.save();
		}, utils.AIRTABLE_RETRY_DELAY);

	// Will handle retrying and similar
	await lock.call(options);
}

async function synchronizeReaction(idea, reaction) {
	// Shortcut
	const message = reaction.message;

	const issueCategory = secure.ideaVaultUncategorizedChannels?.includes(message.channel.id) ?
		null : message.channel.name;

	return await synchronize(idea, {
		ideaNumber: idea.id,
		bulbCount: reaction.count,
		postDateTime: message.createdAt,
		postedBy: message.author?.username,
		postedById: message.author?.id,
		postText: message.content,
		postImageUrls: message.attachments?.map(m => m.url),
		originalMessageLink: message.url,
		initialIssueCategory: issueCategory,
	});
}

async function synchronizeContent(idea, content) {
	return await synchronize(idea, {
		ideaNumber: idea.id,
		postText: content,
	});
}

module.exports = {
	synchronize,
	synchronizeReaction,
	synchronizeContent,
};
