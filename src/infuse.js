import Watch from './Watch';
import infuseElement from './infuseElement';
import sweep, { addCleanupFunction } from './sweep';
import configs, { contexts, contextFunctions } from './configs';

// Export the `sweep` function as `clear`.
export { sweep as clear };

/**
 * Finds the corresponding context function for the given element, executes it to create a new
 * context, stores it in `contexts`, infuses the element, and if needed, adds event listeners.
 *
 * @function initializeElement
 * @param {Element} element The element to infuse.
 * @param {Element} host The host element.
 * @param {Object} [data] The data object.
 */
export function initializeElement(element, host, data) {
	const tags = configs.get('tags');
	const contextFnId = configs.get('contextFunctionId');

	// Get the ID of the element's context function and remove the attribute.
	const ctxId = element.getAttribute(contextFnId);
	element.removeAttribute(contextFnId);

	// Get the element's context function.
	const ctxFn = contextFunctions.get(ctxId);

	// Execute the context function to create a new context object for the given `element`.
	const context = ctxFn.call(element, host, data, tags);
	const { constants, eventListeners, watches } = context;

	// Add it to `contexts` and infuse the element.
	contexts.set(element, context);
	infuseElement(element);

	/**
	 * Add a function to delete the element's `context` from `contexts` when the `element` is
	 * removed from the DOM.
	 */
	addCleanupFunction(element, () => {
		contexts.delete(element);
	});

	// Add event listeners.
	if (eventListeners) {
		eventListeners.forEach((callback, name) => {
			// Add the event listener to the element.
			element.addEventListener(name, callback, false);

			/**
			 * Add a function to remove the event listener when the `element` is
			 * removed from the DOM.
			 */
			addCleanupFunction(element, () => {
				element.removeEventListener(name, callback, false);
			});
		});
	}

	// Do not continue if there are no watches.
	if (!watches || watches.size === 0) {
		return;
	}

	/**
	 * Keys in `watches` are names of the constants/elements to "watch" and the values are
	 * event maps, which can be:
	 *     * A string: 'eventType1[ selector1][; eventType2[ selector2]]'
	 *     * An array: [['eventType1[ selector1][; eventType2[ selector2]]', 'parts']]
	 *     * An object: {'eventType1[ selector1][; eventType2[ selector2]]': 'parts'}
	 */
	Array.from(watches.keys()).forEach((name) => {
		const el = constants[name];
		let eventMap = watches.get(name);

		if (!(eventMap instanceof Map)) {
			// Turn `eventMap` (string, array, or object) into a `Map` instance.
			if (typeof eventMap === 'string') {
				eventMap = [[eventMap, '*']];
			} else if (!Array.isArray(eventMap)) {
				eventMap = Object.keys(eventMap).map(key => ([key, eventMap[key]]));
			}
			eventMap = new Map(eventMap);
		}

		Array.from(eventMap.keys()).forEach((key) => {
			// These are the parts that will be infused when the event is triggered.
			const parts = eventMap.get(key);

			key.trim().split(';').forEach((eventAndSelector) => {
				let selector = null;
				let eventName = eventAndSelector.trim();
				const i = eventName.indexOf(' ');

				/**
				 * If `eventName` contains a space, everything before the space is the
				 * event name and everything after the space is the selector.
				 */
				if (i !== -1) {
					selector = eventName.substr(i + 1);
					eventName = eventName.substring(0, i);
				}

				// Get a `Watch` for the `eventName` on the `el` element.
				const watch = Watch.for(el, eventName);
				// Add `element` as watcher.
				watch.addWatcher(element, { selector, parts });
			});
		});
	});
}

/**
 * Clone and infuse the given template.
 *
 * @function infuse
 * @param {Element} host The host element.
 * @param {HTMLTemplate} template The HTML template.
 * @param {Object} [data={}] Optional data object.
 * @returns {DocumentFragment} The infused document fragment.
 */
export default function infuse(host, template, data = {}) {
	const fragment = template.content.cloneNode(true);
	const selector = `[${ configs.get('contextFunctionId') }]`;
	const elements = Array.from(fragment.querySelectorAll(selector));

	// Search for, initialize, and infuse all elements that have a context function ID attribute.
	for (const element of elements) {
		initializeElement(element, host, data);
	}

	return fragment;
}

export class Host extends HTMLElement {
	constructor() {
		super();

		let { template } = this;

		if (typeof template === 'function') {
			template = template();
		}

		this.appendChild(infuse(this, template));
	}

	disconnectedCallback() {
		sweep(this);
	}
}