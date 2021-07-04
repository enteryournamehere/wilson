const secure = require('../secure.json');
const { Wilson } = require('../utils/wilson');
const { collaboratorsTable, fetchPages, pageUpdates, AIRTABLE_COLLABORATOR_FIELDS } = require('../utils/airtable');

const filterIds = secure.airtable.collaboratorSyncRoles.map((r) => r.id).filter(Boolean);
const filterNames = secure.airtable.collaboratorSyncRoles.map((r) => r.name).filter(Boolean);

Wilson.on('ready', async () => {
	// Fetch all members from Discord
	const guild = await Wilson.guilds.fetch(secure.updateguild);
	await guild.members.fetch();
	await guild.roles.fetch();

	// Fetch all existing collaborators in Airtable
	const collaborators = await fetchPages(collaboratorsTable.select({
		fields: [AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID],
	}));

	// Generate k=>v map of Discord ID => Airtable ID
	const collaboratorIds = collaborators.reduce((accum, rec) => ({
		[rec.fields[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID]]: rec.id,
		...accum,
	}), {});

	const upserts = guild.members.cache.map((m) => ({
		id: collaboratorIds[m.user.id],
		fields: {
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ROLES]: m.roles.cache
				.filter((r) => filterNames.includes(r.name) || filterIds.includes(r.id))
				.map((r) => r.name),
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_HANDLE]: `${m.user.tag}`,
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID]: m.user.id,
		},
	})).filter((u) => u.fields[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ROLES].length > 0);

	const updates = upserts.filter((u) => u.id);
	const inserts = upserts.filter((u) => !u.id).map((i) => ({ fields: i.fields }));

	console.log(`Update ${updates.length}`);
	await pageUpdates(updates, (u) => collaboratorsTable.update(u, { typecast: true }));

	console.log(`Inserting ${inserts.length}`);
	await pageUpdates(inserts, (i) => collaboratorsTable.create(i, { typecast: true }));

	process.exit();
});

Wilson.login(secure.token);
