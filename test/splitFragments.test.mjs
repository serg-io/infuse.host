/* eslint-disable no-template-curly-in-string */
import splitFragments, { joinFragments, tagOptions } from '../lib/splitFragments.mjs';

describe('tagOptions', () => {
	it('should throw an exception when called with invalid arguments', () => {
		expect(() => tagOptions()).toThrow();
		expect(() => tagOptions(0)).toThrow();
		expect(() => tagOptions([])).toThrow();
		expect(() => tagOptions(true)).toThrow();
	});

	it('should return a valid tag options object', () => {
		const tags = ['i18n', 'date', 'currency'];
		const longest = tags.reduce((max, tag) => (tag.length > max ? tag.length : max), 0);
		const shortest = tags.reduce((min, tag) => (tag.length < min ? tag.length : min), longest);
		const options = tagOptions(tags);

		expect(options.tagsExp).toBeInstanceOf(RegExp);
		expect(options.longestTagLength).toBe(longest);
		expect(options.shortestTagLength).toBe(shortest);
		expect(options.tagsExp.toString()).toBe('/(await )?(currency|i18n|date)$/');
	});
});

describe('splitFragments', () => {
	it('should return `null` if a string doesn\'t contain expressions or template literals', () => {
		const fragments = splitFragments('String with no fragments');

		expect(fragments).toBeNull();
	});

	it('should parse a single expression correctly', () => {
		const fragments = splitFragments('${ host.price }');

		expect(fragments).toEqual([{
			hasAwait: false,
			expression: 'host.price',
		}]);
	});

	it('should parse a string with a single expression correctly', () => {
		const fragments = splitFragments('btn btn-${ host.btnType }');

		expect(fragments).toEqual([
			'btn btn-',
			{
				hasAwait: false,
				expression: 'host.btnType',
			},
		]);
	});

	it('should parse a string with multiple expressions correctly', () => {
		const str = 'Price: ${ it.price }. Count: ${ it.count }. Total: ${ it.price * it.count }';
		const fragments = splitFragments(str);

		expect(fragments).toEqual([
			'Price: ',
			{
				hasAwait: false,
				expression: 'it.price',
			},
			'. Count: ',
			{
				hasAwait: false,
				expression: 'it.count',
			},
			'. Total: ',
			{
				hasAwait: false,
				expression: 'it.price * it.count',
			},
		]);
	});

	it('should ignore single backticks', () => {
		const fragments = splitFragments('btn `btn-primary');

		expect(fragments).toBeNull();
	});

	it('should ignore double backticks', () => {
		const fragment = splitFragments('btn ``btn-primary');

		expect(fragment).toBeNull();
	});

	it('should parse a single template literal correctly', () => {
		const fragments = splitFragments('`btn btn-${ host.btnType }`');

		expect(fragments).toEqual([{
			hasAwait: false,
			template: '`btn btn-${ host.btnType }`',
		}]);
	});

	it('should recognize escaped backticks within a template literal', () => {
		const fragment = splitFragments('`btn \\`btn-primary`');

		expect(fragment).toEqual([{
			hasAwait: false,
			template: '`btn \\`btn-primary`',
		}]);
	});

	it('should parse a string with a single template literal correctly', () => {
		const fragments = splitFragments('submit-button `btn btn-${ host.btnType }`');

		expect(fragments).toEqual([
			'submit-button ',
			{
				hasAwait: false,
				template: '`btn btn-${ host.btnType }`',
			},
		]);
	});

	it('should parse tagged template literals correctly', () => {
		const options = tagOptions(['i18n']);
		const fragments = splitFragments('i18n`total`', options);

		expect(fragments).toEqual([{
			tag: 'i18n',
			hasAwait: false,
			template: '`total`',
		}]);
	});

	it('should parse a string with expressions and template literals correctly', () => {
		const options = tagOptions(['i18n']);
		const fragments = splitFragments('i18n`total`: $${ order.total }', options);

		expect(fragments).toEqual([
			{
				tag: 'i18n',
				hasAwait: false,
				template: '`total`',
			},
			': $',
			{
				hasAwait: false,
				expression: 'order.total',
			},
		]);
	});
});

describe('joinFragments', () => {
	it('should join together multiple fragments into a single line of source code', () => {
		const options = tagOptions(['i18n']);
		const fragments = splitFragments('i18n`total`: $${ order.total }', options);
		const source = joinFragments(fragments);

		expect(source).toBe('tags.i18n`total` + ": $" + (order.total)');
	});

	it('should join fragments into an event callback if the second argument is `true`', () => {
		const fragments = splitFragments('${ event ? event.target.value : "" }');
		const source = joinFragments(fragments, {}, true);

		expect(source).toBe('(event) => (event ? event.target.value : "")');
	});
});
