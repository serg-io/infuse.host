let idCounter = 1;

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
 * If the value of the named property is a function then invoke it with the object as context;
 * otherwise, return it.
 *
 * @function result
 * @param {Object} object The object.
 * @param {string} property Name of the property.
 */
export function result(object, property) {
	const value = object[property];

	return typeof value === 'function' ? value.call(object) : value;
}