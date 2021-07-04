const ideaVault = require('../../models/idea-vault');
const { renameIssueCategory, airtableGetIdeasAndCategories } = require('../../utils/airtable');
const { synchronize, synchronizeReaction, synchronizeContent } = require('./airtable');
const { updatePostCount, handleTiers } = require('./discord');
const utils = require('./utils');
const secure = require('../../secure.json');

async function messageReactionAdd(reaction, _user) {
	// This also fetches the reaction for us
	if (!await utils.filterReaction(reaction)) return;

	// We prefer to pass undefined rather than null because undefined turns into the function's default.
	let idea = await ideaVault.getIdeaByMsg(reaction.message.id) || undefined;
	// If there's an idea inserted and it is not a reserved idea
	let post = idea && idea.post !== utils.RESERVED_IDEA_POST_ID ?
		await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post) :
		undefined;

	// Handle moving tiers and override the post variable with a potential new post,
	// the old post will be returned if nothing was done.
	post = await handleTiers(reaction, idea || undefined, post);

	// Insert the new idea with its post
	if (!idea) {
		idea = await ideaVault.insertIdea(reaction.message, post);
	}

	// Edit the post
	await updatePostCount(reaction, idea, post);

	// Synchronize with airtable
	await synchronizeReaction(idea, reaction);
}

async function messageReactionRemove(reaction, _user) {
	// This also fetches the reaction for us
	if (!await utils.filterReaction(reaction)) return;

	const idea = await ideaVault.getIdeaByMsg(reaction.message.id);
	let post = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);

	// Handle moving tiers and override the post variable with a potential new post,
	// the old post will be returned if nothing was done.
	post = await handleTiers(reaction, idea, post);

	// Edit the post, if post is undefined (handleTiers removed it and returned undefined) it will do nothing
	await updatePostCount(reaction, idea, post);

	// Synchronize with airtable
	await synchronizeReaction(idea, reaction);
}

async function updateIdeaCategory(message, channel) {
	// Rebuild the footer, this trick means we don't need to fetch the reaction count
	const infos = message.embeds[0].footer.split('|');
	infos[2] = ` Category: ${channel.name}`;

	message.embeds[0].setFooter(infos.join('|'), utils.IDEA_VOTE_EMOJI_IMAGE);

	await message.edit({ embed: message.embeds[0] });
}

async function channelUpdate(oldChannel, newChannel) {
	// We only care if the channel name changed
	if (oldChannel.name == newChannel.name) return;

	const channel = newChannel.guild.channels.cache.get(secure.ideaVaultOrganizersChannel);
	await channel.send(`{red}${oldChannel.name} has been renamed to ${newChannel.name}, beginning migrations.`);

	// Rename in airtable
	renameIssueCategory({ oldName: oldChannel.name, newName: newChannel.name }).error(async (err) => {
		await channel.send(
			`{red}An error occured trying to rename ${oldChannel.name} to ${newChannel.name} on Airtable. ` +
			`This will have to be done manually by someone else.`,
		);
	});

	// We need to change the embeds of all ideas
	const existingIdeas = await ideaVault.getIdeasByTaggedChannel(newChannel.id);

	for (const idea of existingIdeas) {
		const post = newChannel.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);

		await updateIdeaCategory(post, newChannel);

		// Sleep as to not get globally ratelimited.
		await new Promise(resolve => setTimeout(resolve, utils.RATE_LIMIT_SLOWDOWN_DELAY));
	}
}

async function synchronizeAirtableCategorization(bot) {
	const categorizations = await airtableGetIdeasAndCategories();
	const ideas = await ideaVault.getAllIdeas();

	for (const idea of ideas) {
		const channel = bot.guilds.cache.get(idea.guild).channels.cache.find((ch) => ch.name == categorizations[idea.id]);
		if (channel && channel.id !== idea.tagged_channel) {
			// Update the categorization and post embed
			idea.tagged_channel = channel.id;
			idea.save();

			const post = await bot.guilds.cache.get(idea.guild).channels.cache.get(idea.post_channel).messages.fetch(idea.post);
			await updateIdeaCategory(post, channel);
		} else if (!channel) {
			console.log(`{red}Couldn't find channel ${categorizations[idea.id]} for Idea #${idea.id}!`);
		}
	}
	// Start over
	setTimeout(synchronizeAirtableCategorization, utils.AIRTABLE_SYNC_CATEGORIES_INTERVAL, bot);
}

// This is a so-called function factory, it allows us to use Wilson in the ready
function readyFactory(bot) {
	async function ready() {
		const unsyncedIdeas = await ideaVault.getUnsyncedIdeas();

		if (unsyncedIdeas) {  // Synchronize ideas that failed to update on Airtable
			console.log('Picking up idea synchronization where we left of.');
			for (const idea of unsyncedIdeas) {
				// Fetch the message and reaction, then synchronize with it
				const msg = await bot.guilds.cache.get(idea.guild).channels.cache.get(idea.message_channel).messages.fetch(idea.message);
				if (!msg) {
					console.log(`Idea #${idea.id}'s message wasn't found!`);
					continue;
				}

				const reaction = msg.reactions.cache.get(utils.IDEA_VOTE_EMOJI);
				await synchronizeReaction(idea, reaction);
			}
		}

		console.log('Starting synchronization loop with Airtable.');
		// Start continuously synchronize categorizations done in Airtable
		await synchronizeAirtableCategorization(bot);
	}
	// Return the function we created (that has access to our bot parameter)
	return ready;
}

async function messageUpdate(_oldMessage, message) {
	if (!ideaVault.isEnabled(message.guild.id)) return;

	// If the category, or the specific channel is not allowed
	if (!ideaVault.isAllowed(message.channel.parent?.id) &&
		!ideaVault.isAllowed(message.channel.id)) return;

	const idea = await ideaVault.getIdeaByMsg(message.id);
	if (!idea) return;

	await synchronizeContent(idea, message.content);

	const post = await message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
	if (!post) return console.log(`Could not fetch post for idea #${idea.id} to update the message!`);

	post.embeds[0].description = message.content;
	await post.edit({ embeds: post.embeds });
}

module.exports = {
	channelUpdate,
	messageReactionAdd,
	messageReactionRemove,
	readyFactory,
	messageUpdate,
};
