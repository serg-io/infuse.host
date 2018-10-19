import configs, { setConfigs } from './configs';

describe('setConfigs', () => {
	it('should set configuration options from an object', () => {
		setConfigs({
			eventName: 'e',
			listenerExp: 'on-',
		});

		expect(configs.get('eventName')).toBe('e');
		expect(configs.get('listenerExp')).toBe('on-');
	});

	it('should set configuration options from an array', () => {
		setConfigs([
			['eventName', 'e'],
			['listenerExp', 'on-'],
		]);

		expect(configs.get('eventName')).toBe('e');
		expect(configs.get('listenerExp')).toBe('on-');
	});
});