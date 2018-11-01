import configs, { setConfigs } from './configs.js';

describe('setConfigs', () => {
	it('should set configuration options from an object', () => {
		setConfigs({
			eventName: 'e',
			eventHandlerExp: 'on-',
		});

		expect(configs.get('eventName')).toBe('e');
		expect(configs.get('eventHandlerExp')).toBe('on-');
	});

	it('should set configuration options from an array', () => {
		setConfigs([
			['eventName', 'e'],
			['eventHandlerExp', 'on-'],
		]);

		expect(configs.get('eventName')).toBe('e');
		expect(configs.get('eventHandlerExp')).toBe('on-');
	});
});