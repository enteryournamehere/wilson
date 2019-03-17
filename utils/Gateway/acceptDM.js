module.exports = async function(client, payload) {
	// todo: fix replying to dms
	return client.dmManager.reply(payload.replyID, payload.msg, payload.opts);
};
