let idCounter = 0;

let useDREV1CaveatWorkaround = false;

const BOOLEAN_ATTRIBUTES = {};

const ATTRIBUTE_FUNCTIONS = {};

const TEXT_CONTENT_FUNCTIONS = {};

const isString = value => typeof value === 'string';

const uniqueId = ( prefix = '' ) => prefix + ++idCounter;

const containsExpression = text => /\$\{[^\}]+\}/.test( text );

const stripExpression = expr => expr.replace( /^\$\{\s*|;?\s*\}$/g, '' );

const isExpression = str => str.substr( 0, 2 ) === '${' && str.substr( -1 ) === '}';

const VAR_HOST =
	'var host = this.closest( \'[data-infuse-host="\' + this.dataset.infuseHostId + \'"]\' );';

const PROXY_MIXIN_METHODS = [
	'cloneTemplate', 'infuseElement', 'infuseElements', 'infuseAttribute', 'infuseTextContent'
];

const EVENT_ATTRIBUTES = [
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
].sort();

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

function extend( object, ...args ) {
	object || ( object = {} );
	for ( let obj of args ) {
		each( obj || {}, ( value, key ) => object[ key ] = value );
	}
	return object;
}

function attributesWithExpressions( el ) {
	let head = [], tail = [];
	for ( let a of el.attributes ) {
		if ( containsExpression( a.value ) ) {
			( /^data\-/i.test( a.name ) ? head : tail ).push([ a.name, a.value.trim() ]);
		}
	}
	return new Map( head.concat( tail ) );
}

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

	fn = new Function( 'host', 'data', 'event', src );
	fn.src = src;

	return fn;
}

function loadInfuseFunctions( el, infuseIdPrefix = 'i' ) {
	let attributes = {},
		textContentFn = null,
		booleanAttributes = {},
		map = attributesWithExpressions( el ),
		id;

	for ( let [ name, val ] of map ) {
		el.removeAttribute( name );

		if ( name.substr( -1 ) === '?' ) {
			name = name.substring( 0, name.length - 1 );
			booleanAttributes[ name ] = true;
		}

		attributes[ name ] = expressionToFunction( val );
	}

	if ( el.children.length === 0 && containsExpression( el.textContent ) ) {
		textContentFn = expressionToFunction( el.textContent );
		el.textContent = '';
	}

	if ( map.size || textContentFn ) {
		id = uniqueId( infuseIdPrefix );
		el.dataset.infuseId = id;

		if ( map.size ) {
			ATTRIBUTE_FUNCTIONS[ id ] = attributes;
			BOOLEAN_ATTRIBUTES[ id ] = booleanAttributes;
		}
		if ( textContentFn ) {
			TEXT_CONTENT_FUNCTIONS[ id ] = textContentFn;
		}
	}
}

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

function onAttributesMap( el ) {
	let names = [];

	for ( let a of el.attributes ) {
		if ( a.name.substr( 0, 2 ) === 'on' ) {
			names.push( a.name );
		}
	}

	return new Map( names.sort().map( name => [ name, el.getAttribute( name ) ] ) );
}

export default class TemplateInfuse {
	static get dreV1Caveat() {
		return useDREV1CaveatWorkaround;
	}

	static set dreV1Caveat( value ) {
		useDREV1CaveatWorkaround = value;
	}

	static get BOOLEAN_ATTRIBUTES() {
		return BOOLEAN_ATTRIBUTES;
	}

	static get ATTRIBUTE_FUNCTIONS() {
		return ATTRIBUTE_FUNCTIONS;
	}

	static get TEXT_CONTENT_FUNCTIONS() {
		return TEXT_CONTENT_FUNCTIONS;
	}

