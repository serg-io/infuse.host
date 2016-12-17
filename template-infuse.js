/**
 * Template Infuse.
 *
 * @module
 */

/**
 * Integer variable used to generate IDs.
 */
let idCounter = 0,
	/**
	 * There's a caveat when working with Custom Elements v1 using the "document-register-element"
	 * polyfill. This boolean flag determines whether or not a workaround should be implemented in
	 * the exported `Mixin` function. To enable a workaround for this caveat, execute the
	 * following line of code right after loading this library:
	 *
	 *     TemplateInfuse.dreV1Caveat = true;
	 *
	 * For more information go to:
	 * https://github.com/WebReflection/document-register-element/#v1-caveat
	 */
	useDREV1CaveatWorkaround = false;

/**
 * This object is used as a map for **boolean** attributes. Consider the following HTML:
 *
 *     <template>
 *         <button class="btn btn-${ host.btnClass() }" disabled?="${ host.disableBtn() }" i>
 *             ${ host.i18n.submit }
 *         </button>
 *     </template>
 *
 * When loading this `<template>` an ID is assigned for the `<button>` element. If such ID is "i1",
 * the following properties will be added to `BOOLEAN_ATTRIBUTES`:
 *
 *     BOOLEAN_ATTRIBUTES = {
 *         i1: {
 *             disabled: true
 *         }
 *     }
 *
 * These properties indicate that the "disabled" attribute is a boolean attribute.
 *
 * @const {object} BOOLEAN_ATTRIBUTES
 */
