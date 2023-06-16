import { expect } from 'chai';
import { createSchema, Schema, XTransformHandlerResult } from '../lib/index.js';

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

	it('#getObjectPath()', function() {
		const schema = createSchema({
			foo: [
				{
					bar: String
				}
			]
		});
		const obj = {
			foo: [
				{ bar: 'a' },
				{ bar: 'b' }
			]
		};
		const path = 'foo.1.bar';
		expect(schema.getObjectPath(obj, path)).to.equal('b');
		expect(schema.xgetObjectPath(obj, path)).to.equal('b');
	});

	it('#setObjectPath A', function() {
		const schema = createSchema({
			foo: {
				bar: {
					baz: String
				}
			}
		});
		const obj: any = {
			foo: {
				bar: {
				}
			}
		};
		schema.setObjectPath(obj, 'foo.bar.baz', 'value');
		expect(obj.foo.bar.baz).to.equal('value');
	});

	it('#setObjectPath B', function() {
		const schema = createSchema({
			foo: {
				bar: {
					baz: String
				}
			}
		});
		const obj: any = {
			foo: {
			}
		};
		schema.setObjectPath(obj, 'foo.bar.baz', 'value');
		expect(obj.foo.bar.baz).to.equal('value');
	});

	it('#setObjectPath C', function() {
		const schema = createSchema({
			foo: 'string'
		});
		const obj: any = {
			foo: {
			}
		};
		schema.setObjectPath(obj, 'foo', 'value');
		expect(obj.foo).to.equal('value');
	});

	it('#setObjectPath D', function() {
		const schema = createSchema({
			arr: [
				{
					foo: 'string'
				}
			]
		});
		const obj: any = {
			arr: [
				{
					foo: 'a'
				}
			]
		};
		schema.setObjectPath(obj, 'arr.0.foo', 'b');
		schema.setObjectPath(obj, 'arr.1.foo', 'c');
		expect(obj.arr[0].foo).to.equal('b');
		expect(obj.arr[1].foo).to.equal('c');
	});

	it('#xsetObjectPath A', function() {
		const schema = createSchema({
			foo: {
				bar: {
					baz: String
				}
			}
		});
		const obj: any = {
			foo: {
				bar: {
				}
			}
		};
		schema.xsetObjectPath(obj, 'foo.bar.baz', 'value');
		expect(obj.foo.bar.baz).to.equal('value');
	});

	it('#xsetObjectPath B', function() {
		const schema = createSchema({
			foo: {
				bar: {
					baz: String
				}
			}
		});
		const obj: any = {
			foo: {
			}
		};
		schema.xsetObjectPath(obj, 'foo.bar.baz', 'value');
		expect(obj.foo.bar.baz).to.equal('value');
	});

	it('#xsetObjectPath C', function() {
		const schema = createSchema({
			foo: 'string'
		});
		const obj: any = {
			foo: {
			}
		};
		schema.xsetObjectPath(obj, 'foo', 'value');
		expect(obj.foo).to.equal('value');
	});

	it('#xsetObjectPath D', function() {
		const schema = createSchema({
			arr: [
				{
					foo: 'string'
				}
			]
		});
		const obj: any = {
			arr: [
				{
					foo: 'a'
				}
			]
		};
		schema.xsetObjectPath(obj, 'arr.0.foo', 'b');
		schema.xsetObjectPath(obj, 'arr.1.foo', 'c');
		expect(obj.arr[0].foo).to.equal('b');
		expect(obj.arr[1].foo).to.equal('c');
	});

	it('#setSubschemaOption', function() {
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

	it('transform', function() {
		const schema = createSchema({
			arrayTest: [
				{
					stopTraverseHere: Boolean,
					setAndStopHere: Boolean,
					valueFoo: String,
					subobject: {
						valueFoo: String
					}
				}
			],
			arraysetTest: {
				type: 'arrayset',
				elements: {
					myKey: String,
					otherKey: String
				},
				keyField: 'myKey'
			}
		});
		const obj = {
			arrayTest: [
				{
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				},
				{
					stopTraverseHere: true,
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				},
				{
					setAndStopHere: true,
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				}
			],
			arraysetTest: [
				{
					myKey: 'a',
					otherKey: 'a'
				}
			]
		};
		const expected = {
			arrayTest: [
				{
					valueFoo: 'bar',
					subobject: {
						valueFoo: 'bar'
					}
				},
				{
					stopTraverseHere: true,
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				},
				{
				}
			],
			arraysetTest: [
				{
					myKey: 'b',
					otherKey: 'b'
				}
			]
		};
		const result = schema.transform(obj, {
			onField(field, value) {
				if (field.endsWith('valueFoo')) return 'bar';
				if (value === 'a') return 'b';
				if (value && value.stopTraverseHere) return schema.stopTransform();
				if (value && value.setAndStopHere) return schema.setAndStopTransform({});
				return value;
			}
		});
	});

	it('xtransform', function() {
		const schema = createSchema({
			arrayTest: [
				{
					stopTraverseHere: Boolean,
					setAndStopHere: Boolean,
					valueFoo: String,
					subobject: {
						valueFoo: String
					}
				}
			],
			arraysetTest: {
				type: 'arrayset',
				elements: {
					myKey: String,
					otherKey: String
				},
				keyField: 'myKey'
			}
		});
		const obj = {
			arrayTest: [
				{
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				},
				{
					stopTraverseHere: true,
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				},
				{
					setAndStopHere: true,
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				}
			],
			arraysetTest: [
				{
					myKey: 'a',
					otherKey: 'a'
				}
			]
		};
		const expected = {
			arrayTest: [
				{
					valueFoo: 'bar',
					subobject: {
						valueFoo: 'bar'
					}
				},
				{
					stopTraverseHere: true,
					valueFoo: 'foo',
					subobject: {
						valueFoo: 'foo'
					}
				},
				{
				}
			],
			arraysetTest: [
				{
					myKey: 'b',
					otherKey: 'b'
				}
			]
		};
		const result = schema.xtransform(obj, {
			onField(p): XTransformHandlerResult {
				if (p.fieldPath.endsWith('valueFoo')) return { set: 'bar' };
				if (p.value === 'a') return { set: 'b' };
				if (p.value && p.value.stopTraverseHere) return { stop: true };
				if (p.value && p.value.setAndStopHere) return { set: {}, stop: true };
				return p.value;
			}
		});
	});

});
