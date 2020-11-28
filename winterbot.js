const secure = require('./secure.json');
const Commando = require('discord.js-commando');
const path = require('path');
const SequelizeProvider = require('./utils/Sequelize');
const database = require('./database.js');
const updates = require('./utils/models/updates.js');
const ideaVault = require('./utils/models/idea-vault.js');
const { MessageEmbed } = require('discord.js');
const translation = require('./utils/translation.js');

const updatesConfig = {
	guild: secure.updateguild,
	roles: secure.roles,
	webhooks: secure.webhooks,
};

const Winterbot = new Commando.Client({
	owner: secure.owners,
	commandPrefix: secure.prefix,
	unknownCommandResponse: false,
	disableEveryone: true,
	messageCacheMaxSize: 50,
	disabledEvents: ['TYPING_START'],
	partials: ['MESSAGE', 'REACTION']
});

Winterbot.dispatcher.addInhibitor(msg => {
	if (msg.webhookID) return 'nope';
	return false;
});

const Webhook = require('./webhook.js');
const twitterWebhook = new Webhook(updatesConfig.webhooks.twitter);
const youtubeWebhook = new Webhook(updatesConfig.webhooks.youtube);

database.start();

Winterbot.setProvider(new SequelizeProvider(database.db)).catch(console.error);

Winterbot.registry
	.registerGroups([
		['fun', 'Fun commands'],
		['search', 'Search commands'],
		['config', 'Config commands'],
		['mod', 'Mod commands'],
		['owner', 'Owner commands'],
		['ideavault', 'Idea vault commands'],
		// ['music', 'music commands'],
	])
	.registerDefaultTypes()
	.registerDefaultGroups()
	.registerDefaultCommands({
		ping: false,
		prefix: false,
		unknownCommand: false,
	})
	.registerCommandsIn(path.join(__dirname, 'commands'));

function twitter2Fetch() {
	Winterbot.fetches.twitter.last = Date.now();
	require('./twitter2.js').fetch().then((x) => {
		if (!x.new) return;
		twitterWebhook.send(`<@&${updatesConfig.roles.twitter}>`, x.embed).catch(() => { }).then(() => {
			updates.addUpdate(
				'twitter',
				x.postid,
				x.time,
			);
		});
	}).catch(e => console.log(e)).then(() => {
		setTimeout(twitter2Fetch, 10 * 60 * 1000);
	});
}


function youtube2Fetch() {
	Winterbot.fetches.youtube.last = Date.now();
	require('./youtube2.js').fetch().then((x) => {
		if (!x.new) return;
		youtubeWebhook.send(`<@&${updatesConfig.roles.youtube}>`, x.embed).catch(() => { }).then(() => {
			updates.addUpdate(
				'youtube',
				x.postid,
				x.time,
			);
		});
	}).catch(e => console.log(e)).then(() => {
		setTimeout(youtube2Fetch, 5 * 60 * 1000);
	});
}

Winterbot.fetches = {
	youtube: {
		run: youtube2Fetch,
		last: 0,
	},
	twitter: {
		run: twitter2Fetch,
		last: 0,
	},
};

Winterbot.on('ready', () => {
	Winterbot.dmManager = new (require('./utils/classes/DmManager.js'))(Winterbot);

	console.log(`{green}Ready!`);
});

Winterbot.once('ready', () => {
	if (secure.fetches.youtube) Winterbot.fetches.youtube.run();
	if (secure.fetches.twitter) Winterbot.fetches.twitter.run();
})