const BOOLEAN_ATTRIBUTES = {},
	/**
	 * This object is used as a map for **attribute** functions. Consider the following HTML:
	 *
	 *     <template>
	 *         <button class="btn btn-${ host.btnClass() }" disabled?="${ host.disableBtn() }" i>
	 *             ${ host.i18n.submit }
	 *         </button>
	 *     </template>
	 *
	 * When loading this `<template>` an ID is assigned for the `<button>` element. If such ID is
	 * "i1", the following properties will be added to `ATTRIBUTE_FUNCTIONS`:
	 *
	 *     ATTRIBUTE_FUNCTIONS = {
	 *         i1: {
	 *             class: function( host, data, event ) {
	 *                 return "btn btn-" + host.btnClass();
	 *             },
	 *             disabled: function( host, data, event ) {
	 *                 return host.disableBtn();
	 *             }
	 *         }
	 *     }
	 *
	 * These functions are used to infuse the "class" and "disabled" attributes of the `<button>`
	 * element.
	 *
	 * @const {object} ATTRIBUTE_FUNCTIONS
	 */
	ATTRIBUTE_FUNCTIONS = {},
	/**
	 * This object is used as a map for **text content** functions. Consider the following HTML:
	 *
	 *     <template>
	 *         <button class="btn btn-${ host.btnClass() }" disabled?="${ host.disableBtn() }" i>
	 *             ${ host.i18n.submit }
	 *         </button>
	 *     </template>
	 *
	 * When loading this `<template>` an ID is assigned for the `<button>` element. If such ID is
	 * "i1", the following property/function will be added to `TEXT_CONTENT_FUNCTIONS`:
	 *
	 *     TEXT_CONTENT_FUNCTIONS = {
	 *         i1: function( host, data, event ) {
	 *             return host.i18n.submit;
	 *         }
	 *     }
	 *
	 * This function will be called whenever the `<button>` element is infused. The value returned
	 * by this function will be assigned to the `textContent` **property** of the `<button>`
	 * element.
	 *
	 * @const {object} TEXT_CONTENT_FUNCTIONS
	 */
	TEXT_CONTENT_FUNCTIONS = {},
	/**
	 * Determines if the given `value` is a string.
	 *
	 * @function isString
	 * @param value
	 * @returns {boolean}
	 */
	isString = value => typeof value === 'string',
	/**
	 * Generates an ID. If `prefix` is passed, the ID will be appended to it.
	 *
	 * @function uniqueId
	 * @param {string} [prefix='']
	 * @returns {string}
	 */
	uniqueId = ( prefix = '' ) => prefix + ( ++idCounter ),
	/**
	 * Determines if the given `string` contains an expression.
	 *
	 * @function containsExpression
	 * @param {string} string
	 * @returns {boolean}
	 */
	containsExpression = string => /\$\{[^\}]+\}/.test( string ),
	/**
	 * Removes the dollar sign, curly braces, empty space, and semi-colon of the given expression.
	 * For instance, if this function is called using "${ host.foo(); }" as the `expr`, it would
	 * return "host.foo()".
	 *
	 * @function stripExpression
	 * @param {string} expr A string that starts with "${" and ends with "}".
	 * @returns {string}
	 */
	stripExpression = expr => expr.replace( /^\$\{\s*|;?\s*\}$/g, '' ),
	/**
	 * Determines if the given string is an expression. A string is considered to be an expression
	 * if it starts with "${" and ends with "}".
	 *
	 * @function isExpression
	 * @param {string} str
	 * @returns {boolean}
	 */
	isExpression = str => str.substr( 0, 2 ) === '${' && str.substr( -1 ) === '}',
	/**
	 * This line of code is prepended to on[event] attributes. It provides access to the `host`
	 * element within the code written for on[event] attributes.
	 *
	 * @const {string} VAR_HOST
	 */
	VAR_HOST =
		'var host = this.closest( \'[data-infuse-host="\' + this.dataset.infuseHostId + \'"]\' );',
	/**
	 * Methods added to the class returned by the `Mixin` function. These methods act as proxies
	 * for the methods of the actual `TemplateInfuse` instance.
	 *
	 * @const {string[]} PROXY_MIXIN_METHODS
	 */
	PROXY_MIXIN_METHODS = [
		'cloneTemplate', 'infuseElement', 'infuseElements', 'infuseAttribute', 'infuseTextContent'
	],
	/**
	 * List of on[event] attribute names.
	 *
	 * @const {string[]} EVENT_ATTRIBUTES
	 */
	EVENT_ATTRIBUTES = [
		// Form events.
		'onblur', 'onchange', 'oncontextmenu', 'onfocus', 'oninput', 'oninvalid', 'onreset',
		'onsearch', 'onselect', 'onsubmit',
	
		// Keyboard events.
		'onkeydown', 'onkeypress', 'onkeyup',
	
		// Mouse events.
		'onclick', 'ondblclick', 'ondrag', 'ondragend', 'ondragenter', 'ondragexit', 'ondragleave',
		'ondragover', 'ondragstart', 'ondrop', 'onmousedown', 'onmouseenter', 'onmouseleave',
		'onmousemove', 'onmouseout', 'onmouseover', 'onmouseup', 'onmousewheel', 'onscroll',
		'onwheel',
	
		// Pointer events.
		'onpointercancel', 'onpointerdown', 'onpointerenter', 'onpointerleave',
		'onpointerlockchange', 'onpointerlockerror', 'onpointermove', 'onpointerout',
		'onpointerover', 'onpointerup',
	
		// Touch events.
		'ontouchcancel', 'ontouchend', 'ontouchmove', 'ontouchstart',
	
		// Clipboard events.
		'oncopy', 'oncut', 'onpaste',
	
		// Media events.
		'onabort', 'oncanplay', 'oncanplaythrough', 'oncuechange', 'ondurationchange',
		'onemptied', 'onended', 'onloadeddata', 'onloadedmetadata', 'onloadstart',
		'onpause', 'onplay', 'onplaying', 'onprogress', 'onratechange', 'onseeked',
		'onseeking', 'onstalled', 'onsuspend', 'ontimeupdate', 'onvolumechange', 'onwaiting',
	
		// Misc events.
		'onerror', 'onload', 'onshow', 'ontoggle'
	].sort(),
	/**
	 * Names of the variables available in all expressions.
	 *
	 * @const {string[]} EXPRESSION_ARGUMENTS
	 */
	EXPRESSION_ARGUMENTS = [ 'host', 'data', 'event' ];

/**
 * Iterates over the elements of an array or the properties of an object and executes the given
 * callback for each element in the array or property of the object. In each iteration the callback
 * receives the array element (if `obj` is an array) or property value (if `obj` is an object) as
 * the first argument and the index (if `obj` is an array) or key (if `obj` is an object) as the
 * second argument.
 *
 * @function each
 * @param {array|object} obj
 * @param {function} fn
 */
function each( obj, fn ) {
	if ( Array.isArray( obj ) ) {
		for ( let i = 0; i < obj.length; i++ ) {
			fn( obj[ i ], i );
		}
	} else {
		for ( let key in obj ) {
			if ( obj.hasOwnProperty( key ) ) {
				fn( obj[ key ], key );
			}
		}
	}
}

/**
 * Copies all of the properties in the **source** objects over to the **destination** object, and
 * returns the **destination** object. It's in-order, so the last source will override properties
 * of the same name in previous arguments.
 *
 * @function extend
 * @param {object} destination
 * @param {...object} sources
 * @returns {object}
 */
