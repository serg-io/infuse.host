module.exports = {
	env: {
		browser: true,
	},
	/**
	 * Extend the Airbnb style guide.
	 * https://github.com/airbnb/javascript
	 * https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base
	 */
	extends: 'airbnb-base',
	rules: {
		/**
		 * Use tabs for indentation instead of spaces.
		 * https://github.com/airbnb/javascript#whitespace--spaces
		 * https://eslint.org/docs/rules/indent
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/style.js#L120
		 */
		indent: ['error', 'tab'],
		/**
		 * Allow assignment in conditional statements only if they're surrounded by parentheses.
		 * For instance:
		 *
		 *     while ((node = nodeIterator.nextNode()) !== null) {
		 *         // ...
		 *     }
		 *
		 * https://eslint.org/docs/rules/no-cond-assign
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/errors.js#L20
		 */
		'no-cond-assign': ['error', 'except-parens'],
		/**
		 * Allow the use of the `continue` statement.
		 * https://eslint.org/docs/rules/no-continue
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/style.js#L265
		 */
		'no-continue': 'off',
		/**
		 * Allow unary operators.
		 * https://github.com/airbnb/javascript#variables--unary-increment-decrement
		 * https://eslint.org/docs/rules/no-plusplus
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/style.js#L319
		 */
		'no-plusplus': 'off',
		/**
		 * The `no-restricted-syntax` is overwritten here to allow use of "for-of" loops.
		 * https://github.com/airbnb/javascript#iterators--nope
		 * https://eslint.org/docs/rules/no-restricted-syntax
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/style.js#L323
		 */
		'no-restricted-syntax': [
			'error',
			{
				selector: 'ForInStatement',
				message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
			},
			{
				selector: 'LabeledStatement',
				message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
			},
			{
				selector: 'WithStatement',
				message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
			},
		],
		/**
		 * Allow use of tabs.
		 * https://eslint.org/docs/rules/no-tabs
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/style.js#L347
		 */
		'no-tabs': 'off',
		/**
		 * The `object-curly-newline` is overwritten here to allow the use of more properties in a
		 * single line.
		 * https://eslint.org/docs/rules/object-curly-newline
		 * https://github.com/airbnb/javascript/blob/fd0834764c8b991a807e6366181c1a3eddba240d/packages/eslint-config-airbnb-base/rules/style.js#L384
		 */
		'object-curly-newline': ['error', {
			ObjectExpression: { minProperties: 8, multiline: true, consistent: true },
			ObjectPattern: { minProperties: 8, multiline: true, consistent: true },
			ImportDeclaration: { minProperties: 8, multiline: true, consistent: true },
			ExportDeclaration: { minProperties: 8, multiline: true, consistent: true },
		}],
		/**
		 * Require all variable declarations **that are initialized** to have one `const` or `let`
		 * and be on its own line. Allow the use of one `const` or `let` to declare multiple
		 * **uninitialized** variables in a single line.
		 * https://github.com/airbnb/javascript#variables--one-const
		 * https://eslint.org/docs/rules/one-var
		 * https://eslint.org/docs/rules/one-var-declaration-per-line
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/style.js#L396
		 */
		'one-var': ['error', { initialized:  'never' }],
		'one-var-declaration-per-line': ['error', 'initializations'],
		/**
		 * Require a space when using dollar sign and curly braces in a template literal.
		 * https://github.com/airbnb/javascript#es6-template-literals
		 * https://eslint.org/docs/rules/template-curly-spacing
		 * https://github.com/airbnb/javascript/blob/cfe10c17d3f1df7325f8d40a4fcb2486254892f1/packages/eslint-config-airbnb-base/rules/es6.js#L171
		 */
		'template-curly-spacing': ['error', 'always'],
	},
};
