const commando = require('discord.js-commando');
const { MessageEmbed } = require('discord.js');
const request = require('request-promise');

module.exports = class XkcdCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'xkcd',
			group: 'fun',
			memberName: 'xkcd',
			description: 'Get an xkcd comic',
			guildOnly: false,
			aliases: ['x'],
			args: [{
				key: 'id',
				type: 'string',
				prompt: 'haha',
				default: false,
			}],
		});

		this.XKCD_BASE_URL = "https://xkcd.com/";
		this.XKCD_API_SUFFIX = "/info.0.json";
	}

	async apiRequest(location) {
		return await request({
			uri: this.XKCD_BASE_URL + location,
			json: true,
			headers: {
				'User-Agent': 'WilsonBot',
			},
		});
	}

	parseComic(xkcdResponseJSON) {
		let comic = {};
		comic.id = xkcdResponseJSON.num;
		comic.title = xkcdResponseJSON.safe_title;
		comic.description = xkcdResponseJSON.alt;
		comic.image = xkcdResponseJSON.img;
		comic.url = this.XKCD_BASE_URL + xkcdResponseJSON.num;

		return comic;
	}

	async fetchLatestComic() {
		let responseJSON = await this.apiRequest(this.XKCD_API_SUFFIX);
		return this.parseComic(responseJSON);
	}

	async fetchComicByID(id) {
		let responseJSON;

		try {
			responseJSON = await this.apiRequest(id + this.XKCD_API_SUFFIX);
		} catch(e) {
			return {error: "Couldn't find that ID."};
		}


		return this.parseComic(responseJSON);
	}

	async fetchRandomComic() {
		let latestComic = await this.fetchLatestComic();
		let randomComicID = 1 + Math.floor(Math.random() * latestComic.id);
		return await this.fetchComicByID(randomComicID);
	}

	fetchComic(id) {
		if (id === "latest") {
			return this.fetchLatestComic();
		} else if (id) {
			return this.fetchComicByID(id);
		} else {
			return this.fetchRandomComic();
		}
	}

	async run(msg, {id}) {
		this.fetchComic(id).then((a) => {
			if (a.error) return msg.say(a.error);
			const embed = new MessageEmbed()
				.setTitle(a.title)
				.setDescription(a.description)
				.setImage(a.image)
				.setURL(a.url);
			msg.say(embed);
		}).catch((e) => {
			console.log('{red}Xkcd error:{reset}', e);
			return msg.say('Something went wrong, sorry.').catch(() => { });
		});
	}
};