function extend( destination, ...sources ) {
	destination || ( destination = {} );
	for ( let source of sources ) {
		each( source || {}, ( value, key ) => destination[ key ] = value );
	}
	return destination;
}

/**
 * Creates a `Map` of all the attributes of the given element that have expressions.
 *
 * @function attributesWithExpressions
 * @param {Element} el
 * @return {Map.<string, string>}
 */
function attributesWithExpressions( el ) {
	let head = [], tail = [];
	for ( let a of el.attributes ) {
		if ( containsExpression( a.value ) ) {
			( /^data\-/i.test( a.name ) ? head : tail ).push([ a.name, a.value.trim() ]);
		}
	}
	return new Map( head.concat( tail ) );
}

/**
 * Creates a function that returns the resulting value of the given expression (code). The source
 * code of the function is added to the returned function as the `source` property.
 *
 * @function expressionToFunction
 * @param {string} expression
 * @returns {Function}
 */
function expressionToFunction( expression ) {
	let src, fn;

	if ( isExpression( expression ) ) {
		src = 'return ' + stripExpression( expression ) + ';';
	} else {
		src = splitTemplateLiteral( expression ).map(
			ex => isExpression( ex ) ? '(' + stripExpression( ex ) + ')' : JSON.stringify( ex )
		);
		src = 'return ' + src.join( '+' ) + ';';
	}

	fn = new Function( ...EXPRESSION_ARGUMENTS, src );
	fn.source = `function(${ EXPRESSION_ARGUMENTS.join( ',' ) }){${ src }}`;

	return fn;
}

/**
 * Loads an element by performing the following tasks:
 *
 *     * Finds all the expressions in the given element.
 *     * Converts all expressions into functions.
 *     * Adds the appropriate properties/functions to the ATTRIBUTE_FUNCTIONS, BOOLEAN_ATTRIBUTES,
 *       and TEXT_CONTENT_FUNCTIONS objects.
 *     * Creates an ID that uniquely identifies the element and sets it as the element's
 *       "data-infuse-id" attribute.
 *
 * @function loadElementInTemplate
 * @param {Element} el The `Element` to load. Must be a descendant of a `<template>` element.
 * @param {string} [infuseIdPrefix='i'] The prefix for the ID.
 */
function loadElementInTemplate( el, infuseIdPrefix = 'i' ) {
	let attributeFunctions = {},
		textContentFunction = null,
		booleanAttributes = {},
		map = attributesWithExpressions( el ),
		id;

	// Iterate over each attribute containing an expression.
	for ( let [ name, val ] of map ) {
		// Remove the original attribute (which contains the expression) from the element.
		el.removeAttribute( name );

		// If it's a boolean attribute, remove the question mark and add it to `booleanAttributes`.
		if ( name.substr( -1 ) === '?' ) {
			name = name.substring( 0, name.length - 1 );
			booleanAttributes[ name ] = true;
		}

		// Convert the expression into a function.
		attributeFunctions[ name ] = expressionToFunction( val );
	}

	// If `textContent` contains an expression, convert it into a function.
	if ( el.children.length === 0 && containsExpression( el.textContent ) ) {
		textContentFunction = expressionToFunction( el.textContent );
		el.textContent = '';
	}

	if ( map.size || textContentFunction ) {
		// Create an ID and set it as the element's "data-infuse-id" attribute.
		id = uniqueId( infuseIdPrefix );
		el.dataset.infuseId = id;

		// Add properties to ATTRIBUTE_FUNCTIONS, BOOLEAN_ATTRIBUTES, and TEXT_CONTENT_FUNCTIONS.
		if ( map.size ) {
			ATTRIBUTE_FUNCTIONS[ id ] = attributeFunctions;
			BOOLEAN_ATTRIBUTES[ id ] = booleanAttributes;
		}
		if ( textContentFunction ) {
			TEXT_CONTENT_FUNCTIONS[ id ] = textContentFunction;
		}
	}
}

/**
 * Splits a string containing one or more expressions into an array where each expression would be
 * separated from the other parts. For instance, it would split the following string:
 *
 *     "btn btn-${ host.btnType } btn-lg"
 *
 * into:
 *
 *     [ "btn btn-", "${ host.btnType }", " btn-lg" ]
 *
 * @function splitTemplateLiteral
 * @param {string} str A string containing one or more expressions.
 * @returns {string[]}
 */
