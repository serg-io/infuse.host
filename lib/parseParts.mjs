import splitFragments, { joinFragments, VARIABLE_NAMES } from './splitFragments.mjs';

const ITERATION_CONSTANT_TYPES = ['value', 'key', 'collection'];

/**
 * Obtain a reference to the `AsyncFunction` constructor since it's not a global variable.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction
 */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * Turns a hyphenated string into camel case. For instance, given "variable-name" it will return
 * "variableName".
 *
 * @function camelCase
 * @param {string} string The hyphenated string.
 * @returns {string} The camel case version of the hyphenated string.
 */
export function camelCase(string) {
	return string.split('-').map((str, k) => (
		k === 0 ? str : `${ str.charAt(0).toUpperCase() }${ str.substr(1) }`
	)).join('');
}

/**
 * Searches the attributes and child nodes of an element to parse:
 *
 * * Constants: Declaration of constants using "const-[variable-name]" attributes.
 * * Events: Events in which the element, or parts of the element, will be re-infused.
 * * Iteration constants: Variable names, as defined by the "for" attribute of a template element,
 *     to use when iterating over a collection of values as defined by the template's "each", "of",
 *     or "in" attributes.
 * * Parts: Parts of the element that have expressions or template literals.
 *     * Attributes.
 *     * Boolean attributes.
 *     * Properties.
 *     * Text child nodes.
 *
 * @function parseParts
 * @param {Element} element The element to parse. Must be an instance of
 *     [Element](https://developer.mozilla.org/en-US/docs/Web/API/element).
 * @param {Object} options Parse options object.
 * @returns {Object} A "parse result" object (which can be used to create a context function using
 *     `createContextFunction`) with the following properties:
 *     * `constants`: An object with constant variable names and the expressions (strings) to
 *         define them when a new context is created. Hyphenated variable names are turned into
 *         camelCase.
 *     * `events`: An object that acts as a map of events that trigger one or all "parsed" parts of
 *         the element to be re-infused.
 *     * `isAsync`: Indicates if one of the `constants` or `events` use "await".
 *     * `iterationConstants`: If the `element` is a <template> element and it has the "for"
 *         attribute, this object will contain the name of the constants to use in each iteration.
 *     * `parts`: A `Map` of parts and their corresponding callback expressions (strings).
 *     * `parsedAttributeNames`: An array of all the parsed attribute names.
 *     * `parsedChildNodes`: An array of all the parsed child node (text nodes) indexes.
 */
export default function parseParts(element, options) {
	const events = {};
	const constants = {};
	const parts = new Map();
	const parsedChildNodes = [];
	const iterationConstants = {};
	const parsedAttributeNames = [];
	const { HTMLTemplateElement, Node } = options.window;

	let isAsync = false;

	for (let i = 0; i < element.attributes.length; i++) {
		let { name, value } = element.attributes.item(i);

		// Get fragments and determine if it's a constant, event, or for attribute.
		const fragments = splitFragments(value, options);
		const hasFragments = fragments !== null;
		const isEvents = name.endsWith('-events');
		const isConstant = name.startsWith('const-');
		const isFor = name === 'for' && element instanceof HTMLTemplateElement;

		// Continue if there are no fragments and it's not a constant, event, nor for attribute.
		if (!hasFragments && !isConstant && !isFor && !isEvents) {
			continue;
		}

		parsedAttributeNames.push(name);

		// If it's a constant or event, determine if any of the `fragments` use await.
		if (hasFragments && (isConstant || isEvents)) {
			const hasAwait = fragments.find(fragment => fragment.hasAwait) !== undefined;

			if (hasAwait) {
				isAsync = true;
			}
		}

		// If it's defining a constant, add it to the `constants` object.
		if (isConstant) {
			name = camelCase(name.substr(6));
			value = hasFragments ? joinFragments(fragments, options) : JSON.stringify(value);
			constants[name] = value;
			continue;
		}

		// If it's defining an event, add it to the `events` object.
		if (isEvents) {
			name = camelCase(name.substr(0, name.length - 7));

			if (hasFragments) {
				events[name] = joinFragments(fragments, options);
			} else if (value.charAt(0) === '[' && value.charAt(value.length - 1) === ']') {
				events[name] = value;
			} else {
				events[name] = JSON.stringify(value);
			}
			continue;
		}

		// If it's defining iteration constants, parse them and add them to `iterationConstants`.
		if (isFor) {
			value = value.trim();

			if (value.startsWith('[') && value.endsWith(']')) {
				value = value.substring(1, value.length - 1);
			}

			const variableNames = value.split(',').map(str => str.trim());
			const length = Math.min(variableNames.length, ITERATION_CONSTANT_TYPES.length);

			for (let j = 0; j < length; j++) {
				const variableName = variableNames[j];
				const type = ITERATION_CONSTANT_TYPES[j];

				if (variableName) {
					iterationConstants[type] = variableName;
				}
			}
			continue;
		}

		// If it's a property (starts with a dot), turn the hyphenated `name` into camelCase.
		if (name.startsWith('.')) {
			name = `.${ camelCase(name.substr(1)) }`;
		}

		// Join the fragments and add it to `parts`.
		const callbackCode = joinFragments(fragments, options, true);
		parts.set(name, callbackCode);
	}

	if (!(element instanceof HTMLTemplateElement)) {
		/**
		 * Iterate over the child nodes, using `element.firstChild` and `node.nextSibling`
		 * (https://github.com/fgnass/domino#optimization), to parse text nodes.
		 */
		for (let i = 0, node = element.firstChild; node !== null; i++, node = node.nextSibling) {
			const { data: text, length, nodeType } = node;
			const isTextNode = nodeType === Node.TEXT_NODE && length > 3;
			const fragments = isTextNode ? splitFragments(text, options) : null;

			if (fragments !== null) {
				const callbackCode = joinFragments(fragments, options, true);
				parts.set(i, callbackCode);

				// Add the child node's index to `parsedChildNodes`.
				parsedChildNodes.push(i);
			}
		}
	}

	return {
		constants,
		events,
		isAsync,
		iterationConstants,
		parts,
		parsedAttributeNames,
		parsedChildNodes,
	};
}

