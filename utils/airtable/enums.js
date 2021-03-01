// Airtable uses the display name of the field as the key in the API, which makes things very brittle. To make things
// easier in case a field is edited, the field names are stored here.
//
// Not all fields in the Airtable need to be tracked here, only those the bot edits.
const AIRTABLE_FIELDS = {
  IDEA_NUMBER: 'Idea #',
  NUMBER_OF_BULBS: '# of bulbs',
  ISSUE_CATEGORY: 'Issue Category',
  POST_DATE_TIME: 'Post Date / Time (GMT)',
  POSTED_BY: 'Posted By',
  POST_TEXT: 'Post Text',
  POST_IMAGES: 'Post Image(s)',
  ORIGINAL_MESSAGE_LINK: 'Original Message Link',
  CURATION_STATUS: 'Curation',
};

// These will probably be static, but it's annoying to type the emoji each time.
const AIRTABLE_CURATION_STATUS = {
  CHOSEN_FOR_CURATION: '🥇 Chosen for Curation',
  SENT_TO_MARTIN: '💌 Sent to Martin',
  CHOSEN_BY_MARTIN: '🏆 Chosen by Martin',
};

module.exports = {
  AIRTABLE_FIELDS,
  AIRTABLE_CURATION_STATUS,
};
