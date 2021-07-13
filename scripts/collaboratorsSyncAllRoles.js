const secure = require('../secure.json');
const { Wilson } = require('../utils/wilson');
const { getCollaboratorRoles } = require('../models/collaborator-role');
const { syncRolesForMembers } = require('../utils/airtable');


Wilson.on('ready', async () => {
	const collaboratorRoles = await getCollaboratorRoles();

	// Fetch all members from Discord
	const guild = await Wilson.guilds.fetch(secure.updateguild);
	await guild.members.fetch();
	await guild.roles.fetch();

	const discordCollaborators = guild.members.cache.map((m) => ({
		discordId: m.user.id,
		discordHandle: m.user.tag,
		discordRoles: m.roles.cache
			.filter((r) => collaboratorRoles.includes(r.id))
			.map((r) => r.name),
	}));

	await syncRolesForMembers(discordCollaborators);
	process.exit();
});

Wilson.login(secure.token);
