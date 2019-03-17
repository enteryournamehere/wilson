const commando = require('discord.js-commando');
const subroles = require('../../utils/models/subroles.js');

module.exports = class SublistCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'sublist',
			group: 'fun',
			memberName: 'sublist',
			description: 'Show the list of roles you can assign to yourself.',
			guildOnly: true,
			aliases: ['sl'],
		});
	}

	async run(msg) {
		subroles.getSubRoles().then(roles => msg.say('These roles are self-assignable: **' + roles.map(x => msg.guild.roles.get(x).name).join(', ') + '**'));
	}
};
