// how many identical messages must be sent in a row for Wilson to take action
const MESSAGES_TO_CACHE = 3;
// how long messages should be remembered at least (it will take between 1x and 2x this duration before they are removed from memory)
const PURGE_INTERVAL_MINUTES = 3;
// this gets sent to the user whose messages have been detected as spam
const MESSAGE_TO_USER = `As a spam prevention measure, you've been muted for sending the exact same message ${MESSAGES_TO_CACHE} times in a row. Please contact a moderator to be un-muted.`;
// messages in these channels are ignored
const IGNORED_CHANNELS = [
	'649186872026988557', // #botspam
	'649186919317504012', // #random
];
// only check messages in these guilds
const ACTIVE_GUILDS = [
	'649165975647682560', // Wintergatan
];
const REPORT_CHANNEL = '709405505990426624'; // #staff-botspam
const MUTED_ROLE = '710120710084755477'; // Muted


const recentlyPosted = {
	/* 'userid': [ recent messages, queue with length MESSAGES_TO_CACHE ] */
};

module.exports = async message => {
	if (message.author.bot || IGNORED_CHANNELS.includes(message.channel.id) ||
                           !ACTIVE_GUILDS.includes(message.guild.id)) {
		return;
	}

	// initialize message cache for user
	if (!(message.author.id in recentlyPosted)) {
		recentlyPosted[message.author.id] = [];
	}

	// push message to queue
	recentlyPosted[message.author.id].push(message);

	// remove oldest item from queue if over max length
	if (recentlyPosted[message.author.id].length > MESSAGES_TO_CACHE) {
		recentlyPosted[message.author.id].shift();
	}

	// check if all 3 messages are equal and are NOT stickers/attachments without message content
	if (mightContainLink(message) && recentlyPosted[message.author.id].filter(stored => messagesEqual(message, stored)).length == MESSAGES_TO_CACHE) {
		// delete the recent messages
		for (const stored of recentlyPosted[message.author.id]) {
			stored.delete().catch(console.error);
		}

		// Give member muted role
		message.member.roles.add(MUTED_ROLE).catch(console.error);

		// Report in #staff-botspam
		message.guild.channels.resolve(REPORT_CHANNEL).send?.(`<@${message.author.id}> sent the same message ${MESSAGES_TO_CACHE}x in a row, in ` +
        `${recentlyPosted[message.author.id].map(m => m.channel.toString()).join(', ')}, content:\n\`\`\`\n${message.content}\n\`\`\``).catch(console.error);

		// tell user they've been muted (try via dm, fall back to channel)
		message.author.send(MESSAGE_TO_USER).catch(e => {
			if (e.code == 50007) {
				message.reply(MESSAGE_TO_USER);
			}
		});
	}
};

function messagesEqual(a, b) {
	// ignore stickers and attachment uploads without content
	return a.content == b.content && a.content.length > 0;
}

function mightContainLink(message) {
	return message.content.includes('.');
}

// periodically clear out old messages
setInterval(function() {
	const currentTime = new Date().getTime();
	for (const key in recentlyPosted) {
		if (!recentlyPosted.hasOwnProperty(key)) continue;

		// remove old enough items from the queue
		while (recentlyPosted[key][0]?.createdTimestamp < currentTime - 1000 * 60 * PURGE_INTERVAL_MINUTES) {
			recentlyPosted[key].shift();
		}
		// delete message cache entry for user if empty
		if (recentlyPosted[key].length == 0) {
			delete recentlyPosted[key];
		}
	}
}, 1000 * 60 * PURGE_INTERVAL_MINUTES);
