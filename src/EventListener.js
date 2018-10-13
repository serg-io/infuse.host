import { config } from './core';

// Attribute name that indicates an element has event listeners.
const DATA_LISTENER = config(null, 'dataListener');

// Attribute name that indicates an element is watching events on other elements.
const DATA_WATCHER = config(null, 'dataWatcher');

// CSS selector to search elements with event listeners or elements watching other elements.
const SELECTOR = `[${ DATA_LISTENER }],[${ DATA_WATCHER }]`;

/**
 * The keys in this map will be elements that have event listeners. The values are a `Set` of all
 * the `EventListener` instances for the corresponding element.
 */
export const byElement = new WeakMap();

/**
 * The keys in this map will be elements "watching" events on other elements. The values are a
 * `Set` of all the `EventListener` instances for the corresponding "watcher".
 */
export const byWatcher = new WeakMap();

/**
 * Each instance of `EventListener` is meant to add an event listener to the element given in the
 * constructor.
 *
 * The event listener is added by calling the `add` method. Once added, the `EventListener`
 * instance is stored in the `byElement` map. This allows us to easily retrieve all `EventListener`
 * instances for a given element. An event listener can be removed from an element by calling the
 * `remove` method. All `EventListeners` for a given element can be removed using the `removeAll`
 * static method, this is specially useful for removing all event listeners when an element is
 * removed from the DOM.
 *
 * An optional `watcher` element can be specified as the second argument in the constructor. A
 * watcher element is an element that "watches" for an event that occurs on another element. This
 * allows us to evaluate, and re-infuse, all or some parts of the watcher element when an event
 * occurs on another element. This is done using `watch-variable-name` attributes. All the event
 * listeners that a watcher is currently "watching" can be removed (for instance when the watcher
 * is removed from the DOM) using the `removeAll` static method.
 */
export default class EventListener {
	/**
	 * Constructor
	 *
	 * @constructs
	 * @param {Element} element The element to which the event listener will be added.
	 * @param {Element} [watcher] An optional element "watching" this event.
	 */
	constructor(element, watcher) {
		this.element = element;
		this.watcher = watcher;
	}

	/**
	 * Adds the specified event listener to the element given in the constructor. This method is
	 * meant to be called only once. The arguments for this method are the same as the ones for
	 * the native [`addEventListener`]
	 * (https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) method.
	 *
	 * @param {string} type Type of event.
	 * @param {Function} callback Callback function to be executed when the event occurs.
	 * @param {Object|boolean} [options=false] Options object or `useCapture` boolean value.
	 */
	add(type, callback, options = false) {
		const { element, watcher } = this;

		this.type = type;
		this.callback = callback;
		this.options = options;

		// Add the event listener to the element.
		element.addEventListener(type, callback, options);

		/**
		 * If the element is already in the `byElement` map, add this `EventListener` instance to
		 * the corresponding `Set`. Otherwise, create a new `Set` with `this` instance as its only
		 * value, add it to `byElement` (using the element as key), and add an attribute to the
		 * element indicating that there are event listeners for the element.
		 */
		if (byElement.has(element)) {
			byElement.get(element).add(this);
		} else {
			byElement.set(element, new Set([this]));
			element.setAttribute(DATA_LISTENER, '');
		}

		/**
		 * If a `watcher` was given in the constructor, add `this` to `byWatcher` in a similar way
		 * to the previous if/else. If the watcher is already in `byWatcher`, add `this` to the
		 * corresponding `Set`. Otherwise, create a `Set`, add it to `byWatcher`, and add an
		 * attribute to the watcher.
		 */
		if (watcher !== undefined) {
			if (byWatcher.has(watcher)) {
				byWatcher.get(watcher).add(this);
			} else {
				byWatcher.set(watcher, new Set([this]));
				watcher.setAttribute(DATA_WATCHER, '');
			}
		}
	}

	/**
	 * Removes `this` event listener from the element.
	 */
	remove() {
		const { element, watcher } = this;
		// Get the `Set` of `EventListener` intances corresponding to this element.
		const elementListeners = byElement.get(element);

		// Remove `this` from the `Set` and remove the event listener from the element.
		elementListeners.delete(this);
		element.removeEventListener(this.type, this.callback, this.options);

		/**
		 * If the `Set` is empty (there are no more event listeners for the element), remove the
		 * `Set` from `byElement` and remove the attribute from the element.
		 */
		if (elementListeners.size === 0) {
			byElement.delete(element);
			element.removeAttribute(DATA_LISTENER);
		}

		/**
		 * Similar to the statements above, if there's a watcher, remove `this` from the
		 * corresponding `Set` in `byWatcher`.
		 */
		if (watcher !== undefined) {
			const watcherListeners = byWatcher.get(watcher);

			watcherListeners.delete(this);

			if (watcherListeners.size === 0) {
				byWatcher.delete(watcher);
				watcher.removeAttribute(DATA_WATCHER);
			}
		}
	}

	/**
	 * Removes all `EventListener` instances, of the given element, from the `byElement` and
	 * `byWatcher` maps.
	 *
	 * @param {Element} element
	 */
	static removeAll(element) {
		Array.from(byElement.get(element) || []).forEach(listener => listener.remove());
		Array.from(byWatcher.get(element) || []).forEach(listener => listener.remove());
	}

	/**
	 * Removes all `EventListener` instances associated with the given element **or any of its
	 * descendants**, from the `byElement` and `byWatcher` maps. The attributes added by the `add`
	 * method are used to find which elements have event listeners. Call this static method when
	 * an element has been removed from the DOM to remove all event listeners.
	 *
	 * @param {Element} element
	 */
	static clear(element) {
		const elements = Array.from(element.querySelectorAll(SELECTOR));

		if (element.matches(SELECTOR)) {
			elements.push(element);
		}

		elements.forEach(el => this.removeAll(el), this);
	}
}