template-infuse
===============

`template-infuse` is a template engine that uses `<template>` elements and mimics the use of
expressions in [ES2015 template literals]
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to generate
dynamic HTML content.

With `template-infuse` you can:

* Clone the contents of a `<template>` element.
* Use expressions (similar to how expressions are used in ES2015 template literals) inside
  `<template>` elements to inject values when a template is cloned.
* Conditionally include a fragment of HTML in the cloned HTML content. In other words, use `if`
  statements in your templates.
* Include a fragment of HTML multiple times by iterating over iterable values. In other words, use
  `for` loops in your templates.
* Explicitly declare when expressions in a given element must be re-evaluated and the resulting
  values must be injected again.

For a demo application that uses `template-infuse` (combined with custom elements, ES2015, and
webpack) go to [todo.alcantara.io](http://todo.alcantara.io/) (the source code is available at
[github.com/serg-io/todo](https://github.com/serg-io/todo)).

## Host element ##

When using `template-infuse` you must define a `host` element ahead of time. A host element is the
element to which all content will be added/inserted. The host element is given to the
`TemplateInfuse` constructor as the first argument. Each instance of the `TemplateInfuse` contain
only one host element. The HTML fragments returned by the `cloneTemplate` method must be
inserted/appended to the host element.

## Expressions ##

To inject values in the content cloned by `template-infuse` you can use expressions the same way
you would in [ES2015 template literals]
(https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals). There are
four variables that are available within these expressions:

* `this`: The element itself (the one that contains the expression).
* `host`: The host element (the first argument given to the `TemplateInfuse` constructor).
* `data`: The data value: second argument given to the `cloneTemplate` method. If none is given,
  this would be `undefined`.
* `event`: The event value. This is only available when the event(s) given to the `data-infuse`
  attribute is(are) triggered, otherwise it would be `undefined`.

## `data-infuse` ###

The `data-infuse` attribute must be added to elements containing expressions. This attribute is
used by `template-infuse` as a CSS selector to find elements with expressions. As a shorthand
alternative, you can simply use the boolean `i` attribute. The following two template elements are
equivalent:

	<template>
		<h1 data-infuse>Hello ${ data.name }</h1>
	</template>
	<template>
		<h1 i>Hello ${ data.name }</h1>
	</template>

An optional value can be given to the `data-infuse` attribute. Its value must be a string composed
of one or more events and optional CSS selector(s). Event names must be separated from the selectors
with a single space. Multiple events must be separated by a semi-colon. For instance:

	<!--
		This element is infused when a "change" event (**ANY** "change" event) reaches its
		host element.
	-->
	<p data-infuse="change">Hello ${ event ? event.target.value : '' }</p>
    
	<!--
		This element is infused when a "change" event triggered by an <input> element reaches its
		host element.
	-->
	<p data-infuse="change input">Hello ${ event ? event.target.value : '' }</p>
    
	<!--
		This element is infused when a "change" event, triggered by an <input> or <select>,
		or a "submit" event, triggered by a <form>, reaches its host element.
	-->
	<p data-infuse="change input, select; submit form">Hello ${ event ? event.target.value : '' }</p>



## Examples ##

The following example is a simple hello world page.


	<!DOCTYPE html>
	<html lang="en">
	<head>
		<title>Hello World</title>
		<meta charset="utf-8">
	</head>
	<body>
		<template>
			<h1 data-infuse>Hello ${ data.name }</h1>
		</template>
		
		<!-- Host element -->
		<div></div>
	
		<script src="template-infuse.js"></script>
		<script>
		(function() {
			let data = { name: 'World' },
				// Find the host element.
				host = document.querySelector( 'div' ),
				// Instantiate `TemplateInfuse`. Use the host element as the first argument.
				templateInfuse = new TemplateInfuse( host ),
				/**
				 * Clone a template.
				 * First argument: the selector of the template (or the template itself) to clone.
				 * Second argument: the `data` to use in the expressions.
				 */
				fragment = templateInfuse.cloneTemplate( 'template', data );
	
			document.body.appendChild( fragment );
		})();
		</script>
	</body>
	</html>

The following example shows how an element can be automatically re-infused when a "change" event is
triggered by the `<input>` element.


	<!DOCTYPE html>
	<html lang="en">
	<head>
		<title>Data Binding</title>
		<meta charset="utf-8">
	</head>
	<body>
		<template>
			<label for="name">Name</label>
			<input id="name" type="text" autofocus>

			<p data-infuse="change input">
				Hello ${ event && event.target.value ? event.target.value : 'World' }
			</p>
		</template>

		<!-- Host element -->
		<form></form>

		<script src="template-infuse.js"></script>
		<script>
		(function() {
			let form = document.querySelector( 'form' ),
				templateInfuse = new TemplateInfuse( form ),
				// If no argument is given, "template" is used as the first argument by default.
				fragment = templateInfuse.cloneTemplate();

			form.appendChild( fragment );

			form.addEventListener( 'submit', e => e.preventDefault() );
		})();
		</script>
	</body>
	</html>

Warning: `template-infuse` is written as an ES2015 module, which is not currently supported by any
browser. You must remove `export default` and `export` from lines 457 and 979 respectively for
these examples to work. You can currently use `template-infuse` with
[webpack](https://webpack.js.org/). A build script will be added in a future version to provide an
alternative to webpack.

### Coming soon (in a future version) ###

* Build script.
* Additional examples.
* Additional documentation.