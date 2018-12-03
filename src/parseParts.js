import configs from './configs.js';
import { camelCase } from './utils.js';
import splitFragments, { joinFragments } from './splitFragments.js';

/**
 * Obtain a reference to the `AsyncFunction` constructor since it's not a global variable.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction
 */
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

/**
 * Searches for, and returns, a variable or event name within a string as indicated by the given
 * regular expression or string prefix. Returns `null` if the string doesn't match the regular
 * expression or prefix. This function is used to extract variable names or event names from
 * certain type of HTML attributes (for instance: "const-foo", "onclick", and "watch-host").
 * The following examples will return the same value "foo":
 *
 *     searchName('c-foo', 'c-');
 *     searchName('const-foo', 'const-');
 *     searchName('const-foo', /^const-(\w+)$/);
 *     searchName('foo-const', /^(\w+)-const$/);
 *     searchName('var-foo-const', /^var-(\w+)-const$/);
 *
 * @function searchName
 * @param {string} str The string in which to search for the variable or event name.
 * @param {(string|RegExp)} exp If it's a string, it's used as a prefix to check if `str` starts
 *     with `exp`. If it's a regular expression, it's used to extract the variable or event name
 *     from `str` (it must contain parentheses indicating the location of the name).
 * @returns {string} The variable or event name if one was found. Returns `null` otherwise.
 */
export function searchName(str, exp) {
	let result;

	if (exp instanceof RegExp && (result = exp.exec(str)) !== null) {
		return result[1] || null;
	}

	if (typeof exp === 'string' && str.length > exp.length && str.startsWith(exp)) {
		return str.substr(exp.length);
	}

	return null;
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
 * @param {Window} window The window object to use during the parsing process.
 * @returns {Object} A "parse result" object (which can be used to create a context function using
 *     `createContextFunction`) with the following properties:
 *     * `constants`: An object with constant variable names and the expressions (strings) to
 *         define them when a new context is created. Hyphenated variable names are turned into
 *         camelCase.
 *     * `eventListeners`: A `Map` of event listeners to add to each new instance of the element.
 *     * `forVariableNames`: If the `element` is a <template> element and it has the "for"
 *         attribute, this array will contain the name of the constants to use in each iteration.
 *         The order of the variable names follow this format: [value, key, collection].
 *     * `isAsync`: Indicates if one of the `constants` or `watches` use "await".
 *     * `parts`: A `Map` of parts and their corresponding callback expressions (strings).
 *     * `parsedAttributeNames`: An array of all the parsed attribute names.
 *     * `parsedChildNodes`: An array of all the parsed child node (text nodes) indexes.
 *     * `watches`: A `Map` of events in which the element, or parts of it, must be re-infused.
 */
export default function parseParts(element, window) {
	const constants = {};
	const parts = new Map();
	const watches = new Map();
	const parsedChildNodes = [];
	const forVariableNames = [];
	const parsedAttributeNames = [];
	const eventListeners = new Map();
	const watchExp = configs.get('watchExp');
	const constantExp = configs.get('constantExp');
	const eventHandlerExp = configs.get('eventHandlerExp');
	const camelCaseEvents = configs.get('camelCaseEvents');
	const { HTMLTemplateElement, Node } = window;

	let isAsync = false;

	for (let i = 0; i < element.attributes.length; i++) {
		let { name, value } = element.attributes.item(i);

		const constantName = searchName(name, constantExp);
		let eventName = searchName(name, eventHandlerExp);
		const watchName = searchName(name, watchExp);

		const isConstant = constantName !== null;
		const isEventHandler = eventName !== null;
		const isFor = name === 'for' && element instanceof HTMLTemplateElement;
		const isWatch = watchName !== null;

		/**
		 * Trim white space if it's an event handler. Throw an exception if it starts with ${ and
		 * ends with }.
		 */
		if (isEventHandler) {
			value = value.trim();

			if (value.startsWith('${') && value.endsWith('}')) {
				throw new SyntaxError(`Event handlers should not start with "\${" and end with "}": ${ name }="${ value }".`);
			}
		}

		const fragments = isEventHandler ? null : splitFragments(value);
		const hasFragments = fragments !== null;

		/**
		 * Ignore attribute and continue to the next one if there are no fragments and it's not:
		 * a constant, event listener, "for" attribute, or watch.
		 */
		if (!hasFragments && !isConstant && !isEventHandler && !isFor && !isWatch) {
			continue;
		}

		parsedAttributeNames.push(name);

		// If it's a constant or watch, determine if any of the `fragments` use await.
		if (hasFragments && (isConstant || isWatch)) {
			const hasAwait = fragments.find(fragment => fragment.hasAwait) !== undefined;

			if (hasAwait) {
				isAsync = true;
			}
		}

		// If it's defining a constant, add it to the `constants` object.
		if (isConstant) {
			value = hasFragments ? joinFragments(fragments) : JSON.stringify(value);
			constants[camelCase(constantName)] = value;
			continue;
		}

		// If it's defining a watch, add it to the `watches` object.
		if (isWatch) {
			if (hasFragments) {
				value = joinFragments(fragments);
			} else {
				const isArray = value.startsWith('[') && value.endsWith(']');
				const isObject = value.startsWith('{') && value.endsWith('}');

				if (!isArray && !isObject) {
					value = JSON.stringify(value);
				}
			}

			watches.set(camelCase(watchName), value);
			continue;
		}

		// If it's defining an event listener, add it to `eventListeners`.
		if (isEventHandler) {
			// Join the fragments and add it to `eventListeners`.
			const callbackCode = `(${ configs.get('eventName') }) => {${ value }}`;

			if (camelCaseEvents) {
				eventName = camelCase(eventName);
			}

			eventListeners.set(eventName, callbackCode);
			continue;
		}

		// If it's defining "for" variable names, parse them and add them to `forVariableNames`.
		if (isFor) {
			value = value.trim();

			if (value.startsWith('[') && value.endsWith(']')) {
				value = value.substring(1, value.length - 1);
			}

			const variableNames = value.split(',').map(str => str.trim());
			forVariableNames.push(...variableNames);
			continue;
		}

		// If it's a property (starts with a dot), turn the hyphenated `name` into camelCase.
		if (name.startsWith('.')) {
			name = `.${ camelCase(name.substr(1)) }`;
		}

		// Join the fragments and add it to `parts`.
		const callbackCode = joinFragments(fragments, true);
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
			const fragments = isTextNode ? splitFragments(text) : null;

			if (fragments !== null) {
				const callbackCode = joinFragments(fragments, true);
				parts.set(i, callbackCode);

				// Add the child node's index to `parsedChildNodes`.
				parsedChildNodes.push(i);
			}
		}
	}

	return {
		constants,
		eventListeners,
		forVariableNames,
		isAsync,
		parts,
		parsedAttributeNames,
		parsedChildNodes,
		watches,
	};
}

