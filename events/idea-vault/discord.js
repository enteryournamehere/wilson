const utils = require('./utils.js');

/**
 * Update the post embeds bulb counts
 * @param {Object} reaction Discord.js MessageReaction object
 * @param {Object} idea The inserted idea
 * @param {Object} post The Discord.js Message that was posted in a tier
 */
async function updatePostCount(reaction, idea, post) {
	if (!post) return;

	post.embeds[0].setFooter(
		utils.generatePostEmbedFooterText(idea.id, reaction.count, post, idea.tagged_channel),
		utils.IDEA_VOTE_EMOJI_IMAGE,
	);

	await post.edit({ embed: post.embeds[0] });
}

/**
 * Handle moving tiers or sending new posts if necessary
 * @param {Object} reaction Discord.js MessageReaction object
 * @param {Object} idea Inserted Idea
 * @param {Object} post Discord.js Message that was posted in a tier
 * @return {Object} The new post message, else undefined
 */
async function handleTiers(reaction, idea = {id: '[loading]'}, post = {}) {
	const tier = await utils.getTierForBulbCount(reaction.message.guild.id, reaction.count);

	if (!tier) {
		// New idea (can only happen on reaction add)
		if (idea.id === '[loading]') return console.log('{red}New idea did not reach first tier!');

		// Turn into reserved idea (can only happen on reaction remove)
		idea.post = idea.post_channel = utils.RESERVED_IDEA_POST_ID;
		idea.save();

		await post.delete();
		return undefined;
	}

	// Did not reach a different tier, do nothing
	if (idea.post_channel === tier.channel) return post;

	// Reached a different tier or its first tier
	let embed = null;
	if (post.embeds) {
		embed = post.embeds[0];
	} else {
		// New idea
		embed = await utils.generatePostEmbed(idea.id, reaction.message, reaction.count, [], reaction.message.channel.id);
	};

	const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: embed });

	// New idea
	if (idea.id !== '[loading]') {
		// Update the old idea
		idea.post = newPost.id;
		idea.post_channel = newPost.channel.id;
		await idea.save();
	}

	return newPost;
}

module.exports = {
	updatePostCount,
	handleTiers,
};
