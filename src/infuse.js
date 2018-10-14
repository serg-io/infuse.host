import EventListener from './EventListener';
import { camelCase, config, contextFunctions, loadConfigs } from './core';

export { loadConfigs };

// Stores all the contexts generated each time an element is infused.
export const contexts = new WeakMap();

const PART_SYNTAX_HELP = 'Make sure the part name is spelled correctly. If it\'s a property, it must start with a dot, if it\'s a boolean attribute, it must end with a question mark.';

/**
 * Infuses all or some of the parts of an element.
 *
 * @function infuseElement
 * @param {Element} element The element to infuse.
 * @param {(string|number)} [parts='*'] The parts of the element to infuse. This can be a string,
 *     to infuse a single attribute, property, or boolean attribute, zero or a positive integer,
 *     to infuse a single text child node, an array of strings and integers, to infuse multiple
 *     parts, or an asterisk ('*') to infuse all parts.
 * @param {Event} event The `Event` instance that triggered the infusion.
 */
export function infuseElement(element, parts = '*', event) {
	let partsToInfuse;
	const el = element;
	const context = contexts.get(el);

	if (parts === '*') {
		partsToInfuse = context.parts;
	} else {
		// Make sure we're using an array.
		partsToInfuse = Array.isArray(parts) ? parts : [parts];
		// Map it into pairs of parts and functions.
		partsToInfuse = partsToInfuse.map(part => ([part, context.parts.get(part)]));
		// Instantiate a `Map` of parts and their corresponding functions.
		partsToInfuse = new Map(partsToInfuse);
	}

	// Execute each function and infuse the corresponding part.
	for (const [part, fn] of partsToInfuse) {
		if (typeof fn !== 'function') {
			throw new TypeError(`Invalid part: "${ part }". ${ PART_SYNTAX_HELP }`);
		}

		const value = fn(event);

		if (typeof part === 'number') {
			// If `part` is a number, infuse the corresponding text child node.
			el.childNodes[part].data = value;
		} else if (part.startsWith('.')) {
			// If `part` starts with a dot, infuse the corresponding property.
			const property = camelCase(part.substr(1));
			el[property] = value;
		} else if (part.endsWith('?')) {
			// If `part` ends with a question mark, infuse the corresponding boolean attribute.
			const name = part.substr(0, part.length - 1);

			if (!value) {
				el.removeAttribute(name);
			} else {
				el.setAttribute(name, value === true ? '' : value);
			}
		} else {
			// Otherwise, infuse the corresponding attribute.
			el.setAttribute(part, value);
		}
	}
}

/**
 * Finds the corresponding context function for the given element, executes it to create a new
 * context, stores it in `contexts`, infuses the element, and if needed, adds event listeners.
 *
 * @function initializeElement
 * @param {Element} element The element to infuse.
 * @param {Element} host The host element.
 * @param {Object} [data] The data object.
 * @param {Object} [options] Options object.
 */
export function initializeElement(element, host, data, options) {
	const { dataCid, tags } = config(options, 'dataCid', 'tags');
	// Get the ID of the element's context function.
	const ctxId = element.getAttribute(dataCid);
	// Get the element's context function.
	const ctxFn = contextFunctions.get(ctxId);
	// Create a new context for the given `element`.
	const context = ctxFn.call(element, host, data, tags);
	const { constants, eventListeners, watches } = context;

	// Add the context to `contexts` and infuse the element.
	contexts.set(element, context);
	infuseElement(element);

	// Create/add event listeners.
	if (eventListeners && eventListeners.size > 0) {
		for (const [name, callback] of eventListeners) {
			const listener = new EventListener(element);
			listener.add(name, callback);
		}
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
				let callback;
				let eventName = eventAndSelector.trim();
				const i = eventName.indexOf(' ');
				// Create an event listener with `element` as the "watcher".
				const listener = new EventListener(el, element);

				if (i !== -1) {
					/**
					 * If `eventName` contains a space, everything before the space is the
					 * event name and everything after the space is the selector.
					 */
					const selector = eventName.substr(i + 1);
					eventName = eventName.substring(0, i);

					// Use a callback that infuses ONLY if `event.target` matches the `selector`.
					callback = (event) => {
						if (event.target.matches(selector)) {
							infuseElement(element, parts, event);
						}
					};
				} else {
					// Otherwise, use a callback that infuses regardless of the `event.target`.
					callback = event => infuseElement(element, parts, event);
				}

				listener.add(eventName, callback);
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
 * @param {Object} [options={}] Optional configuration options object.
 * @returns {DocumentFragment} The infused document fragment.
 */
export default function infuse(host, template, data = {}, options = {}) {
	const dataCid = config(options, 'dataCid');
	const fragment = template.content.cloneNode(true);

	// Search for, initialize, and infuse all elements that have the context id attribute.
	for (const element of fragment.querySelectorAll(`[${ dataCid }]`)) {
		initializeElement(element, host, data, options);
	}

	return fragment;
}

/**
 * Clears contexts and event listeners created for the given element and its descendants.
 *
 * @param {Element} element
 * @param {Object} [options={}] Optional configuration options object.
 */
export function clear(element, options) {
	const dataCid = config(options, 'dataCid');
	const selector = `[${ dataCid }]`;
	const elements = Array.from(element.querySelectorAll(selector));

	if (element.matches(selector)) {
		elements.push(element);
	}

	EventListener.clear(element);
	elements.forEach(el => contexts.delete(el));
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
		clear(this);
	}
}