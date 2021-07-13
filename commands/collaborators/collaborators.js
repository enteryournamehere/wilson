const { Command } = require('discord.js-commando');
const { getCollaboratorRoles, trackCollaborators, untrackCollaborators } = require('../../models/collaborator-role.js');
const { syncRolesForMembers } = require('../../utils/airtable');

module.exports = class IdeaVaultTierCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'collaborator-role',
			group: 'collaborators',
			memberName: 'collaborator-role',
			aliases: [],
			description: 'Tracks collaborators by role in Airtable',
			examples: ['collaborator-role track @rolename', 'collaborator-role untrack @rolename'],
			format: '<action> [action arguments]',
			guildOnly: true,
			args: [{
				key: 'action',
				prompt: 'list/track/untrack?',
				type: 'string',
				default: '',
				validate: (val) => {
					return ['list', 'track', 'untrack'].includes(val);
				},
			}, {
				key: 'role',
				prompt: 'role?',
				type: 'role',
				default: '',
			}],
		});
	}

	hasPermission(msg) {
		if (this.client.isOwner(msg.author)) return true;
		if (msg.member.hasPermission('MANAGE_ROLES')) return true;
		return 'You need permission to manage roles in order to manage collaborator role syncing.';
	}

	async run(msg, {action, role}) {
		const collaboratorRoles = await getCollaboratorRoles();
		switch (action) {
			case '': // Do nothing. We want the code below to execute.
			case 'list':
				const ids = await getCollaboratorRoles();
				if (!ids || ids.length === 0) {
					return await msg.say('There are no collaborator roles being tracked.');
				} else {
					await msg.say(
						`Roles tracked in Airtable: ` + ids.map((id) => `<@&${id}>`).join(', '),
						{ allowedMentions: { roles: [] } },
					);
				}
				break;
			case 'track':
				await syncRolesForMembers(role.members.map((m) => ({
					discordId: m.user.id,
					discordHandle: m.user.tag,
					discordRoles: m.roles.cache
						.filter((r) => collaboratorRoles.includes(r.id) || r.id === role.id)
						.map((r) => r.name),
				})));
				await trackCollaborators(role.id);
				await msg.say(`Tracked <@&${role.id}>`, { allowedMentions: { roles: [] }});
				break;
			case 'untrack':
				await syncRolesForMembers(role.members.map((m) => ({
					discordId: m.user.id,
					discordHandle: m.user.tag,
					discordRoles: m.roles.cache
						.filter((r) => collaboratorRoles.includes(r.id) && r.id !== role.id)
						.map((r) => r.name),
				})));
				await untrackCollaborators(role.id);
				await msg.say(`Stopped tracking <@&${role.id}>`, { allowedMentions: { roles: [] }});
				break;
		}
	}
};
