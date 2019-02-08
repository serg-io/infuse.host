Infuse.host allows you to **infuse** HTML templates with dynamic content. The resulting infused
HTML fragments can then be added to **host** elements. This is done by writing [template literals](
https://infuse.host/#template-literals) or [expressions](https://infuse.host/#expressions) in your
HTML templates. It also allows you to:

  * Write [event handlers](https://infuse.host/#event-handlers), the same way you would normally
    write them (using [on-event attributes](
    https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers)), but with access to
    the `host` and other variables.
  * Write [watches](https://infuse.host/#watches) to automatically re-infuse an element when an
    event occurs on another element.
  * Write [iterating templates](https://infuse.host/#iterating-templates) to infuse a template
    iteratively, based on values in a given iterable variable.

## Installation ##

```bash
npm install infuse.host
```

## Example ##

A working version of the following "Hello world" example can be found [here](
https://codepen.io/serg-io/pen/YBrwxa).

```html
<!DOCTYPE html>
<html>
<head>
	<title>Basic infuse.host example</title>
</head>
<body>
	<template>
		<h1>${ data.title }</h1>
	</template>
	<header></header>

	<script type="module">
		// Import the infuse and parser modules.
		import infuse from 'https://infuse.host/src/infuse.js';
		import parseTemplate from 'https://infuse.host/src/parseTemplate.js';

		// Find the <header> element (which will be used as `host`) and the <template> element.
		const host = document.querySelector('header');
		const template = document.querySelector('template');

		// Parse the template.
		parseTemplate(template);

		// Data to infuse.
		const data = { title: 'Hello World' };

		// Clone and infuse the template.
		const fragment = infuse(host, template, data);

		// Add the resulting infused `fragment` to the <header> (the `host`).
		host.appendChild(fragment);
	</script>
</body>
</html>
```

## Documentation ##

For documentation and examples visit [https://infuse.host/](https://infuse.host/).

## Webpack ##

[infuse-loader](https://github.com/serg-io/infuse-loader) is a webpack loader that allows you to
parse HTML templates and use infuse.host in webpack projects.

## License ##

[MIT](https://github.com/serg-io/infuse.host/blob/master/LICENSE).