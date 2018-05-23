/* eslint-disable no-template-curly-in-string */
import domino, { impl as window } from 'domino';
import parseParts, {
	camelCase,
	contextSourceCode,
	createContextFunction,
} from '../lib/parseParts.mjs';

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

describe('camelCase', () => {
	it('should turn hyphenated strings into camelCase', () => {
		expect(camelCase('variable-name')).toBe('variableName');
		expect(camelCase('date-of-birth')).toBe('dateOfBirth');
	});

	it('should return the same string if it\'s not hyphenated', () => {
		expect(camelCase('user')).toBe('user');
	});
});

describe('parseParts', () => {
	function parse(html, options) {
		const doc = domino.createDocument(`<body>${ html }</body>`);
		const element = doc.body.firstElementChild;

		return parseParts(element, { window, ...options });
	}

	it('should parse constants that have a string as their value', () => {
		const { constants } = parse('<div const-foo="bar"></div>');
		expect(constants.foo).toBe('"bar"');
	});

	it('should parse constants that have an expression to be evaluated as their value', () => {
		const { constants } = parse('<div const-foo="${ host.bar }"></div>');
		expect(constants.foo).toBe('(host.bar)');
	});

	it('should parse constants that have a string and expression as their value', () => {
		const { constants } = parse('<div const-foo="foo-${ host.bar }"></div>');
		expect(constants.foo).toBe('"foo-" + (host.bar)');
	});

	it('should parse events that have a string as their value', () => {
		const { events } = parse('<div host-events="click .btn"></div>');
		expect(events.host).toBe('"click .btn"');
	});

	it('should parse events that have an array as their value', () => {
		const { events } = parse('<div host-events="[[\'disabled?\', \'change select\']]"></div>');
		expect(events.host).toBe('[[\'disabled?\', \'change select\']]');
	});

	it('should parse events that have an expression as their value', () => {
		const { events } = parse('<div host-events="${ this.updateEventsMap }"></div>');
		expect(events.host).toBe('(this.updateEventsMap)');
	});

	it('should detect if a context function should be async', () => {
		const resultA = parse('<div const-foo="${ host.bar }"></div>');
		const resultB = parse('<div const-foo="${ await host.bar() }"></div>');
		const resultC = parse('<div host-events="${ host.bar }"></div>');
		const resultD = parse('<div host-events="${ await host.bar() }"></div>');

		expect(resultA.isAsync).toBe(false);
		expect(resultB.isAsync).toBe(true);
		expect(resultC.isAsync).toBe(false);
		expect(resultD.isAsync).toBe(true);
	});

	it('should parse the "value" iteration constant from the "for" attribute a template', () => {
		const html = '<template for="val" of="${ host.collection }"></template>';
		const { iterationConstants } = parse(html);
		const { value, key, collection } = iterationConstants;

		expect(value).toBe('val');
		expect(key).toBeUndefined();
		expect(collection).toBeUndefined();
	});

	it('should parse "value" and "key" iteration constants from the "for" attribute a template', () => {
		const html = '<template for="[val, k]" of="${ host.collection }"></template>';
		const { iterationConstants } = parse(html);
		const { value, key, collection } = iterationConstants;

		expect(value).toBe('val');
		expect(key).toBe('k');
		expect(collection).toBeUndefined();
	});

	it('should parse all iteration constants from the "for" attribute a template', () => {
		const html = '<template for="[val, k, items]" of="${ host.collection }"></template>';
		const { iterationConstants } = parse(html);
		const { value, key, collection } = iterationConstants;

		expect(value).toBe('val');
		expect(key).toBe('k');
		expect(collection).toBe('items');
	});

	it('should parse "attributes parts"', () => {
		const { parts } = parse('<input type="text" value="${ host.firstName }">');

		expect(parts.get('value')).toBe('(event) => (host.firstName)');
	});

	it('should parse "boolean attribute parts"', () => {
		const { parts } = parse('<input type="text" disabled?="${ host.foo }">');

		expect(parts.get('disabled?')).toBe('(event) => (host.foo)');
	});

	it('should parse "property parts"', () => {
		const { parts } = parse('<input type="text" .value="${ host.foo }">');

		expect(parts.get('.value')).toBe('(event) => (host.foo)');
	});

	it('should convert hyphenated property parts into camel case', () => {
		const { parts } = parse('<input type="date" .value-as-date="${ host.date }">');

		expect(parts.get('.valueAsDate')).toBe('(event) => (host.date)');
	});

	it('should return an object with an array of parsed attributes names', () => {
		const { parsedAttributeNames } = parse('<input type="text" .value="${ host.foo }">');

		expect(parsedAttributeNames).toEqual(['.value']);
	});

	it('should parse text child nodes', () => {
		const html = '<p>${ host.foo }<strong>bold text</strong>${ host.bar }</p>';
		const { parts, parsedChildNodes } = parse(html);

		expect(parts.size).toBe(2);
		expect(parsedChildNodes).toEqual([0, 2]);
		expect(parts.get(0)).toBe('(event) => (host.foo)');
		expect(parts.get(2)).toBe('(event) => (host.bar)');
	});

	describe('when parsing iterationConstants of a template using the "for" attribute', () => {
		function parseFor(value) {
			const html = `<template for="${ value }" each="\${ host.collection }"></template>`;
			return parse(html);
		}

		it('should parse "value"', () => {
			const result = parseFor('item');
			expect(result.iterationConstants.value).toBe('item');
		});

		it('should parse "value" and "key"', () => {
			const result = parseFor('item, i');

			expect(result.iterationConstants.key).toBe('i');
			expect(result.iterationConstants.value).toBe('item');
		});

		it('should parse "value", "key", and "collection"', () => {
			const result = parseFor('item, i, list');

			expect(result.iterationConstants.key).toBe('i');
			expect(result.iterationConstants.value).toBe('item');
			expect(result.iterationConstants.collection).toBe('list');
		});

		it('should ignore square brackets', () => {
			const result = parseFor('[item, i, list]');

			expect(result.iterationConstants.key).toBe('i');
			expect(result.iterationConstants.value).toBe('item');
			expect(result.iterationConstants.collection).toBe('list');
		});
	});
});

