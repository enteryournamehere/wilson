class GatewayCommand {
	constructor(totalShards, source, command, destinations, payload, time) {
		this.source = source;
		this.command = command;
		this.destinations = destinations;
		this.totalDestinations = !destinations || destinations.length === 0 ? totalShards : destinations.length;
		this.payload = payload;
		this.time = time ? time : (new Date()).getTime().toString(16);
	}
}

module.exports = GatewayCommand;
