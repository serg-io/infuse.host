import { camelCase, config } from './core';
import splitFragments, { joinFragments } from './splitFragments';

const ITERATION_CONSTANT_TYPES = ['value', 'key', 'collection'];

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
 *     searchName('const-foo', /const-(\w+)/);
 *     searchName('foo-const', /(\w+)-const/);
 *     searchName('var-foo-const', /var-(\w+)-const/);
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
 * @param {Object} [options] Configuration options object.
 * @returns {Object} A "parse result" object (which can be used to create a context function using
 *     `createContextFunction`) with the following properties:
 *     * `constants`: An object with constant variable names and the expressions (strings) to
 *         define them when a new context is created. Hyphenated variable names are turned into
 *         camelCase.
 *     * `eventListeners`: A `Map` of event listeners to add to each new instance of the element.
 *     * `isAsync`: Indicates if one of the `constants` or `watches` use "await".
 *     * `iterationConstants`: If the `element` is a <template> element and it has the "for"
 *         attribute, this object will contain the name of the constants to use in each iteration.
 *     * `parts`: A `Map` of parts and their corresponding callback expressions (strings).
 *     * `parsedAttributeNames`: An array of all the parsed attribute names.
 *     * `parsedChildNodes`: An array of all the parsed child node (text nodes) indexes.
 *     * `watches`: A `Map` of events in which the element, or parts of it, must be re-infused.
 */
export default function parseParts(element, options) {
	const constants = {};
	const parts = new Map();
	const watches = new Map();
	const parsedChildNodes = [];
	const iterationConstants = {};
	const parsedAttributeNames = [];
	const eventListeners = new Map();
	const { HTMLTemplateElement, Node } = config(options, 'window');
	const expressions = config(options, 'constantExp', 'listenerExp', 'watchExp');
	const { constantExp, listenerExp, watchExp } = expressions;

	let isAsync = false;

	for (let i = 0; i < element.attributes.length; i++) {
		let { name, value } = element.attributes.item(i);

		const constantName = searchName(name, constantExp);
		const eventName = searchName(name, listenerExp);
		const watchName = searchName(name, watchExp);

		const isConstant = constantName !== null;
		const isEventListener = eventName !== null;
		const isFor = name === 'for' && element instanceof HTMLTemplateElement;
		const isWatch = watchName !== null;

		/**
		 * The opening ('${') and closing ('}') expression brackets are optional for event
		 * listeners. Add them if the value doesn't have them.
		 */
		if (isEventListener) {
			value = value.trim();

			// Remove semi-colon if it ends with one.
			if (value.endsWith(';')) {
				value = value.substr(0, value.length - 1);
			}

			if (!value.startsWith('${') && !value.endsWith('}')) {
				value = `\${${ value }}`;
			}
		}

		const fragments = splitFragments(value, options);
		const hasFragments = fragments !== null;

		/**
		 * Ignore attribute and continue to the next one if there are no fragments and it's not:
		 * a constant, event listener, "for" attribute, or watch.
		 */
		if (!hasFragments && !isConstant && !isEventListener && !isFor && !isWatch) {
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
			value = hasFragments ? joinFragments(fragments, options) : JSON.stringify(value);
			constants[camelCase(constantName)] = value;
			continue;
		}

		// If it's defining a watch, add it to the `watches` object.
		if (isWatch) {
			if (hasFragments) {
				value = joinFragments(fragments, options);
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
		if (isEventListener) {
			// Join the fragments and add it to `eventListeners`.
			const callbackCode = joinFragments(fragments, options, true);
			eventListeners.set(camelCase(eventName), callbackCode);
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
		eventListeners,
		isAsync,
		iterationConstants,
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
 * @param {Object} [options] Configuration options object.
 * @returns {string} The source code of the body of a context function.
 */
export function contextSourceCode(parseResult, options) {
	const context = {};
	const tagsName = config(options, 'tagsName');
	const dataConstants = [...config(options, 'dataConstants')];
	const { constants, eventListeners, iterationConstants, parts, watches } = parseResult;
	// Name of constant variables declared in the element using "const-*" attributes.
	const names = Object.keys(constants);
	// Each string in `constLines` declares one or more constant variables.
	const constLines = [`const [host, data, ${ tagsName }] = arguments;`];
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

	/**
	 * Add `constants`, `eventListeners`, `iterationConstants`, and `watches` to the object
	 * returned by the context function.
	 */
	context.constants = `{ ${ [...notOverwritten, ...names, 'host', 'data'].join(', ') } }`;
	if (eventListeners.size > 0) {
		context.eventListeners = `new Map([${
			Array.from(eventListeners).map(([name, src]) => `["${ name }", ${ src }]`).join(',')
		}])`;
	}
	if (Object.keys(iterationConstants).length > 0) {
		context.iterationConstants = JSON.stringify(iterationConstants);
	}
	if (watches.size > 0) {
		context.watches = `new Map([${
			Array.from(watches).map(([name, src]) => `["${ name }", ${ src }]`).join(',')
		}])`;
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
 * @param {Object} [options] Configuration options object.
 * @returns {Function|AsyncFunction} The context function.
 */
export function createContextFunction(parseResult, options) {
	const { isAsync } = parseResult;
	const source = contextSourceCode(parseResult, options);

	// eslint-disable-next-line no-new-func
	return isAsync ? new AsyncFunction(source) : new Function(source);
}