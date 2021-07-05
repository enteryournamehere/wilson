const { getCollaboratorRoles } = require('../../models/collaborator-role');

async function guildMemberUpdate(oldMember, newMember) {
	const trackedRoles = await getCollaboratorRoles();

	const oldRoles = oldMember.roles.cache.map((r) => r.id);
	const newRoles = newMember.roles.cache.map((r) => r.id);
	const changedRoles = [
		...newRoles.filter((r) => !oldRoles.includes(r)),
		...oldRoles.filter((r) => !newRoles.includes(r)),
	];

	if (changedRoles.filter((r) => trackedRoles.includes(r)).length > 0) {
		console.log('Triggered role update');
	}
}

module.exports = {
	guildMemberUpdate,
};
