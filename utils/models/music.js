const ytdl = require('ytdl-core');
const streamOptions = { seek: 0, volume: 1};
const ytdlOptions = { filter: 'audio' };

const guilds = {};

module.exports = {
	play: async (song, msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		const connection = guilds[msg.guild.id].connection;
		if (!connection) return console.log('{red}No connection aaaaaaa');
		const opt = {
			begin: song.time ? song.time + 's' : '0s',
			filter: ytdlOptions.filter,
		};
		const stream = ytdl(`http://youtube.com/watch?v=${song.id}`, opt);
		if (song.time) msg.say('Resuming: ' + song.title + '. Starting at ' + secondsToHms(song.time));
		else msg.say('Now playing: ' + song.title);
		guilds[msg.guild.id].song = song;
		const dispatcher = connection.playStream(stream, streamOptions);
		guilds[msg.guild.id].playing = true;
		dispatcher.on('end', function(reason) {
			stream.destroy();
			if (reason === 'user' || reason === '') guilds[msg.guild.id].song = undefined;
			guilds[msg.guild.id].playing = false;
			if (reason === 'stop') {
				return guilds[msg.guild.id].connection.channel.leave();
			}
			if (guilds[msg.guild.id].queue.length === 0) {
				msg.say('No more songs in the queue, disconnecting.');
				return guilds[msg.guild.id].connection.channel.leave();
			}
			module.exports.play(guilds[msg.guild.id].queue.shift(), msg);
		});
	},

	queue: async (song, msg, playNext) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		if (guilds[msg.guild.id].playing) {
			if (playNext) return guilds[msg.guild.id].queue.unshift(song);
			return guilds[msg.guild.id].queue.push(song);
		}
		msg.guild.channels.get(msg.member.voiceChannelID).join().then(conn => {
			guilds[msg.guild.id].connection = conn;
			module.exports.play(song, msg);
		});
	},

	skip: async (msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		if (msg.client.voiceConnections.get(msg.guild.id).dispatcher) {
			msg.client.voiceConnections.get(msg.guild.id).dispatcher.end('skip');
		}
	},

	getQueue: (msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		return guilds[msg.guild.id].queue;
	},

	getCurrentSong: (msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		return guilds[msg.guild.id].song;
	},

	stop: async (guildID, client) => {
		guilds[guildID] = guilds[guildID] || {queue: [], playing: false};
		if (client.voiceConnections.get(guildID).dispatcher) {
			guilds[guildID].song.time = (guilds[guildID].song.time ? guilds[guildID].song.time : 0) + Math.floor(client.voiceConnections.get(guildID).dispatcher.time / 1000);
			client.voiceConnections.get(guildID).dispatcher.end('stop');
		}
	},

	clear: (msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		guilds[msg.guild.id].queue = [];
	},

	resume: (msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		if (module.exports.isPlaying(msg)) return msg.say('I am already playing music!');
		if (!guilds[msg.guild.id].queue.length && !guilds[msg.guild.id].song) return msg.say('There is no music in the queue.');
		msg.guild.channels.get(msg.member.voiceChannelID).join().then(conn => {
			guilds[msg.guild.id].connection = conn;
			if (guilds[msg.guild.id].song) {
				module.exports.play(guilds[msg.guild.id].song, msg);
			} else {
				module.exports.play(guilds[msg.guild.id].queue[0], msg);
			}
		});
	},

	remove: (msg, index) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		guilds[msg.guild.id].queue.splice(index, 1);
	},

	isPlaying: (msg) => {
		guilds[msg.guild.id] = guilds[msg.guild.id] || {queue: [], playing: false};
		return guilds[msg.guild.id].playing;
	},
};

function secondsToHms(d) {
	d = Number(d);
	const h = Math.floor(d / 3600);
	const m = Math.floor(d % 3600 / 60);
	const s = Math.floor(d % 3600 % 60);
	return (h > 0 ? ('0' + h).slice(-2) + ':' : '') + (h > 0 ? ('0' + m).slice(-2) : m) + ':' + ('0' + s).slice(-2);
}
