import { expect } from 'chai';
import { createSchema, Schema } from '../lib/index.js';

describe('Schema', function() {
	it('::isSchema', function() {
		let schema = createSchema({ foo: String });

		expect(Schema.isSchema(schema)).to.be.true;
		expect(Schema.isSchema('foo')).to.be.false;
		expect(Schema.isSchema(true)).to.be.false;
		expect(Schema.isSchema(64)).to.be.false;
		expect(Schema.isSchema({ foo: 'bar' })).to.be.false;
		expect(Schema.isSchema([ 4, 16, 256 ])).to.be.false;
		expect(Schema.isSchema(/foo/)).to.be.false;
		expect(Schema.isSchema(new Date())).to.be.false;
	});

	const testSchema1 = createSchema({
		foo: String,
		bar: { type: 'map', values: Number },
		baz: {
			biz: {
				buz: Boolean
			}
		},
		arr: [ {
			zip: String
		} ]
	});

	it('#listFields', function() {
		const expected = [ 'foo', 'bar', 'baz', 'baz.biz', 'baz.biz.buz', 'arr' ];
		const actual = testSchema1.listFields();
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields no stopAtArrays', function() {
		const expected = [ 'foo', 'bar', 'bar.$', 'baz', 'baz.biz', 'baz.biz.buz', 'arr', 'arr.$', 'arr.$.zip' ];
		const actual = testSchema1.listFields({ stopAtArrays: false  });
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields includePathArrays', function() {
		const expected = [ 'foo', 'bar', 'bar.$', 'baz', 'baz.biz', 'baz.biz.buz', 'arr', 'arr.$', 'arr.$.zip' ];
		const actual = testSchema1.listFields({ stopAtArrays: false, includePathArrays: true });
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields maxDepth', function() {
		const expected = [ 'foo', 'bar', 'baz', 'baz.biz', 'arr' ];
		const actual = testSchema1.listFields({ maxDepth: 2  });
		expect(actual).to.deep.equal(expected);
	});

	it('#listFields onlyLeaves', function() {
		const expected = [ 'foo', 'bar', 'baz.biz.buz', 'arr' ];
		const actual = testSchema1.listFields({ onlyLeaves: true });
		expect(actual).to.deep.equal(expected);
	});

	it.only('#setSubschemaOption', function() {
		let schema = createSchema({
			scalarTest: String,
			nestedObjectTest: {
				foo: String
			},
			arrayTest: [ String ],
			arraySetTest: {
				type: 'arrayset',
				elements: String
			},
			mapTest: {
				type: 'map',
				values: String
			}
		});
		schema.setSubschemaOption('', 'testOpt', true);
		schema.setSubschemaOption('scalarTest', 'testOpt', true);
		schema.setSubschemaOption('nestedObjectTest', 'testOpt', 'foo');
		schema.setSubschemaOption('nestedObjectTest.foo', 'testOpt', 'bar');
		schema.setSubschemaOption('arrayTest', 'testOpt', 'foo');
		schema.setSubschemaOption('arrayTest.$', 'testOpt', 'bar');
		schema.setSubschemaOption('arraySetTest.$', 'testOpt', 'foo');
		schema.setSubschemaOption('arraySetTest.el', 'testOpt', 'bar');
		schema.setSubschemaOption('mapTest.$', 'testOpt', 'foo');
		schema.setSubschemaOption('mapTest.el', 'testOpt', 'bar');

		let expected = {
			type: 'object',
			testOpt: true,
			properties: {
				scalarTest: {
					type: 'string',
					testOpt: true
				},
				nestedObjectTest: {
					type: 'object',
					testOpt: 'foo',
					properties: {
						foo: {
							type: 'string',
							testOpt: 'bar'
						}
					}
				},
				arrayTest: {
					type: 'array',
					testOpt: 'foo',
					elements: {
						type: 'string',
						testOpt: 'bar'
					}
				},
				arraySetTest: {
					type: 'arrayset',
					elements: {
						type: 'string',
						testOpt: 'foo'
					},
					keySchemas: {
						el: {
							type: 'string',
							testOpt: 'bar'
						}
					}
				},
				mapTest: {
					type: 'map',
					values: {
						type: 'string',
						testOpt: 'foo'
					},
					keySchemas: {
						el: {
							type: 'string',
							testOpt: 'bar'
						}
					}
				}
			}
		};

		expect(schema.getData()).to.deep.equal(expected);
	});


});
