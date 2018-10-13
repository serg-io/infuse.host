let idCounter = 1;

export const parsedTemplates = new Map();

export const contextFunctions = new Map();

/**
 * Generates a unique ID with an optional prefix. Inspired by Underscore's [uniqueId]
 * (http://underscorejs.org/#uniqueId) function.
 *
 * @function uniqueId
 * @param {string} [prefix] If provided, the ID will be prefixed with this value.
 * @returns {string} A globally unique ID.
 */
export function uniqueId(prefix) {
	return `${ prefix || '' }${ idCounter++ }`;
}

/**
 * Turns a hyphenated string into camel case. For instance, given "first-name" it will return
 * "firstName".
 *
 * @function camelCase
 * @param {string} hyphenated The hyphenated string.
 * @returns {string} The camel case version of the hyphenated string.
 */
export function camelCase(hyphenated) {
	return hyphenated.split('-').map((str, k) => (
		k === 0 ? str : `${ str.charAt(0).toUpperCase() }${ str.substr(1) }`
	)).join('');
}

/**
 * Default configuration options.
 */
export const DEFAULTS = {
	/**
	 * Prefix or regular expression used to determine if an attribute is a constant variable
	 * declaration.
	 */
	constantExp: 'const-',
	/**
	 * When an element is parsed, the id of the generated context function will be set as the
	 * "data-cid" attribute of the element.
	 */
	dataCid: 'data-cid',
	/**
	 * Names of the "data" constant variables to declare in all context functions. Can be
	 * overwritten using an array of strings.
	 */
	dataConstants: new Set(),
	/**
	 * Name of the attribute that indicates that an element has event listeners.
	 */
	dataListener: 'data-listener',
	/**
	 * Nested templates are replaced with "placeholder" templates. The presence of the "data-pid"
	 * attribute on a template indicates that the template is a placeholder. The value of the
	 * "data-pid" attribute can be used to found the original nested template.
	 */
	dataPid: 'data-pid',
	/**
	 * Name of the attribute that indicates that an element is a "watcher" (it's watching events
	 * that happen in another element).
	 */
	dataWatcher: 'data-watcher',
	/**
	 * Prefix or regular expression used to determine if an attribute is an event listener.
	 */
	listenerExp: 'on',
	/**
	 * Name of the "event" variable to use in event callbacks/listeners.
	 */
	eventName: 'event',
	/**
	 * Used by the createESModule to generate unique ids using the document's MD5 hash.
	 */
	hashLength: 7,
	/**
	 * Path to the "core" module to use in generated ES modules.
	 */
	infuseCorePath: 'infuse.host/src/core.js',
	/**
	 * An object that will contain all possible tag functions to be used with template literals.
	 * During parsing this can be an array of all possible tag function names. However, at run
	 * time, this must be an object where the keys are the names of the tag functions and the
	 * values are the tag functions.
	 */
	tags: {},
	/**
	 * Name of the variable that contains all the tag functions.
	 */
	tagsName: 'tags',
	/**
	 * After parsing a template element, a unique id is generated and is set as the template's
	 * "data-tid" attribute.
	 */
	dataTid: 'data-tid',
	/**
	 * Default function to generate unique ids.
	 */
	uniqueId,
	/**
	 * Prefix or regular expression used to determine if an attribute is a "watch" (event(s) in
	 * which an element, or parts of it, must be re-infused).
	 */
	watchExp: 'watch-',
	/**
	 * Default window variable.
	 */
	window: typeof window !== 'undefined' ? window : undefined,
};

/**
 * Iterates through the given configuration `options` and overwrites the corresponding default
 * configuration options.
 *
 * @function loadConfigs
 * @param {Object} options Configuration options object.
 * @returns {undefined}
 */
export function loadConfigs(options) {
	// Filter out `keys` from `options` that are not in `DEFAULTS`.
	const keys = Object.keys(options).filter(key => !!DEFAULTS[key]);

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		DEFAULTS[key] = options[key];
	}
}

/**
 * Returns one or more configuration options. If any of the specified configuration options are not
 * present in the given `options` object, the corresponding default values are returned instead.
 *
 * @function config
 * @param {Object} options Configuration options object. Attributes in this object overwrite the
 *     default configuration options.
 * @param {...string} names Name(s) of the configuration option(s) to get. If only one name is
 *     given, the value of that option is returned. Otherwise, an object with the specified options
 *     is returned.
 * @returns {(*|Object)}
 */
export function config(options, ...names) {
	const opts = options || {};

	if (names.length === 1) {
		const name = names[0];
		return opts[name] || DEFAULTS[name];
	}

	return names.reduce((obj, name) => ({ ...obj, [name]: opts[name] || DEFAULTS[name] }), {});
}