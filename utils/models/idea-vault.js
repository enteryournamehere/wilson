/* eslint-disable new-cap */
const Sequelize = require('sequelize');
const { db } = require('../database.js');
const { upsertAirtableIdea, renameIssueCategory, airtableGetIdeasAndCategories } = require('../airtable');
const { Wilson, findMessageChannel } = require('../wilson');
const secure = require('../../secure.json');
const { MessageEmbed } = require('discord.js');

const RESERVED_IDEA_POST_ID = '0';
const IDEA_VOTE_EMOJI = '💡';
const IDEA_VOTE_EMOJI_IMAGE = 'https://emojipedia-us.s3.dualstack.us-west-1.amazonaws.com/thumbs/120/twitter/248/light-bulb_1f4a1.png';
const RATE_LIMIT_SLOWDOWN_DELAY = 1000;
const AIRTABLE_RETRY_DELAY = 1000 * 5;
const AIRTABLE_SYNC_CATEGORIES_INTERVAL = 1000 * 60 * 30;

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

async function getTiers(guild) {
	return tiers.findAll({
		where: {
			guild: guild,
		},
	});
};

async function getTierForBulbCount(guild, count) {
	const tiers = await getTiers(guild);
	return tiers.sort((a, b) => b.threshold - a.threshold).find((tier) => count >= tier.threshold);
}

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

function insertIdea(msg, post) {
	return ideas.create({
		guild: msg.guild.id,
		message: msg.id,
		message_channel: msg.channel.id,
		post: post.id,
		post_channel: post.channel.id,
		// Only idea vault categories are pre-tagged.
		tagged_channel: secure.ideaVaultUncategorizedChannels.includes(msg.channel.id) ? null : msg.channel.id,
	});
};

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

async function getReactionCount(message, refresh) {
  const updatedMessage = refresh ? await message.channel.messages.fetch(message.id) : message;
  return updatedMessage.reactions.cache.filter(a => a.emoji.name == IDEA_VOTE_EMOJI).map(reaction => reaction.count)[0] || 0;
}

