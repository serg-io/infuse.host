import crypto from 'crypto';
import domino from 'domino';

// Default doctype.
const DEFAULT_DOCTYPE = '<!DOCTYPE html>';

/**
 * Gets the DOCTYPE string of a document. Returns `null` if the document has no DTD:
 * https://developer.mozilla.org/en-US/docs/Web/API/document/doctype
 * Inspired by https://stackoverflow.com/a/10162353/588283
 *
 * @function getDoctype
 * @param {Document} document The document object.
 * @returns {string} The document's DOCTYPE string or `null` if it doesn't have one.
 */
export const getDoctype = function getDoctypeString(document) {
	const type = document.doctype;

	if (type === null) {
		return null;
	}

	let specs = type.name;

	if (type.publicId) {
		specs += ` PUBLIC "${ type.publicId }"`;
	}
	if (!type.publicId && type.systemId) {
		specs += ' SYSTEM';
	}
	if (type.systemId) {
		specs += ` "${ type.systemId }"`;
	}

	return `<!DOCTYPE ${ specs }>`;
};

/**
 * Parses a HTML document. An MD5 hash is alse generated using the provided `htmlDocument`.
 *
 * @function parseDocument
 * @param {(string|Document)} htmlDocument The HTML source code to parse or a parsed `Document`.
 * @returns {Object} An object with the following attributes:
 *     * `document`: The parsed document.
 *     * `doctype`: The document's DOCTYPE string.
 *     * `window`: The window used to parse the document.
 *     * `hash`: The first few characters of the MD5 hash of the provided `htmlDocument`
 */
export default function parseDocument(htmlDocument) {
	let document, doctype, html, window;

	if (typeof htmlDocument === 'string') {
		// If the `htmlDocument` is a string, use domino to parse it into a document.

		html = htmlDocument.trim();

		// If `html` has a DOCTYPE, remove it and assign it to `doctype`.
		if (html.substr(0, 10).toUpperCase() === '<!DOCTYPE ') {
			const i = html.indexOf('>', 10);
			doctype = html.substring(0, i + 1);
			html = html.substr(i + 1).trim();
		} else {
			doctype = DEFAULT_DOCTYPE;
		}

		// If `html` doesn't have a <html> and a <body>, put it inside a <body> element.
		if (html.indexOf('<html') === -1 && html.indexOf('<body') === -1) {
			/**
			 * If `html` doesn't have a <body> and doesn't start with a <template> assume that the
			 * entire HTML code is meant to be inside a single <template> element.
			 */
			if (html.substr(0, 9).toLowerCase() !== '<template') {
				html = `<template>${ html }</template>`;
			}

			html = `<body>${ html }</body>`;
		}

		// Parse `html` into a `document`.
		document = domino.createDocument(`${ doctype }\n${ html }`);
		// Use the original `htmlDocument` to calculate the hash below.
		html = htmlDocument;
		// Use domino's implementation of the window interface as `window`.
		window = domino.impl;
	} else {
		// If `htmlDocument` is NOT a string, assume it's an instance of `Document`.
		document = htmlDocument;
		window = document.defaultView;
		doctype = getDoctype(document) || DEFAULT_DOCTYPE;
		html = `${ doctype }\n${ document.documentElement.outerHTML }`;
	}

	// Calculate a hash of `html`.
	const hash = crypto.createHash('md5').update(html).digest('hex');

	// eslint-disable-next-line object-curly-newline
	return { doctype, document, hash, window };
}