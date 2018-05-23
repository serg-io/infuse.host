import { tagOptions } from './splitFragments.mjs';
import parseParts, { createContextFunction } from './parseParts.mjs';
import { contextFunctions, parsedTemplates, uniqueId as defaultUniqueIdFn } from './core.mjs';

export const DEFAULT_PARSE_OPTIONS = {
	dataConstants: new Set(),
	templateId: 'data-tid',
	contextFnId: 'data-cid',
	placeholderId: 'data-pid',
	uniqueId: defaultUniqueIdFn,
	window: typeof window !== 'undefined' ? window : undefined,
};

/**
 * Finds and parses all the expressions and template literals in all attributes and text child
 * nodes of an element.
 *
 * @function parseElement
 * @param {Element} element The element to parse. Must be an instance of [Element]
 *     (https://developer.mozilla.org/en-US/docs/Web/API/element).
 * @param {Object} parseOptions Parse options object.
 * @returns {Object} The same parse result object returned by `parseParts` or `undefined` if
 *     the result doesn't contain any parts.
 */
export function parseElement(element, parseOptions) {
	const options = { ...DEFAULT_PARSE_OPTIONS, ...parseOptions };
	const { contextFnId } = options;
	const result = parseParts(element, options);

	/**
	 * Create a context function and add it to `contextFunctions` if the parse result object
	 * contains parts.
	 */
	if (result.parts.size !== 0) {
		let cid;
		const { childNodes, tagName } = element;
		const ctxFn = createContextFunction(result, options);

		// If it already has a context id, use it. Otherwise, generate and set one.
		if (element.hasAttribute(contextFnId)) {
			cid = element.getAttribute(contextFnId);
		} else {
			const uniqueId = options.uniqueId || defaultUniqueIdFn;

			cid = uniqueId(tagName.toLowerCase(), element);
			element.setAttribute(contextFnId, cid);
		}

		contextFunctions.set(cid, ctxFn);

		// Remove parsed attributes.
		for (const name of result.parsedAttributeNames) {
			element.removeAttribute(name);
		}

		// Replace the text of parsed child nodes with an underscore character.
		for (const i of result.parsedChildNodes) {
			childNodes[i].data = '_';
		}

		return result;
	}

	return undefined;
}

/**
 * Finds and parses all the expressions and template literals in the given template and all of its
 * descendants (including all levels of nested templates).
 *
 * @function parseTemplate
 * @param {HTMLTemplateElement} template The template element to parse. Must be an instance of
 *     [HTMLTemplateElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement).
 * @param {Object} [parseOptions={}] Parse options object.
 */
export default function parseTemplate(template, parseOptions = {}) {
	let { tags, ...options } = parseOptions;

	// If a tags array was given, use it to generate "tag options" and add them to `options`.
	if (Array.isArray(tags) && tags.length > 0) {
		tags = tagOptions(tags);
		options = { ...options, ...tags };
	}

	// Convert `options.dataConstans` into a `Set` if it's an array.
	if (Array.isArray(options.dataConstans)) {
		options.dataConstans = new Set(options.dataConstans);
	}

	// Extend default options with the given `options`.
	options = { ...DEFAULT_PARSE_OPTIONS, ...options };

	const { HTMLTemplateElement, NodeFilter } = options.window;
	const { templateId, placeholderId } = options;

	if (!(template instanceof HTMLTemplateElement)) {
		throw new Error('The `template` must be an instance of `HTMLTemplateElement`');
	}

	let tid;

	// If it already has a template ID, use it. Otherwise, generate and set one.
	if (template.hasAttribute(templateId)) {
		tid = template.getAttribute(templateId);

		// If the template has already been parsed, don't parse it again.
		if (parsedTemplates.has(tid)) {
			return;
		}
	} else {
		const uniqueId = options.uniqueId || defaultUniqueIdFn;

		tid = uniqueId('template', template);
		template.setAttribute(templateId, tid);
	}

	// Parse the <template> element.
	const result = parseElement(template, options);

	// Add the template's  constants to `options.dataConstans` before parsing its descendants.
	if (result !== undefined) {
		const constants = [
			...Object.keys(result.constants),
			...Object.values(result.iterationConstants),
		];

		if (constants.length > 0) {
			options.dataConstants = new Set([...options.dataConstants, ...constants]);
		}
	}

	parsedTemplates.set(tid, template);

	const doc = template.ownerDocument;
	const iterator = doc.createNodeIterator(template.content, NodeFilter.SHOW_ELEMENT);

	// Iterate and parse all descendant nodes of the <template> element.
	for (let element; (element = iterator.nextNode()) !== null;) {
		if (element instanceof HTMLTemplateElement) {
			/**
			 * If `element` is a template, parse it, replace it with a placeholder <template>,
			 * and put right beside the parent `template`.
			 */
			parseTemplate(element, options);

			const pid = element.getAttribute(templateId);
			const placeholder = doc.createElement('template');

			placeholder.setAttribute(placeholderId, pid);

			element.parentNode.insertBefore(placeholder, element);

			if (template.nextSibling === null) {
				template.parentNode.appendChild(element);
			} else {
				template.parentNode.insertBefore(element, template.nextSibling);
			}
		} else {
			// Parse the element if it's not a template.
			parseElement(element, options);
		}
	}
}
