const commando = require('discord.js-commando');
const subroles = require('../../utils/models/subroles.js');

module.exports = class SubscribeCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'subscribe',
			group: 'fun',
			memberName: 'subscribe',
			description: 'Subscribe to one or multiple roles.',
			aliases: ['sub'],
			guildOnly: true,
			throttling: {
				usages: 5,
				duration: 10,
			},
		});
	}

	async run(msg, {roles}) {
		return msg.reply('This command is disabled, please see the message in #welcome (new server) to get roles!');
		const names = [];
		const nones = [];
		let say = '';
		const sas = await subroles.getSubRoles();
		for (let i = 0; i < roles.length; i++) {
			if (sas.includes(roles[i].id)) {
				msg.member.roles.add(roles[i]);
				names.push(roles[i].name);
			} else {
				nones.push(roles[i].name);
			}
		}
		if (nones.length) say += `I could not add these roles: **${nones.join(', ')}**. These are not self-assignable.`;
		if (names.length) say += '\n\nYou now have the roles: **' + names.join(', ') + '**';
		return msg.say(say);
		/*
		role = role.toLowerCase();
		// eslint-disable-next-line
		let roles = role.split(',');
		const toGive = [];
		const names = [];
		roles = roles.map((text) => text.trim());
		roles = roles.map((text) => {
			if (text === 'youtube' || text === 'yt') {
				toGive.push(roleIds.youtube);
				names.push('YouTube');
			}
			if (text === 'twitter') {
				toGive.push(roleIds.twitter);
				names.push('Twitter');
			}
			if (text === 'instagram' || text === 'insta') {
				toGive.push(roleIds.instagram);
				names.push('Instagram');
			}
		});
		msg.member.addRoles(toGive);
		msg.say('You will now receive notifications for: **' + names.join(', ') + '**');*/
	}
};
