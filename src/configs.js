// Stores all the contexts objects created the first time an element is infused.
export const contexts = new WeakMap();

// Stores parsed templates.
export const parsedTemplates = new Map();

// Stores generated context functions.
export const contextFunctions = new Map();

/**
 * Default configuration options.
 */
export const DEFAULTS = [
	/**
	 * Prefix or regular expression used to determine if an attribute is a constant variable
	 * declaration.
	 */
	['constantExp', 'const-'],
	/**
	 * When an element is parsed, an attribute will be set on the element with the ID of the
	 * generated context function. This configuration option is the name of that attribute.
	 */
	['contextFunctionId', 'data-cid'],
	/**
	 * Names of the "data" constant variables to declare in all context functions. Can be
	 * overwritten using an array of strings.
	 * TODO: Is this used?
	 */
	['dataConstants', new Set()],
	/**
	 * Name of the attribute that indicates that an element has event listeners.
	 * TODO: Remove this after refeactoring EventListener.
	 */
	['dataListener', 'data-listener'],
	/**
	 * Name of the placeholder ID attribute. Nested templates are replaced with "placeholder"
	 * templates. The presence of the placeholder ID attribute on a template indicates that the
	 * template is a placeholder. The value of the placeholder ID attribute can be used to find
	 * the original nested template.
	 */
	['placeholderId', 'data-pid'],
	/**
	 * Name of the attribute that indicates that an element is a "watcher" (it's watching events
	 * that happen in another element).
	 * TODO: Remove this after refeactoring EventListener.
	 */
	['dataWatcher', 'data-watcher'],
	/**
	 * Prefix or regular expression used to determine if an attribute is an event listener.
	 */
	['listenerExp', 'on'],
	/**
	 * Name of the "event" variable to use in event callbacks/listeners.
	 */
	['eventName', 'event'],
	/**
	 * Name of the attribute that indicates an element must be sweept when it's removed from
	 * the DOM.
	 */
	['sweepFlag', 'data-sweep'],
	/**
	 * An object that will contain all possible tag functions to be used with template literals.
	 * During parsing this can be an array of all possible tag function names. However, at run
	 * time, this must be an object where the keys are the names of the tag functions and the
	 * values are the tag functions.
	 */
	['tags', {}],
	/**
	 * Name of the variable that contains all the tag functions.
	 */
	['tagsName', 'tags'],
	/**
	 * Name of the template ID attribute. After parsing a template element, a template ID attribute
	 * is set on the template element. This configuration option is the name of that attribute.
	 */
	['templateId', 'data-tid'],
	/**
	 * Prefix or regular expression used to determine if an attribute is a "watch" (event(s) in
	 * which an element, or parts of it, must be re-infused).
	 */
	['watchExp', 'watch-'],
];

// Container for configuration options.
const configs = new Map(DEFAULTS);
export { configs as default };

/**
 * Sets configuration options.
 *
 * @function setConfigs
 * @param {Object} options Configuration options object.
 */
export function setConfigs(options) {
	if (Array.isArray(options)) {
		options.forEach(([key, value]) => configs.set(key, value));
	} else {
		Object.keys(options).forEach(key => configs.set(key, options[key]));
	}
}