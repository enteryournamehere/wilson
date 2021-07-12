const { getCollaboratorRoles, untrackCollaborators } = require('../../models/collaborator-role');
const { syncRolesForMember, syncRolesForMembers } = require('../../utils/airtable');

async function guildMemberUpdate(oldMember, newMember) {
	const collaboratorRoles = await getCollaboratorRoles();

	const oldRoles = oldMember.roles.cache.map((r) => r.id);
	const newRoles = newMember.roles.cache.map((r) => r.id);
	const changedRoles = [
		...newRoles.filter((r) => !oldRoles.includes(r)),
		...oldRoles.filter((r) => !newRoles.includes(r)),
	];

	if (changedRoles.filter((r) => collaboratorRoles.includes(r)).length > 0) {
		syncRolesForMember(
			newMember.user.id,
			newMember.user.tag,
			newMember.roles.cache
				.filter((r) => collaboratorRoles.includes(r.id))
				.map((r) => r.name),
		);
	}
}

async function guildRoleUpdate(oldRole, newRole) {
	const collaboratorRoles = await getCollaboratorRoles();
	if (!collaboratorRoles.includes(oldRole.id)) return;

	console.log(`Renaming collaborator roles from ${oldRole.name} to ${newRole.name}`);
	syncRolesForMembers(newRole.members.map((m) => ({
		discordId: m.user.id,
		discordHandle: m.user.tag,
		roles: m.user.roles
			.filter((r) => collaboratorRoles.includes(r.id))
			.map((r) => r.name),
	})));
}

async function guildRoleDelete(oldRole) {
	const collaboratorRoles = await getCollaboratorRoles();
	if (!collaboratorRoles.includes(oldRole.id)) return;

	console.log(`Untracking collaborators for role ${oldRole.name}.`);
	untrackCollaborators(oldRole.id);
	syncRolesForMembers(oldRole.members.map((m) => ({
		discordId: m.user.id,
		discordHandle: m.user.tag,
		roles: m.user.roles
			.filter((r) => collaboratorRoles.includes(r.id))
			.map((r) => r.name),
	})));
}

module.exports = {
	guildMemberUpdate,
	guildRoleUpdate,
	guildRoleDelete,
};