/**
 * Uses a "parse result" object to generate the source code for a context function.
 *
 * @function contextSourceCode
 * @param {Object} parseResult The parse result object returned by the `parseParts` function.
 * @param {Object} options Parse options object.
 * @returns {string} The source code of the body of a context function.
 */
export function contextSourceCode(parseResult, options = {}) {
	const context = {};
	const { constants, events, iterationConstants, parts } = parseResult;
	const dataConstants = options.dataConstants ? [...options.dataConstants] : [];
	// Name of constant variables declared in the element using "const-*" attributes.
	const names = Object.keys(constants);
	const eventKeys = Object.keys(events);
	const tags = options.tagsName || VARIABLE_NAMES.tagsName;
	// Each string in `constLines` declares one or more constant variables.
	const constLines = [`const [host, data, ${ tags }] = arguments;`];
	/**
	 * `options.dataConstants` defines attributes within `data` that are meant to be used as
	 * constant variables within the context function. The `notOverwritten` array contains
	 * `dataConstants` names that are not overwritten by "const-[name]" attributes.
	 */
	const notOverwritten = dataConstants.filter(name => !names.includes(name));

	// First declare constants as defined by `options.dataConstants`.
	if (notOverwritten.length > 0) {
		constLines.push(`const { ${ notOverwritten.join(', ') } } = data;`);
	}

	// Then declare constants as defined by "const-[name]" attributes.
	for (const name of names) {
		constLines.push(`const ${ name } = ${ constants[name] };`);
	}

	// Add `constants`, `events`, and `iterationConstants` to the object returned by the function.
	if ((notOverwritten.length + names.length) > 0) {
		context.constants = `{ ${ [...notOverwritten, ...names].join(', ') } }`;
	}
	if (eventKeys.length > 0) {
		context.events = `{ ${
			eventKeys.map(name => `${ name }: ${ events[name] }`).join(', ')
		} }`;
	}
	if (Object.keys(iterationConstants).length > 0) {
		context.iterationConstants = JSON.stringify(iterationConstants);
	}

	context.parts = `new Map([${
		Array.from(parts).map(([key, src]) => `[${ JSON.stringify(key) }, ${ src }]`).join(',')
	}])`;

	return `	${ constLines.join('\n\t') }

	return {
		${ Object.keys(context).map(key => `${ key }: ${ context[key] }`).join(',\n\t\t') }
	};`;
}

/**
 * Uses a "parse result" object to create a context function.
 *
 * @function createContextFunction
 * @param {Object} parseResult The parse result object returned by the `parseParts` function.
 * @param {Object} options Parse options object.
 * @returns {Function|AsyncFunction} The context function.
 */
export function createContextFunction(parseResult, options = {}) {
	const { isAsync } = parseResult;
	const source = contextSourceCode(parseResult, options);

	// eslint-disable-next-line no-new-func
	return isAsync ? new AsyncFunction(source) : new Function(source);
}
