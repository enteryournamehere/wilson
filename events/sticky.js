const sticky = require('../models/sticky.js');
const secure = require('../secure.json');

module.exports = async (msg) => {
	if (msg.author.bot
		|| msg.content[0] == msg.guild.commandPrefix
		|| msg.content[0] == secure.prefix)
		return;

	let dbRow = await sticky.getPost(msg.channel.id);
	if (!dbRow) return;

	msg.channel.messages.fetch(dbRow.current_post)
		.then(existing => existing.delete())
		.catch(e => console.log(e))
		.then(() => msg.channel.send(dbRow.text))
		.then(new_msg => sticky.setPost(msg.channel.id, new_msg.id));
};
