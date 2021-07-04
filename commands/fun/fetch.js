const commando = require('discord.js-commando');
const updates = require('../../models/updates.js');

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
			require('../../utils/twitter2.js').fetch().then((x) => {
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
			require('../../utils/youtube2.js').fetch().then((x) => {
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
	}
};
