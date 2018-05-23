/**
 * Splits a string into an array of fragments. A fragment represents a portion of the `input`
 * string that is an expression, a template literal, or a string. Returns `null` if `input`
 * doesn't contain any expressions or template literals. For instance:
 *
 * ╔═════════════════════════════════════════╦═════════════════════════════════════════════════╗
 * ║ Input string                            ║ Result                                          ║
 * ╠═════════════════════════════════════════╬═════════════════════════════════════════════════╣
 * ║ 'String with no fragments'              ║ null                                            ║
 * ╠═════════════════════════════════════════╬═════════════════════════════════════════════════╣
 * ║ '${ host.price }'                       ║ [{ hasAwait: false, expression: 'host.price' }] ║
 * ╠═════════════════════════════════════════╬═════════════════════════════════════════════════╣
 * ║                                         ║ [                                               ║
 * ║                                         ║     'btn btn-',                                 ║
 * ║                                         ║     {                                           ║
 * ║ 'btn btn-${ host.btnType }'             ║         hasAwait: false,                        ║
 * ║                                         ║         expression: 'host.btnType'              ║
 * ║                                         ║     }                                           ║
 * ║                                         ║ ]                                               ║
 * ╠═════════════════════════════════════════╬═════════════════════════════════════════════════╣
 * ║                                         ║ [{                                              ║
 * ║                                         ║     tag: undefined,                             ║
 * ║ '`btn btn-${ host.btnType }`'           ║     hasAwait: false,                            ║
 * ║                                         ║     template: '`btn btn-${ host.btnType }`'     ║
 * ║                                         ║ }]                                              ║
 * ╠═════════════════════════════════════════╬═════════════════════════════════════════════════╣
 * ║                                         ║ [                                               ║
 * ║                                         ║     {                                           ║
 * ║                                         ║         tag: 'i18n',                            ║
 * ║                                         ║         hasAwait: false,                        ║
 * ║                                         ║         template: '`price`'                     ║
 * ║ 'i18n`price`: $${ this.dataset.price }' ║     },                                          ║
 * ║                                         ║     '": $"',                                    ║
 * ║                                         ║     {                                           ║
 * ║                                         ║         hasAwait: false,                        ║
 * ║                                         ║         expression: 'this.dataset.price'        ║
 * ║                                         ║     }                                           ║
 * ║                                         ║ ]                                               ║
 * ╚═════════════════════════════════════════╩═════════════════════════════════════════════════╝
 *
 * The last example contains a tagged template literal. In order to identify tags, an options
 * object must be created using the `tagOptions` function. For instance:
 *
 *     import splitFragments, { tagOptions } from 'path/to/splitFragments.mjs';
 *     // Pass all tag names that could be found in the string.
 *     const options = tagOptions(['i18n', 'currency', 'date']);
 *     // Template literals can be tagged using any tag name given to `tagOptions`.
 *     const input = 'i18n`price`: $${ this.dataset.price }';
 *     // The same `options` object can also be used in subsequent calls to `splitFragments`.
 *     const result = splitFragments(input, options);
 *     console.log(result); // Logs the result array shown in the last example above.
 *
 * @function splitFragments
 * @param {string} input A string that may or may not contain expressions and/or template literals.
 * @param {Object} [options] The options to use when searching for tag functions that precede
 *     template literals. Must be created using the `tagOptions` function.
 * @returns {Array} An array of fragments or `null` if the input string doesn't contain any
 *     expressions or template literals.
 */
