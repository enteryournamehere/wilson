async function fetchPages(request) {
	const result = [];

	await request.eachPage((records, nextPage) => {
		records.forEach((rec) => result.push(rec));
		nextPage();
	});

	return result;
}

module.exports = {
	fetchPages,
};