function splitTemplateLiteral( str ) {
	let parts = [];

	for ( let i = 0, j; ; ) {
		j = str.indexOf( '${'/*}*/, i );

		if ( j === -1 ) {
			if ( i < str.length ) {
				parts.push( str.substr( i ) );
			}
			return parts;
		} else if ( j > i ) {
			parts.push( str.substring( i, j ) );
		}

		for ( let k = j + 2, o = 0, c; ; k++ ) {
			if ( k >= str.length ) {
				parts.push( str.substr( j ) );
				return parts;
			}

			c = str.charAt( k );
			if ( c === '{' ) {
				o++;
			} else if ( c === '}' ) {
				if ( o === 0 ) {
					i = k + 1;
					parts.push( str.substring( j, i ) );
					break;
				}
				o--;
			}
		}
	}
}

/**
 * Uses the "data-infuse" attribute of the given element to create a `Map` of events where the keys
 * represent event names and the values represent selectors. `false` is used as the value if there
 * is no selector for an event name.
 *
 * @function eventMap
 * @param {Element} el
 * @returns {Map.<string, (string|boolean)>}
 */
function eventMap( el ) {
	let events = el.dataset.infuse ? el.dataset.infuse.trim().split( ';' ) : [];

	events = events.map( e => e.trim() ).map( e => {
		let i = e.indexOf( ' ' ),
			name = i === -1 ? e : e.substring( 0, i ),
			selector = i === -1 ? false : e.substr( i + 1 ).trim();

		return [ name, selector ];
	});

	return new Map( events );
}

/**
 * Creates a **sorted** `Map` containing all the on[event] attributes of the given element.
 *
 * @function onAttributesMap
 * @param {Elemen} el
 * @returns {Map.<string, string>}
 */
function onAttributesMap( el ) {
	let names = [];

	for ( let a of el.attributes ) {
		if ( a.name.substr( 0, 2 ) === 'on' ) {
			names.push( a.name );
		}
	}

	return new Map( names.sort().map( name => [ name, el.getAttribute( name ) ] ) );
}

/**
 * TemplateInfuse class. Each instance of this class uses:
 *
 *     * A "host" element. All DOM fragments returned by the `cloneTemplate` method must be added
 *       to the host element passed to the constructor.
 *     * An owner document (optional). You can avoid polluting the main `document` by keeping your
 *       `<template>` element(s) in a different document. This can be done using HTML imports or
 *       loading HTML using XHR. `TemplateInfuse` will limit its scope to the `ownerDocument`. If
 *      none is given, the global `document` variable will be used instead.
 */
export default class TemplateInfuse {
	static get dreV1Caveat() {
		return useDREV1CaveatWorkaround;
	}

	/**
	 * Set `TemplateInfuse.dreV1Caveat` to `true` if you're using the "document-register-element"
	 * polyfill to use Custom Elements v1 and you want TemplateInfuse to work around the caveat
	 * explained [here](https://github.com/WebReflection/document-register-element#v1-caveat).
	 */
	static set dreV1Caveat( value ) {
		useDREV1CaveatWorkaround = value;
	}

	/**
	 * Provides access to `BOOLEAN_ATTRIBUTES` from outside this module.
	 */
	static get BOOLEAN_ATTRIBUTES() {
		return BOOLEAN_ATTRIBUTES;
	}

	/**
	 * Provides access to `ATTRIBUTE_FUNCTIONS` from outside this module.
	 */
	static get ATTRIBUTE_FUNCTIONS() {
		return ATTRIBUTE_FUNCTIONS;
	}

	/**
	 * Provides access to `TEXT_CONTENT_FUNCTIONS` from outside this module.
	 */
	static get TEXT_CONTENT_FUNCTIONS() {
		return TEXT_CONTENT_FUNCTIONS;
	}