Winterbot.on('message', (msg) => {
	if (!msg.author) return;
	if (!msg.content.match(/https?:\/\//)) return;
	msg.guild.members.fetch(msg.author).then((member) => {
		const beenHereMinutes = (Date.now() - member.joinedTimestamp) / 1000 / 60;
		if (beenHereMinutes < 10) {
			msg.reply('To prevent spam and bots, please wait 10 minutes before sending links');
			msg.delete();
		}
	});
});

// subscribe the idea vault's events
Winterbot.on('messageReactionAdd', ideaVault.messageReactionAdd);

Winterbot.on('messageReactionRemove', ideaVault.messageReactionRemove);

function createTranslateEmbed(msg, language) {
	const embed = new MessageEmbed({
		description: '[Original message](' + msg.url + ') ' + language
	});
	embed.setColor(msg.member.displayColor || 16777215);
	return embed;
}

/**
 * guild ids for role transfers
 */
const oldGuildId = '413366614747250708';
const newGuildId = '649165975647682560';

/**
 * @typedef {String} oldRoleId
 * @typedef {String} newRoleId
 */

/**
 * map for role transfers from old server member to new server
 * @type {Map<oldRoleId, newRoleId>}
 */
const roleMap = new Map();

roleMap.set('413371714827714560', '649189528958926887');    // admin
roleMap.set('413371743416352768', '649189529231556609');    // moderator
roleMap.set('453171669004058625', '650660087731585111');    // youtube
roleMap.set('609714412554682378', '650660149857615873');    // twitch
roleMap.set('453171752667709441', '650660135894646804');    // twitter
roleMap.set('465044582569082881', '708972931430088715');    // community
roleMap.set('465043327201443841', '708988136398651482');    // minecraft
roleMap.set('418726756501946368', '650707449610895362');    // artist
roleMap.set('418683780476174336', '651548732696821776');    // craftsman
roleMap.set('418683680567853056', '651548761092259891');    // developer
roleMap.set('418683762797314058', '651548957322903553');    // engineer
roleMap.set('418718491781365761', '651548806533349426');    // gamer
roleMap.set('418683641850232833', '651548778746216448');    // GFX designer
roleMap.set('418726789444272129', '651548709527617557');    // musician
roleMap.set('694608130629435432', '709469819874836541');    // john

Winterbot.on('guildMemberAdd', member => {
    /**
     * transfer roles from old server member to new server member
     */
	if (member.guild.id != newGuildId) return;  // if join is not in new server, return
	let oldMember = Winterbot.guilds.resolve(oldGuildId).members.resolve(member.id);
	if (!oldMember) return; // if user is not in old server, return
	oldMember.roles.cache.forEach((v, k) => {
		let newId = roleMap.get(k);
		if (newId) member.roles.add(newId); // if role is in map, add role
	});
});

const mmxTeamRoleId = '650660016755310592';
const ccAgreedRoleId = '709386821850759178';
const mmxTeamCcAgreedRoleId = '709406460450177094';

Winterbot.on('guildMemberUpdate', (oldMember, newMember) => {
	// if the roles have changed, do stuff
	if (oldMember.roles.cache.keys() != newMember.roles.cache.keys()) {
		let roles = newMember.roles.cache.keyArray(); // get updated roles
		// if member has both roles and not the combined role, add combined role
		if (roles.includes(mmxTeamRoleId) && roles.includes(ccAgreedRoleId) && !roles.includes(mmxTeamCcAgreedRoleId))
			newMember.roles.add(mmxTeamCcAgreedRoleId);
		// if member does not have both roles but has combined role, remove combined role
		else if ((!roles.includes(mmxTeamRoleId) || !roles.includes(ccAgreedRoleId)) && roles.includes(mmxTeamCcAgreedRoleId))
			newMember.roles.remove(mmxTeamCcAgreedRoleId);
	}
});

// const messageBridge = {
// 	guilds: secure.guildsToBridge,
// 	getChannels: (guild) => {
// 		return Winterbot.guilds.cache.get(guild).channels.cache.filter(c => c.type === 'text').map(x => { return { guild: guild, channel: x.id, name: x.name } });
// 	},
// 	pairs: [],
// }

// if (secure.guildsToBridge && secure.guildsToBridge.length && secure.guildsToBridge.length == 2) Winterbot.once('ready', () => {
// 	messageBridge.one = messageBridge.getChannels(messageBridge.guilds[0]);
// 	messageBridge.two = messageBridge.getChannels(messageBridge.guilds[1]);
// 	messageBridge.pairs = [];
// 	messageBridge.one.forEach(channel => {
// 		const other = messageBridge.two.find(secondChannel => secondChannel.name === channel.name);
// 		if (other) messageBridge.pairs.push([channel, other]);
// 	});

// 	messageBridge.pairs.forEach(pair => {
// 		pair.forEach(channelObj => {
// 			const textChannel = Winterbot.guilds.cache.get(channelObj.guild).channels.cache.get(channelObj.channel);
// 			textChannel.fetchWebhooks().then(webhooks => {
// 				if (webhooks.first()) channelObj.webhook = webhooks.first();
// 				else {
// 					textChannel.createWebhook('MessageBridge', {})
// 				}
// 			})
// 		})
// 	});

// 	Winterbot.on('message', (msg) => {
// 		if (msg.webhookID) return;
// 		if (msg.channel.parent && (msg.channel.parent.id === '649172890360741922' || msg.channel.parent.id === '413366615300767764')) return;
// 		channelPair = messageBridge.pairs.find(pair => {
// 			return pair.some(obj => obj.channel == msg.channel.id);
// 		});
// 		if (!channelPair) return;
// 		const otherChannel = channelPair.find(obj => obj.channel !== msg.channel.id);
// 		otherChannel.webhook.send(msg.content, {
// 			username: msg.member.nickname ? `${msg.member.nickname} (${msg.author.username}#${msg.author.discriminator})` : `${msg.author.username}#${msg.author.discriminator}`,
// 			avatarURL: msg.author.avatarURL(),
// 			embeds: msg.embeds,
// 			files: msg.attachments.array(),
// 			allowedMentions: {
// 				parse: [],
// 			}
// 		});
// 	});
// });

Winterbot.on('message', async (msg) => {
	if (msg.webhookID) return;
	if (msg.channel.id !== secure.translation.from) return;
	const toChannel = await msg.guild.channels.cache.get(secure.translation.to);
	toChannel.fetchWebhooks().then(async webhooks => {
		if (webhooks.first()) return webhooks.first();
		else {
			return await toChannel.createWebhook('Translation', {})
		}
	}).then(async (webhook) => {
		if (!webhook) return console.error('No Translation Webhook');
		const translated = await translation.translateText(msg.content);
		const language = await translation.detectLanguage(msg.content);
		
		const embed = createTranslateEmbed(msg, `(${translation.emoji(language[0][0].split('-')[0])} ${language[0][1]})`)
		webhook.send(translated[0], {
			username: msg.member.nickname ? `${msg.member.nickname} (${msg.author.username}#${msg.author.discriminator})` : `${`${msg.author.username}#${msg.author.discriminator}`}`,
			avatarURL: msg.author.avatarURL(),
			embeds: [embed, ...msg.embeds],
			files: msg.attachments.array(),
			allowedMentions: {
				parse: [],
			}
		});
		
	})
});

Winterbot.on('message', async (msg) => {
	if (!msg.author.bot && !msg.content && msg.channel.type == 'dm') Winterbot.dmManager.newMessage(msg);
});

Winterbot.on('unknownCommand', (msg) => {
	if (!msg.author.bot && msg.channel.type == 'dm') Winterbot.dmManager.newMessage(msg);
});

Winterbot.on('error', (msg) => {
	console.log('{red}Error!{reset}', msg);
});

Winterbot.login(secure.token);

const colours = {
	black: '\x1b[30m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	reset: '\x1b[0m',
};

const oldLog = console.log;

global.console.log = function (...args) {
	args = args.map(arg => {
		if (typeof arg === 'string') {
			/* eslint-disable guard-for-in */
			for (const colour in colours) {
				arg = arg.replace('{' + colour + '}', colours[colour]);
			}
			arg += colours.reset;
		}
		return arg;
	});
	return oldLog(new Date().toISOString().replace('T', ' ').replace('Z', ''), ...args);
};
