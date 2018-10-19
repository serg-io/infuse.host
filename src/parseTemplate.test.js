/* eslint-disable no-template-curly-in-string */
import domino, { impl as window } from 'domino';
import parseTemplate, { parseElement } from './parseTemplate';
import { uniqueId } from './utils';
import { contextFunctions, setConfigs, parsedTemplates } from './configs';

const OPTIONS = { uniqueId, window };

function parseHTMLElement(html) {
	const doc = domino.createDocument(`<body>${ html }</body>`);
	return doc.body.firstElementChild;
}

describe('parseElement', () => {
	let element;

	beforeEach(() => {
		element = parseHTMLElement('<p>Total: ${ host.total }</p>');
	});

	it('should parse an element and adds a context function to contextFunctions', () => {
		parseElement(element, OPTIONS);
		expect(contextFunctions.size).toBe(1);
	});

	it('should add a data-cid attribute to the parsed element', () => {
		parseElement(element, OPTIONS);
		expect(element.hasAttribute('data-cid')).toBe(true);
	});

	it('should add a custom context function id attribute to the parsed element', () => {
		setConfigs({ contextFunctionId: 'ctx-id' });
		parseElement(element, OPTIONS);
		expect(element.hasAttribute('ctx-id')).toBe(true);
	});

	it('should use the data-cid attribute if the element has one', () => {
		setConfigs({ contextFunctionId: 'data-cid' });
		element = parseHTMLElement('<p data-cid="fancyParagraph1">${ host.foo }</p>');
		parseElement(element, OPTIONS);

		expect(contextFunctions.has('fancyParagraph1')).toBe(true);
	});

	it('should use the custom context function id attribute if the element has one', () => {
		setConfigs({ contextFunctionId: 'ctx-id' });
		element = parseHTMLElement('<p ctx-id="fancyParagraph2">${ host.foo }</p>');
		parseElement(element, OPTIONS);

		expect(contextFunctions.has('fancyParagraph2')).toBe(true);
	});
});

describe('parseTemplate', () => {
	it('should throw an exception when called with an element that is not a template', () => {
		const div = parseHTMLElement('<div></div>');

		expect(() => parseTemplate(div, OPTIONS)).toThrow();
	});

	describe('when called with a template', () => {
		let template;

		beforeEach(() => {
			template = parseHTMLElement('<template></template>');
		});

		it('should return undefined', () => {
			const result = parseTemplate(template, OPTIONS);

			expect(result).toBeUndefined();
		});

		it('should add the template to parsedTemplates', () => {
			const before = parsedTemplates.size;

			parseTemplate(template, OPTIONS);
			expect(parsedTemplates.size).toBe(before + 1);
		});

		it('should not parse the same template twice', () => {
			const before = parsedTemplates.size;

			parseTemplate(template, OPTIONS);
			parseTemplate(template, OPTIONS);

			expect(parsedTemplates.size).toBe(before + 1);
		});

		it('should add a data-tid attribute to the template', () => {
			parseTemplate(template, OPTIONS);
			expect(template.hasAttribute('data-tid')).toBe(true);
		});

		it('should add a custom template id attribute to the template', () => {
			setConfigs({ templateId: 'id' });
			parseTemplate(template, OPTIONS);

			expect(template.hasAttribute('id')).toBe(true);
		});

		it('should use the data-tid attribute if the template has one', () => {
			setConfigs({ templateId: 'data-tid' });
			template = parseHTMLElement('<template data-tid="fancyTemplate1"></template>');
			parseTemplate(template, OPTIONS);

			expect(parsedTemplates.has('fancyTemplate1')).toBe(true);
		});

		it('should use a custom template id attribute if the template has one', () => {
			setConfigs({ templateId: 'id' });
			template = parseHTMLElement('<template id="fancyTemplate2"></template>');
			parseTemplate(template, OPTIONS);

			expect(parsedTemplates.has('fancyTemplate2')).toBe(true);
		});
	});

	it('should parse the contents of template', () => {
		const before = contextFunctions.size;
		const html = '<template><ul><li>${ host.foo }<li>${ host.bar }</li></ul></template>';
		const template = parseHTMLElement(html);

		parseTemplate(template, OPTIONS);
		expect(contextFunctions.size).toBe(before + 2);
	});

	it('should parse nested templates', () => {
		const htmlBefore = '<template id="outerTempl"><template id="innerTempl"><p>${ host.foo }</p></template></template>';
		const htmlAfter = '<template id="outerTempl"><template pid="innerTempl"></template></template>';

		const before = parsedTemplates.size;
		const outerTemplate = parseHTMLElement(htmlBefore);
		const innerTemplate = outerTemplate.content.firstChild;
		setConfigs({ templateId: 'id', placeholderId: 'pid' });

		parseTemplate(outerTemplate, OPTIONS);

		expect(parsedTemplates.size).toBe(before + 2);
		expect(parsedTemplates.has('outerTempl')).toBe(true);
		expect(parsedTemplates.has('innerTempl')).toBe(true);
		expect(outerTemplate.outerHTML).toBe(htmlAfter);
		expect(outerTemplate.nextSibling).toBe(innerTemplate);
	});
});