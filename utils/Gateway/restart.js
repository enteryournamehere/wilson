module.exports = async function(client, payload) {
	setTimeout(() => {
		console.log(`{cyan}Restarting...`);
		process.exit(0);
	}, client.shard.id * 4000);
};