	/**
	 * Loads a `<template>` element.
	 *
	 * @param {HTMLTemplateElement} templateEl The `<template>` element to load.
	 * @param {object} [options={}]
	 * @param {string} [options.prefix] The prefix to use for all IDs created and assigned to
	 *     elements as the "data-infuse-id" attribute.
	 * @param {boolean|string[]} [options.eventAttributes] Use `false` to avoid prepending
	 *     `VAR_HOST` to on[event] attributes. Alternatively, you can set this to an array of
	 *     strings to limit this action to only those events included in this array.
	 *     For instance, if you want `VAR_HOST` to only be prepended to "onclick" event attributes,
	 *     use `[ "onclick" ]` as `options.eventAttributes`.
	 */
	static loadTemplate( templateEl, options = {} ) {
		// Don't load the template if it's already loaded.
		if ( templateEl.hasAttribute( 'data-loaded' ) ) {
			return;
		}

		// Load expressions in the `<template>` element attributes.
		loadElementInTemplate( templateEl, options.prefix );

		// Iterate over all the descendants that have the "i" or "data-infuse" attributes.
		for ( let el of templateEl.content.querySelectorAll( '[i], [data-infuse]' ) ) {
			// If it doesn't have "data-infuse", rename the "i" attribute to "data-infuse".
			if ( !el.hasAttribute( 'data-infuse' ) ) {
				el.setAttribute( 'data-infuse', el.getAttribute( 'i' ) );
				el.removeAttribute( 'i' );
			}

			if ( options.eventAttributes !== false ) {
				let start = 0,
					events = options.eventAttributes || EVENT_ATTRIBUTES;

				// Prepend the on[event] attributes with `VAR_HOST`.
				for ( let [ name, value ] of onAttributesMap( el ) ) {
					let i = events.indexOf( name, start );
					if ( i !== -1 ) {
						el.setAttribute( name, VAR_HOST + value );
						start = i + 1;
					}
				}
			}

			// Load all expressions in this element.
			loadElementInTemplate( el, options.prefix );
		}

		// Set the "data-loaded" boolean attribute.
		templateEl.dataset.loaded = '';

		// Load nested/descendant `<template>` elements.
		for ( let el of templateEl.content.querySelectorAll( 'template' ) ) {
			TemplateInfuse.loadTemplate( el, options );
		}
	}

	/**
	 * Constructor.
	 *
	 * @param {Element} host The host element.
	 * @param {Document} [ownerDocument=document]
	 */
	constructor( host, ownerDocument = document ) {
		this.host = host;
		this.hostId = uniqueId( 'h' );
		host.dataset.infuseHost = this.hostId;

		this.eventListeners = [];
		this.ownerDocument = ownerDocument;
	}

	/**
	 * Loads (if it hasn't been loaded), clones, and infuses a `<template>` element.
	 *
	 * The "data-if" attribute (containing an expression) can be used to determine whether or not
	 * the descendants of the `<template>` element should be cloned. If the expression returns a
	 * a falsy value, an empty fragment is returned. This technique can be applied to nested
	 * templates.
	 *
	 * The attributes "data-repeat" or "data-repeat-it" can be used to clone the template multiple
	 * times. The expression in either of these two attributes must return a collection.
	 * A collection can be an object or an array if using "data-repeat" or it can be any value
	 * that can be used in a for-of loop if using "data-repeat-it". The template will be
	 * cloned and infused once for each item in the collection. All the resulting fragments will be
	 * put together into a single fragment. This technique can be applied to nested templates.
	 *
	 * @param {string|HTMLTemplateElement} [el="template"] The template element to clone or a
	 *     selector. When using a selector, it will search (inside `this.ownerDocument`) for an
	 *     element that matches the given selector and clone it. If `el` is not specified, or it's
	 *     a falsy value, "template" would be used as the default selector.
	 * @param {object} [data={}] The value to use as the `data` variable inside all expressions.
	 * @param {object} [event=undefined] The value to use as the `event` variable inside all
	 *     expressions.
	 * @param {boolean} [isNestedTemplate=false] Used internally when cloning nested templates.
	 * @returns {DocumentFragment} The infused document fragment.
	 */
	cloneTemplate( el, data = {}, event = undefined, isNestedTemplate = false ) {
		!el && ( el = 'template' );
		isString( el ) && ( el = this.ownerDocument.querySelector( el ) );
		TemplateInfuse.loadTemplate( el );

		let id = el.dataset.infuseId,
			attrFunctions = ATTRIBUTE_FUNCTIONS[ id ] || {},
			ifFn = attrFunctions[ 'data-if' ],
			collection = attrFunctions[ 'data-repeat' ] || attrFunctions[ 'data-repeat-it' ],
			fragment, key, value, entry, clone;

		// If it has a "data-if" attribute/expression...
		if ( ifFn ) {
			// Return an empty fragment if the expression returns a falsy value.
			if ( !ifFn.call( el, this.host, data, event ) ) {
				if ( isNestedTemplate ) {
					el.remove();
				}

				return document.createDocumentFragment();
			}
		}

		// If it has "data-repeat" or "data-repeat-of"...
		if ( collection ) {
			// Evaluate the expression and use the result as the `collection`.
			collection = collection.call( el, this.host, data, event );

			key = el.dataset.key || 'key';
			value = el.dataset.value || 'value';
			entry = el.dataset.entry || 'entry';

			// Setup a function that will be executed for each item in the collection.
			clone = additionalData => {
				let d = extend( {}, data, additionalData ),
					frag = this.infuseFragment( el.content.cloneNode( true ), d, event );

				for ( let nestedTemplate of frag.querySelectorAll( 'template' ) ) {
					this.cloneTemplate( nestedTemplate, d, event, true );
				}

				if ( fragment ) {
					fragment.appendChild( frag );
				} else {
					fragment = frag;
				}
			};
		}

		if ( attrFunctions[ 'data-repeat' ] ) {
			// If using data-repeat, clone the template for each item in the collection.
			each( collection, ( v, k ) => clone({ [ key ]: k, [ value ]: v }) );
		} else if ( attrFunctions[ 'data-repeat-it' ] ) {
			// If using data-repeat-it, use a for-of loop to iterate over the collection.
			if ( el.dataset.key || el.dataset.value ) {
				for ( let [ k, v ] of collection ) {
					clone({ [ key ]: k, [ value ]: v });
				}
			} else {
				for ( let e of collection ) {
					clone({ [ entry ]: e });
				}
			}
		} else {
			// Clone the template and infuse the fragment.
			fragment = this.infuseFragment( el.content.cloneNode( true ), data, event );

			// Clone nested templates.
			for ( let nestedTemplate of fragment.querySelectorAll( 'template' ) ) {
				this.cloneTemplate( nestedTemplate, data, event, true );
			}
		}

		// If `el` is a `<template>` inside another `<template>` (if `el` is a nested template)...
		if ( isNestedTemplate ) {
			if ( fragment ) {
				// Insert the `fragment` right before the `el` (the nested template).
				el.parentNode.insertBefore( fragment, el );
			}
			// Remove `el`.
			el.remove();
		}

		return fragment;
	}