export default function splitFragments(input, options) {
	// Container for all fragments.
	const fragments = [];

	/**
	 * These variables are used in the for loop below to iterate over each character in `input`.
	 */
	// `a` is the previous character, the one before position `i`.
	let a = '';
	// `b` is the current character, the one at position `i`.
	let b = input.charAt(0);
	// `c` is the next character, the one after position `i`.
	let c = input.charAt(1);
	/**
	 * Index position, within `input`, where a template literal starts. The value -1 indicates
	 * that the start of template literal has not been found during the iteration.
	 */
	let templateStart = -1;
	/**
	 * Index position, within `input`, where an expression starts. The value -1 indicates that
	 * the start of an expression has not been found during the iteration.
	 */
	let expressionStart = -1;
	/**
	 * Number of opened curly braces. This is used during the iteration to make sure
	 * expressions are well balanced.
	 */
	let openedBraces = 0;

	/**
	 * Iterate over each character in `input`.
	 * The variable `h` is the index position after the last parsed "fragment" and `i` is the index
	 * position of the current character. After each iteration, `i` is incremented and the values
	 * for `a`, `b`, and `c` are updated accordingly.
	 */
	for (let h = 0, i = 0; i < input.length; a = b, b = c, c = input.charAt(++i + 1)) {
		/**
		 * If the current character is a backtick and there's not an expression currently
		 * started ("${") prior to the current index position `i`. Backticks within expressions
		 * are ignored.
		 */
		if (b === '`' && expressionStart === -1) {
			/**
			 * If there's backtick prior to the current index position `i` that started a template
			 * literal, then the current character (a backtick) closes the template literal, which
			 * must be extracted from `input` and added to `fragments`.
			 */
			if (templateStart !== -1) {
				let match, hasAwait, tag;

				/**
				 * Do not proceed (continue to the next iteration) if the backtick is escaped. A
				 * backtick within a template literal is "escaped" if it's preceded by a backslash.
				 */
				if (a === '\\') {
					continue;
				}

				/**
				 * If the template literal starts after `h`, we need to extract the string prior
				 * to the start of the template (from position `h` to `templateStart`, but not
				 * including `templateStart`) and add it as a "string fragment" to `fragments`.
				 */
				if (h < templateStart) {
					let j = templateStart;

					/**
					 * If the string "fragment" is as long or longer than the shortest registered
					 * tag, the template literal could be tagged. If the template literal is
					 * tagged, the name of the tag function, preceded by an optional "await ",
					 * would be at the end of the string fragment.
					 */
					if (options && (j - h) >= options.shortestTagLength) {
						/**
						 * Subtract the length of the longest registered tag and the length of
						 * "await " from `j`. If the template literal is tagged, the name of the
						 * tag function and the optional "await " will be contained within `j` and
						 * the `templateStart`.
						 */
						j -= options.longestTagLength + 6;

						/**
						 * Subtract the piece of string from `j` (or from `h`, if `j` is less
						 * than `h`) to the `templateStart` to search for a tag function and an
						 * optional "await ".
						 */
						const pre = input.substring(j < h ? h : j, templateStart);
						// Perform the search.
						const result = pre.match(options.tagsExp) || [];

						/**
						 * If a `result` was found, the first position will be the full string
						 * that matches the regular expression, second position will indicate if
						 * an "await " was found, and third position will be the name of the tag
						 * function.
						 */
						[match, hasAwait, tag] = result;

						/**
						 * Assign `templateStart` to `j` minus the length of the `match` if a
						 * a match was found.
						 */
						j = templateStart - (match ? match.length : 0);
					}

					// If `h < j`, subtract the "string fragment" and add it to `fragments`.
					if (h < j) {
						fragments.push(input.substring(h, j));
					}
				}

				// Extract the template literal and add a "template fragment" object to `fragments`.
				fragments.push({
					tag,
					hasAwait: !!hasAwait,
					template: input.substring(templateStart, i + 1),
				});

				/**
				 * Now that the "template fragment" was extracted, `h` needs to be updated to the
				 * next index position in the iteration and `templateStart` is changed back to -1
				 * indicating that there's no template currently started/opened.
				 */
				h = i + 1;
				templateStart = -1;
			} else if (c !== '`') {
				/**
				 * If the next character is not a backtick, then the current backtick is the start
				 * of a template literal.
				 */
				templateStart = i;
			}
		} else if (b === '{') {
			if (expressionStart !== -1) {
				// Keep track of the number of opened braces within an expression.
				openedBraces++;
			} else if (a === '$') {
				/**
				 * The prior index position is the start of an expression if the prior character
				 * is "$" and the current character is "{".
				 */
				expressionStart = i - 1;
			}
		} else if (b === '}' && expressionStart !== -1) {
			// If the current character is "}" and there's an expression currently started/opened.
			if (openedBraces) {
				// If there are `openedBraces`, `b` closes the last open bracket.
				openedBraces--;
			} else if (templateStart !== -1) {
				/**
				 * If the expression is within a template literal simply change `expressionStart`
				 * back to -1 indicating that there's no expression currently started/opened.
				 */
				expressionStart = -1;
			} else {
				/**
				 * If there's no template started/opened, the "expression fragment" must be added
				 * to `fragments`.
				 */

				// If there's a "string fragment" before the expression, add it to `fragments`.
				if (h < expressionStart) {
					fragments.push(input.substring(h, expressionStart));
				}

				// Extract the expression and check if it has an await.
				const expression = input.substring(expressionStart + 2, i).trim();
				const hasAwait = expression.indexOf('await ') !== -1;

				// Add the expression to `fragments`.
				fragments.push({ hasAwait, expression });

				/**
				 * Now that the "expression fragment" was extracted, `h` needs to be updated to the
				 * next index position in the iteration and `expressionStart` is changed back to
				 * -1 indicating that there's no expression currently started/opened.
				 */
				h = i + 1;
				expressionStart = -1;
			}
		}

		if ((i + 1) === input.length && h <= i) {
			/**
			 * If we're at the last iteration, the last "string fragment" (everything after `h`)
			 * needs to be added to `fragments`.
			 */
			fragments.push(input.substr(h));
		}
	}

	return fragments.length === 1 && fragments[0] === input ? null : fragments;
}

