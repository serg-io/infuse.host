import parseDocument from './parseDocument.js';
import parseTemplate from './parseTemplate.js';
import configs, { contextFunctions, parsedTemplates } from './configs.js';

/**
 * Path to the configs module to use in generated ES modules.
 */
const DEFAULT_CONFIGS_PATH = 'infuse.host/src/configs.js';

/**
 * Generates a function that can be used to create unique IDs. The returned function is meant to be
 * used by the infuse.host parser to ensure that all parsed elements use unique IDs within a given
 * HTML document. The `hash` argument is used to make sure IDs generated for elements in one HTML
 * document don't conflict with those of another document.
 *
 * @function uniqueIdFn
 * @param {string} fullHash A hash to append to all IDs.
 * @param {number} [hashLength=7] Limits the length of the hash to the number of characters
 *     specified by this attribute. Uses 7 by default, which means that the returned function will
 *     only append the first 7 characters of the hash to the generated unique IDs.
 * @returns {Function} The return function takes a `tagName` (string) as the only argument and
 *     returns a unique ID string.
 */
export const uniqueIdFn = function createUniqueIdFunction(fullHash, hashLength = 7) {
	let idCounter = 1;
	const hash = hashLength > fullHash.length ? fullHash : fullHash.substr(0, hashLength);

	return tagName => `${ tagName }${ idCounter++ }_${ hash }`;
};

/**
 * Generates an ES module from an HTML document. If the provided `htmlDocument` is a string, it is
 * parsed into an actual `Document`. It is then ran through the infuse.host parser and the source
 * code for an ES module is generated. The returned ES module exports:
 *
 *     * The resulting `document`, after all the parsing is performed by infuse.host.
 *     * Default export: The first template found in the exported `document`.
 *     * All other templates found in `document`, using their predefined or generated
 *       "template ids" as export names.
 *
 * The generated ES module also loads all the `contextFunctions`, generated by the infuse.host
 * parser, into memory.
 *
 * @function createESModule
 * @param {(string|Document)} htmlDocument The HTML document as a string (HTML source code) or as an
 *     instance of `Document`.
 * @param {Object} [options={}] Options object.
 * @param {number} [options.hashLength=7] The length of the hash to use when generating unique
 *     element IDs. The hash is used to avoid collisions with IDs of elements in other documents.
 * @param {Function} [options.uniqueId] A function to generate unique ID values during the
 *     parsing process.
 * @param {string} [options.configsPath='infuse.host/src/configs'] Path to the infuse.host
 *     configs module to use in the generated ES module.
 * @returns {string} The source code of the generated ES module.
 */
export default function createESModule(htmlDocument, options = {}) {
	const lines = [''];
	const templateId = configs.get('templateId');
	const configsPath = options.configsPath || DEFAULT_CONFIGS_PATH;

	// Parse the document.
	const { doctype, document, hash, window } = parseDocument(htmlDocument);
	// If a unique ID function was not provided, create one using the document's `hash`.
	const uniqueId = options.uniqueId || uniqueIdFn(hash, options.hashLength);

	// Find and parse all templates in the `document`. This changes the document's DOM.
	let templates = Array.from(document.querySelectorAll('template'));
	for (let i = 0; i < templates.length; i++) {
		parseTemplate(templates[i], { uniqueId, window });
	}

	// Since the document's DOM changed, we need to find all templates again.
	templates = Array.from(document.querySelectorAll('template'));

	/**
	 * Iterate over each template and add lines of code to `lines` to perform the following actions
	 * when the generated ES module is loaded by the browser:
	 *
	 *     * Export the template using its template ID.
	 *     * Add the template to the `parsedTemplates` map using its template ID.
	 */
	for (let i = 0; i < templates.length; i++) {
		const tid = templates[i].getAttribute(templateId);

		lines.splice(i, 0, `export const ${ tid } = templates[${ i }];`);
		lines.push(`parsedTemplates.set('${ tid }', ${ tid });`);
	}

	lines.push('');

	/**
	 * Iterate over the generated parsed elements `Map` and add code to `lines` so that its
	 * contents are added to `contextFunctions` when the generated ES module is loaded by
	 * the browser.
	 */
	for (const [tid, fn] of contextFunctions) {
		const fnSrc = fn.toString().replace('function anonymous(', 'function(');
		lines.push(`contextFunctions.set('${ tid }', ${ fnSrc });`);
	}

	// Clear context functions and templates from memory.
	contextFunctions.clear();
	parsedTemplates.clear();

	return `import { contextFunctions, parsedTemplates } from '${ configsPath }';

const html = \`${ doctype }\n${ document.body.outerHTML.replace(/\\?`/g, '\\`') }\`;

const parser = new DOMParser();
const doc = parser.parseFromString(html, 'text/html');
const templates = doc.getElementsByTagName('template');

export { doc as document };
export default templates[0];
${ lines.join('\n') }`;
}