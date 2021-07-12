const Commando = require('discord.js-commando');
const secure = require('../secure.json');

const Wilson = new Commando.Client({
	owner: secure.owners,
	commandPrefix: secure.prefix,
	unknownCommandResponse: false,
	disableEveryone: true,
	messageCacheMaxSize: 50,
	disabledEvents: ['TYPING_START'],
	partials: ['MESSAGE', 'REACTION'],
	ws: { intents: [
		'GUILDS',
		'GUILD_MEMBERS',
		'GUILD_BANS',
		'GUILD_EMOJIS',
		'GUILD_MESSAGES',
		'GUILD_MESSAGE_REACTIONS',
		'GUILD_INTEGRATIONS',
		'GUILD_INVITES',
		'DIRECT_MESSAGES',
		'DIRECT_MESSAGE_REACTIONS',
	] },
});

async function findMessageChannel(guildId, messageId) {
	const allChannels = Wilson.guilds.cache.get(guildId).channels.cache.array();
	for (const channel of allChannels) {
		try {
			await channel.messages.fetch(messageId);
			return channel;
		} catch (err) {}
	}
}

module.exports = { Wilson, findMessageChannel };