/**
 * Takes an array of tag function names and returns an options object that can be used to find tag
 * functions in strings with template literals. The returned object is meant to be used by the
 * `splitFragments` function.
 *
 * @function tagOptions
 * @param {string[]} tags A non-empty array of tag function names.
 * @returns {Object} A tag options object that contains the following attributes:
 *     * `longestTagLength`: The length of the longest tag.
 *     * `shortestTagLength`: The length of the shortest tag.
 *     * `tagsExp`: A regular expression to test if a string ends with one of the given tags
 *         prefixed with an optional "await".
 */
export function tagOptions(tags) {
	const sorted = [];

	if (!Array.isArray(tags) || tags.length === 0) {
		throw new Error('`tags` must be a non-empty array of strings');
	}

	// Iterate over `tags` to sort them, in descending order, by their length.
	for (const tag of tags) {
		// Find the index of a tag that is shorter than `tag`.
		const i = sorted.findIndex(it => (it.length < tag.length));

		// If found, insert `tag` before the shorter tag. Otherwise, add it to the end of `sorted`.
		if (i !== -1) {
			sorted.splice(i, 0, tag);
		} else {
			sorted.push(tag);
		}
	}

	return {
		longestTagLength: sorted[0].length,
		shortestTagLength: sorted[sorted.length - 1].length,
		tagsExp: new RegExp(`(await )?(${ sorted.join('|') })$`),
	};
}

/**
 * Generates an expression by joining all the `fragments` together separated by a "+" sign. When
 * evaluated, the returned expression concatenates together all the resulting values of each
 * fragment.
 *
 * @function joinFragments
 * @param {string[]} fragments The parsed fragments.
 * @param {boolean} [isEventCallback=false] If `true`, the returned expression will be an arrow
 *     function that takes an `event` argument.
 * @returns {string}
 */
export function joinFragments(fragments, isEventCallback = false) {
	let isAsync = false;

	let src = fragments.map((fragment) => {
		if (typeof fragment === 'string') {
			return JSON.stringify(fragment);
		}

		if (fragment.hasAwait) {
			isAsync = true;
		}

		if (fragment.expression) {
			return `(${ fragment.expression })`;
		}

		const template = (fragment.tag ? `tags.${ fragment.tag }` : '') + fragment.template;
		return fragment.hasAwait ? `(await ${ template })` : template;
	});

	/**
	 * If there are multiple fragments and the first one is an expression (which, when evaluated,
	 * might not be string), use implicit coercion (add an empty string at the beginning) to make
	 * sure that the result of evaluating all the fragments together is a string.
	 */
	if (fragments.length > 1 && fragments[0].expression) {
		src.splice(0, 0, '""');
	}

	src = src.join(' + ');

	if (isEventCallback) {
		src = `${ isAsync ? 'async ' : '' }(e, event) => ${ src }`;
	}

	return src;
}
