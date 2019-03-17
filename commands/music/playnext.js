const {Command} = require('discord.js-commando');
const request = require('request-promise');
const secure = require('../../secure.json');
const music = require('../../utils/models/music.js');

module.exports = class PlayNextCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'playnext',
			group: 'music',
			memberName: 'playnext',
			description: 'Searches for a video on Youtube and plays it directly after the current song.',
			details: 'Searches for a video on Youtube and plays it directly after the current song.',
			aliases: ['pn', 'addnext'],
			examples: ['playnext  despacito'],
			format: '[query]',
			guildOnly: true,
			args: [
				{
					key: 'query',
					prompt: 'What would you like to search for?',
					type: 'string',
				},
			],
		});
	}

	async run(msg, { query }) {
		if (!msg.member.voiceChannelID) return msg.say('Please join a voice channel!');
		request({uri: `https://www.googleapis.com/youtube/v3/search?maxResults=1&type=video&q=${query}&key=${secure.youtube}&part=snippet`, json: true}).then((d) => {
			if (!d.items.length) return msg.say('No results found.');
			request({uri: `https://www.googleapis.com/youtube/v3/videos?id=${d.items[0].id.videoId}&key=${secure.youtube}&part=contentDetails`, json: true}).then((e) => {
				music.queue({
					title: d.items[0].snippet.title,
					id: d.items[0].id.videoId,
					thumbnail: d.items[0].snippet.thumbnails.high.url,
					duration: e.items[0].contentDetails.duration,
				}, msg, true);
				return msg.say('Playing next:', {embed: {
					title: d.items[0].snippet.title,
					color: 0xFF2020,
					thumbnail: {
						url: d.items[0].snippet.thumbnails.high.url,
					},
					fields: [{
						name: 'Link',
						value: `http://youtube.com/watch?v=${d.items[0].id.videoId}`,
					}],
				}});
			});
		}).catch((e) => {
			return msg.say('Something went wrong with the search, try again later.');
		}).catch(() => {});
	}
};
