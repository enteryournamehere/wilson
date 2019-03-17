const commando = require('discord.js-commando');
const updates = require('../../utils/models/updates.js');

module.exports = class FetchCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'fetch',
			group: 'fun',
			memberName: 'fetch',
			description: 'Get the latest update from the w e b.',
			guildOnly: true,
			aliases: ['f'],
			args: [
				{
					key: 'type',
					prompt: 'which? y/t/i',
					type: 'string',
				},
			],
		});
	}

	hasPermission(msg) {
		if (this.client.isOwner(msg.author)) return true;
		if (msg.member.hasPermission('ADMINISTRATOR')) return true;
		return 'only administrators can do this';
	}

	async run(msg, {type}) {
		if (type === 't') {
			require('../../twitter2.js').fetch().then((x) => {
				msg.say('Here\'s the latest tweet. New: ' + x.new, {
					embed: x.embed,
				});
				if (x.new) {
					updates.addUpdate(
						'twitter',
						x.postid,
						x.time,
					);
				}
			});
		}
		if (type === 'y') {
			require('../../youtube2.js').fetch().then((x) => {
				msg.say('Here\'s the latest video. New: ' + x.new, {
					embed: x.embed,
				});
				if (x.new) {
					updates.addUpdate(
						'youtube',
						x.postid,
						x.time,
					);
				}
			});
		}
		/* if (type === 'i') {
			require('../../instagram2.js').fetch().then((x) => {
				if (!x) return msg.say('No new posts found.');
				msg.say('Here\'s the latest post. New: ' + x.new, {
					embed: x.embed,
				});
				if (x.new) {
					updates.addUpdate(
						'instagram',
						x.postid,
						x.time,
					);
				}
			});
		}*/
	}
};
