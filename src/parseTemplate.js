import { uniqueId as defaultUniqueIdFn } from './utils.js';
import configs, { contextFunctions, parsedTemplates } from './configs.js';
import parseParts, { createContextFunction } from './parseParts.js';

/**
 * Finds and parses all the expressions and template literals in all attributes and text child
 * nodes of an element.
 *
 * @function parseElement
 * @param {Element} element The element to parse. Must be an instance of [Element]
 *     (https://developer.mozilla.org/en-US/docs/Web/API/element).
 * @param {Object} options Options object.
 * @param {Function} options.uniqueId A function to generate a unique context function ID.
 * @param {Window} options.window The window object to use during the parsing process.
 * @param {Set} [options.iterationConstants] Names of constant iteration variables defined by a
 *     parent template element.
 * @returns {Object} The same parse result object returned by `parseParts` or `undefined` if
 *     the result doesn't contain any parts.
 */
export function parseElement(element, options) {
	const { uniqueId } = options;
	const result = parseParts(element, options.window);
	const { parts, eventListeners } = result;
	const contextFnId = configs.get('contextFunctionId');

	/**
	 * Create a context function and add it to `contextFunctions` if the parse result object
	 * contains parts.
	 */
	if (parts.size !== 0 || eventListeners.size !== 0) {
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
 * descendants (including all levels of nested templates). Parsed templates will be added to the
 * `parseTemplates` map and generated context functions will be added to the `contextFunctions`
 * map. Both maps, `parsedTemplates` and `contextFunctions`, are part of the configs module.
 *
 * @function parseTemplate
 * @param {HTMLTemplateElement} template The template element to parse. Must be an instance of
 *     [HTMLTemplateElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement).
 * @param {Object} [parseOptions={}] Parse options object.
 * @param {Function} [parseOptions.uniqueId] A function to generate unique ID values during the
 *     parsing process. If not provided, the `uniqueId` function from the "utils" module will be
 *     used by default.
 * @param {Window} [parseOptions.window] The window object to use during the parsing process. If
 *     not provided, it will try to use the global `window` variable.
 */
export default function parseTemplate(template, parseOptions = {}) {
	const options = { ...parseOptions };

	if (!options.uniqueId) {
		options.uniqueId = defaultUniqueIdFn;
	}
	if (!options.window && typeof window !== 'undefined') {
		options.window = window;
	}

	const { uniqueId } = options;
	const templateId = configs.get('templateId');
	const placeholderId = configs.get('placeholderId');
	const { HTMLTemplateElement, NodeFilter } = options.window;

	if (!(template instanceof HTMLTemplateElement)) {
		throw new TypeError('The `template` must be an instance of `HTMLTemplateElement`');
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
		tid = uniqueId('template', template);
		template.setAttribute(templateId, tid);
	}

	// Parse the <template> element.
	const result = parseElement(template, options);

	/**
	 * If the template is defining `forVariableNames`, add them to `options.iterationConstants`
	 * (which must be an instance of `Set`) before parsing its descendants.
	 */
	if (result !== undefined) {
		const names = result.forVariableNames;

		if (names.length > 0) {
			if (!options.iterationConstants) {
				options.iterationConstants = new Set();
			}

			names.forEach(name => options.iterationConstants.add(name));
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