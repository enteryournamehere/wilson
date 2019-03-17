const {Command} = require('discord.js-commando');
const music = require('../../utils/models/music.js');

module.exports = class RemoveCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'remove',
			group: 'music',
			memberName: 'remove',
			description: 'Removes the song at *index* from the queue',
			details: 'Removes the song at *index* from the queue',
			aliases: ['r'],
			examples: ['remove'],
			format: '<index>',
			guildOnly: true,
			args: [
				{
					key: 'index',
					type: 'integer',
					prompt: 'Which index would you like to remove?',
					parse: (p) => Math.max(0, p - 1),
				},
			],
		});
	}

	async run(msg, { index }) {
		const queue = music.getQueue(msg);
		if (index >= queue.length) return msg.say('This queue item does not exist.');
		msg.say('Removed **' + queue[index].title + '** from the queue.');
		music.remove(msg, index);
	}
};
