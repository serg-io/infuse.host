Infuse.host
===========

With infuse.host you can write Javascript expressions and template literals in HTML templates and
infuse.host will evaluate them to **infuse** the elements with dynamic content when the templates
are cloned.

## Basic Usage ##

To infuse elements inside a `<template>` element you can use Javascript expressions, enclosed by a
`${` and a `}`, or template literals, in attributes and text child nodes.

For instance, lets say you want to create a custom element with an image of a funny cat. You would
start by writting an HTML file, that we'll call _funny-cat.html_, with a template element
containing an `<img>` element with an expression as the value for its `src` attribute:

	<template>
		<img src="${ host.imageURL }">
	</template>

The contents of this template will be cloned and will be used as the contents of another element
known as the `host` element. We can then use the `Infuse.Host` class to define a `<funny-cat>`
custom element. When using [webpack](https://webpack.js.org/), you can setup [infuse-loader](https://github.com/serg-io/infuse-loader)
to parse and import the template into an ES module:

	import * as Infuse from 'infuse.host';
	import funnyCatTemplate from './funny-cat.html';
	
	class FunnyCat extends Infuse.Host {
		/**
		 * The `Infuse.Host` class uses `this.template` to get the template that will be cloned and
		 * infused when the custom element is created and added to the document. Here, we're simply
		 * using the `funnyCatTemplate` imported at the top.
		 */
		get template() {
			return funnyCatTemplate;
		}
		
		/**
		 * This is the property used in the template to obtain the image URL from the host.
		 */
		get imageURL() {
			return 'https://bit.ly/2PTcf0d';
		}
	}
	
	window.customElements.define('funny-cat', FunnyCat);

Once the custom element is defined, every time the `<funny-cat>` element is used in the document,
infuse.host will clone the template, infuse the `<img>` element, and set it as the content of the
`<funny-cat>` element:

	<funny-cat>
		<img src="https://bit.ly/2PTcf0d">
	</funny-cat>

## Fragments ##

A fragment can be a static string, an expression, or a template literal, and they are used to
infuse **parts** of an element.

### Static strings ###

Static strings can be used in combination with expressions and template literals.

### Expressions ###

In regular Javascript code, expressions can be used within template literals (inside two back-ticks
characters). Infuse.host allows you to use expressions in your HTML code without the use of
back-ticks.

Expressions start with a `${` and end with a `}` and contain valid Javascript code between the
curly braces. When a template is cloned, the Javascript code within the curly braces is evaluated
and the result is used to infuse the part of the element containing the expression.

### Template Literals ###

[Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals)
can also be used to infuse elements and you can use them in your HTML code the same way they are
written in regular Javascript code: they're enclosed by two back-tick characters, they can contain
expressions, and they can be tagged. Tagged template literals are specially useful for things like:
internationalization, date formating, currency formating, etc.

## Parts ##

Infuse.host can infuse four different kinds of parts of an element:

* Attributes
* Boolean attributes
* Properties
* Text child nodes

### Attributes ###

In the following example, the `class` attribute will be infused with "is-valid" (in addition to
"form-control") if `host.isEmailValid` evaluates to a truthy value:

	<input type="email" class="form-control ${ host.isEmailValid ? 'is-valid' : '' }">

### Boolean Attributes ###

A boolean attribute is added to an element if the expression given in its value evaluates to a
truthy value. The name of boolean attributes must end with a question mark. In the following
example, the attribute `disabled` is added to the `<button>` element if `host.isFormInvalid` is
`true`:

	<button type="submit" disabled?="${ host.isFormInvalid }">
		Submit
	</button>

The value of the expression will be used as the value of the boolean attribute if it's truthy but
**it's not** `true`. For instace, in the following example, if `host.getBtnClass()` returns the
string "btn btn-warning", it will be used as the value of the class attribute.

	<button type="reset" class?="${ host.getBtnClass() }">
		Clear Form
	</button>

### Properties ###

Properties of elements can be infused by adding an attribute in the HTML code that starts with a
dot. The expression given in the value will be evaluated and the result will be assigned to the
specified **property** of the element. In the following example, the expression evaluates to a
`Date` instance which is assigned to the property `valueAsDate` of the input element:

	<input type="date" name="moon-landing" .value-as-date="${ new Date(1969, 6, 20) }">

Note that attributes in HTML are case-insensitive (they're [lowercased automatically](https://www.w3.org/TR/html5/dom.html#embedding-custom-non-visible-data-with-the-data-attributes)).
To infuse properties with capital letters in their names use dashes as shown in the example above.

### Text Child Nodes ###

The **text** child nodes of an element can be infused by adding an expression or a template literal:

	<p>${ host.paragraphText }</p>

Tagged template literals can be used for things like internationalization:

	<button type="submit">
		i18n`submit`
	</button>

## Watches ##

## Iterating Templates ##

## Configuration Options ##