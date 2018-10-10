import { camelCase, uniqueId } from '../lib/core.mjs';

describe('camelCase', () => {
	it('should turn hyphenated strings into camelCase', () => {
		expect(camelCase('variable-name')).toBe('variableName');
		expect(camelCase('date-of-birth')).toBe('dateOfBirth');
	});

	it('should return the same string if it\'s not hyphenated', () => {
		expect(camelCase('user')).toBe('user');
	});
});

describe('uniqueId', () => {
	it('should return an unique id using the given prefix', () => {
		const id = uniqueId('foo');
		expect(id).toMatch(/^foo\d+$/);
	});

	it('should return a number, as a string, if no prefix is given', () => {
		const id = uniqueId();

		expect(typeof id).toBe('string');
		expect(uniqueId()).toMatch(/^\d+$/);
	});

	it('should not return the same unique id when called twice with the same value', () => {
		const a = uniqueId('foo');
		const b = uniqueId('foo');

		expect(a).not.toBe(b);
	});
});
