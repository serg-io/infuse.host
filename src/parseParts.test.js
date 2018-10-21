/* eslint-disable no-template-curly-in-string */
import domino, { impl as window } from 'domino';
import parseParts, {
	searchName,
	contextSourceCode,
	createContextFunction,
} from './parseParts';

const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

describe('searchName', () => {
	it('should find a "name" using a string prefix', () => {
		expect(searchName('c-foo', 'c-')).toBe('foo');
		expect(searchName('const-foo', 'const-')).toBe('foo');
	});

	it('should find a "name" using a regular expression', () => {
		expect(searchName('const-foo', /const-(\w+)/)).toBe('foo');
		expect(searchName('foo-const', /(\w+)-const/)).toBe('foo');
		expect(searchName('var-foo-const', /var-(\w+)-const/)).toBe('foo');
	});

	it('should return null if no "name" was found', () => {
		expect(searchName('const-', 'const-')).toBeNull();
		expect(searchName('constfoo', 'const-')).toBeNull();
	});
});

describe('parseParts', () => {
	function parse(html) {
		const doc = domino.createDocument(`<body>${ html }</body>`);
		const element = doc.body.firstElementChild;

		return parseParts(element, window);
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

	it('should parse watches that have a string as their value', () => {
		const { watches } = parse('<div watch-host="click .btn"></div>');
		expect(watches.get('host')).toBe('"click .btn"');
	});

	it('should parse watches that have an array as their value', () => {
		const { watches } = parse('<div watch-host="[[\'disabled?\', \'change select\']]"></div>');
		expect(watches.get('host')).toBe('[[\'disabled?\', \'change select\']]');
	});

	it('should parse watches that have an expression as their value', () => {
		const { watches } = parse('<div watch-host="${ this.updateEventsMap }"></div>');
		expect(watches.get('host')).toBe('(this.updateEventsMap)');
	});

	it('should detect if a context function should be async', () => {
		const resultA = parse('<div const-foo="${ host.bar }"></div>');
		const resultB = parse('<div const-foo="${ await host.bar() }"></div>');
		const resultC = parse('<div watch-host="${ host.bar }"></div>');
		const resultD = parse('<div watch-host="${ await host.bar() }"></div>');

		expect(resultA.isAsync).toBe(false);
		expect(resultB.isAsync).toBe(true);
		expect(resultC.isAsync).toBe(false);
		expect(resultD.isAsync).toBe(true);
	});

	it('should parse the "value" iteration constant from the "for" attribute a template', () => {
		const html = '<template for="val" each="${ host.collection }"></template>';
		const { forVariableNames } = parse(html);
		const [value, key, collection] = forVariableNames;

		expect(value).toBe('val');
		expect(key).toBeUndefined();
		expect(collection).toBeUndefined();
	});

	it('should parse "value" and "key" iteration constants from the "for" attribute a template', () => {
		const html = '<template for="[val, k]" each="${ host.collection }"></template>';
		const { forVariableNames } = parse(html);
		const [value, key, collection] = forVariableNames;

		expect(value).toBe('val');
		expect(key).toBe('k');
		expect(collection).toBeUndefined();
	});

	it('should parse all iteration constants from the "for" attribute a template', () => {
		const html = '<template for="[val, k, items]" each="${ host.collection }"></template>';
		const { forVariableNames } = parse(html);
		const [value, key, collection] = forVariableNames;

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

	describe('when parsing forVariableNames of a template using the "for" attribute', () => {
		function parseFor(value) {
			const html = `<template for="${ value }" each="\${ host.collection }"></template>`;
			return parse(html);
		}

		it('should parse the first name as "value"', () => {
			const result = parseFor('item');
			expect(result.forVariableNames[0]).toBe('item');
		});

		it('should parse the first two names as "value" and "key"', () => {
			const result = parseFor('item, i');

			expect(result.forVariableNames[0]).toBe('item');
			expect(result.forVariableNames[1]).toBe('i');
		});

		it('should parse "value", "key", and "collection" in order', () => {
			const result = parseFor('item, i, list');

			expect(result.forVariableNames[0]).toBe('item');
			expect(result.forVariableNames[1]).toBe('i');
			expect(result.forVariableNames[2]).toBe('list');
		});

		it('should ignore square brackets', () => {
			const result = parseFor('[item, i, list]');

			expect(result.forVariableNames[0]).toBe('item');
			expect(result.forVariableNames[1]).toBe('i');
			expect(result.forVariableNames[2]).toBe('list');
		});
	});
});

describe('contextSourceCode', () => {
	const SOURCE_CODE = `	const [host, data, iterationData, tags] = arguments;

	return {
		constants: { host, data },
		parts: new Map([["class", (event) => "btn btn-" + (host.btnClass)]])
	};`;

	function contextSrc(html) {
		const doc = domino.createDocument(`<body>${ html }</body>`);
		const element = doc.body.firstElementChild;
		const parseResult = parseParts(element, window);

		return contextSourceCode(parseResult);
	}

	it('should return source code', () => {
		const src = contextSrc('<div class="btn btn-${ host.btnClass }"></div>');

		expect(typeof src).toBe('string');
		expect(src).toBe(SOURCE_CODE);
	});
});

describe('createContextFunction', () => {
	function contextFn(html) {
		const doc = domino.createDocument(`<body>${ html }</body>`);
		const element = doc.body.firstElementChild;
		const parseResult = parseParts(element, window);

		return createContextFunction(parseResult);
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
		const foo = 10;
		const fn = contextFn('<p const-total="${ host.foo }">Total: ${ total }</p>');
		const host = { foo };
		const ctx = fn(host);
		const callback = ctx.parts.get(0);

		// Changing the host's property should not affect the constant.
		host.total = 99;

		expect(ctx.parts.size).toBe(1);
		expect(callback()).toBe('Total: 10');
		expect(ctx.constants.total).toBe(foo);
	});
});