	/**
	 * Used internally to infuse all the elements that have the "data-infuse" attribute (or "i"
	 * attribute) inside a fragment. A set of event names and selectors can be used as the value
	 * for the "data-infuse" attribute. When these events occur, the corresponding element(s) are
	 * infused. The event listeners are added to the host element.
	 *
	 * @param {DocumentFragment} fragment A document fragment cloned from a template.
	 * @param {object} data The value to use as the `data` variable in all expressions.
	 * @param {Event} event The value to use as the `event` variable in all expressions.
	 * @returns {DocumentFragment} The infused document fragment.
	 */
	infuseFragment( fragment, data, event ) {
		for ( let el of fragment.querySelectorAll( '[data-infuse]' ) ) {
			el.dataset.infuseHostId = this.hostId;
			this.infuseElement( el, data, event );

			for ( let [ eventName, selector ] of eventMap( el ) ) {
				let listener = ev => {
					if ( !selector || ev.target.matches( selector ) ) {
						this.infuseElement( el, {}, ev );
					}
				};
				this.on( eventName, listener );
			}
		}

		return fragment;
	}

	/**
	 * Infuses the given elements (descendants of the host element).
	 *
	 * @param {string|Element[]|NodeList} elements A collection of elements or a selector. If a
	 *     selector is used, it will infuse all the elements, descendants of the host element, that
	 *     match the given selector.
	 * @param {object} data The value to use as the `data` variable in all expressions.
	 * @param {object} event The value to use as the `event` variable in all expressions.
	 */
	infuseElements( elements, data, event ) {
		isString( elements ) && ( elements = this.host.querySelectorAll( elements ) );

		for ( let el of elements ) {
			this.infuseElement( el, data, event );
		}
	}

	/**
	 * Infuses an element (descendant of the host element).
	 *
	 * @param {string|Element} element The element to infuse or a selector. If a selector is used,
	 *     it will infuse the element (descendant of the host element) that matches the given
	 *     selector.
	 * @param {object} data The value to use as the `data` variable in all expressions.
	 * @param {object} event The value to use as the `event` variable in all expressions.
	 */
	infuseElement( element, data, event ) {
		let id, textContentFn, selector;

		if ( isString( element ) ) {
			selector = element;
			element = this.host.querySelector( selector );

			if ( !element ) {
				throw new Error(
					'Cannot infuse element. The host element doesn\'t have a ' +
					'descendant element that matches the selector "' + selector + '".'
				);
			}
		}

		// Obtain the infuse ID of the element.
		id = element ? element.dataset.infuseId : false;

		if ( !id ) {
			throw new Error(
				'Cannot infuse element. The first argument must be a string (a valid selector) ' +
				'or an element that has the attribute "data-infuse" or the attribute "i".'
			);
		}

		// Infuse the attributes of the element that have expressions.
		each( ATTRIBUTE_FUNCTIONS[ id ], ( fn, name ) => {
			this._infuseAttribute( element, name, fn, data, event );
		});

		textContentFn = TEXT_CONTENT_FUNCTIONS[ id ];

		// Infuse the `textContent` if the original element had an expression as text content.
		if ( textContentFn ) {
			this._infuseTextContent( element, textContentFn, data, event );
		}
	}

