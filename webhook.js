const rp = require('request-promise-native');

class Webhook {
	constructor(url) {
		this.url = url;
	}

	send(text, embed) {
		const options = {
			method: 'POST',
			uri: this.url,
			body: {
				content: text,
				embeds: [embed],
			},
			json: true, // Automatically stringifies the body to JSON
		};
		return new Promise((resolve, reject) => {
			rp(options)
				.then(function(parsedBody) {
					resolve();
				})
				.catch(function(err) {
					reject();
				});
		});
	}
}

module.exports = Webhook;
