module.exports = async function(client, payload) {
	return ({
		id: client.shard.id,
		totalMembers: client.guilds.map((g) => g.memberCount).reduce((a, b) => a + b, 0),
		totalGuilds: client.guilds.size,
		totalChannels: client.channels.size,
	});
};
