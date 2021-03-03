const Airtable = require('airtable');
const { fetchPages } = require('./fetch');
const { AIRTABLE_FIELDS, AIRTABLE_CURATION_STATUS } = require('./enums');
const secure = require('../../secure.json');

Airtable.configure({ apiKey: secure.airtable.apiKey });
const table = Airtable.base(secure.airtable.base)(secure.airtable.tables.ideas);

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
	};

	// no support for upsert in airtable, so we first do a lookup to see if the record exists:
	const existingRecords = await fetchPages(table.select({
		maxRecords: 1,
		fields: [],
		filterByFormula: `{${AIRTABLE_FIELDS.IDEA_NUMBER}} = "${ideaNumber}"`,
	}));
	if (existingRecords.length > 0) {
		await table.update([{
			id: existingRecords[0].getId(),
			fields: updateData,
		}], { typecast: true });
	} else {
		await table.create([{ fields: insertData }], { typecast: true });
	}
}

async function getCuratedIdeasForCategory({ issueCategory, onlyNew }) {
	const issueCategoryFormula = issueCategory
		? `FIND("${issueCategory}", {${AIRTABLE_FIELDS.ISSUE_CATEGORY}}),`
		: '';

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

	return fetchPages(table.select({ filterByFormula }));
}

async function renameIssueCategory({ oldName, newName }) {
	const oldRecords = await fetchPages(table.select({
		fields: [],
		filterByFormula: `{${AIRTABLE_FIELDS.ISSUE_CATEGORY}} = "${oldName}"`,
	}));

	return chunkArray(oldRecords, 10).map(async (chunk) => {
		return table.update(chunk.map((r) => ({
			id: r.id,
			fields: { [AIRTABLE_FIELDS.ISSUE_CATEGORY]: newName },
		})), { typecast: true });
	});
}

async function airtableGetIdeasAndCategories() {
	const result = await fetchPages(table.select({
		fields: [AIRTABLE_FIELDS.IDEA_NUMBER, AIRTABLE_FIELDS.ISSUE_CATEGORY],
	}));

	return result
		.reduce((accum, { fields }) => ({
			...accum,
			[fields[AIRTABLE_FIELDS.IDEA_NUMBER]]: fields[AIRTABLE_FIELDS.ISSUE_CATEGORY],
		}), {});
}

module.exports = {
	upsertAirtableIdea,
	getCuratedIdeasForCategory,
	renameIssueCategory,
	airtableGetIdeasAndCategories,
	AIRTABLE_CURATION_STATUS,
	AIRTABLE_FIELDS,
};
