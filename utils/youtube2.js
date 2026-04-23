const secure = require('../secure.json');
const rp = require('request-promise-native');
const updates = require('../models/updates.js');

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
				desc = desc.split('———————————')[0];
				desc = desc.split(' ^`^t ^`^t ^`^t ^`^t ^`^t ^`^t ^`^t ^`^t ^`^t ^`^t ^`^t')[0].split('JOIN THE WINTERGATAN')[0].split('Video edited')[0];
				// check if the video is a short by using a HEAD request to check for a redirect to /watch
				rp({
					method: 'HEAD',
					uri: `https://youtube.com/shorts/${latest.snippet.resourceId.videoId}`,
					resolveWithFullResponse: true,
				}).then((headRequest) => {
					resolve({
						new: new Date(latest.snippet.publishedAt).getTime() > obj.time,
						postid: latest.snippet.resourceId.videoId,
						time: new Date(latest.snippet.publishedAt).getTime(),
						mainVideo: headRequest.request.uri.pathname === '/watch',
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
	});
};
