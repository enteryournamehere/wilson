const commando = require('discord.js-commando');
const subroles = require('../../utils/models/subroles.js');

module.exports = class AddsubCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'addsub',
			group: 'fun',
			memberName: 'addsub',
			description: 'Add a self-assignable role.',
			aliases: ['as'],
			guildOnly: true,
			args: [
				{
					key: 'role',
					prompt: 'Which role?',
					type: 'role',
				},
			],
		});
	}

	hasPermission(msg) {
		if (this.client.isOwner(msg.author)) return true;
		if (msg.member.hasPermission('ADMINISTRATOR')) return true;
		return 'only administrators can do this';
	}

	async run(msg, {role}) {
		subroles.setSub(role.id);
		msg.say('Ok');
	}
};
