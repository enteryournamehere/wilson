const commando = require('discord.js-commando');
const mentionaccess = require('../../utils/models/mentionaccess.js');

module.exports = class MentionAccessCommand extends commando.Command {
	constructor(client) {
		super(client, {
			name: 'mentionaccess',
			group: 'mod',
			memberName: 'mentionaccess',
			description: 'Gives a role permission to .mention another role',
			aliases: ['ma'],
			guildOnly: true,
			args: [
				{
					key: 'action',
					prompt: 'Allow or deny or get?',
					type: 'string',
					validate: (value, message, argument) => {
						if (value === 'get') message.command.argsCollector.args[2].default = '';
						console.log(message.command.argsCollector.args[2]);
						return ['allow', 'deny', 'get'].includes(value);
					},
				},
				{
					key: 'fromrole',
					label: 'Role that mentions',
					prompt: 'What\'s the mentioning role?',
					type: 'role',
				},
				{
					key: 'torole',
					prompt: 'Mentioned role?',
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

	async run(msg, {action, fromrole, torole}) {
		msg.command.argsCollector.args[2].default = null;
		switch (action) {
			case 'allow':
				const perm = await mentionaccess.checkPermission(fromrole.id, torole.id);
				if (!perm) mentionaccess.givePermission(fromrole.id, torole.id);
				msg.say(`**${fromrole.name}** can now \`.mention\` *${torole.name}*.`);
				break;
			case 'deny':
				mentionaccess.takePermission(fromrole.id, torole.id);
				msg.say(`**${fromrole.name}** can no longer \`.mention\` *${torole.name}*.`);
				break;
			case 'get':
				if (torole && torole != '') {
					const perm = await mentionaccess.checkPermission(fromrole.id, torole.id);
					if (perm) return msg.say(`Yes, **${fromrole.name}** can \`.mention\` *${torole.name}*.`);
					return msg.say(`No, **${fromrole.name}** can't \`.mention\` *${torole.name}*.`);
				} else {
					let roles = await mentionaccess.getPermissions(fromrole.id);
					console.log(roles);
					roles = roles.map(obj => {
						return msg.guild.roles.get(obj.torole).name;
					});
					if (roles.length > 0) return msg.say(`The role **${fromrole.name}** can \`.mention\` the following roles: *${roles.join(', ')}*.`);
					return msg.say(`**${fromrole.name}** has no permission to \`.mention\` anyone.`);
				}
		}
	}
};
