const commando = require('discord.js-commando');
const subroles = require('../../utils/models/subroles.js');

module.exports = class UnsubscribeCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'unsubscribe',
			group: 'fun',
			memberName: 'unsubscribe',
			description: 'Unsubscribe from one or multiple roles.',
			aliases: ['unsub'],
			throttling: {
				usages: 5,
				duration: 10,
			},
			guildOnly: true,
			args: [
				{
					key: 'roles',
					prompt: 'Which roles do you want to remove? (One role name per message)',
					type: 'role',
					infinite: true,
				},
			],
		});
	}

	async run(msg, {roles}) {
		const names = [];
		const nones = [];
		let say = '';
		const sas = await subroles.getSubRoles();
		for (let i = 0; i < roles.length; i++) {
			if (sas.includes(roles[i].id)) {
				msg.member.roles.remove(roles[i]);
				names.push(roles[i].name);
			} else {
				nones.push(roles[i].name);
			}
		}
		if (nones.length) say += `I could not add these roles: **${nones.join(', ')}**. These are not self-assignable.`;
		if (names.length) say += '\n\nYou no longer have the roles: **' + names.join(', ') + '**';
		return msg.say(say);
	}
};
