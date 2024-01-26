const sticky = require('../models/sticky.js');
const secure = require('../secure.json');

const TIMEOUT_S = 30;

let debounce = null;

module.exports = async (msg) => {
	if (msg.author.bot
		|| msg.content[0] == msg.guild.commandPrefix
		|| msg.content[0] == secure.prefix)
		return;

	let dbRow = await sticky.getPost(msg.channel.id);
	if (!dbRow) return;

	if (debounce === null) {
		await msg.channel.messages.fetch(dbRow.current_post)
			.then(existing => existing.delete())
			.catch(e => console.log(e));
	} else {
		clearTimeout(debounce);
	}
	debounce = setTimeout(() => {
		await msg.channel.send(dbRow.text)
			.then(new_msg => sticky.setPost(msg.channel.id, new_msg.id))
			.catch(e => console.log(e));
		debounce = null;
	}, TIMEOUT_S * 1000);
};
