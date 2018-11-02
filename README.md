Infuse.host
===========

Infuse.host allows you to **infuse** an HTML fragment, cloned from an HTML template, with dynamic
content, the infused fragment can then be added to a **host** element. This is done by writing
expressions or [template
literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) in
your HTML code, for the parts you want to infuse. It also allows you to:

* Write event handlers the same way you would normally write them (using [on-event
  attributes](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers)), but with
  access to the `host` and other variables.
* Write watches to re-infuse an element automatically when an event occurs on another element.
* Clone and infuse a template multiple times using templates known as **iterating templates**.

## Template Literals ##

A **template literal** starts and ends with back-tick characters, and just like template literals
in regular Javascript code, they can contain strings and expressions and they can be tagged.

In order to be able to tag template literals, you must tell infuse.host what are the tag functions
that you use within your HTML templates. You do this by setting the "tags" configuration. A common
use case for tagged template literals is internationalization. For instance, if you want to tag
your template literals with a tag function called `i18n` you must use the config ES module to set
the "tags" configuration object:

	import { setConfigs } from 'path/to/infuse.host/src/configs.js';

	const dictionary = { submit: 'Submit' };

	// Tag function: It retrieves the value of the given `key` from the `dictionary`.
	function i18n([key]) {
		return dictionary[key];
	}

	// Set the "tags" configuration object.
	setConfigs({ tags: { i18n: i18n } });

The infuse.host parser uses the "tags" configuration object to identify the tag functions that you
use in your HTML templates. For instance, if you use the "tags" configuration object shown above,
`` i18n`submit` `` will be infused with (replaced with) the string `Submit`.

## Expressions ##

An **expression** starts with a `${` and ends with `}` and contains Javascript code, which is
evaluated, during the infuse process, and its result is used to infuse the corresponding part of
an element. Expressions can be used inside template literals, inside back-tick characters (just
like in regular Javascript code), or directly in your HTML code, without back-tick characters.

The following variables are available within expressions:

* **`this`**: The element that contains the expression.
* **`host`**: The element to which the infused fragment will be added.
* **`data`**: An optional data object.
* **`tags`**: The configuration object that contains all tag functions.
* **`event`**: When an element is infused by a "watch", the `event` variable is the event that
  triggered the infusion. This variable is `undefined` the first time an element is infused.
* Elements can define their own **custom constant** variables.
* Additional **iteration constant** variables are available within iterating templates.

Expressions and template literals can be used in combination with static strings. For instance:

	<button type="submit" class="btn btn-${ data.hasWarnings ? 'warning' : 'success' }">
		i18n`submit`
	</button>

## Example ##

In the following basic example, the `<template>` element is parsed, cloned, and infused. The
resulting fragment (`<h1>Page Title</h1>`) is then added to `<header>` (the `host` element).

	<!doctype html>
	<html>
	<head>
		<title>Basic infuse.host example</title>
	</head>
	<body>
		<template>
			<h1>${ data.pageTitle }</h1>
		</template>
		<header></header>

		<script type="module">
			// Import the infuse and parser modules.
			import infuse from 'path/to/infuse.host/src/infuse.js';
			import parseTemplate from 'path/to/infuse.host/src/parseTemplate.js';

			// Find the <header> element, which will be used as `host`, and the <template> element.
			const host = document.querySelector('header');
			const template = document.querySelector('template');

			// Parse the template.
			parseTemplate(template);

			// Data to infuse.
			const data = { pageTitle: 'Page Title' };

			// Clone/infuse the template and add the infused fragment to the <header> (`host`).
			const fragment = infuse(host, template, data);
			host.appendChild(fragment);
		</script>
	</body>
	</html>

The same result can be achieved using custom elements. The `Infuse.Host` class can be used to
define custom elements. Note that in the following example, instead of getting `pageTitle` from
`data`, it is obtained from the `host` variable (the custom element).

	<!doctype html>
	<html>
	<head>
		<title>Basic infuse.host example using a custom element</title>
	</head>
	<body>
		<template>
			<h1>${ host.pageTitle }</h1>
		</template>
		<custom-header></custom-header>

		<script type="module">
			// Import the infuse and parser modules.
			import * as Infuse from 'path/to/infuse.host/src/infuse.js';
			import parseTemplate from 'path/to/infuse.host/src/parseTemplate.js';

			// Find the <template> and parse it.
			const headerTemplate = document.querySelector('template');
			parseTemplate(headerTemplate);

			// Extend `Infuse.Host` to define a class for the new custom element.
			class CustomHeader extends Infuse.Host {
				// `Infuse.Host` uses `this.template` to obtain the template to clone/infuse.
				get template() {
					return headerTemplate;
				}

				// This is the property used in the template.
				get pageTitle() {
					return 'Page Title';
				}
			}

			// Define the custom element using the `CustomHeader` class.
			window.customElements.define('custom-header', CustomHeader);
		</script>
	</body>
	</html>

