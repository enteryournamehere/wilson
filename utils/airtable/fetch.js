function chunk(inputArray, perChunk) { // Modified from https://stackoverflow.com/a/37826698
	return inputArray.reduce((resultArray, item, index) => {
		const chunkIndex = Math.floor(index/perChunk);

		if (!resultArray[chunkIndex]) {
			resultArray[chunkIndex] = []; // start a new chunk
		}

		resultArray[chunkIndex].push(item);

		return resultArray;
	}, []);
}

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

async function pageUpdates(updates, eachUpdate) {
	for (const c of chunk(updates, 10)) {
		await eachUpdate(c);
	}
}

module.exports = {
	fetchPages,
	pageUpdates,
};