	static loadTemplate( templateEl, options = {} ) {
		if ( templateEl.hasAttribute( 'data-loaded' ) ) {
			return;
		}

		loadInfuseFunctions( templateEl, options.prefix );

		for ( let el of templateEl.content.querySelectorAll( '[i], [data-infuse]' ) ) {
			if ( !el.hasAttribute( 'data-infuse' ) ) {
				el.setAttribute( 'data-infuse', el.getAttribute( 'i' ) );
				el.removeAttribute( 'i' );
			}

			if ( options.eventAttributes !== false ) {
				let start = 0,
					events = options.eventAttributes || EVENT_ATTRIBUTES;

				for ( let [ name, value ] of onAttributesMap( el ) ) {
					let i = events.indexOf( name, start );
					if ( i !== -1 ) {
						el.setAttribute( name, VAR_HOST + value );
						start = i + 1;
					}
				}
			}

			loadInfuseFunctions( el, options.prefix );
		}

		templateEl.dataset.loaded = '';

		for ( let el of templateEl.content.querySelectorAll( 'template' ) ) {
			TemplateInfuse.loadTemplate( el, options );
		}
	}

	constructor( host, ownerDocument = document ) {
		this.host = host;
		this.hostId = uniqueId( 'h' );
		host.dataset.infuseHost = this.hostId;

		this.eventListeners = [];
		this.ownerDocument = ownerDocument;
	}

	cloneTemplate( el = 'template', data = {}, event = undefined, isNestedTemplate = false ) {
		isString( el ) && ( el = this.ownerDocument.querySelector( el ) );
		TemplateInfuse.loadTemplate( el );

		let id = el.dataset.infuseId,
			attrFunctions = ATTRIBUTE_FUNCTIONS[ id ] || {},
			ifFn = attrFunctions[ 'data-if' ],
			collection = attrFunctions[ 'data-repeat' ] || attrFunctions[ 'data-repeat-it' ],
			fragment, key, value, entry, clone;

		if ( ifFn ) {
			if ( !ifFn.call( el, this.host, data, event ) ) {
				if ( isNestedTemplate ) {
					el.remove();
				}

				return document.createDocumentFragment();
			}
		}

		if ( collection ) {
			collection = collection.call( el, this.host, data, event );

			key = el.dataset.key || 'key';
			value = el.dataset.value || 'value';
			entry = el.dataset.entry || 'entry';

			clone = additionalData => {
				let d = extend( {}, data, additionalData ),
					frag = this._infuseFragment( el.content.cloneNode( true ), d, event );

				for ( let nestedTemplate of frag.querySelectorAll( 'template' ) ) {
					this.cloneTemplate( nestedTemplate, d, event, true );
				}

				fragment ? fragment.appendChild( frag ) : ( fragment = frag );
			};
		}

		if ( attrFunctions[ 'data-repeat' ] ) {
			each( collection, ( v, k ) => clone({ [ key ]: k, [ value ]: v }) );
		} else if ( attrFunctions[ 'data-repeat-it' ] ) {
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
			fragment = this._infuseFragment( el.content.cloneNode( true ), data, event );

			for ( let nestedTemplate of fragment.querySelectorAll( 'template' ) ) {
				this.cloneTemplate( nestedTemplate, data, event, true );
			}
		}

		if ( isNestedTemplate ) {
			if ( fragment ) {
				el.parentNode.insertBefore( fragment, el );
			}
			el.remove();
		}

		return fragment;
	}

