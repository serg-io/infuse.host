import configs from './configs';

/**
 * Keys will be elements and values will be a `Set` of callbacks that will be executed, by the
 * `sweepElement` function (which is meant to be executed when the elements are removed from the
 * DOM), to clean up data associated with the element.
 */
export const queues = new WeakMap();

/**
 * Adds a callback to the element's queue of callbacks.
 *
 * @function add
 * @param {Element} element The element.
 * @param {Function} callback A function that cleans up some data associated with the `element`.
 */
export function addCleanupFunction(element, callback) {
	// Get the `queue` of callbacks for the given `element`.
	let queue = queues.get(element);

	// If there's no `queue`, create a new one, add it to `queues`, and set the flag attribute.
	if (!queue) {
		queue = new Set();
		queues.set(element, queue);
		element.setAttribute(configs.get('sweepFlag'), '');
	}

	// Add the given `callback` to the element's `queue`.
	queue.add(callback);
}

/**
 * Executes all callbacks in the element's queue to clean up data associated with the element.
 * This is meant to be called when an element is removed from the DOM.
 *
 * @function sweepElement
 * @param {Element} element The element.
 */
export function sweepElement(element) {
	// Get the `queue` of callbacks for the given `element`.
	const queue = queues.get(element);

	// End execution if there's no `queue`.
	if (!queue) {
		return;
	}

	// Execute each `callback` in the `queue`.
	for (const callback of queue) {
		callback();
	}

	// Clear the `queue`, remove it from `queues`, and remove the flag attribute.
	queue.clear();
	queues.delete(element);
	element.removeAttribute(configs.get('sweepFlag'));
}

/**
 * Searches for all elements, descendants of `element`, that have the flag attribute and "sweeps"
 * them (using `sweepElement`). The given `element` will also be sweept if it has the flag
 * attribute.
 *
 * @function sweep
 * @param {Element} element Descendants of this `element` that have the flag attribute will be
 *     "sweept". The `element` itself will also be sweept if it has the flag attribute.
 */
export default function sweep(element) {
	const selector = `[${ configs.get('sweepFlag') }]`;
	const elements = Array.from(element.querySelectorAll(selector));

	if (element.matches(selector)) {
		elements.push(element);
	}

	elements.forEach(sweepElement);
}