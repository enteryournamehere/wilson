const Airtable = require('airtable');
const { fetchPages, pageUpdates } = require('./fetch');
const { AIRTABLE_FIELDS, AIRTABLE_CURATION_STATUS, AIRTABLE_COLLABORATOR_FIELDS } = require('./enums');
const secure = require('../../secure.json');


Airtable.configure({ apiKey: secure.airtable.apiKey });
const ideasTable = Airtable.base(secure.airtable.base)(secure.airtable.tables.ideas);
const collaboratorsTable = Airtable.base(secure.airtable.collaboratorBase)(secure.airtable.tables.collaborators);

function chunkArray(arr, chunkSize) {
	const groups = [];
	let i = 0;
	while (i < arr.length) {
		groups.push(arr.slice(i, i += chunkSize));
	}
	return groups;
}

async function upsertAirtableIdea({
	ideaNumber,
	bulbCount,
	postDateTime,
	postedBy,
	postedById,
	postText,
	postImageUrls,
	originalMessageLink,
	initialIssueCategory,
}) {
	const updateData = { // Data which will be updated each time. (No reason to leave most things out of here.)
		[AIRTABLE_FIELDS.NUMBER_OF_BULBS]: bulbCount,
		[AIRTABLE_FIELDS.POST_DATE_TIME]: postDateTime.toISOString(),
		[AIRTABLE_FIELDS.POSTED_BY]: postedBy,
		[AIRTABLE_FIELDS.POSTED_BY_TAG]: `<@${postedById}>`,
		[AIRTABLE_FIELDS.POST_TEXT]: postText,
		[AIRTABLE_FIELDS.ORIGINAL_MESSAGE_LINK]: originalMessageLink,
	};
	const insertData = { // Data which will only be synchronized when first tracked
		...updateData,
		[AIRTABLE_FIELDS.IDEA_NUMBER]: ideaNumber,
		[AIRTABLE_FIELDS.ISSUE_CATEGORY]: initialIssueCategory,
		[AIRTABLE_FIELDS.POST_IMAGES]: postImageUrls.map((url) => ({ url })), // Would need to track Airtable IDs to update
		[AIRTABLE_FIELDS.GLORY_IMAGE]: postImageUrls.map((url) => ({ url })), // Would need to track Airtable IDs to update
	};

	// no support for upsert in airtable, so we first do a lookup to see if the record exists:
	const existingRecords = await fetchPages(ideasTable.select({
		maxRecords: 1,
		fields: [],
		filterByFormula: `{${AIRTABLE_FIELDS.IDEA_NUMBER}} = "${ideaNumber}"`,
	}));

	await new Promise((resolve, reject) => {
		if (existingRecords.length > 0) {
			ideasTable.update([{
				id: existingRecords[0].getId(),
				fields: updateData,
			}], { typecast: true }, (err, res) => err ? reject(JSON.stringify(err)) : resolve(res));
		} else {
			ideasTable.create([{ fields: insertData }], { typecast: true }, (err, res) => err ? reject(JSON.stringify(err)) : resolve(res));
		}
	});
}

async function getCuratedIdeasForCategory({ issueCategory, onlyNew }) {
	const issueCategoryFormula = issueCategory ?
		`FIND("${issueCategory}", {${AIRTABLE_FIELDS.ISSUE_CATEGORY}}),` :
		'';

	const filterByFormula = `AND(
		${issueCategoryFormula}
		FIND("${AIRTABLE_CURATION_STATUS.CHOSEN_FOR_CURATION}", {${AIRTABLE_FIELDS.CURATION}}),
		NOT(
			OR(
				FIND("${AIRTABLE_CURATION_STATUS.SENT_TO_MARTIN}", {${AIRTABLE_FIELDS.CURATION}}),
				FIND("${AIRTABLE_CURATION_STATUS.CHOSEN_BY_MARTIN}", {${AIRTABLE_FIELDS.CURATION}})
			)
		)
	)`;

	return fetchPages(ideasTable.select({ filterByFormula }));
}

