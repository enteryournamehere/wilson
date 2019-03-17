const secure = require('./secure.json');
const Commando = require('discord.js-commando');
const path = require('path');
const SequelizeProvider = require('./utils/Sequelize');
const database = require('./database.js');
const updates = require('./utils/models/updates.js');

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
});

const Webhook = require('./webhook.js');
const twitterWebhook = new Webhook(updatesConfig.webhooks.twitter);
const youtubeWebhook = new Webhook(updatesConfig.webhooks.youtube);
// const instagramWebhook = new Webhook(updatesConfig.webhooks.instagram);

database.start();

Winterbot.setProvider(new SequelizeProvider(database.db)).catch(console.error);

Winterbot.registry
	.registerGroups([
		['fun', 'Fun commands'],
		['search', 'Search commands'],
		['config', 'Config commands'],
		['mod', 'Mod commands'],
		['owner', 'Owner commands'],
		// ['music', 'music commands'],
	])
	.registerDefaultTypes()
	.registerDefaultGroups()
	.registerDefaultCommands({
		ping: false,
		prefix: false,
	})
	.registerCommandsIn(path.join(__dirname, 'commands'));

function twitter2Fetch() {
	Winterbot.fetches.twitter.last = Date.now();
	require('./twitter2.js').fetch().then((x) => {
		if (!x.new) return;
		Winterbot.guilds.get(updatesConfig.guild).roles.get(updatesConfig.roles.twitter).setMentionable(true).then(() => {
			setTimeout(function() {
				twitterWebhook.send(`<@&${updatesConfig.roles.twitter}>`, x.embed).catch(() => {}).then(() => {
					updates.addUpdate(
						'twitter',
						x.postid,
						x.time,
					);
					setTimeout(function() {
						Winterbot.guilds.get(updatesConfig.guild).roles.get(updatesConfig.roles.twitter).setMentionable(false);
					}, 1000);
				});
			}, 1000);
		});
	}).catch(e => console.log(e)).then(() => {
		setTimeout(twitter2Fetch, 10 * 60 * 1000);
	});
}

function youtube2Fetch() {
	Winterbot.fetches.youtube.last = Date.now();
	require('./youtube2.js').fetch().then((x) => {
		if (!x.new) return;
		Winterbot.guilds.get(updatesConfig.guild).roles.get(updatesConfig.roles.youtube).setMentionable(true).then(() => {
			setTimeout(function() {
				youtubeWebhook.send(`<@&${updatesConfig.roles.youtube}>`, x.embed).catch(() => {}).then(() => {
					updates.addUpdate(
						'youtube',
						x.postid,
						x.time,
					);
					setTimeout(function() {
						Winterbot.guilds.get(updatesConfig.guild).roles.get(updatesConfig.roles.youtube).setMentionable(false);
					}, 1000);
				});
			}, 1000);
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
	// if (secure.fetches.instagram) instagramFetch();
	if (secure.fetches.youtube) Winterbot.fetches.youtube.run();
	if (secure.fetches.twitter) Winterbot.fetches.twitter.run();
});

Winterbot.on('message', (msg) => {
	if (!msg.author) return;
	if (!msg.content.match(/https?:\/\//)) return;
	msg.guild.members.fetch(msg.author).then((member) => {
		const beenHereMinutes = (Date.now() - member.joinedTimestamp) / 1000 / 60;
		if (beenHereMinutes < 30) {
			msg.reply('please wait 30 minutes before sending links');
			msg.delete();
		}
	});
});

/*
const music = require('./utils/models/music.js');

Winterbot.on('voiceStateUpdate', (oldMember, newMember) => {
	if (!newMember.guild.me.voiceChannel) return;
	if (newMember.guild.me.voiceChannel.members.filter(member => !member.user.bot && !member.deaf).size < 1 || newMember.guild.me.mute) {
		console.log('{cyan}Left channel because no one is listening.');
		// todo: make it send a message
		music.stop(newMember.guild.id, Winterbot);
	}
});
*/

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

global.console.log = function(...args) {
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
