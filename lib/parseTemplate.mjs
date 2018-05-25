import { createTagSettings } from './splitFragments.mjs';
import { config, contextFunctions, parsedTemplates } from './core.mjs';
import parseParts, { createContextFunction } from './parseParts.mjs';

/**
 * Finds and parses all the expressions and template literals in all attributes and text child
 * nodes of an element.
 *
 * @function parseElement
 * @param {Element} element The element to parse. Must be an instance of [Element]
 *     (https://developer.mozilla.org/en-US/docs/Web/API/element).
 * @param {Object} [options] Configuration options object.
 * @param {Object} [tagSettings] Settings to use when searching for tag functions that precede
 *     template literals. Must be created using the `createTagSettings` function.
 * @returns {Object} The same parse result object returned by `parseParts` or `undefined` if
 *     the result doesn't contain any parts.
 */
export function parseElement(element, options, tagSettings) {
	const result = parseParts(element, options, tagSettings);
	const { contextFnId, uniqueId } = config(options, 'contextFnId', 'uniqueId');

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
 * @param {Object} [configOptions] Configuration options object.
 * @param {Object} [searchTagSettings] Settings to use when searching for tag functions that precede
 *     template literals. Must be created using the `createTagSettings` function.
 */
export default function parseTemplate(template, configOptions, searchTagSettings) {
	let tagSettings = searchTagSettings;
	const options = { ...configOptions };
	const { HTMLTemplateElement, NodeFilter } = config(options, 'window');
	const { placeholderId, templateId } = config(options, 'placeholderId', 'templateId');

	/**
	 * If `searchTagSettings` was not given, check if `options.tags` is a non-empty array to create
	 * a "tag settings" object.
	 */
	if (!tagSettings) {
		const tags = config(options, 'tags');
		tagSettings = Array.isArray(tags) && tags.length > 0 ? createTagSettings(tags) : {};
	}

	// Convert `options.dataConstans` into a `Set` if it's an array.
	if (Array.isArray(options.dataConstans) && options.dataConstans.length > 1) {
		options.dataConstans = new Set(options.dataConstans);
	}

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
		const uniqueId = config(options, 'uniqueId');

		tid = uniqueId('template', template);
		template.setAttribute(templateId, tid);
	}

	// Parse the <template> element.
	const result = parseElement(template, options, tagSettings);

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
			 * and put it right beside the parent `template`.
			 */
			parseTemplate(element, options, tagSettings);

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
			parseElement(element, options, tagSettings);
		}
	}
}
