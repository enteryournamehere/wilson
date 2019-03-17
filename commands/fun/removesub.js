const commando = require('discord.js-commando');
const subroles = require('../../utils/models/subroles.js');

module.exports = class AddsubCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'removesub',
			group: 'fun',
			memberName: 'removesub',
			description: 'Remove a self-assignable role.',
			aliases: ['rs', 'delsub'],
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
		subroles.setNotSub(role.id);
		msg.say('Ok');
	}
};
