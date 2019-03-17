const { ShardingManager } = require('discord.js');
const manager = new ShardingManager('./winterbot.js', { totalShards: 1, respawn: true });
const managerCommands = require('require-all')({
	dirname: `${__dirname}/managerCommands`,
	filter: n => n.slice(0, -3),
});

manager.on('launch', shard => shard.process.on('message', m => {
	if (!m.destinations || m.destinations.length == 0) {
		return manager.shards.map((s, i) => s.send(m).catch(e => console.log(`Shard ${i} is experiencing issues, and failed to recieve a gateway message.`)));
	}

	return m.destinations.map((id, i) => {
		try {
			manager.shards.get(id).process.send(m);
		} catch (e) {
			console.log(`Shard ${i} is experiencing issues, and failed to recieve a gateway message.`);
		}
	});
}));

managerCommands.init().then(() => manager.spawn(manager.totalShards, 5000));
