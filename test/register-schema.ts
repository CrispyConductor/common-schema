import { expect } from 'chai';
import { createSchema, defaultSchemaFactory } from '../lib/index.js';

describe('#registerSchema', function() {

	it('should register a schema', function() {
		let Foo = createSchema({
			bars: [ {
				biz: Number,
				baz: String
			} ]
		});

		defaultSchemaFactory.registerSchema('Foo', Foo);

		expect(defaultSchemaFactory.getRegisteredSchema('Foo')).to.be.equal(Foo);
	});
});