async function findMessageChannelFromIdeaPost(idea) {
	// Kind of a hack, this message will try to find the message link -> channel ID from the actual post content.
	// (The only other option seems to be checking every channel, which is definitely a worse option.)
	if (!idea.post_channel || idea.post_channel === RESERVED_IDEA_POST_ID) return null;

  try {
    const post = await Wilson
                    .guilds.cache.get(idea.guild)
                    .channels.cache.get(idea.post_channel)
                    .messages.fetch(idea.post);

    const originalMessage = post.embeds[0].fields.filter((f) => f.name === 'Original message')[0]?.value || null;
    if (!originalMessage) return null;

    return originalMessage.match(/discord.com\/channels\/\w+\/(\w+)\//)[1] || null;
  } catch (ex) { return null; } // Idea vault post is missing
}

async function backfillMissing(query, afterUpdate) {
	const result = await query;
	if (result && result.message) {
		let discordRequest = false;
		if (!result.message_channel) {
			changes = true;
			discordRequest = true;
			console.log(`Looking for missing channel information for idea #${result.id}`);
			// Try to find channel from Original Post link in embed
			result.message_channel = await findMessageChannelFromIdeaPost(result);

			// Fallback, search all channels.
			if (!result.message_channel) result.message_channel = (await findMessageChannel(result.guild, result.message)).id;

      if (!result.tagged_channel && !secure.ideaVaultUncategorizedChannels.includes(result.message_channel)) {
        result.tagged_channel = result.message_channel;
      }
			await result.save();
			afterUpdate && await afterUpdate(result, discordRequest);
		}
	}
	return result;
}

async function getIdeaByMsg(msg) {
	return backfillMissing(ideas.findOne({
		where: {
			message: msg,
		},
	}));
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

function generatePostEmbedFooterText(id, count, msg, tagged_channel) {
	if (!tagged_channel) return `${count} | Idea #${id} | Uncategorized`;

	// Unfortunately we cannot do tags in embeds, so we have to look up the channel name.
	const channelName = msg.guild
										.channels.cache.get(tagged_channel)
										.name;
	return `${count} | Idea #${id} | Category: ${channelName}`;
}

async function generatePostEmbed(id, msg, count, comments = [], tagged_channel) {
	const embed = new MessageEmbed({
		author: {
			name: `${msg.author.username} in #${msg.channel.name}`,
			icon_url: msg.author.avatarURL(),
		},
		description: msg.content,
		footer: {
			icon_url: IDEA_VOTE_EMOJI_IMAGE,
			text: generatePostEmbedFooterText(id, count, msg, tagged_channel),
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

	await upsertAirtableIdea({
		ideaNumber: idea.id,
		bulbCount: reactionCount || await getReactionCount(msg),
		postDateTime: msg.createdAt,
		postedBy: msg.author?.username,
    postedById: msg.author?.id,
		postText: msg.content,
		postImageUrls: msg.attachments?.map((m) => m.url),
		originalMessageLink: msg.url,
		initialIssueCategory: secure.ideaVaultUncategorizedChannels.includes(msg.channel.id) ? null : msg.channel.name,
	});

	airtableSynchronizingPending[idea.id] = false;

	idea.airtable_updated = true;
	await idea.save();
}

async function synchronizeAirtableIdeaWithRetry(args) {
	try {
		await synchronizeAirtableIdea(args);
	} catch (err) {
		console.error(`Retrying failed Airtable sync with error: ${err}`);
		setTimeout(() => synchronizeAirtableIdeaWithRetry(args), AIRTABLE_RETRY_DELAY);
	}
}

async function refreshPosts({ idea, post, msg }) {
	if (!idea && post) idea = await getIdeaByPost(post.id);
	if (!idea && msg) idea = await getIdeaByMsg(msg.id);

  try {
    if (!msg) msg = await Wilson
                      .guilds.cache.get(idea.guild)
                      ?.channels.cache.get(idea.message_channel)
                      ?.messages.fetch(idea.message);

    if (!post) post = await Wilson
                      .guilds.cache.get(idea.guild)
                      ?.channels.cache.get(idea.post_channel)
                      ?.messages.fetch(idea.post);
  } catch { return null; }

  if (!post || !post.embeds || post.embeds.length === 0 || !post.embeds[0]) return null;

	post.embeds[0].setFooter(
		generatePostEmbedFooterText(idea.id, await getReactionCount(msg), post, idea.tagged_channel),
		IDEA_VOTE_EMOJI_IMAGE
	);
	await post.edit({ embed: post.embeds[0] });
}

async function channelUpdate(oldChannel, newChannel) {
	if (oldChannel.name === newChannel.name) return;

	const existingIdeas = await ideas.findAll({ where: { tagged_channel: oldChannel.id } });
	if (existingIdeas.length === 0) return;

	try {
		await renameIssueCategory({ oldName: oldChannel.name, newName: newChannel.name });
	} catch(err) {
		await oldChannel.guild.channels.cache.get(secure.ideaVaultOrganizersChannel)
			.send(
				`An error occurred renaming ${oldChannel.name} to ${newChannel.name} on Airtable.`
				+ ` Someone will need to fix it manually.`
			);
	}

	await oldChannel.guild.channels.cache.get(secure.ideaVaultOrganizersChannel)
			.send(
        `\`${oldChannel.name}\` was renamed to <#${newChannel.id}>. I updated the Airtable entries, but I am not able`
        + ` to remove \`${oldChannel.name}\` from the "Issue Category" drop-down options.\nCan someone please`
        + ` **remove \`${oldChannel.name}\` from the "Issue Category" dropdown options in Airtable?**`
      );

	// Slowly update all the existing posts on a background thread. We could do this faster, but it would constantly
	// trigger rate limits, which would prevent the rest of the bot from working until it completes.
	(async () => {
		for (const idea of existingIdeas) {
			await refreshPosts({ idea });
			await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_SLOWDOWN_DELAY));
		}
	})();
}

async function updatePostTaggedChannel(idea, newChannel) {
	idea.tagged_channel = newChannel?.id || null;
	await idea.save();
	refreshPosts({ idea });
}

async function messageReactionAdd(reaction, user) {
	if (reaction.emoji.name !== IDEA_VOTE_EMOJI) return;

	await reaction.fetch();
  const reactionCount = await getReactionCount(reaction.message, true);
	if (!isEnabled(reaction.message.guild.id)) return;

	// Only allow reactions to posts in the ideaVaultCategory channels. TODO: Make channel configurable per guild
	if (!reaction.message.channel.parent || !(
		reaction.message.channel.parent.id === secure.ideaVaultCategory
		|| secure.ideaVaultUncategorizedChannels.includes(reaction.message.channel.id)
	)) return;

	// If people are reacting to a post in the idea vault, instead of the original message, the reaction will not be
	// tracked. TODO(@tylermenezes): it would be nice if we tracked these but deduped with original reactions. Looking
	// through the idea vault, it appears people think this is how it works already. Would need to track all reaction
	// authors in the DB for this to be efficient.
	if (await getIdeaByPost(reaction.message.id)) return;

	// TODO(@tylermenezes): once support for cross-posting to topic channels is added, we will need to check if they
	// are reacting to a topic channel cross-post here

	const tier = await getTierForBulbCount(reaction.message.guild.id, reactionCount);
	if (!tier) return;

	let idea = await getIdeaByMsg(reaction.message.id);
	const post = idea && idea.post !== RESERVED_IDEA_POST_ID
		? await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post)
		: await reaction.message.guild.channels.cache.get(tier.channel).send(
			{ embed: await generatePostEmbed('[loading]', reaction.message, reactionCount, [], reaction.message.channel.id) },
		);

	if (!idea) idea = await insertIdea(reaction.message, post);
	else if (idea.post === RESERVED_IDEA_POST_ID) { // Reserved idea, update post
		idea.post = post.id;
		idea.post_channel = post.channel.id;
	};

	idea.airtable_updated = false;
	await idea.save();
	synchronizeAirtableIdeaWithRetry({ idea, msg: reaction.message, post, reactionCount: reactionCount });
  post.embeds[0].setFooter(
    generatePostEmbedFooterText(idea.id, reactionCount, post, idea.tagged_channel),
    IDEA_VOTE_EMOJI_IMAGE
  );

	if (idea.post_channel !== tier.channel) { // We have reached a new tier, we need to move the message.
		const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: post.embeds[0] });
		idea.post = newPost.id;
		idea.post_channel = newPost.channel.id;
		await idea.save();
		await post.delete();
	} else { // Edit reaction count
		await post.edit({ embed: post.embeds[0] });
	}
};

