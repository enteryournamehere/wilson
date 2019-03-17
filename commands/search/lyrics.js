const {Command} = require('discord.js-commando');
const request = require('request-promise');

module.exports = class LyricsCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'lyrics',
			group: 'search',
			memberName: 'lyrics',
			description: 'Searches for a song on Genius.',
			details: 'Searches for a song on Genius.',
			examples: ['!lyrics Element Kendrick Lamar', '!lyrics Marvin Gaye Let\'s get it on'],
			format: '[query]',
			args: [
				{
					key: 'query',
					prompt: 'What would you like to search Genius for?',
					type: 'string',
				},
			],
		});
	}

	async run(msg, {query}) {
		if (msg.member.currentSearch && !msg.member.currentSearch.ended) msg.member.currentSearch.stop();
		const sayFunction = async (resultsArray) => {
			try {
				const targetResult = resultsArray.splice(0, 1)[0].result;
				const embed = {
					color: 0xFFFF64,
					title: `${targetResult.primary_artist.name} - ${targetResult.title}`,
					thumbnail: {url: targetResult.song_art_image_thumbnail_url},
					fields: [{name: 'Link', value: `https://genius.com${targetResult.api_path}`}],
				};
				msg.say('Type "next" for the next search result.', {embed});
			} catch (e) {
				return msg.say('There are no more results for this search.');
			}
			msg.member.currentSearch = msg.channel.createMessageCollector((m) => m.author.id == msg.author.id && m.channel.id == msg.channel.id && m.content.toLowerCase() == 'next', {time: 30000, maxMatches: 1});
			msg.member.currentSearch.on('collect', () => sayFunction(resultsArray));
		};
		return request(`https://api.genius.com/search?access_token=${require('../../secure.json').genius}&q=${query}`, {json: true})
			.then(async (d) => {
				sayFunction(d.response.hits);
			})
			.catch((e) => msg.say('I didn\'t find a song by that title, try another.'));
	}
};
