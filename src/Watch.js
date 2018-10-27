import infuseElement from './infuseElement.js';
import { addCleanupFunction } from './sweep.js';

/**
 * Stores all the watches. The keys are the elements being "watched" and the values are "watch maps"
 * (in which keys are event names and values are `Watch` instances).
 */
export const watches = new WeakMap();

/**
 * This class is meant to "watch" for the given `eventName` on the `element` specified on the
 * constructor.
 */
export default class Watch {
	/**
	 * `Watch` constructor.
	 *
	 * @constructs
	 * @param {Element} element The element to watch.
	 * @param {string} eventName The name of the event.
	 */
	constructor(element, eventName) {
		// Get the watch map for `element`.
		let watchMap = watches.get(element);

		// If there was no watch map for `element`, create one and add it to `watches`.
		if (!watchMap) {
			watchMap = new Map();
			watches.set(element, watchMap);

			/**
			 * Add a function to clear the `watchMap` and delete the element's `watches` when the
			 * `element` is removed from the DOM.
			 */
			addCleanupFunction(element, () => {
				watchMap.clear();
				watches.delete(element);
			});
		}

		// Add `this` watch to the watch map.
		watchMap.set(eventName, this);

		/**
		 * The keys of this map are the elements "watching" the `element` and the values are sets
		 * of objects (these objects contain an optional `selector`, for event delegation, and an
		 * optional `parts` attribute inticating the parts to infuse when the event matches the
		 * selector).
		 */
		this.watchers = new Map();

		/**
		 * This callback will be executed every time the `eventName` is triggered on the `element`.
		 * It iterates over the `watchers` and infuses their `parts` if the `event.target` matches
		 * the `selector` or if there's no `selector`.
		 */
		const callback = (event) => {
			for (const [watcher, optionsSet] of this.watchers) {
				for (const options of optionsSet) {
					const { selector, parts } = options;

					if (!selector || event.target.matches(selector)) {
						infuseElement(watcher, parts, event);
					}
				}
			}
		};

		// Set `callback` as event listener of the `element` for the `eventName`.
		element.addEventListener(eventName, callback, false);

		/**
		 * Add a function to clear `this.watchers` and remove the event listener when the
		 * `element` is removed from the DOM.
		 */
		addCleanupFunction(element, () => {
			this.watchers.clear();
			element.removeEventListener(eventName, callback, false);
		});
	}

	/**
	 * Add a watcher element and infuse the specified parts of the watcher element every time the
	 * event of this watch occurs.
	 *
	 * @method addWatcher
	 * @param {Element} watcher The element that will be infused when this watch is triggered.
	 * @param {Object} [options={}] Options object.
	 * @param {string} [options.selector] A CSS selector for event delegation. If specified, the
	 *     `watcher` element will only be infused when the `event.target` matches this selector.
	 * @param {*} [options.parts] The parts of the `watcher` element to infuse. This value is
	 *     used to execute the `infuseElement` function.
	 */
	addWatcher(watcher, options = {}) {
		let optionsSet = this.watchers.get(watcher);

		/**
		 * If `watcher` was not present in `this.watchers`, create a new set and add it
		 * to `this.watchers`.
		 */
		if (!optionsSet) {
			optionsSet = new Set();
			this.watchers.set(watcher, optionsSet);

			/**
			 * Add a function to clear the `optionsSet` and delete the `watcher` from
			 * `this.watchers` when the `watcher` element is removed from the DOM.
			 */
			addCleanupFunction(watcher, () => {
				optionsSet.clear();
				this.watchers.delete(watcher);
			});
		}

		// Add the given `options` to the `optionsSet`.
		optionsSet.add(options);
	}

	/**
	 * If it exists, returns the `Watch` instance "watching" for the specified `eventName` on the
	 * given `element`. If it doesn't exists, a new `Watch` is created and returned.
	 *
	 * @function watchFor
	 * @param {Element} element The element to watch.
	 * @param {string} eventName the name of the event.
	 * @returns {Watch}
	 */
	static for(element, eventName) {
		const watchMap = watches.get(element);

		if (!watchMap || !watchMap.has(eventName)) {
			return new Watch(element, eventName);
		}

		return watchMap.get(eventName);
	}
}