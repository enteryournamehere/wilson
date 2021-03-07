const Twitter = require('twitter');
const secure = require('../secure.json');
const updates = require('./models/updates.js');

const client = new Twitter({
	consumer_key: secure.twitter.consumer_key,
	consumer_secret: secure.twitter.consumer_secret,
	access_token_key: secure.twitter.acces_token_key,
	access_token_secret: secure.twitter.acces_token_secret,
});

module.exports.fetch = () => {
	return new Promise((resolve, reject) => {
		client.get('statuses/user_timeline', {
			screen_name: 'wintergatan',
			exclude_replies: true,
			include_rts: false,
			count: 15,
		}, function(error, tweets, response) {
			if (!error) {
				if (tweets.length) {
					updates.getLatestUpdate('twitter').then((obj) => {
						const latest = tweets[0];
						for (let j = 0; j < latest.entities.urls.length; j++) {
							latest.text = latest.text.replace(latest.entities.urls[j].url, latest.entities.urls[j].expanded_url);
						}
						const embed = {
							author: {
								name: latest.user.name,
								icon_url: latest.user.profile_image_url_https,
								url: 'https://twitter.com/' + latest.user.screen_name,
							},
							description: latest.text,
							timestamp: new Date(latest.created_at).toISOString(),
							color: '1942002',
							title: 'Tweet',
							url: `https://twitter.com/wintergatan/status/${latest.id_str}`,
						};
						if (latest.entities.media && latest.entities.media[0]) {
							embed.image = {
								url: latest.entities.media[0].media_url_https,
							};
						}
						resolve({
							new: new Date(latest.created_at).getTime() > obj.time,
							postid: latest.id_str,
							time: new Date(latest.created_at).getTime(),
							embed: embed,
						});
					});
				}
			} else {
				reject(error);
			}
		});
	});
};
