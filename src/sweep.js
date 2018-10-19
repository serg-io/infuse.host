import configs from './configs';

/**
 * Keys will be elements and values will be a `Set` of callbacks that will be executed, by the
 * `sweepElement` function (which is meant to be executed when the elements are removed from the
 * DOM), to clean up data associated with the element.
 */
export const stacks = new WeakMap();

/**
 * Adds a callback to the element's stack of callbacks.
 *
 * @function add
 * @param {Element} element The element.
 * @param {Function} callback A function that cleans up some data associated with the `element`.
 */
export function addCleanupFunction(element, callback) {
	// Get the `stack` of callbacks for the given `element`.
	let stack = stacks.get(element);

	// If there's no `stack`, create a new one, add it to `stacks`, and set the flag attribute.
	if (!stack) {
		stack = new Set();
		stacks.set(element, stack);
		element.setAttribute(configs.get('sweepFlag'), '');
	}

	// Add the given `callback` to the element's `stack`.
	stack.add(callback);
}

/**
 * Executes all callbacks in the element's stack to clean up data associated with the element.
 * This is meant to be called when an element is removed from the DOM.
 *
 * @function sweepElement
 * @param {Element} element The element.
 */
export function sweepElement(element) {
	// Get the `stack` of callbacks for the given `element`.
	const stack = stacks.get(element);

	// End execution if there's no `stack`.
	if (!stack) {
		return;
	}

	// Execute each `callback` in the `stack`.
	for (const callback of stack) {
		callback();
	}

	// Clear the `stack`, remove it from `stacks`, and remove the flag attribute.
	stack.clear();
	stacks.delete(element);
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