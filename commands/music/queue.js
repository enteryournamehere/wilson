const {Command} = require('discord.js-commando');
const music = require('../../utils/models/music.js');

module.exports = class QueueCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'queue',
			group: 'music',
			memberName: 'queue',
			description: 'Shows the music queue.',
			details: 'Shows the music queue.',
			aliases: ['q'],
			examples: ['queue'],
			format: '',
			guildOnly: true,
			args: [
				{
					key: 'page',
					type: 'integer',
					prompt: 'Despacito',
					default: 0,
					parse: (p) => p - 1,
				},
			],
		});
	}

	async run(msg, {page}) {
		const queue = music.getQueue(msg);
		const pages = Math.ceil(queue.length / 10);
		page = Math.min(page, pages - 1);
		if (queue.length === 0) return msg.say('There are no songs queued.');
		return msg.say('Here is the current queue: ```' + queue.slice(page * 10, page * 10 + 10).map((song, index) => {
			return (index+1 + page * 10) + '. ' + song.title;
		}).join('\n') + '```page ' + (page + 1) + ' of ' + pages);
	}
};