async function renameIssueCategory({ oldName, newName }) {
	const oldRecords = await fetchPages(ideasTable.select({
		fields: [],
		filterByFormula: `{${AIRTABLE_FIELDS.ISSUE_CATEGORY}} = "${oldName}"`,
	}));

	return chunkArray(oldRecords, 10).map(async (chunk) => {
		return ideasTable.update(chunk.map((r) => ({
			id: r.id,
			fields: { [AIRTABLE_FIELDS.ISSUE_CATEGORY]: newName },
		})), { typecast: true });
	});
}

async function airtableGetIdeasAndCategories() {
	const result = await fetchPages(ideasTable.select({
		fields: [AIRTABLE_FIELDS.IDEA_NUMBER, AIRTABLE_FIELDS.ISSUE_CATEGORY],
	}));

	return result
		.reduce((accum, { fields }) => ({
			...accum,
			[fields[AIRTABLE_FIELDS.IDEA_NUMBER]]: fields[AIRTABLE_FIELDS.ISSUE_CATEGORY],
		}), {});
}

async function syncRolesForMember(discordId, discordHandle, discordRoles) {
	console.log(`Updating roles for ${discordHandle} in Airtable.`);

	// This is implemented seprataely from syncRolesForMembers so that we can fetch only a record instead of the table
	const toUpdateAirtable = await fetchPages(collaboratorsTable.select({
		fields: [AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID],
		filterByFormula: `{${AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID}} = "${discordId}"`,
	}));

	const fields = {
		[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ROLES]: discordRoles,
		[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_HANDLE]: discordHandle,
		[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID]: discordId,
	};

	if (toUpdateAirtable.length > 0) {
		await collaboratorsTable.update(
			[{ id: toUpdateAirtable[0].id, fields }],
			{ typecast: true },
		);
	} else if (discordRoles.length > 0) {
		await collaboratorsTable.create(
			[{ fields }],
			{ typecast: true },
		);
	} else console.log(`... did not insert a new member with 0 roles.`); // This shouldn't happen.
}

async function syncRolesForMembers(members) {
	// Fetch all existing collaborators in Airtable
	const collaborators = await fetchPages(collaboratorsTable.select({
		fields: [AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID],
	}));

	// Generate k=>v map of Discord ID => Airtable ID
	const collaboratorIds = collaborators.reduce((accum, rec) => ({
		[rec.fields[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID]]: rec.id,
		...accum,
	}), {});

	// Map into Airtable updates/inserts
	const upserts = members.map(({ discordId, discordHandle, discordRoles }) => ({
		id: collaboratorIds[discordId],
		fields: {
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ROLES]: discordRoles,
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_HANDLE]: discordHandle,
			[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ID]: discordId,
		},
	})).filter((u) => u.fields[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ROLES].length > 0);

	const updates = upserts.filter(({ id }) => id);
	const inserts = upserts.filter(({ id }) => !id)
		.map(({ fields }) => ({ fields }))
		.filter(({ fields }) => fields[AIRTABLE_COLLABORATOR_FIELDS.DISCORD_ROLES].length > 0);

	// Run updates/inserts
	console.log(`Updating roles for ${updates.length} members in Airtable.`);
	await pageUpdates(updates, (u) => collaboratorsTable.update(u, { typecast: true }));
	console.log(`Inserting roles for ${inserts.length} members in Airtable.`);
	await pageUpdates(inserts, (i) => collaboratorsTable.create(i, { typecast: true }));
}

module.exports = {
	ideasTable,
	collaboratorsTable,
	upsertAirtableIdea,
	getCuratedIdeasForCategory,
	renameIssueCategory,
	airtableGetIdeasAndCategories,
	fetchPages,
	pageUpdates,
	syncRolesForMember,
	syncRolesForMembers,
	AIRTABLE_CURATION_STATUS,
	AIRTABLE_COLLABORATOR_FIELDS,
	AIRTABLE_FIELDS,
};
