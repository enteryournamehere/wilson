const {Command} = require('discord.js-commando');
const request = require('request-promise');
const secure = require('../../secure.json');

module.exports = class YoutubeCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'image',
			group: 'search',
			memberName: 'image',
			description: 'Searches for an image. SFW results only.',
			details: 'Searches for an image. SFW results only.',
			aliases: ['img'],
			examples: ['img marble machine', 'img modulin'],
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
		if (msg.member.currentSearch && !msg.member.currentSearch.ended) msg.member.currentSearch.stop();
		const sayResult = async (data) => {
			try {
				await msg.say('Type "next" for the next search result.', {embed: {
					title: `Image result for "${query}"`,
					color: 0x4885ED,
					image: {
						url: data.splice(0, 1)[0].link,
					},
				}});
			} catch (e) {
				return msg.say('There are no more results for this search.');
			}
			msg.member.currentSearch = msg.channel.createMessageCollector((m) => m.author.id == msg.author.id && m.channel.id == msg.channel.id && m.content.toLowerCase() == 'next', {time: 30000, maxMatches: 1});
			msg.member.currentSearch.on('collect', () => sayResult(data));
			return;
		};

		request({
			uri: `https://www.googleapis.com/customsearch/v1?searchType=image&cx=017119602772521781611:_sy6ezmcc90&key=${secure.imgSearch}&safe=medium&q=${query}`,
			json: true,
			headers: {
				'User-Agent': 'Aeiou Bot',
			},
		}).then((d) => {
			sayResult(d.items);
		}).catch((e) => {
			console.log('{red}Image search error:{reset}', e);
			return msg.say('Something went wrong with this search.').catch(() => {});
		});
	}
};
