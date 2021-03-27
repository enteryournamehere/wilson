const { underscoredIf } = require('sequelize/types/lib/utils');
const ideaVault = require('../../models/idea-vault.js');
const utils = require('./utils.js');

async function updatePostCount(reaction, post) {
	return 0;
}

/**
 * Handle tiers and moving if needed
 * @param {Object} reaction - Discord.js MessageReaction object
 * @param {Object} idea - Inserted Idea
 * @param {Object} post - Discord.js Message that was posted in a tier
 * @return {Object} - The new post message, else undefined
 */
async function handleTiers(reaction, idea = {id: '[loading]'}, post = {}) {
	const tier = ideaVault.getTiers(reaction.message.guild.id)
		.sort((a, b) => b.threshold - a.threshold)  // Ascending
		.find(tier => reaction.count >= tier.threshold);

	if (!tier) {
		if (idea.id === '[loading]') return console.log('New idea did not reach first tier!');

		idea.post = idea.post_channel = utils.RESERVED_IDEA_POST_ID;
		idea.save();

		await post.delete();
		return undefined;
	}

	// Did not reach a new tier, do nothing
	if (idea.post_channel === tier.channel) return undefined;

	let embed = null;
	if (post.embeds) {
		embed = post.embeds[0];
	} else {
		// New idea
		embed = utils.generatePostEmbed(idea.id, reaction.message, reaction.count, [], reaction.message.channel.id);
	};

	const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: embed });

	idea.post = newPost.id;
	idea.post_channel = newPost.channel.id;
	await idea.save();
	return newPost;
}

module.exports = {
	updatePostCount,
	handleTiers,
};
