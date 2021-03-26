const secure = require('./secure.json');
const path = require('path');
const SequelizeProvider = require('./utils/Sequelize');
const database = require('./utils/database.js');
const updates = require('./models/updates.js');
const { Wilson } = require('./utils/wilson');
const translation = require('./events/translation.js');
const ideaVault = require('./models/idea-vault.js');
const Webhook = require('./utils/webhook.js');

Wilson.registry
	.registerGroups([
		['config', 'Config commands'],
		['fun', 'Fun commands'],
		['ideavault', 'Idea vault commands'],
		['mod', 'Mod commands'],
		['owner', 'Owner commands'],
	])
	.registerDefaultTypes()
	.registerDefaultGroups()
	.registerDefaultCommands({
		ping: false,
		prefix: false,
		unknownCommand: false,
	})
	.registerCommandsIn(path.join(__dirname, 'commands'));


Wilson.on('ready', () => {
	console.log(`{green}Ready!`);
});

Wilson.on('error', (msg) => {
	console.log('{red}Error!{reset}', msg);
});

database.start();

Wilson.setProvider(new SequelizeProvider(database.db)).catch(console.error);


// Events
Wilson.on('message', translation);

// subscribe the idea vault's events
Wilson.on('channelUpdate', ideaVault.channelUpdate);
Wilson.on('messageReactionAdd', ideaVault.messageReactionAdd);
Wilson.on('messageReactionRemove', ideaVault.messageReactionRemove);
Wilson.on('messageUpdate', ideaVault.messageUpdate);
Wilson.on('ready', ideaVault.ready);


Wilson.dispatcher.addInhibitor(msg => {
	if (msg.webhookID) return 'nope';
	return false;
});


Wilson.on('message', (msg) => {
	if (!msg.author) return;
	if (!msg.guild) return;
	if (!msg.content.match(/https?:\/\//)) return;
	msg.guild.members.fetch(msg.author).then((member) => {
		const beenHereMinutes = (Date.now() - member.joinedTimestamp) / 1000 / 60;
		if (beenHereMinutes < 10) {
			msg.reply('welcome to the Wintergatan Discord server! To prevent spam and bots, there is a 10 minute wait time before new members can send links, so please try again in a moment. Thank you!').then(reply => {
				setTimeout(() => {
					reply.delete();
				}, 60 * 1000);
			});
			msg.delete();
		}
	});
});

// guild ids for role transfers
/**
 * @typedef {String} oldRoleId
 * @typedef {String} newRoleId
 */
const oldGuildId = '413366614747250708';
const newGuildId = '649165975647682560';

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


const mmxTeamRoleId = '650660016755310592';
const ccAgreedRoleId = '709386821850759178';
const mmxTeamCcAgreedRoleId = '709406460450177094';

Wilson.on('guildMemberAdd', member => {
	/**
		 * transfer roles from old server member to new server member
		 */
	if (member.guild.id != newGuildId) return;  // if join is not in new server, return
	const oldMember = Wilson.guilds.resolve(oldGuildId).members.resolve(member.id);
	if (!oldMember) return; // if user is not in old server, return
	oldMember.roles.cache.forEach((v, k) => {
		const newId = roleMap.get(k);
		if (newId) member.roles.add(newId); // if role is in map, add role
	});
});

Wilson.on('guildMemberUpdate', (oldMember, newMember) => {
	// if the roles have changed, do stuff
	if (oldMember.roles.cache.keys() != newMember.roles.cache.keys()) {
		const roles = newMember.roles.cache.keyArray(); // get updated roles
		// if member has both roles and not the combined role, add combined role
		if (roles.includes(mmxTeamRoleId) && roles.includes(ccAgreedRoleId) && !roles.includes(mmxTeamCcAgreedRoleId)) {
			newMember.roles.add(mmxTeamCcAgreedRoleId);
		// if member does not have both roles but has combined role, remove combined role
		} else if ((!roles.includes(mmxTeamRoleId) || !roles.includes(ccAgreedRoleId)) && roles.includes(mmxTeamCcAgreedRoleId)) {
			newMember.roles.remove(mmxTeamCcAgreedRoleId);
		};
	}
});


const updatesConfig = {
	guild: secure.updateguild,
	roles: secure.roles,
	webhooks: secure.webhooks,
};

const twitterWebhook = new Webhook(updatesConfig.webhooks.twitter);
const youtubeWebhook = new Webhook(updatesConfig.webhooks.youtube);

function twitter2Fetch() {
	Wilson.fetches.twitter.last = Date.now();
	require('./utils/twitter2.js').fetch().then((x) => {
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
	Wilson.fetches.youtube.last = Date.now();
	require('./utils/youtube2.js').fetch().then((x) => {
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

Wilson.fetches = {
	youtube: {
		run: youtube2Fetch,
		last: 0,
	},
	twitter: {
		run: twitter2Fetch,
		last: 0,
	},
};

Wilson.once('ready', () => {
	if (secure.fetches.youtube) Wilson.fetches.youtube.run();
	if (secure.fetches.twitter) Wilson.fetches.twitter.run();
});


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


Wilson.login(secure.token);
