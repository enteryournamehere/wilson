const {Command} = require('discord.js-commando');
const music = require('../../utils/models/music.js');

module.exports = class PlayingCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'playing',
			group: 'music',
			memberName: 'playing',
			description: 'Shows the music that\'s currently playing.',
			details: 'Shows the music that\'s currently playing.',
			aliases: ['np', 'nowplaying'],
			examples: ['np'],
			format: '',
			guildOnly: true,
		});
	}

	async run(msg) {
		if (!music.isPlaying(msg)) return msg.say('I am not playing music.');
		const song = music.getCurrentSong(msg);
		const progress = secondsToHms(this.client.voiceConnections.get(msg.guild.id).dispatcher.time/1000);
		const length = song.duration.replace(/PT|S/g, '').replace(/H|M/g, ':');
		if (!song) return msg.say('There is no music playing.');
		return msg.say(`Now playing: **${song.title}** (${progress} / ${length})`);
	}
};

function secondsToHms(d) {
	d = Number(d);
	const h = Math.floor(d / 3600);
	const m = Math.floor(d % 3600 / 60);
	const s = Math.floor(d % 3600 % 60);
	return (h > 0 ? ('0' + h).slice(-2) + ':' : '') + (h > 0 ? ('0' + m).slice(-2) : m) + ':' + ('0' + s).slice(-2);
}
