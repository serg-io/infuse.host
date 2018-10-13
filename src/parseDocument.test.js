import parseDocument, { getDoctype } from './parseDocument';

// Default DOCTYPE (HTML5).
const DOCTYPE = '<!DOCTYPE html>';

describe('getDocype', () => {
	it('should return null for documents that have no DTD', () => {
		const document = { doctype: null };
		const doctype = getDoctype(document);

		expect(doctype).toBeNull();
	});

	it('should return a valid DOCTYPE for "HTML 5" documents', () => {
		const document = {
			doctype: {
				name: 'html',
				publicId: '',
				systemId: '',
			},
		};
		const doctype = getDoctype(document);

		expect(doctype).toEqual(DOCTYPE);
	});

	it('should return a valid DOCTYPE for "HTML 4.01 Strict" documents', () => {
		const document = {
			doctype: {
				name: 'html',
				publicId: '-//W3C//DTD HTML 4.01//EN',
				systemId: 'http://www.w3.org/TR/html4/strict.dtd',
			},
		};
		const doctype = getDoctype(document);

		expect(doctype).toEqual('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">');
	});
});

describe('parseDocument', () => {
	// Empty <div>.
	const DIV = '<div></div>';

	it('should parse HTML into an instance of Document', () => {
		const { document, window } = parseDocument(DIV);
		expect(document).toBeInstanceOf(window.Document);
	});

	it('should extract the document\'s DOCTYPE string', () => {
		const { doctype } = parseDocument(`${ DOCTYPE }\n${ DIV }`);
		expect(doctype).toEqual(DOCTYPE);
	});

	it('should use an HTML5 DOCTYPE by default', () => {
		const { doctype } = parseDocument(DIV);
		expect(doctype).toEqual(DOCTYPE);
	});

	it('should calculate a hash from the document', () => {
		const { hash } = parseDocument(DIV);
		expect(hash).toEqual('f9df91370d9b344946e23cbcd6a1541f');
	});

	describe('when parsing partial HTML (HTML without <html> and <body>)', () => {
		it('should put a <template> inside a <body>', () => {
			const template = `<template>${ DIV }</template>`;
			const { document } = parseDocument(template);

			expect(document.body.outerHTML).toEqual(`<body>${ template }</body>`);
		});

		it('should put HTML, that doesn\'t start with a <template>, inside a <template>', () => {
			const { document } = parseDocument(DIV);
			expect(document.body.outerHTML).toEqual(`<body><template>${ DIV }</template></body>`);
		});
	});
});