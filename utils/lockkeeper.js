/**
 * A lock that automatically schedules retries on errors,
 * scheduled retries are cancelled in favor of newer calls.
 */
class ScheduledLock {
	constructor(func, delay) {
		this.func = func;

		this.delay = delay;
		this.timeoutId = null;
		this.locked = false;
	}

	toggle() {
		this.locked = !this.locked;
	}

	cancel() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}

	schedule(...args) {
		this.cancel();

		this.timeoutId = setTimeout(this.call, this.delay, ...args);
	}

	async call(...args) {
		this.cancel();

		// If we're locked schedule for later
		if (this.locked) return this.schedule(...args);

		this.toggle();
		try {
			await this.func(...args);
		} catch (err) {
			this.schedule(...args);
		}
		this.toggle();
	}
}

class Lockkeeper {
	constructor() {
		this.locks = {};
	}

	create(id, func, delay) {
		const lock = new ScheduledLock(func, delay);
		this.locks[id] = lock;
		return lock;
	}

	get(id) {
		const lock = this.locks[id];

		if (!lock) return undefined;

		return lock;
	}
}

module.exports = Lockkeeper;
