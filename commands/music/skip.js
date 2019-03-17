const {Command} = require('discord.js-commando');
const music = require('../../utils/models/music.js');

module.exports = class SkipCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'skip',
			group: 'music',
			memberName: 'skip',
			description: 'Skips the current song.',
			details: 'Skips the current song.',
			aliases: ['s'],
			examples: ['skip'],
			format: '',
			guildOnly: true,
		});
	}

	async run(msg) {
		if (!music.isPlaying(msg)) return msg.say('I am not playing music.');
		music.skip(msg);
	}
};
