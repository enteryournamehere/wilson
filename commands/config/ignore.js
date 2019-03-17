const { Command } = require('discord.js-commando');

// doesn't do anything. todo: make it do anything

module.exports = class IgnoreCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'ignore',
			group: 'config',
			memberName: 'ignore',
			description: 'Toggles whether Wilson will run commands in this channel. Stops ongoing image/lyrics searches.',
			details: 'Toggles whether Wilson will run commands in this channel. Stops ongoing image/lyrics searches.',
			guildOnly: true,
		});
	}

	hasPermission(msg) {
		if (msg.member.hasPermission('ADMINISTRATOR') || this.client.isOwner(msg.author.id)) return true;
		return 'You need to be an adminstrator for this.';
	}

	async run(msg) {
	}
};
