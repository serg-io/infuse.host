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
