<section>

## Introduction ##

Infuse.host allows you to **infuse** HTML templates with dynamic content. The resulting infused
HTML fragments can then be added to **host** elements. This is done by writing [template literals](
#template-literals) or [expressions](#expressions) in your HTML templates. It also allows you to:

  * Write [event handlers](#event-handlers), the same way you would normally write them (using
    [on-event attributes](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers)),
    but with access to the `host` and other variables.
  * Write [watches](#watches) to automatically re-infuse an element when an event occurs on another
    element.
  * Write [iterating templates](#iterating-templates) to infuse a template iteratively, based on
    values in a given iterable variable.

</section>
<section>

## Example ##

In the following "Hello World" example, the `<template>` element is parsed, cloned, and infused and
the resulting fragment (`<h1>Hello World</h1>`) is added to `<header>` (the `host` element).

**Note:** In order to keep things simple, templates in these examples are parsed in the browser.
However, this practice is discouraged in a production environment. You can avoid this by parsing
templates as part of a build or back-end process. If you're using [webpack](https://webpack.js.org/),
you can use [infuse-loader](https://github.com/serg-io/infuse-loader) to parse templates and
generate [ES modules](https://developers.google.com/web/fundamentals/primers/modules#intro) from
HTML files. These modules can then be imported into other modules.

<p class="loading-iframe">Loading example...</p>
<iframe height="500" style="width: 100%;" scrolling="no" title="Hello World - infuse.host" data-src="https://codepen.io/serg-io/embed/YBrwxa/?height=500&theme-id=light&default-tab=js,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>

The same result can be achieved using custom elements. The `Infuse.Host` class can be extended to
define custom elements. In this example the text is obtained from the custom element (`host.title`
is used in the template instead of `data.title`).

<p class="loading-iframe">Loading example...</p>
<iframe height="560" style="width: 100%;" scrolling="no" title="Custom &quot;Hello World&quot; element - infuse.host" data-src="https://codepen.io/serg-io/embed/yZzVbX/?height=560&theme-id=light&default-tab=js,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>

</section>
<section>

## Template Literals ##

You can write [template literals](
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) in your HTML
code (inside elements and attribute values), the same way you would write them in regular
Javascript code. They start and end with back-tick characters, they can contain strings and
expressions, and they can be tagged. However, in order to be able to tag template literals, you
must tell infuse.host what are the tag functions that you use within your HTML templates. You do
this by setting the `tags` [configuration option](#configuration-options).

A common use case for tagged template literals is internationalization. For instance, if you want
to tag your template literals with a tag function called `i18n` you must use the configs ES module
to set the `tags` configuration option:

```javascript
import { setConfigs } from 'path/to/infuse.host/src/configs.js';

const dictionary = { submit: 'Submit' };

/**
 * Set the "tags" configuration option. Must be set before parsing.
 * The `i18n` tag function retrieves the value of the given `key`  from the `dictionary`.
 */
setConfigs({
	tags: {
		i18n: function([key]) {
			return dictionary[key];
		}
	}
});
```

The parser uses the "tags" configuration option to identify the tag functions that you use in your
HTML templates. For instance, if you use the `tags` object shown above, `` i18n`submit` `` will be
infused with (replaced with) the string "Submit".

<p class="loading-iframe">Loading example...</p>
<iframe height="500" style="width: 100%;" scrolling="no" title="Tagged template literal - infuse.host" data-src="https://codepen.io/serg-io/embed/NoXRjB/?height=500&theme-id=light&default-tab=html,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>
</section>
<section>

## Expressions ##

An expression starts with `${` and ends with `}` and contains Javascript code, which is
evaluated during the infuse process, and its result is used to infuse the corresponding part of
an element. Expressions can be used inside template literals, inside back-tick characters (just
like in regular Javascript code), or directly in your HTML code, without back-tick characters.

The following variables are available within expressions:

  * **`this`**: The element that contains the expression.
  * **`host`**: The element to which the infused fragment will be added.
  * **`data`**: An optional data object.
  * **`tags`**: The configuration object that contains all tag functions.
  * **`event`**: When an element is infused by a [watch](#watches), the `event` variable is the
    event that triggered the infusion. This variable is `undefined` the first time an element is
    infused.
  * Elements can define their own [custom constant](#custom-constants) variables.
  * Additional **iteration constant** variables are available within [iterating templates](
    #iterating-templates).

Expressions and template literals can be used in combination with static strings. For instance:

```html
<button type="submit" class="btn btn-${ data.hasWarnings ? 'warning' : 'success' }">
	i18n`submit`
</button>
```

</section>
<section>

## Custom Constants ##

Custom constants are variables available within the expressions and event handlers of an element.
These constants are defined using attributes that follow this format:
`const-variable-name="${ expression }"`, where `variable-name` is the name of the variable,
`expression` is the Javascript code that gets evaluated (right before the element is infused for
the first time), and the resulting value is assigned to the variable.

For instance, lets say that `host.getCarInventory()` returns an array of objects, each object
represents a car with a `color` attribute. The following paragraph displays how many blue cars
there are in the inventory:

```html
<p const-car-inventory="${ host.getCarInventory() }">
	Number of blue cars: ${ carInventory.filter(car => car.color === 'blue').length }
</p>
```

**Note**: In HTML, attributes names are case-insensitive (they're [lower-cased automatically](
https://www.w3.org/TR/html5/dom.html#embedding-custom-non-visible-data-with-the-data-attributes)).
To define a variable with uppercase letters in its name, you must use dashes as shown in the
previous example.

**Note**: the `event` variable is not available in expressions to declare custom constants.

</section>
<section>

## Parts ##

There are four parts of an element that can be infused:

  * Attributes
  * Boolean attributes
  * Properties
  * Text child nodes

<section>

### Attributes ###

In the following example, the `class` attribute will be infused with "is-valid" (in addition to
"form-control") if `host.isEmailValid` evaluates to a truthy value:

```html
<input type="email" class="form-control ${ host.isEmailValid ? 'is-valid' : '' }">
```

</section>
<section>

### Boolean Attributes ###

Boolean attributes have names that end with a question mark and they're added to the element if
their expressions result in a [truthy value](
https://developer.mozilla.org/en-US/docs/Glossary/Truthy).

If the result of an expression is `true`, the attribute is added to the element using an empty
string as its value. If the result is a truthy value, other than `true`, it will be used as the
value of the attribute. Otherwise, if the expression results in a [falsy value](
https://developer.mozilla.org/en-US/docs/Glossary/Falsy), the attribute is removed from the element.

In the following example, the attribute `disabled` is added to the `<button>` element if
`host.isFormInvalid` is `true`:

```html
<button type="submit" disabled?="${ host.isFormInvalid }">
	Submit
</button>
```

When an expressions results in a string that is **not empty**, the string will be used as the value
of the attribute. For instance, if `host.getBtnClass()` returns the string `"btn btn-warning"`, it
will be used as the value of the `class` attribute. However, if it returns a falsy value, the
`class` attribute will not be added to the button at all.

```html
<button type="reset" class?="${ host.getBtnClass() }">
	Clear Form
</button>
```

</section>
<section>

### Properties ###

Properties of elements can be infused by adding an attribute in the HTML code that starts with a
dot. The expression given in the value will be evaluated and the result will be assigned to the
specified **property** of the element. In the following example, the expression evaluates to a
`Date` instance which is assigned to the property `valueAsDate` of the input element:

```html
<input type="date" name="moon-landing" .value-as-date="${ new Date(1969, 6, 20) }">
```

**Note**: In HTML, attributes names are case-insensitive (they're [lower-cased automatically](
https://www.w3.org/TR/html5/dom.html#embedding-custom-non-visible-data-with-the-data-attributes)).
To infuse a property with uppercase letters in its name use dashes as shown in the example above.

</section>
<section>

### Text Child Nodes ###

The **text** child nodes of an element can be infused by adding an expression or a template
literal:

```html
<p>${ host.paragraphText }</p>
```

Tagged template literals can be used for things like internationalization:

```html
<button type="submit" disabled?="${ host.isFormInvalid }">
	i18n`submit`
</button>
```

</section>
</section>
<section>

## Event Handlers ##

You can add event handlers to elements, just like you would in regular HTML code, by using
[on-event attributes](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers).

When an element is parsed, event handler attributes are converted into event listener functions ([
terminology](https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers#Terminology)).
When an element is infused for the first time, these event listeners are added to the element using
the [`addEventListener`](
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) method.

Event handlers have access to the same variables available within expressions. For instance, if you
want to call a method on the `host` element when a form is submitted, you would add an `onsubmit`
event handler attribute.

<p class="loading-iframe">Loading example...</p>
<iframe height="500" style="width: 100%;" scrolling="no" title="Event handler - infuse.host" data-src="https://codepen.io/serg-io/embed/KJQgPQ/?height=500&theme-id=light&default-tab=html,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>
</section>
<section>

## Watches ##

Watches re-infuse an element when an event occurs on itself or another element.

For instance, when the following button is infused for the first time the `disabled` boolean
attribute will not be added because the `event` variable is `undefined`.

```html
<button type="submit" disabled?="${ event !== undefined }">
	i18n`submit`
</button>
```

A watch can be added to infuse the button again whenever it is clicked. When a watch infuses an
element, the value of `event` is the event that triggered the infusion.

In the following example, the watch will listen for the `click` event on the button itself (`this`).
When the event occurs, the element will be re-infused, this time the `event` will be the `click`
event that triggered the watch, which will cause the `disabled` attribute to be added to the button.

```html
<button type="submit" disabled?="${ event !== undefined }" watch-this="click">
	i18n`submit`
</button>
```

Watches can also be used to watch events on other elements. For instance, the button can be infused
when a `submit` event occurs on the `host` element:

```html
<button type="submit" disabled?="${ event !== undefined }" watch-host="submit">
	i18n`submit`
</button>
```

If the `host` element in the previous example contains multiple forms, the button will be disabled
whenever any of those forms are submitted. This is because events [bubble up the DOM](
https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture)
and eventually reach the `host`.

Watches can be limited to infuse an element only when the specified type of event is triggered by
an element that matches a given selector. For instance, the following button will be disabled when
a `submit` event reaches the `host` element and the event was triggered by a form with "login-form"
as its ID:

```html
<button type="submit" disabled?="${ event !== undefined }" watch-host="submit #login-form">
	i18n`login`
</button>
```

Watches are written in this format: `watch-variable="event-map"`, where `variable` is the name of
the variable (element) to watch. This is usually `host` or `this`, but it can be any variable
available within the element's expressions as long as it's an [`Element`](
https://developer.mozilla.org/en-US/docs/Web/API/Element) or implements the [`addEventListener`](
https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) method.

The `event-map` can be written in any of the following formats:

  * A string, `watch-variable="eventList"`, where:
    + `eventList` is a list of semicolon-separated `event`s: `event1[; event2]...[; eventN]`.
    + `event` is an `eventType` optionally followed by a comma-separated list of `selector`s:
      `eventType[ selector1[, selector2]...[, selectorN] ]`
    + `eventType` is the type of event to watch, for instance `click` or `submit`.
    + `selector` is an optional CSS selector used for event delegation. A watch will only infuse
      an element if the element that triggered the event matches the `selector`.

    For instance, the following button will be infused only when a form triggers a `submit` event
    or a form field with the `required` boolean attribute triggers an `invalid` event:

    ```html
    <button type="submit" disabled?="${ event !== undefined }" watch-host="submit; invalid [required]">
    	i18n`signup`
    </button>
    ```

  * An object, `watch-variable="{ eventList: parts }"`, where:
    + The keys follow the `eventList` structure explained above.
    + The values indicate one (a string or a number) or multiple (an array) parts of the element to
      infuse.
        - If the part is a boolean attribute, it must end with a question mark (i.e. `disabled?`).
        - If the part is a property, it must start with a dot and it can be either dashed (i.e.
          `.value-as-date`) or camel cased (i.e. `.valueAsDate`).
        - If the part is a text child node, it must be a number indicating the zero-based index
          position of the text child node to infuse. For instance, consider the following `<p>`
          element:

          ```html
          <p>i18n`total`<strong>=</strong>${ host.getTotal() }</p>
          ```

          It contains three child nodes:
            0. A text child node (`` i18n`submit` ``).
            1. An element child node (`<strong>=</strong>`).
            2. A text child node (`${ host.getTotal() }`).

    In the following example, when a `submit` event reaches the `host`, the watch will **only**
    infuse the `disabled` boolean attribute.

    ```html
    <button type="submit" disabled?="${ event !== undefined }" watch-host="{ submit: 'disabled?' }">
    	i18n`signup`
    </button>
    ```

  * An array of arrays, `watch-variable="[ [eventList, parts] ]"`. This is the same as using an
    object, but the `eventList`/`parts` pairs are written as arrays. For instance, the watch in the
    previous example can be written as an array of arrays and the watch would work the same way.

    ```html
    <button type="submit" disabled?="${ event !== undefined }" watch-host="[ ['submit', 'disabled?'] ]">
    	i18n`signup`
    </button>
    ```

  * An expression, `watch-variable="${ expression }"`. The expression, when evaluated, must return
    a value in one of the formats listed above (a string, an object, or an array of arrays).

    In the following example, `host.getEventMapForSubmitBtn()` must return a string, an object, or
    an array of arrays:

    ```html
    <button type="submit" disabled?="${ event !== undefined }" watch-host="${ host.getEventMapForSubmitBtn() }">
    	i18n`signup`
    </button>
    ```

</section>
<section>

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

```javascript
host.getBooksArray().forEach(function(book, index, books) {
	// Code to execute in each iteration.
	// The variables `book`, `index`, and `books` are available within each iteration.
});
```

A similar iteration can be implemented to clone and infuse a template multiple times by adding the
`for` and `each` attributes to the `<template>` element:

```html
<template for="book, index, books" each="${ host.getBooksArray() }">
	<!--
		Contents of this template will be cloned and infuse once for each `book`.
		The variables `book`, `index`, and `books` are available within any expression and
		event handlers inside this template.
	-->
</template>
```

Lets say that `host.getBooksArray()` returns an array of objects, each object represents a book and
contains the attributes `isbn`, `title`, and `author`. The following template can be used to
generate a `<table>` with a list of books.

<p class="loading-iframe">Loading example...</p>
<iframe height="550" style="width: 100%;" scrolling="no" title="Iterating template - infuse.host" data-src="https://codepen.io/serg-io/embed/KJQzmP/?height=550&theme-id=light&default-tab=html,result" frameborder="no" allowtransparency="true" allowfullscreen="true"></iframe>

Note how the iterating template is inside a parent template. When a template is cloned and infused,
nested templates are also cloned and infused.

</section>
<section>

## Custom Elements ##

The `Infuse.Host` class can be extended to define a class for a custom element. The only property
that is required to be defined is a `template` getter.

Lets say you want to define a custom element for a login form and that you're using webpack and
[infuse-loader](https://github.com/serg-io/infuse-loader) to parse and import your templates. The
following code would define a custom element called `<login-form>`.

```javascript
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
```

When the custom element is added to the DOM, `Infuse.Host` uses the `template` property to obtain
the template that needs to be cloned and infused, the resulting fragment is added to the custom
element. When the custom element is removed from the DOM, memory allocated (during the infusion
process) for the element, and any of its descendants, is cleared automatically, there's no need to
call the `clear` function.

<section>

### Customized Built-in Elements ###

If you want to extend one of the browser's built-in elements you can use the `CustomHost` function
to define a [customized built-in element](
https://developers.google.com/web/fundamentals/web-components/customelements#extendhtml).

For instance, lets say that your application contains a shopping cart and you want to summarize the
items in the cart using a list (an `<ul>` element) where each element in the list is an item in the
cart. You can define a **customized built-in element** that extends the `HTMLLIElement` class (the
`<li>` element):

```javascript
import { CustomHost } from 'path/to/infuse.host/src/infuse.js';
import cartItemTemplate from './cart-item.html';

/**
 * Extend the `HTMLLIElement` class to define a new `CartItem` class.
 */
class CartItem extends CustomHost(HTMLLIElement) {
	get template() {
		// Return the parsed template.
		return cartItemTemplate;
	}
}

/**
 * When defining customized built-in elements, you must specify (in the third argument) what
 * built-in HTML tag the custom element extends.
 */
window.customElements.define('cart-item', CartItem, { extends: 'li' });
```

Once defined, you can create them manually using the constructor:

```javascript
const item = new CartItem();
```

or using `document.createElement`:

```javascript
const item = document.createElement('li', { is: 'cart-item' });
```

and add them to the DOM manually.

You can also use them in HTML templates:

```html
<ul>
	<template for="item" each="${ host.shoppingCartItems }">
		<li is="cart-item" .description="${ item.description }" .price="${ item.price }"></li>
	</template>
</ul>
```

</section>
</section>
<section>

## Cleanup ##

When a template is cloned and the cloned fragment is infused, memory is allocated to create
variables, event listeners, and watches. Infuse.host keeps track of allocated memory. When an
element is removed from the DOM and is no longer needed, memory associated with that element must
be cleared. This memory can be cleared using the `clear` function. The `clear` function searches
for infused elements and clears memory associated with the elements it finds.

In the following example a `<form>` element is removed from the DOM and the `clear` function is
called using the `form` as the only argument. The `clear` function will search for infused elements
inside the `form` and clear memory that was allocated to infuse them. If the form itself is an
infused element, memory associated with the form will also be cleared.

```javascript
import { clear } from 'path/to/infuse.host/src/infuse.js';

const form = document.querySelector('#login-form');

// Remove form from the DOM.
form.remove();

// Clear memory from any infused element within the form (including the form itself).
clear(form);
```

**Note:** Custom elements defined using the `Infuse.Host` class or the `Infuse.CustomHost` function
call the `clear` method when the custom element is removed from the DOM (when the
`disconnectedCallback` method is called). Therefore, the `clear` function doesn't need to be called
for custom elements defined using `Infuse.Host` or `Infuse.CustomHost`.

</section>
<section>

## Configuration Options ##

The config ES module allows you to change configuration options.

In the following example, the `setConfigs` function is used to change the configuration options
`eventHandlerExp` and `eventName`:

```javascript
import { setConfigs } from 'path/to/infuse.host/src/configs.js';

setConfigs({
	// Change the name of the "event" variable to just "e".
	eventName: 'e',
	// Change the prefix of event handler attributes to "on-".
	eventHandlerExp: 'on-'
});
```

The following is a list of all the configuration options:

  * **`camelCaseEvents`**: Indicates whether or not event names in event handlers should be camel
    cased during the parsing process. This option is `false` by default.

    Consider the following element:

    ```html
    <form on-client-side-validation="host.enableSubmitBtn(event)">
    	<!-- Form fields. -->
    </form>
    ```

    By default, this event handler will be listening for `'client-side-validation'` events. However,
    if `camelCaseEvents` is set to `true`, the event handler would be listening for
    `'clientSideValidation'` events instead.

  * **`constantExp`**: The prefix (a string) or a regular expression used to determine if an
    attribute is a custom constant. This is `'const-'` by default which means that all attributes
    that start with `const-` are custom constant definitions.

    If `constantExp` is set to a regular expression, the regular expression is used to determine if
    attributes are custom constants. For instance, if you want custom constant attribute names to
    end with `-const` you would use the following regular expression:

    ```javascript
    setConfigs({ constantExp: /^(\w+)-const$/ });
    ```

    If you're using a regular expression, it must contain parenthesis, as shown above. The
    parenthesis indicate the location of the name of the variable.

  * **`contextFunctionId`**: When an element is parsed a context function is generated. An ID that
    uniquely identifies the context function is also created. This ID is added to the element as an
    attribute. The `contextFunctionId` option defines the name of that attribute. This is
    `'data-cid'` by default.

  * **`eventHandlerExp`**: The prefix (a string) or a regular expression used to determine if an
    attribute is an event handler. By default, event handler attributes start with `on` or `on-`
    and can contain alphanumeric characters, underscores, dashes, and colons. The following regular
    expression is used by default to identify event handler attributes:

    ```javascript
    /^on-?(\w[\w:-]+)$/
    ```

    Parentheses are required when using a regular expression, they indicate the location of the
    event type. For instance, when using the following expression:

    ```javascript
    setConfigs({ eventHandlerExp: /^when-(\w+)-run$/ });
    ```

    you would write event handlers using the format `when-eventtype-run="expression"`, where
    `eventtype` is the type of event and `expression` is the expression to execute when the
    event occurs. For example, when using `when-submit-run="event.preventDefault()"` the event
    handler would listen for `submit` events.

    Alternatively, you can use a string to indicate the prefix of event handlers. For instance,
    when using `'on'`:

    ```javascript
    setConfigs({ eventHandlerExp: 'on' });
    ```

    all attributes that start with `on` will be treated as event handlers.

  * **`eventName`**: Name of the event variable available within expressions and event handlers.
    This is `'event'` by default. If you wanted event variables to be named `e` instead, you would
    have to change this configuration option:

    ```javascript
    setConfigs({ eventName: 'e' });
    ```

    This would allow you to use `e` (instead of `event`) to access event variables within
    expressions and event handlers. For instance:

    ```html
    <form onsubmit="e.preventDefault()">
    	<button type="submit" disabled?="${ e !== undefined }">Submit</button>
    </form>
    ```

  * **`placeholderId`**: Nested templates are replaced with placeholder templates during the
    parsing process. Placeholder templates have an attribute that uniquely identifies the template
    that was replaced. The `placeholderId` defines the name of the attribute. This is `'data-pid'`
    by default.

  * **`sweepFlag`**: Name of the boolean attribute to use as an indicator that memory has been
    allocated for an element. Allocated memory must be cleared when the element is removed from the
    DOM. This is `'data-sweep'` by default.

  * **`tags`**: An object containing all possible tag functions to be used with template literals.
    During parsing (for instance, when using the [infuse-loader](
    https://github.com/serg-io/infuse-loader)) this can be an array (of strings) of all possible
    tag function names. However, at run time, this must be an object where the keys are the names
    of the tag functions and the values are the tag functions.

  * **`tagsName`**: Name of the variable, available within expressions and event handlers, that
    contains all tag functions. This is `'tags'` by default.

  * **`templateId`**: Name of the template ID attribute. After parsing a template, a template ID
    attribute is automatically generated and added to the template element. This configuration
    option is the name of that attribute and it's `'data-tid'` by default.

    If the template element already has this attribute when it's parsed, a new ID is **not**
    generated, instead the value of the attribute is used to identify the template.

    If you're already setting the `id` attribute on your templates, changing this configuration
    option to `id` would make it easier to access your templates (especially if you're using
    infuse-loader, see [infuse-loader](https://github.com/serg-io/infuse-loader) for details).

  * **`watchExp`**: The prefix (a string) or a regular expression used to determine if an attribute
    is a watch. This is `'watch-'` by default which means that all attributes that start with
    `watch-` are treated as watches.

    If `watchExp` is set to a regular expression, the regular expression is used to determine if
    attributes are watches. For instance, if you want watch attribute names to end with `-watch`
    you would use the following regular expression:

    ```javascript
    setConfigs({ watchExp: /^(\w+)-watch$/ });
    ```

    If you're using a regular expression, it must contain parenthesis, as shown above. The
    parenthesis indicate the location of the name of the variable/element to watch.

</section>