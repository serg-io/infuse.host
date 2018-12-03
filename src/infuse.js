import Watch from './Watch.js';
import infuseElement from './infuseElement.js';
import sweep, { addCleanupFunction } from './sweep.js';
import configs, { contexts, contextFunctions, parsedTemplates } from './configs.js';

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
 * @param {Object} [iterationData={}] Optional iteration data object.
 */
export function initializeElement(element, host, data, iterationData = {}) {
	const tags = configs.get('tags');
	const contextFnId = configs.get('contextFunctionId');

	// Get the ID of the element's context function and remove the attribute.
	const ctxId = element.getAttribute(contextFnId);
	element.removeAttribute(contextFnId);

	// Get the element's context function.
	const ctxFn = contextFunctions.get(ctxId);

	// Execute the context function to create a new context object for the given `element`.
	const context = ctxFn.call(element, host, data, iterationData, tags);
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
		const el = name === 'this' ? element : constants[name];
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
 * @param {Element} host The host element.
 * @param {HTMLTemplate} template The HTML template element to clone and infuse.
 * @param {Object} [data={}] Optional data object.
 * @param {Object} [iterationData={}] Optional iteration data object.
 * @returns {DocumentFragment} The infused document fragment.
 */
export function infuseTemplate(host, template, data = {}, iterationData = {}) {
	const fragment = template.content.cloneNode(true);
	const selector = `[${ configs.get('contextFunctionId') }]`;

	// Search for, initialize, and infuse all elements that have a context function ID attribute.
	for (const element of Array.from(fragment.querySelectorAll(selector))) {
		initializeElement(element, host, data, iterationData);
	}

	const placeholderId = configs.get('placeholderId');

	// Search for placeholder templates and iterate over them.
	for (const placeholder of Array.from(fragment.querySelectorAll(`[${ placeholderId }]`))) {
		// Get the placeholder ID, which is the ID of the original template.
		const tid = placeholder.getAttribute(placeholderId);
		// Use the ID to get the original template.
		const nestedTemplate = parsedTemplates.get(tid);
		// Call `infuse` using the original template.
		// eslint-disable-next-line no-use-before-define
		const nestedFragment = infuse(host, nestedTemplate, data, iterationData);

		// Replace the placeholder with the fragment returned by `infuse`.
		placeholder.parentNode.replaceChild(nestedFragment, placeholder);
	}

	return fragment;
}

/**
 * Clone and infuse the given template. If the template has an "each" attribute with a valid
 * expression, it will evaluate the expression, iterate over the result, clone and infuse the
 * template once for each iteration, and join the generated fragments together.
 *
 * @function infuse
 * @param {Element} host The host element.
 * @param {HTMLTemplate} template The HTML template.
 * @param {Object} [data={}] Optional data object.
 * @param {Object} [iterationData={}] Optional iteration data object.
 * @returns {DocumentFragment} The infused document fragment.
 */
export default function infuse(host, template, data = {}, iterationData = {}) {
	const contextFnId = configs.get('contextFunctionId');

	// Call infuseTemplate if the template doesn't have a context function.
	if (!template.hasAttribute(contextFnId)) {
		return infuseTemplate(host, template, data, iterationData);
	}

	// Get the ID of the template's context function.
	const ctxId = template.getAttribute(contextFnId);

	// Get the template's context function.
	const ctxFn = contextFunctions.get(ctxId);

	// Execute the context function to create a new context object.
	const context = ctxFn.call(template, host, data, iterationData, configs.get('tags'));
	const { forVariableNames, parts } = context;
	const fn = parts.get('each');

	if (typeof fn !== 'function') {
		throw new TypeError('The template attribute "each" is either invalid or missing.');
	}

	// Evaluate the expression of the "each" attribute.
	const collection = fn();

	if (!collection || typeof collection.forEach !== 'function') {
		throw new TypeError('Evaluating the "each" expression resulted in an invalid value. The expression must return a value that has a "forEach" method, for instance: an array, a Map, or a Set.');
	}

	/**
	 * Iterate over the result of the "each" expression, calling `infuseTemplate` for each
	 * iteration, and adding the generated fragments to `fragments`.
	 */
	const fragments = [];
	collection.forEach((...args) => {
		// Create a new `iteration` data object containing the same attributes as `iterationData`.
		const iteration = { ...iterationData };

		/**
		 * Add the values of this iteration (`args` contains [value, key, collection]) to the
		 * `iteration` object using the variable names specified in the `forVariableNames` array.
		 */
		for (let i = 0; i < forVariableNames.length; i++) {
			const name = forVariableNames[i];
			iteration[name] = args[i];
		}

		// Call `infuseTemplate`, using the `iteration` object, and add `fragment` to `fragments`.
		const fragment = infuseTemplate(host, template, data, iteration);
		fragments.push(fragment);
	});

	// Return empty fragment if the iteration didn't generate any fragments.
	if (fragments.length === 0) {
		return document.createDocumentFragment();
	}

	// Join the fragments generated during the iteration and return the resulting fragment.
	return fragments.reduce((accumulator, fragment) => {
		accumulator.appendChild(fragment);
		return accumulator;
	});
}

/**
 * Uses (extends) the given element class to define a custom element class that uses the `infuse`
 * function to generate its contents. The `template` getter must be overwritten to return a
 * template, which would be cloned and infused when the element is added to the DOM (when
 * `connectedCallback` is called). When the element is removed from the DOM (and
 * `disconnectCallback` is called) all memory allocated by infuse process (associated with the
 * element **and any of its descendants**) will be cleared.
 *
 * To define a [custom element
 * class](https://developers.google.com/web/fundamentals/web-components/customelements) use
 * `HTMLElement` when calling this function. To define a [customized built-in element
 * class](https://developers.google.com/web/fundamentals/web-components/customelements#extendhtml),
 * use the class of the native element that you want to extend (for instance use `HTMLLIElement` if
 * you want to extend the native `<li>` element).
 *
 * @function CustomHost
 * @param ElementClass The element class to extend.
 * @returns The custom element class.
 */
export function CustomHost(ElementClass) {
	return class extends ElementClass {
		/**
		 * This is the only property/getter that must be overwritten in order to generate the
		 * contents of the element automatically. The function used to overwrite this getter must
		 * return a template, which will be cloned and infused when the element is added to the DOM.
		 *
		 */
		// eslint-disable-next-line class-methods-use-this
		get template() {
			return null;
		}

		/**
		 * Uses the template provided by the `template` getter to generate the contents of this
		 * element when the element is added to the DOM. Performs no action if the `template` getter
		 * returns a falsy value.
		 *
		 * @method connectedCallback
		 */
		connectedCallback() {
			let { template } = this;

			if (!template) {
				return;
			}

			if (typeof template === 'function') {
				template = template();
			}

			this.appendChild(infuse(this, template));
		}

		/**
		 * When the element is removed from the DOM, this method clears all memory associated with
		 * this element, **and any of its descendants**, that was allocated by infuse process.
		 *
		 * @method disconnectedCallback
		 */
		disconnectedCallback() {
			sweep(this);
		}
	};
}

/**
 * This class extends the `HTMLElement` class and can be used to define [custom
 * elements](https://developers.google.com/web/fundamentals/web-components/customelements).
 *
 * @class
 */
export class Host extends CustomHost(HTMLElement) {}