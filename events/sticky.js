const sticky = require('../models/sticky.js');
const secure = require('../secure.json');

const timeouts = new Map();
const DEBOUNCE_TIMEOUT = 2 * 60 * 1000;

module.exports = async (msg) => {
	if (msg.author.bot
		|| msg.content[0] == msg.guild.commandPrefix
		|| msg.content[0] == secure.prefix)
		return;

	let dbRow = await sticky.getPost(msg.channel.id);
	if (!dbRow) return;
	if (timeouts.has(msg.channel.id)) {
		clearTimeout(timeouts.get(msg.channel.id));
	}
	const timeoutID = setTimeout(() => {
		timeouts.delete(msg.channel.id);
		msg.channel.messages.fetch(dbRow.current_post)
			.then(existing => existing.delete())
			.catch(e => console.log(e))
			.then(() => msg.channel.send(dbRow.text))
			.then(new_msg => sticky.setPost(msg.channel.id, new_msg.id));
	}, DEBOUNCE_TIMEOUT);
	timeouts.set(msg.channel.id, timeoutID);
};