async function messageReactionRemove(reaction, user) {
	if (reaction.emoji.name !== IDEA_VOTE_EMOJI) return;

	await reaction.fetch();
  const reactionCount = await getReactionCount(reaction.message, true);
	if (!isEnabled(reaction.message.guild.id)) return;
	// TODO: Make channel configurable per guild
	if (!reaction.message.channel.parent || !(
		reaction.message.channel.parent.id === secure.ideaVaultCategory
		|| secure.ideaVaultUncategorizedChannels.includes(reaction.message.channel.id)
	)) return;

	const idea = await getIdeaByMsg(reaction.message.id);
	if (!idea) return;

	const post = await reaction.message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
	if (!post) return;

	idea.airtable_updated = false;
	await idea.save();
	synchronizeAirtableIdeaWithRetry({ idea, msg: reaction.message, post, reactionCount: reactionCount });
	post.embeds[0].setFooter(
		generatePostEmbedFooterText(idea.id, reactionCount, post, idea.tagged_channel),
		IDEA_VOTE_EMOJI_IMAGE
	);

	const tier = await getTierForBulbCount(reaction.message.guild.id, reactionCount);
	if (!tier) { // Idea has fallen off the tiers and the post will be removed, but the Idea # will be "reserved".
		idea.post = RESERVED_IDEA_POST_ID;
		idea.post_channel = RESERVED_IDEA_POST_ID;
		idea.save();
		await post.delete();
	} else if (idea.post_channel !== tier.channel) { // Idea moves down a tier.
		const newPost = await reaction.message.guild.channels.cache.get(tier.channel).send({ embed: post.embeds[0] });
		idea.post = newPost.id;
		idea.post_channel = newPost.channel.id;
		await idea.save();
		await post.delete();
	} else { // Update reaction count.
		await post.edit({ embed: post.embeds[0] });
	};
}

async function messageUpdate(oldMessage, message) {
	if (!isEnabled(message.guild.id)) return;
	// TODO: Make channel configurable per guild
	if (!message.channel.parent || !(
		message.channel.parent.id === secure.ideaVaultCategory
		|| secure.ideaVaultUncategorizedChannels.includes(message.channel.id)
	)) return;

	const idea = await getIdeaByMsg(message.id);
	if (!idea) return;

	const post = await message.guild.channels.cache.get(idea.post_channel).messages.fetch(idea.post);
	if (!post) return;

	idea.airtable_updated = false;
	await idea.save();
	synchronizeAirtableIdeaWithRetry({ idea, msg: message, post });

  post.embeds[0].description = message.content;
  await post.edit({ embed: post.embeds[0] });
}

async function ready() {
	const airtableSync = async () => {
		console.log('Beginning Airtable sync');
		const airtableTruth = await airtableGetIdeasAndCategories();
		const serverTruth = await ideas.findAll();

		for (const maybeIdea of serverTruth) {
      try {
        // Historical posts will be missing channel information which needs to be fetched.
        const idea = await backfillMissing(maybeIdea, async (result) => {
          await refreshPosts({ idea: result });
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_SLOWDOWN_DELAY));
        });

        // Check if the DB has information which needs to be saved to Airtable.
        if (!(idea.id in airtableTruth) || !idea.airtable_updated) {
          try {
            await synchronizeAirtableIdea({ idea });
          }
          catch (e) {
            console.log(`Error when syncronizing idea ${idea.id}:`, e);
          }
        } else {
          // Check if the Airtable channel ID has changed
          const airtableChannelName = airtableTruth[idea.id];
          const airtableChannel = Wilson.guilds.cache.get(idea.guild).channels.cache.find((ch) => ch.name == airtableChannelName);
          if (airtableChannelName && !airtableChannel) {
            console.error(`Airtable had invalid channel name ${airtableChannelName} for idea #${idea.id}.`);
            if (idea.tagged_channel) await updatePostTaggedChannel(idea, airtableChannel);
          } else if (!airtableChannelName || (airtableChannel?.id !== idea.tagged_channel)) {
            await updatePostTaggedChannel(idea, airtableChannel);
          }
        }
      } catch (err) { console.error('Airtable sync - ', err); }
		}

		console.log('Sync done');
		setTimeout(airtableSync, AIRTABLE_SYNC_CATEGORIES_INTERVAL);
	};

	airtableSync(); // Start sync.
}

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
	ready,
	updatePostTaggedChannel,
	channelUpdate,
	messageReactionAdd,
	messageReactionRemove,
  messageUpdate,
};