	_infuseFragment( fragment, data, event ) {
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

	infuseElements( elements, data, event ) {
		isString( elements ) && ( elements = this.host.querySelectorAll( elements ) );

		for ( let el of elements ) {
			this.infuseElement( el, data, event );
		}
	}

	infuseElement( el, data, event ) {
		let id, textContentFn, selector;

		if ( isString( el ) ) {
			selector = el;
			el = this.host.querySelector( selector );

			if ( !el ) {
				throw new Error(
					'Cannot infuse element. The host element doesn\'t have a ' +
					'descendant element that matches the selector "' + selector + '".'
				);
			}
		}

		id = el ? el.dataset.infuseId : false;

		if ( !id ) {
			throw new Error(
				'Cannot infuse element. The first argument must be a string (a valid selector) ' +
				'or an element that has the attribute "data-infuse" or the attribute "i".'
			);
		}

		each( ATTRIBUTE_FUNCTIONS[ id ], ( fn, name ) => {
			this._infuseAttribute( el, name, fn, data, event );
		});

		textContentFn = TEXT_CONTENT_FUNCTIONS[ id ];

		if ( textContentFn ) {
			this._infuseTextContent( el, textContentFn, data, event );
		}
	}

	infuseAttribute( el, name, data, event ) {
		let id, functions, selector;

		if ( isString( el ) ) {
			selector = el;
			el = this.host.querySelector( selector );

			if ( !el ) {
				throw new Error(
					'Cannot infuse attribute "' + name + '". The host element doesn\'t have a ' +
					'descendant element that matches the selector "' + selector + '".'
				);
			}
		}

		id = el ? el.dataset.infuseId : false;

		if ( !id ) {
			throw new Error(
				'Cannot infuse attribute "' + name + '". The first argument must be a string (a ' +
				'valid selector) or an element that has the attribute "data-infuse" or the ' +
				'attribute "i".'
			);
		}

		functions = ATTRIBUTE_FUNCTIONS[ id ];

		if ( !functions || !functions[ name ] ) {
			throw new Error( 'The attribute "' + name + '" does not contain an expression.' );
		}

		this._infuseAttribute( el, name, functions[ name ], data, event );
	}

	_infuseAttribute( el, name, attributeFunction, data, event ) {
		let setAttribute = true,
			id = el.dataset.infuseId,
			value = attributeFunction.call( el, this.host, data, event ),
			attributeValue = '' + value;

		if ( BOOLEAN_ATTRIBUTES[ id ] && BOOLEAN_ATTRIBUTES[ id ][ name ] ) {
			if ( !value ) {
				setAttribute = false;
				if ( el.hasAttribute( name ) ) {
					el.removeAttribute( name );
				}
			} else if ( value === true ) {
				attributeValue = '';
			}
		}

		if ( setAttribute && attributeValue !== el.getAttribute( name ) ) {
			el.setAttribute( name, attributeValue );
		}

		if ( this.isProperty( el, name ) && value !== el[ name ] ) {
			el[ name ] = value;
		}
	}

	isProperty( el, name ) {
		if ( typeof this.host.isProperty === 'function' ) {
			return this.host.isProperty( el, name );
		}

		return el.nodeName === 'INPUT' && ( name === 'value' || name === 'checked' );
	}

	infuseTextContent( el, data, event ) {
		let id, textContentFn, selector;

		if ( isString( el ) ) {
			selector = el;
			el = this.host.querySelector( selector );

			if ( !el ) {
				throw new Error(
					'Cannot infuse textContent. The host element doesn\'t have a ' +
					'descendant element that matches the selector "' + selector + '".'
				);
			}
		}

		id = el ? el.dataset.infuseId : false;

		if ( !id ) {
			throw new Error(
				'Cannot infuse textContent. The first argument must be a string (a ' +
				'valid selector) or an element that has the attribute "data-infuse" or the ' +
				'attribute "i".'
			);
		}

		textContentFn = TEXT_CONTENT_FUNCTIONS[ id ];

		if ( !textContentFn ) {
			throw new Error(
				'Cannot infuse textContent. The specified element does not contain an expression.'
			);
		}

		this._infuseTextContent( el, textContentFn, data, event );
	}

	_infuseTextContent( el, fn, data, event ) {
		const textContent = fn.call( el, this.host, data, event );

		if ( textContent !== el.textContent ) {
			el.textContent = textContent;
		}
	}

	on( eventName, listener ) {
		this.host.addEventListener( eventName, listener );
		this.eventListeners.push([ eventName, listener ]);
	}

	clearEventListeners() {
		for ( let args; args = this.eventListeners.pop(); ) {
			this.host.removeEventListener( ...args );
		}
	}
}

TemplateInfuse.Mixin = function( Base, ownerDocument ) {
	let Class;

	if ( !ownerDocument ) {
		ownerDocument = ( document._currentScript || document.currentScript ).ownerDocument;
	}

	if ( useDREV1CaveatWorkaround ) {
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

	Class.prototype._init = function( ...args ) {
		this.templateInfuse = new TemplateInfuse( this, ownerDocument );
		this.initialize( ...args );
	};

	Class.prototype.initialize = function() {};

	Class.prototype.disconnectedCallback = function() {
		this.templateInfuse.clearEventListeners();
	};

	each( PROXY_MIXIN_METHODS, name => {
		Class.prototype[ name ] = function( ...args ) {
			return this.templateInfuse[ name ]( ...args );
		};
	});

	return Class;
};