/**
 * Uses a "parse result" object to generate the source code for a context function.
 *
 * @function contextSourceCode
 * @param {Object} parseResult The parse result object returned by the `parseParts` function.
 * @param {Object} [options={}] Options object.
 * @param {Set} [options.iterationConstants] Names of constant iteration variables defined by a
 *     parent template element.
 * @returns {string} The source code of the body of a context function.
 */
export function contextSourceCode(parseResult, options = {}) {
	// `context` is the object returned by the context function.
	const context = {};
	const tagsName = configs.get('tagsName');
	const { constants, eventListeners, forVariableNames, parts, watches } = parseResult;
	const constantNames = Object.keys(constants);

	// Each string in `constLines` declares one or more constant variables.
	const constLines = [`const [host, data, iterationData, ${ tagsName }] = arguments;`];

	/**
	 * If the parsed element was inside a template element that defined "for" variable names, the
	 * name of those constants will be in the `options.iterationConstants` set. At run time, the
	 * `iterationData` (the third argument received by the context function) will be an object
	 * containing the iteration data.
	 */
	const iterationConstants = Array.from(options.iterationConstants || []);

	// If there are iteration constants, add a line to `constLines` to declare them.
	if (iterationConstants.length > 0) {
		constLines.push(`const { ${ iterationConstants.join(', ') } } = iterationData || {};`);
	}

	// Declare constants as defined by "const-[name]" attributes.
	for (const name of constantNames) {
		constLines.push(`const ${ name } = ${ constants[name] };`);
	}

	// Add `iterationConstants` at the beginning of `constantNames`.
	constantNames.unshift(...iterationConstants);

	// Add constants to `context`.
	context.constants = `{ ${ [...constantNames, 'host', 'data'].join(', ') } }`;

	// Add event listeners to `context`.
	if (eventListeners.size > 0) {
		context.eventListeners = `new Map([${
			Array.from(eventListeners).map(([name, src]) => `["${ name }", ${ src }]`).join(',')
		}])`;
	}

	/**
	 * If the parsed element was a template element and defined "for" variable names,
	 * `forVariableNames` (an array) will contain the names of those variables/constants and their
	 * order will be [value, key, collection]. If it's not empty, add `forVariableNames` to the
	 * `context` object.
	 */
	if (forVariableNames.length > 0) {
		context.forVariableNames = JSON.stringify(forVariableNames);
	}

	// Add watches to `context`.
	if (watches.size > 0) {
		context.watches = `new Map([${
			Array.from(watches).map(([name, src]) => `["${ name }", ${ src }]`).join(',')
		}])`;
	}

	// Add parts to `context`.
	context.parts = `new Map([${
		Array.from(parts).map(([key, src]) => `[${ JSON.stringify(key) }, ${ src }]`).join(',')
	}])`;

	/**
	 * Return the generated source code. The declaration of constants go at the top followed by
	 * a return statement for the `context` object.
	 */
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
 * @param {Object} [options={}] Options object.
 * @param {Set} [options.iterationConstants] Names of constant iteration variables defined by a
 *     parent template element.
 * @returns {Function|AsyncFunction} The context function.
 */
export function createContextFunction(parseResult, options = {}) {
	const { isAsync } = parseResult;
	const source = contextSourceCode(parseResult, options);

	// eslint-disable-next-line no-new-func
	return isAsync ? new AsyncFunction(source) : new Function(source);
}