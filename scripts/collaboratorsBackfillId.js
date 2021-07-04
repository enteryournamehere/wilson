const secure = require('../secure.json');
const { Wilson } = require('../utils/wilson');
const { collaboratorsTable, fetchPages, pageUpdates, AIRTABLE_COLLABORATOR_FIELDS } = require('../utils/airtable');

Wilson.on('ready', async () => {
	// Find collaborators with missing handles in Airtable
	const missing = await fetchPages(collaboratorsTable.select({
		filterByFormula: `NOT({${AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID}})`,
		fields: [AIRTABLE_COLLABORATOR_FIELDS.DISCORD_HANDLE],
	}));

	// Generate k=>v map of Handle => Airtable ID
	const searchFor = missing.reduce((accum, rec) => ({
		[rec.fields[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_HANDLE]]: rec.id,
		...accum,
	}), {});
	const searchForHandles = Object.keys(searchFor);
	console.log(`Searching for handles for ${searchForHandles.length} missing users.`);

	// Fetch all members from Discord, and find the matching ones
	const guild = await Wilson.guilds.fetch(secure.updateguild);
	await guild.members.fetch();
	const foundUsers = guild.members.cache.filter((u) => searchForHandles.includes(u.user.tag));

	// Generate Airtable updates
	const updates = foundUsers.map((u) => ({
		id: searchFor[u.user.tag],
		fields: {
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID]: u.user.id,
		},
	}));

	console.log(`Found ${updates.length} in Discord.`);

	await pageUpdates(updates, async (page) => collaboratorsTable.update(page));
	process.exit();
});

Wilson.login(secure.token);
