import Watch from './Watch.js';
import { result } from './utils.js';
import infuseElement from './infuseElement.js';
import sweep, { addCleanupFunction } from './sweep.js';
import configs, { contexts, contextFunctions, parsedTemplates } from './configs.js';

// Export the `sweep` function as `clear`.
export { sweep as clear };

/**
 * Creates a context object for the given `element`.
 *
 * @function createContext
 * @param {Element} element The element for which the context will be created.
 * @param {Element} host The host element.
 * @param {Object} data The data object.
 * @param {Object} iterationData The iteration data object.
 * @returns {Object} The created context object or `undefined` if the element doesn't have the
 *     context function id attribute.
 */
export function createContext(element, host, data, iterationData) {
	const tags = configs.get('tags');
	const contextFnId = configs.get('contextFunctionId');

	// Do not proceed if the element doesn't have the context function id attribute.
	if (!element.hasAttribute(contextFnId)) {
		return undefined;
	}

	// Get the ID of the element's context function and remove the attribute.
	const ctxId = element.getAttribute(contextFnId);
	element.removeAttribute(contextFnId);

	// Get the element's context function.
	const ctxFn = contextFunctions.get(ctxId);

	// Execute the context function to create a new context object for the given `element`.
	const context = ctxFn.call(element, host, data, iterationData, tags);

	// Add it to `contexts` and infuse the element.
	contexts.set(element, context);

	// Add a function to delete the element's `context` when the `element` is removed from the DOM.
	addCleanupFunction(element, () => {
		contexts.delete(element);
	});

	return context;
}

/**
 * Creates a context for the given `element`, infuses it, and if needed, adds event listeners and
 * watches.
 *
 * @function initializeElement
 * @param {Element} element The element to infuse.
 * @param {Element} host The host element.
 * @param {Object} [data] The data object.
 * @param {Object} [iterationData] Optional iteration data object.
 */
export function initializeElement(element, host, data, iterationData) {
	const context = createContext(element, host, data, iterationData);
	const { constants, eventListeners, watches } = context;

	infuseElement(element);

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
	if (!watches) {
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
	// Create a context (if one can be created).
	const context = createContext(template, host, data, iterationData);

	// If the context couldn't be created, call infuseTemplate.
	if (!context) {
		return infuseTemplate(host, template, data, iterationData);
	}

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
 * Closed Shadow DOMs will be stored here.
 */
const closedShadowRoots = new WeakMap();

/**
 * Returns the root of the given element. The root can be a "closed" Shadow DOM, which is stored in
 * `closedShadowRoots`, an "open" Shadow DOM, which is stored in `element.shadowRoot`, or the
 * `element` itself.
 *
 * @function getRoot
 * @param {Element} element
 * @returns {(ShadowRoot|Element)}
 */
function getRoot(element) {
	return closedShadowRoots.get(element) || element.shadowRoot || element;
}

/**
 * Uses (extends) the given element class to define a custom element class that uses the `infuse`
 * function to generate its contents. The `template` getter must be overwritten to return a
 * template, which would be cloned and infused when the element is added to the DOM (when
 * `connectedCallback` is called). When the element is removed from the DOM (and
 * `disconnectedCallback` is called) all memory allocated by infuse process (associated with the
 * element **and any of its descendants**) will be cleared.
 *
 * This function defines a class that extends the given `ElementClass`. The returned class can be
 * extended to define custom elements. This function can be used to define [custom
 * element](https://developers.google.com/web/fundamentals/web-components/customelements) classes,
 * by using `HTMLElement`, or [customized built-in
 * element](https://developers.google.com/web/fundamentals/web-components/customelements#extendhtml)
 * classes, by using the class of the native element that you want to extend (for instance use
 * `HTMLLIElement` if you want to extend the native `<li>` element).
 *
 * @function CustomHost
 * @param ElementClass The element class to extend.
 * @returns The custom element class.
 */
export function CustomHost(ElementClass) {
	return class extends ElementClass {
		/**
		 * If `this.shadowRootMode` is set, this constructor creates a shadow root and renders
		 * `this.template` into the shadow root.
		 */
		constructor() {
			super();
			const mode = result(this, 'shadowRootMode');

			// If `this.shadowRootMode` is set...
			if (mode) {
				// Create a Shadow DOM.
				const shadowRoot = this.attachShadow({ mode });

				// If it's a "closed" Shadow DOM, add it to `closedShadowRoots`.
				if (mode === 'closed') {
					closedShadowRoots.set(this, shadowRoot);
				}

				// Render the element's template into the Shadow DOM.
				this.render();
			}
		}

		/**
		 * Clones and infuses `this.template` and appends the resulting fragment to the element's
		 * root (a Shadow DOM or directly to the element in the regular DOM).
		 *
		 * @method render
		 */
		render() {
			const template = result(this, 'template');

			if (template instanceof HTMLTemplateElement) {
				const root = getRoot(this);

				// Clone and infuse the `template` and append the resulting fragment to `root`.
				root.appendChild(infuse(this, template));
			}
		}

		/**
		 * Uses the template provided by the `template` getter to generate the contents of this
		 * element when the element is added to the DOM. Performs no action if the `template` getter
		 * returns a falsy value.
		 *
		 * @method connectedCallback
		 */
		connectedCallback() {
			// Call `this.render` if this element doesn't use a Shadow DOM.
			if (!this.shadowRootMode) {
				this.render();
			}
		}

		/**
		 * When the element is removed from the DOM, this method clears all memory associated with
		 * this element, **and any of its descendants**, that was allocated by infuse process.
		 *
		 * @method disconnectedCallback
		 */
		disconnectedCallback() {
			sweep(this, getRoot(this));
			closedShadowRoots.delete(this);
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