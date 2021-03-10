async function fetchPages(request) {
	const result = [];

	await new Promise((resolve, reject) => {
		request.eachPage((records, nextPage) => {
			records.forEach((rec) => result.push(rec));
			nextPage();
		}, (err) => err ? reject(JSON.stringify(err)) : resolve());
	});

	return result;
}

module.exports = {
	fetchPages,
};