describe('contextSourceCode', () => {
	const SOURCE_CODE = `	const [host, data, tags] = arguments;

	return {
		parts: new Map([["class", (event) => "btn btn-" + (host.btnClass)]])
	};`;

	function contextSrc(html, options = {}) {
		const doc = domino.createDocument(`<body>${ html }</body>`);
		const element = doc.body.firstElementChild;
		const parseResult = parseParts(element, { window, ...options });

		return contextSourceCode(parseResult, options);
	}

	it('should return source code', () => {
		const src = contextSrc('<div class="btn btn-${ host.btnClass }"></div>');

		expect(typeof src).toBe('string');
		expect(src).toBe(SOURCE_CODE);
	});
});

describe('createContextFunction', () => {
	function contextFn(html, options = {}) {
		const doc = domino.createDocument(`<body>${ html }</body>`);
		const element = doc.body.firstElementChild;
		const parseResult = parseParts(element, { window, ...options });

		return createContextFunction(parseResult, options);
	}

	it('should return a function', () => {
		const fn = contextFn('<input type="text" .value="${ host.foo }">');

		expect(fn).toBeInstanceOf(Function);
	});

	it('should return an AsyncFunction if a constant declaration uses await', () => {
		const html = '<input type="text" const-model="${ await host.fetchModel() }">';
		const fn = contextFn(html);

		expect(fn).toBeInstanceOf(AsyncFunction);
	});

	it('should parse "attribute parts" into callbacks', () => {
		const html = '<button type="submit" class="btn btn-${ host.btnType }">Submit</button>';
		const fn = contextFn(html);
		const host = { btnType: 'primary' };
		const ctx = fn(host);
		const callback = ctx.parts.get('class');

		expect(ctx.parts.size).toBe(1);
		expect(callback()).toBe('btn btn-primary');

		host.btnType = 'secondary';
		expect(callback()).toBe('btn btn-secondary');
	});

	it('should parse "boolean attribute parts" into callbacks', () => {
		const html = '<button type="submit" disabled?="${ host.disableSubmit }">Submit</button>';
		const fn = contextFn(html);
		const host = { disableSubmit: true };
		const ctx = fn(host);
		const callback = ctx.parts.get('disabled?');

		expect(ctx.parts.size).toBe(1);
		expect(callback()).toBe(true);

		host.disableSubmit = false;
		expect(callback()).toBe(false);
	});

	it('should parse "property parts" into callbacks', () => {
		const fn = contextFn('<input type="text" .value="${ host.foo }">');
		const host = { foo: 'foo' };
		const ctx = fn(host);
		const callback = ctx.parts.get('.value');

		expect(ctx.parts.size).toBe(1);
		expect(callback()).toBe('foo');

		host.foo = 'bar';
		expect(callback()).toBe('bar');
	});

	it('should parse "text parts" into callbacks', () => {
		const fn = contextFn('<p>Total: $${ host.total }</p>');
		const host = { total: 10 };
		const ctx = fn(host);
		const callback = ctx.parts.get(0);

		expect(ctx.parts.size).toBe(1);
		expect(callback()).toBe('Total: $10');

		host.total = 99.99;
		expect(callback()).toBe('Total: $99.99');
	});

	it('should define constant variables', () => {
		const fn = contextFn('<p const-total="${ host.total }">Total: ${ total }</p>');
		const host = { total: 10 };
		const ctx = fn(host);
		const callback = ctx.parts.get(0);

		// Changing the host's property should not affect the constant.
		host.total = 99;

		expect(ctx.parts.size).toBe(1);
		expect(callback()).toBe('Total: 10');
		expect(ctx.constants).toEqual({ total: 10 });
	});
});