	/**
	 * Infuses a given attribute of an element (descendant of the host element).
	 *
	 * @param {string|Element} element The element to infuse or a selector. If a selector is used,
	 *     it will infuse the element (descendant of the host element) that matches the given
	 *     selector.
	 * @param {object} data The value to use as the `data` variable in all expressions.
	 * @param {object} event The value to use as the `event` variable in all expressions.
	 */
	infuseAttribute( element, name, data, event ) {
		let id, functions, selector;

		if ( isString( element ) ) {
			selector = element;
			element = this.host.querySelector( selector );

			if ( !element ) {
				throw new Error(
					'Cannot infuse attribute "' + name + '". The host element doesn\'t have a ' +
					'descendant element that matches the selector "' + selector + '".'
				);
			}
		}

		// Obtain the infuse ID of the element.
		id = element ? element.dataset.infuseId : false;

		if ( !id ) {
			throw new Error(
				'Cannot infuse attribute "' + name + '". The first argument must be a string (a ' +
				'valid selector) or an element that has the attribute "data-infuse" or the ' +
				'attribute "i".'
			);
		}

		// Find the "attribute functions" of this element.
		functions = ATTRIBUTE_FUNCTIONS[ id ];

		if ( !functions || !functions[ name ] ) {
			throw new Error( 'The attribute "' + name + '" does not contain an expression.' );
		}

		// Infuse the attribute.
		this._infuseAttribute( element, name, functions[ name ], data, event );
	}

	/**
	 * Used internally to infuse an attribute of a given element.
	 *
	 * @param {string|Element} element
	 * @param {string} name The attribute name.
	 * @param {function} attributeFunction A function that evaluates the corresponding expression.
	 * @param {object} data The value to use as the `data` variable in the expression.
	 * @param {object} event The value to use as the `event` variable in the expression.
	 */
	_infuseAttribute( element, name, attributeFunction, data, event ) {
		let setAttribute = true,
			// Obtain the infuse ID of the element.
			id = element.dataset.infuseId,
			// Evaluate the expression.
			value = attributeFunction.call( element, this.host, data, event ),
			// The `value` can be of any type, but the actual attribute value must be a string.
			attributeValue = '' + value;

		// If it's a boolean attribute...
		if ( BOOLEAN_ATTRIBUTES[ id ] && BOOLEAN_ATTRIBUTES[ id ][ name ] ) {
			if ( !value ) {
				// If `value` is falsy, remove the attribute from the element.
				setAttribute = false;
				if ( element.hasAttribute( name ) ) {
					element.removeAttribute( name );
				}
			} else if ( value === true ) {
				// If `value` is `true`, set the actual value of the attribute to an empty string.
				attributeValue = '';
			}
		}

		// Set the attribute if its current value is not the same as `attributeValue`.
		if ( setAttribute && attributeValue !== element.getAttribute( name ) ) {
			element.setAttribute( name, attributeValue );
		}

		/**
		 * Set `value` as a "property" of the element if the attribute is also considered to be a 
		 * property and its current value is not the same as `value`
		 */
		if ( this.isProperty( element, name ) && value !== element[ name ] ) {
			element[ name ] = value;
		}
	}

	/**
	 * Determines if an attribute is also a property. If the host element has an `isProperty`
	 * method it proxies the call to such method. This allows for custom logic, to determine if an
	 * attribute is also a property, to be implemented in the host element.
	 *
	 * @param {Element} element
	 * @param {string} name The name of the attribute.
	 * @param {boolean}
	 */
	isProperty( el, name ) {
		if ( typeof this.host.isProperty === 'function' ) {
			return this.host.isProperty( el, name );
		}

		return el.nodeName === 'INPUT' && ( name === 'value' || name === 'checked' );
	}

