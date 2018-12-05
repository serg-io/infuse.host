import { contexts } from './configs.js';
import { camelCase } from './utils.js';

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
export default function infuseElement(element, parts = '*', event) {
	let partsToInfuse;
	const context = contexts.get(element);
	const contextParts = context.parts || new Map();

	if (parts === '*') {
		partsToInfuse = contextParts;
	} else {
		// Make sure we're using an array.
		partsToInfuse = Array.isArray(parts) ? parts : [parts];
		// Map it into pairs of parts and functions.
		partsToInfuse = partsToInfuse.map(part => ([part, contextParts.get(part)]));
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
			const childNode = element.childNodes[part];
			childNode.data = value;
		} else if (part.startsWith('.')) {
			// If `part` starts with a dot, infuse the corresponding property.
			const property = camelCase(part.substr(1));
			/* eslint-disable-next-line no-param-reassign */
			element[property] = value;
		} else if (part.endsWith('?')) {
			// If `part` ends with a question mark, infuse the corresponding boolean attribute.
			const name = part.substr(0, part.length - 1);

			if (!value) {
				element.removeAttribute(name);
			} else {
				element.setAttribute(name, value === true ? '' : value);
			}
		} else {
			// Otherwise, infuse the corresponding attribute.
			element.setAttribute(part, value);
		}
	}
}