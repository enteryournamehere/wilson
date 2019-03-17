const {Command} = require('discord.js-commando');
const music = require('../../utils/models/music.js');

module.exports = class StopCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'stop',
			group: 'music',
			memberName: 'stop',
			description: 'Stops the music. Can be resumed with the `resume` command.',
			details: 'Stops the music. Can be resumed with the `resume` command.',
			aliases: ['st', 'leave'],
			examples: ['stop'],
			format: '',
			guildOnly: true,
		});
	}

	async run(msg) {
		if (!music.isPlaying(msg)) return msg.say('I am not playing music.');
		music.stop(msg.guild.id, this.client);
		msg.say('Left channel.');
	}
};
