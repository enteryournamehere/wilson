const secure = require('../secure.json');
const rp = require('request-promise-native');
const updates = require('../models/updates.js');

//const sendTelegram = require('../../tgposter/index.js');
//const sendReddit = require('./redditpost.js');

const options = {
	method: 'GET',
	uri: `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=UUcXhhVwCT6_WqjkEniejRJQ&key=${secure.youtube}`,
	json: true,
};

module.exports.fetch = () => {
	return new Promise((resolve, reject) => {
		rp(options).then((result) => {
			if (!result) return;
			updates.getLatestUpdate('youtube').then((obj) => {
				const latest = result.items[0];
				let desc = latest.snippet.description;
				desc = desc.split('———————————')[0].split('JOIN THE WINTERGATAN')[0];
				if (new Date(latest.snippet.publishedAt).getTime() > obj.time) {
//					sendTelegram(`[${latest.snippet.title}](${'https://youtube.com/watch?v=' + latest.snippet.resourceId.videoId})`);
//					sendReddit(latest.snippet.title, 'https://youtube.com/watch?v=' + latest.snippet.resourceId.videoId);
				}
				resolve({
					new: new Date(latest.snippet.publishedAt).getTime() > obj.time,
					postid: latest.snippet.resourceId.videoId,
					time: new Date(latest.snippet.publishedAt).getTime(),
					embed: {
						author: {
							name: 'Wintergatan',
							icon_url: 'https://yt3.ggpht.com/-BcuK88tIhwg/AAAAAAAAAAI/AAAAAAAAAAA/F_K192CLKUA/s288-mo-c-c0xffffffff-rj-k-no/photo.jpg',
							url: 'https://www.youtube.com/user/wintergatan2000',
						},
						description: (desc.length > 2048 ? desc.slice(0, 2047) + '…' : desc),
						title: latest.snippet.title,
						timestamp: latest.snippet.publishedAt,
						color: '16711680',
						thumbnail: {
							url: latest.snippet.thumbnails.default.url,
						},
						url: 'https://youtube.com/watch?v=' + latest.snippet.resourceId.videoId,
					},
				});
			});
		});
	});
};
