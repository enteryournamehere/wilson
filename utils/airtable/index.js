const Airtable = require('airtable');
const { fetchPages } = require('./fetch');
const { AIRTABLE_FIELDS, AIRTABLE_CURATION_STATUS } = require('./enums');
const secure = JSON.parse(require('fs').readFileSync('../secure.json'));

Airtable.configure({ apiKey: secure.airtable.apiKey })
const table = Airtable.base(secure.airtable.base)(secure.airtable.tables.ideas);

async function upsertAirtableIdea({
  ideaNumber,
  bulbCount,
  postDateTime,
  postedBy,
  postText,
  postImageUrls,
  originalMessageLink,
  initialIssueCategory,
}) {
  const insertData = { // Data which will only be synchronized when the idea is first tracked.
    [AIRTABLE_FIELDS.IDEA_NUMBER]: ideaNumber,
    [AIRTABLE_FIELDS.ISSUE_CATEGORY]: initialIssueCategory,
    [AIRTABLE_FIELDS.POST_IMAGES]: postImageUrls.map((url) => ({ url })), // Would need to track Airtable IDs to update
  };
  const updateData = { // Data which will be updated each time. (No reason to leave most things out of here.)
    [AIRTABLE_FIELDS.NUMBER_OF_BULBS]: bulbCount,
    [AIRTABLE_FIELDS.POST_DATE_TIME]: postDateTime,
    [AIRTABLE_FIELDS.POSTED_BY]: postedBy,
    [AIRTABLE_FIELDS.POST_TEXT]: postText,
    [AIRTABLE_FIELDS.ORIGINAL_MESSAGE_LINK]: originalMessageLink,
  };

  // no support for upsert in airtable, so we first do a lookup to see if the record exists:
  const existingRecords = await fetchPages(table.select({ maxRecords: 1, fields: [], }));
  if (existingRecords.length > 0) {
    await table.update([{
      id: existingRecords[0].getId(),
      fields: updateData,
    }]);
  } else {
    await table.create([{ ...insertData, ...updateData }]);
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

module.exports = {
  upsertAirtableIdea,
  getCuratedIdeasForCategory,
  AIRTABLE_CURATION_STATUS,
  AIRTABLE_FIELDS,
};
