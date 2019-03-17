const {Command} = require('discord.js-commando');
const music = require('../../utils/models/music.js');

module.exports = class ClearCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'clear',
			group: 'music',
			memberName: 'clear',
			description: 'Clears the music queue.',
			details: 'Clears the music queue.',
			aliases: ['c'],
			examples: ['clear'],
			format: '',
			guildOnly: true,
		});
	}

	async run(msg, { query }) {
		music.clear(msg);
		msg.say('Cleared the current queue.');
	}
};