	/**
	 * Infuses the `textContent` of an element (descendant of the host element).
	 *
	 * @param {string|Element} element The element to infuse or a selector. If a selector is used,
	 *     it will infuse the element (descendant of the host element) that matches the given
	 *     selector.
	 * @param {object} data The value to use as the `data` variable in all expressions.
	 * @param {object} event The value to use as the `event` variable in all expressions.
	 */
	infuseTextContent( element, data, event ) {
		let id, textContentFn, selector;

		if ( isString( element ) ) {
			selector = element;
			element = this.host.querySelector( selector );

			if ( !element ) {
				throw new Error(
					'Cannot infuse textContent. The host element doesn\'t have a ' +
					'descendant element that matches the selector "' + selector + '".'
				);
			}
		}

		// Obtain the infuse ID of the element.
		id = element ? element.dataset.infuseId : false;

		if ( !id ) {
			throw new Error(
				'Cannot infuse textContent. The first argument must be a string (a ' +
				'valid selector) or an element that has the attribute "data-infuse" or the ' +
				'attribute "i".'
			);
		}

		// Find the "text content function" of this element.
		textContentFn = TEXT_CONTENT_FUNCTIONS[ id ];

		if ( !textContentFn ) {
			throw new Error(
				'Cannot infuse textContent. The specified element does not contain an expression.'
			);
		}

		// Infuse the element's `textContent` property.
		this._infuseTextContent( element, textContentFn, data, event );
	}

	/**
	 * Used internally to infuse the `textContent` property of a given element.
	 *
	 * @param {string|Element} element
	 * @param {function} fn A function that evaluates the corresponding expression.
	 * @param {object} data The value to use as the `data` variable in the expression.
	 * @param {object} event The value to use as the `event` variable in the expression.
	 */
	_infuseTextContent( element, fn, data, event ) {
		const textContent = fn.call( element, this.host, data, event );

		if ( textContent !== element.textContent ) {
			element.textContent = textContent;
		}
	}

	/**
	 * Adds an event listener to the host element. All event listeners added using this method can
	 * be removed by calling the `clearEventListeners` method.
	 *
	 * @param {string} eventName Name of the event.
	 * @param {function} listener Callback function.
	 */
	on( eventName, listener ) {
		this.host.addEventListener( eventName, listener );
		this.eventListeners.push([ eventName, listener ]);
	}

	/**
	 * Removes all the event listeners previously added using the `on` method from the host
	 * element.
	 */
	clearEventListeners() {
		for ( let args; args = this.eventListeners.pop(); ) {
			this.host.removeEventListener( ...args );
		}
	}
}

/**
 * Defines, and returns, a class extended from the given `Base` class and adds several convenience
 * methods. This can be used to define a class for a custom element.
 *
 * @param [Base=HTMLElement] The base class to extend from.
 * @param {Document} [ownerDocument] The owner document. If not given it would use:
 *     `document._currentScript.ownerDocument`, `document.currentScript.ownerDocument`, or
 *     `document`.
 * @param {boolean} [caveatOverwrite] If given, it would be used to determine if a workaround
 *     should be implemented against the caveat in the "document-register-element" polyfill. If
 *     it's not given, it will use the value of `TemplateInfuse.dreV1Caveat`. For more info go to:
 *     https://github.com/WebReflection/document-register-element/#v1-caveat
 */
export function Mixin( Base, ownerDocument, caveatOverwrite ) {
	let useCaveatWorkaround = useDREV1CaveatWorkaround,
		Class;

	if ( !ownerDocument ) {
		ownerDocument = ( document._currentScript || document.currentScript ).ownerDocument;
	}

	if ( typeof caveatOverwrite === 'boolean' ) {
		useCaveatWorkaround = caveatOverwrite;
	}

	if ( useCaveatWorkaround ) {
		Class = class extends ( Base || HTMLElement ) {
			constructor( self ) {
				self = super( self );
				self._init();
				return self;
			}
		}
	} else {
		Class = class extends ( Base || HTMLElement ) {
			constructor( ...args ) {
				super();
				this._init( ...args );
			}
		}
	}

	/**
	 * Instantiates a `TemplateInfuse` and calls `initialize`.
	 */
	Class.prototype._init = function( ...args ) {
		this.templateInfuse = new TemplateInfuse( this, ownerDocument );
		this.initialize( ...args );
	};

	Class.prototype.initialize = function() {};

	/**
	 * Clears all the event listeners added by the instance of `TemplateInfuse`.
	 */
	Class.prototype.disconnectedCallback = function() {
		this.templateInfuse.clearEventListeners();
	};

	// Add the proxy methods.
	each( PROXY_MIXIN_METHODS, name => {
		Class.prototype[ name ] = function( ...args ) {
			return this.templateInfuse[ name ]( ...args );
		};
	});

	return Class;
};