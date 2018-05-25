let idCounter = 1;

export const data = {};

export const tags = {};

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
 * Default configuration options.
 */
export const DEFAULTS = {
	/**
	 * When an element is parsed, the id of the generated context function will be set as the
	 * "data-cid" attribute of the element.
	 */
	contextFnId: 'data-cid',
	/**
	 * Names of the "data" constant variables to declare in all context functions. Can be
	 * overwritten using an array of strings.
	 */
	dataConstants: new Set(),
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
	infuseCorePath: 'infuse.host/lib/core.mjs',
	/**
	 * Nested templates are replaced with "placeholder" templates. The presence of the "data-pid"
	 * attribute on a template indicates that the template is a placeholder. The value of the
	 * "data-pid" attribute can be used to found the original nested template.
	 */
	placeholderId: 'data-pid',
	/**
	 * An array of all the possible tag functions that can be used with template literals.
	 */
	tags: [],
	/**
	 * Name of the variable that contains all the tag functions.
	 */
	tagsName: 'tags',
	/**
	 * After parsing a template element, a unique id is generated and is set as the template's
	 * "data-tid" attribute.
	 */
	templateId: 'data-tid',
	/**
	 * Default function to generate unique ids.
	 */
	uniqueId,
	/**
	 * Default window variable.
	 */
	window: typeof window !== 'undefined' ? window : undefined,
};

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
 * @returns {(*|Object})
 */
export function config(options, ...names) {
	const opts = options || {};

	if (names.length === 1) {
		const name = names[0];
		return opts[name] || DEFAULTS[name];
	}

	return names.reduce((obj, name) => ({ ...obj, [name]: opts[name] || DEFAULTS[name] }), {});
}
