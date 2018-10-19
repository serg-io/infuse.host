/* eslint-disable no-template-curly-in-string */
import domino from 'domino';
import createESModule, { uniqueIdFn } from './createESModule';

/**
 * Simulates the DOMParser class available in the browser. Uses domino to parse HTML.
 */
class DOMParser {
	// eslint-disable-next-line class-methods-use-this
	parseFromString(html) {
		return domino.createDocument(html);
	}
}

/**
 * Evaluates the source code of a module generated by the `createESModule` function and returns
 * its exports.
 *
 * @function importESModule
 * @param {string} source The source code generated by `createESModule`
 * @param {Object} [core={}] Simulates the `contextFunctions` and `parsedTemplates` exports of the
 *     core module.
 * @erturns {Object} The values exported by the ES module.
 */
function importESModule(source, core = {}) {
	const { contextFunctions, parsedTemplates } = core;

	/**
	 * Remove the first line, which imports `contextFunctions` and `parsedTemplates` from the core
	 * module. Those variables will be provided as arguments.
	 */
	let src = source.substr(source.indexOf('\n') + 1);

	// Replace the "export" syntax with an `exports` object.
	src = src.replace('export { doc as document };', 'const exports = { document: doc };');
	src = src.replace('export default', 'exports.default =');
	src = src.replace(/export const (\w+)/g, (str, name) => `const ${ name } = exports.${ name }`);

	// Add one last statement to return `exports`.
	src += '\nreturn exports;';

	// eslint-disable-next-line no-new-func
	const importModule = new Function('contextFunctions', 'parsedTemplates', 'DOMParser', src);

	return importModule(contextFunctions || new Map(), parsedTemplates || new Map(), DOMParser);
}

describe('uniqueIdFn', () => {
	// MD5 hash for "<div></div>".
	const HASH = 'f9df91370d9b344946e23cbcd6a1541f';

	it('should return a function', () => {
		const fn = uniqueIdFn(HASH);
		expect(fn).toBeInstanceOf(Function);
	});

	describe('returns a function that', () => {
		it('should return an ID that ends with the first 7 characters of the hash', () => {
			const fn = uniqueIdFn(HASH);
			const id = fn('div');

			expect(id).toBe(`div1_${ HASH.substr(0, 7) }`);
		});

		it('should return an ID that ends with the first n characters of the hash', () => {
			const n = 10;
			const fn = uniqueIdFn(HASH, n);
			const id = fn('div');

			expect(id.substr(id.length - n)).toBe(HASH.substr(0, n));
		});

		it('should not return the same ID if called multiple times with the same argument', () => {
			const fn = uniqueIdFn(HASH);
			const a = fn('div');
			const b = fn('div');

			expect(a).not.toBe(b);
		});
	});
});

describe('createESModule', () => {
	const DIV = '<div></div>';
	const { Document, HTMLTemplateElement } = domino.impl;
	const BODY = '<body><template data-tid="template1_f9df913"><div></div></template></body>';

	it('should return a string', () => {
		const source = createESModule(DIV);
		expect(typeof source).toBe('string');
	});

	it('should generate the same source code, when called twice using the same HTML', () => {
		const sourceA = createESModule(DIV);
		const sourceB = createESModule(DIV);

		expect(sourceA).toBe(sourceB);
	});

	describe('generates an ES module that', () => {
		let source;

		beforeAll(() => {
			source = createESModule(DIV);
		});

		it('should use the resulting HTML (the HTML after parsing is performed)', () => {
			expect(source).toContain(`<!DOCTYPE html>\n${ BODY }`);
		});

		describe('when executed', () => {
			let module;

			beforeAll(() => {
				module = importESModule(source, {});
			});

			it('should export a document', () => {
				const { document } = module;

				expect(document).toBeDefined();
				expect(document).toBeInstanceOf(Document);
				expect(document.body.outerHTML).toBe(BODY);
			});

			it('should export a template as the default export', () => {
				const { document, default: template } = module;
				const firstTemplate = document.querySelector('template');

				expect(template).toBeDefined();
				expect(template).toBe(firstTemplate);
				expect(template).toBeInstanceOf(HTMLTemplateElement);
				expect(template.innerHTML).toBe(DIV);
			});

			it('should export templates in the document using their ids as export names', () => {
				const names = Object.keys(module).filter(key => key.startsWith('template'));

				for (const name of names) {
					const template = module[name];

					expect(template).toBeDefined();
					expect(template).toBeInstanceOf(HTMLTemplateElement);
					expect(template.getAttribute('data-tid')).toBe(name);
				}
			});
		});

		it('should add parsed templates to the "parsedTemplates" map', () => {
			const parsedTemplates = new Map();

			importESModule(source, { parsedTemplates });

			expect(parsedTemplates.size).toBe(1);

			for (const [id, template] of parsedTemplates) {
				expect(typeof id).toBe('string');
				expect(template).toBeInstanceOf(HTMLTemplateElement);
				expect(template.getAttribute('data-tid')).toBe(id);
			}
		});

		it('should add context functions to the "contextFunctions" map', () => {
			const contextFunctions = new Map();
			const src = createESModule('<p>${ host.text }</p>');
			const { default: template } = importESModule(src, { contextFunctions });

			expect(contextFunctions.size).toBe(1);

			const id = template.content.querySelector('p').getAttribute('data-cid');

			expect(contextFunctions.has(id)).toBe(true);

			const fn = contextFunctions.get(id);

			expect(fn).toBeInstanceOf(Function);

			const host = { text: 'foo' };
			const ctx = fn(host);
			const callback = ctx.parts.get(0);

			expect(callback()).toBe('foo');

			host.text = 'bar';
			expect(callback()).toBe('bar');
		});
	});
});