In order to keep things simple in these two examples, expressions within the `<template>` elements
are parsed in the browser. However, this practice is discouraged in a production environment. One
can avoid doing this in the browser, which would increase performance, by parsing templates as
part of a build or back-end process. If you're using [webpack](https://webpack.js.org/), you can
use [infuse-loader](https://github.com/serg-io/infuse-loader) to parse templates and generate ES
modules from HTML files. These modules can then be imported into other modules.

## Custom Constants ##

Custom constants are variables available within expressions and event handlers of an element. These
constants are defined using this format: `const-variable-name="${ expression }"`, where
`variable-name` is the name of the variable, `expression` is the Javascript code that gets
evaluated (right before the element is infused for the first time), and the resulting value is
assigned to the variable.

For instance, lets say that `host.getCarInventory()` returns an array of objects, each object
represents a car with a `color` attribute. The following paragraph displays how many blue cars
are there in the inventory:

	<p const-car-inventory="${ host.getCarInventory() }">
		Number of blue cars: ${ carInventory.filter(car => car.color === 'blue').length }
	</p>

Note that in HTML, attributes names are case-insensitive (they're [lower-cased
automatically](https://www.w3.org/TR/html5/dom.html#embedding-custom-non-visible-data-with-the-data-attributes)).
To define a variable with a capital letter in its name, you must use dashes as shown in the
previous example.

Note: the `event` variable is not available in expressions to declare custom constants.

## Parts ##

There are four parts of an element that can be infused:

* Attributes
* Boolean attributes
* Properties
* Text child nodes

### Attributes ###

In the following example, the `class` attribute will be infused with "is-valid" (in addition to
"form-control") if `host.isEmailValid` evaluates to a truthy value:

	<input type="email" class="form-control ${ host.isEmailValid ? 'is-valid' : '' }">

### Boolean Attributes ###

Boolean attributes have names that end with a question mark and they're added to the element if
their expressions result in a [truthy
value](https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

If the result of an expression is `true`, the attribute is added to the element using an empty
string as its value. If the result is a truthy value, other than `true`, it will be used as the
value of the attribute. Otherwise, if the expression results in a [falsy
value](https://developer.mozilla.org/en-US/docs/Glossary/Falsy), the attribute is removed from the
element.

In the following example, the attribute `disabled` is added to the `<button>` element, with an
empty string as its value, if `host.isFormInvalid` is `true`:

	<button type="submit" disabled?="${ host.isFormInvalid }">
		Submit
	</button>

When an expressions results in a string that is **not empty**, the string will be used as the value
of the attribute. For instance, if `host.getBtnClass()` returns the string `"btn btn-warning"`, it
will be used as the value of the `class` attribute.

	<button type="reset" class?="${ host.getBtnClass() }">
		Clear Form
	</button>

### Properties ###

Properties of elements can be infused by adding an attribute in the HTML code that starts with a
dot. The expression given in the value will be evaluated and the result will be assigned to the
specified **property** of the element. In the following example, the expression evaluates to a
`Date` instance which is assigned to the property `valueAsDate` of the input element:

	<input type="date" name="moon-landing" .value-as-date="${ new Date(1969, 6, 20) }">

Note that in HTML, attributes names are case-insensitive (they're [lower-cased
automatically](https://www.w3.org/TR/html5/dom.html#embedding-custom-non-visible-data-with-the-data-attributes)).
To infuse properties with capital letters in their names use dashes as shown in the example above.

### Text Child Nodes ###

The **text** child nodes of an element can be infused by adding an expression or a template
literal:

	<p>${ host.paragraphText }</p>

Tagged template literals can be used for things like internationalization:

	<button type="submit" disabled?="${ host.isFormInvalid }">
		i18n`submit`
	</button>

## Event Handlers ##

You can add event handlers to elements, just like you would in regular HTML code, by using
[on-event attributes](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers).

When an element is parsed, event handler attributes are converted into event listener functions
([terminology](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers#Terminology)).
When an element is infused for the first time, these event listeners are added to the element
using the
[`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
method.

Event handlers have access to the same variables available within expressions. For instance, if you
want to call a method on the `host` element when a form is submitted, you would add an `onsubmit`
event handler attribute:

	<form id="login-form" onsubmit="host.login(event)">
		<!-- Form fields. -->
	</form>

## Watches ##

Watches re-infuse an element when an event occurs on itself or another element.

For instance, when the following button is infused for the first time the `disabled` boolean
attribute will not be added because `event` is `undefined`.

	<button type="submit" disabled?="${ event !== undefined }">
		i18n`submit`
	</button>

A watch can be added to infuse the button again whenever it is clicked. When a watch infuses an
element, the value of `event` is the event that triggered the infusion.

In the following example, the watch will listen for the `click` event on the button itself (`this`).
When the event occurs, the element will be re-infused, this time the `event` will be the `click`
event that triggered the watch, which will cause the `disabled` attribute to be added to the button.

	<button type="submit" disabled?="${ event !== undefined }" watch-this="click">
		i18n`submit`
	</button>

Watches can also be used to watch events on other elements. For instance, the button can be infused
when a `submit` event occurs on the `host` element:

	<button type="submit" disabled?="${ event !== undefined }" watch-host="submit">
		i18n`submit`
	</button>

If the `host` element in the previous example contains multiple forms, the button will be disabled
whenever any of those forms are submitted. This is because events [bubble up the
DOM](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture)
and eventually reach the `host`.

Watches can be limited to infuse an element only when the specified type of event is triggered by
an element that matches a given selector. For instance, the following button will be disabled when
a `submit` event reaches the `host` element and the event was triggered by a form with "login-form"
as its ID:

	<button type="submit" disabled?="${ event !== undefined }" watch-host="submit #login-form">
		i18n`login`
	</button>

Watches are written in the following format:

	watch-variable="event-map"

The  **`variable`** is the name of the variable (element) to watch. This would usually be `host` or
`this` but it can be any variable available within the element's expressions, as long as it's an
[`Element`](https://developer.mozilla.org/en-US/docs/Web/API/Element) or implements the
[`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
method.

The values can be written in any of the following formats:

* A string:

		watch-variable="eventList"

	where:

	* `eventList` is: `event1[; event2]...[; eventN]`
	* `event` is: `eventType[ selector1[, selector2]...[, selectorN] ]`
	* `eventType` is the type of event to watch, for instance `click` or `submit`.
	* `selector` is an optional CSS selector used for event delegation. A watch will only infuse
	  the element if the element that triggered the event matches the `selector`.

	For instance, the following button will be infused only when a form triggers a `submit` event
	or a form field with the `required` boolean attribute triggers an `invalid` event:

		<button type="submit" disabled?="${ event !== undefined }" watch-host="submit; invalid [required]">
			i18n`signup`
		</button>

* An object:

		watch-variable="{ eventList: parts }"

	where:

	* The keys follow the `eventList` structure explained above.
	* The values indicate one (a string or a number) or multiple (an array) parts of the element to
	  infuse.

		+ If the part is a boolean attribute, it must end with a question mark (i.e. `disabled?`).
		+ If the part is a property, it must start with a dot and it can be either dashed (i.e.
		  `.value-as-date`) or camel cased (i.e. `.valueAsDate`).
		+ If the part is a text child node, it must be a number indicating the zero-based index
		  position of the text child node to infuse. For instance, the template literal in the
		  following paragraph element is the child node **0** and the expression is the child node
		  **2**: `` <p>i18n`total`<strong>=</strong>${ host.getTotal() }</p> ``

	In the following example, when a `submit` event reaches the `host`, the watch will **only**
	infuse the `disabled` boolean attribute.

		<button type="submit" disabled?="${ event !== undefined }" watch-host="{ submit: 'disabled?' }">
			i18n`signup`
		</button>

* An array of arrays:

		watch-variable="[ [eventList, parts] ]"

	This is the same as using an object but the `eventList`/`parts` pairs are written as arrays.

* An expression:

		watch-variable="${ expression }"

	The expression, when evaluated, must return a value in one of the formats listed above (a
	string, an object, or an array).

	In the following example, `host.getEventMapForSubmitBtn()` must return a string, an object, or
	an array:

		<button type="submit" disabled?="${ event !== undefined }" watch-host="${ host.getEventMapForSubmitBtn() }">
			i18n`signup`
		</button>

## Cleanup ##

When a template is cloned and the cloned fragment is infused, memory is allocated to create
variables, event listeners, and watches. Infuse.host keeps track of allocated memory. When an
element is removed from the DOM and is no longer needed, memory associated with that element must
be cleared. This memory can be cleared using the `clear` function. The `clear` function searches
for infused elements and clears memory associated with the elements it finds.

In the following example a `<form>` element is removed from the DOM and the `clear` function is
called using the `form`, which will search for infused elements inside the form and clear memory
allocated to infuse them. If the form is an infused element, memory associated with the form will
also be cleared.

	import { clear } from 'path/to/infuse.host/src/infuse.js';

	const form = document.querySelector('#login-form');

	// Remove form from the DOM.
	form.remove();

	// Clear memory from any infused element within the form (including the form itself).
	clear(form);

Note: The `clear` function doesn't need to be called if you're defining custom elements that extend
the `Infuse.Host`.

## Iterating Templates ##

Iterating templates use the `for` and `each` attributes to indicate that the template must be
cloned and infused multiple times. The value of the `for` attribute is a string with up to 3
comma-separated variable names to use in each iteration. The value of the `each` attribute must be
an expression. Evaluating the expression must result in a collection (array, `Map`, `Set`, or any
value that has a `forEach` method). The collection is used to clone the template multiple times,
once for each value in the collection.

Using the `for` and `each` attributes to clone and infuse a template multiple times is analogous
to using the `forEach` method to iterate over multiple values in regular Javascript. For instance,
in Javascript you would write a `forEach` loop like this:

	host.getBooksArray().forEach(function(book, index, books) {
		// Code to execute in each iteration.
		// The variables `book`, `index`, and `books` are available within each iteration.
	});

A similar iteration can be implemented to clone and infuse a template multiple times by adding the
`for` and `each` attributes to the `<template>` element:

	<template for="book, index, books" each="${ host.getBooksArray() }">
		<!--
			Contents of this template will be cloned and infuse once for each `book`.
			The variables `book`, `index`, and `books` are available within any expression and
			event handlers inside this template.
		-->
	</template>

Lets say that `host.getBooksArray()` returns an array of objects, each object represents a book and
contains the attributes `isbn`, `title`, and `author`. The following template can be used to
generate a `<table>` with a list of books.

	<template>
		<table>
			<thead>
				<tr>
					<th>Index</th>
					<th>ISBN</th>
					<th>Title</th>
					<th>Author</th>
				</tr>
			</thead>
			<tbody>
				<template for="book, index" each="${ host.getBooksArray() }">
					<tr>
						<td>${ index }</td>
						<td>${ book.isbn }</td>
						<td>${ book.title }</td>
						<td>${ book.author }</td>
					</tr>
				</template>
			</tbody>
		</table>
	</template>

Note how the iterating template is inside a parent template. When a template is cloned and infused,
nested templates are also cloned and infused.

## Custom Elements Using Infuse.Host ##

The `Infuse.Host` can be extended to define a class for a custom element. The only property that
is required to be defined is a `template` getter.

Lets say you want to define a custom element for a login form and that you're using
[infuse-loader](https://github.com/serg-io/infuse-loader) to parse and import your templates. The
following code would define a custom element called `<login-form>`:

	import * as Infuse from 'path/to/infuse.host/src/infuse.js';
	import loginTemplate from './login-form.html';

	// Extend `Infuse.Host` to define a class for the new custom element.
	class LoginForm extends Infuse.Host {
		get template() {
			// Return the parsed template.
			return loginTemplate;
		}
	}

	// Define the custom element.
	window.customElements.define('login-form', LoginForm);

When the custom element is created, `Infuse.Host` uses the `template` property to obtain the
template to clone and infuse and the resulting fragment is added to the custom element. When the
custom element is removed from the DOM, memory allocated (during the infusion process) for any of
its descendants it's cleared automatically, no need to call the `clear` function.

## Configuration Options ##

The config ES module allows you to change configuration options.

In the following example, the `setConfigs` function is used to change the configuration options
`eventHandlerExp` and `eventName`:

	import { setConfigs } from 'path/to/infuse.host/src/configs.js';

	setConfigs({
		// Change the name of the "event" variable to just "e".
		eventName: 'e',
		// Change the prefix of event handler attributes to "on-".
		eventHandlerExp: 'on-'
	});

The following is a list of all the configuration options:

* **`constantExp`**: The prefix (a string) or a regular expression used to determine if an
  attribute is a custom constant. This is "const-" by default which means that all attributes that
  start with "const-" are custom constant definitions.

  If `constantExp` is set to a regular expression, the regular expression is used to determine if
  attributes are custom constants. For instance, if you want custom constant attribute names to end
  with "-const" you would use the following regular expression:

		setConfigs({ constantExp: /^(\w+)-const$/ });

  If you're using a regular expression, it must contain parenthesis, as shown above. The
  parenthesis indicate the location of the name of the variable.

* **`contextFunctionId`**: When an element is parsed a context function is created and an ID that
  uniquely identifies the function is generated. An attribute is added to the element with the ID
  of the context function. The `contextFunctionId` option defines the name of that attribute. This
  is "data-cid" by default.

* **`eventHandlerExp`**: The prefix (a string) or a regular expression used to determine if an
  attribute is an event handler. This is "on" by default which means that all attributes that start
  with "on" are event handlers.

  If `eventHandlerExp` is set to a regular expression, the regular expression is used to determine
  if attributes are event handlers. For instance, when using the following expression:

		setConfigs({ eventHandlerExp: /^on-(\w+)-run$/ });

  you would write event handlers in the following format:

		on-type-run="expression"

  where `type` is the event type and `expression` is the expression to execute when the event
  occurs, for example:

		on-submit-run="event.preventDefault()"

  If you're using a regular expression, it must contain parenthesis, as shown above. The
  parenthesis indicate the location of the type of event.

* **`eventName`**: Name of the event variable available within expressions and event handlers.
  This is "event" by default. If you wanted event variables to be named "e" instead, you would have
  to change this configuration option:

		setConfigs({ eventName: 'e' });

  This would allow you use `e` (instead of `event`) to access event variables within expressions
  and event handlers. For instance:

		<form onsubmit="e.preventDefault()">
			<button type="submit" disabled?="${ e !== undefined }">Submit</button>
		</form>

* **`placeholderId`**: Nested templates are replaced with placeholder templates during the parsing
  process. Placeholder templates have an attribute that uniquely identifies the template that was
  replaced. The `placeholderId` defines the name of the attribute. This is "data-pid" by default.

* **`sweepFlag`**: Name of the boolean attribute to use as an indicator that memory has been
  allocated for an element. Allocated memory must be cleared when the element is removed from the
  DOM. This is "data-sweep" by default.

* **`tags`**: An object containing all possible tag functions to be used with template literals.
  During parsing (for instance, when using the
  [infuse-loader](https://github.com/serg-io/infuse-loader)) this can be an array of all possible
  tag function names. However, at run time, this must be an object where the keys are the names of
  the tag functions and the values are the tag functions.

* **`tagsName`**: Name of the variable, available within expressions and event handlers, that
  contains all tag functions. This is "tags" by default.

* **`templateId`**: Name of the template ID attribute. After parsing a template, a template ID
  attribute is set on the template element. If the template already has this attribute, its value
  is used to uniquely identify the template instead. This configuration option is the name of that
  attribute. This is "data-tid" by default. If you're already setting the "id" attribute on your
  templates, changing this configuration option to "id" would make it easier to access your
  templates (especially if you're using infuse-loader, see
  [infuse-loader](https://github.com/serg-io/infuse-loader) for details).

* **`watchExp`**: The prefix (a string) or a regular expression used to determine if an attribute
  is a watch. This is "watch-" by default which means that all attributes that start with "watch-"
  are watches.

  If `watchExp` is set to a regular expression, the regular expression is used to determine if
  attributes are watches. For instance, if you want watch attribute names to end with "-watch" you
  would use the following regular expression:

		setConfigs({ watchExp: /^(\w+)-watch$/ });

  If you're using a regular expression, it must contain parenthesis, as shown above. The
  parenthesis indicate the location of the name of the variable/element to watch.