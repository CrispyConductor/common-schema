import { expect } from 'chai';
import { createSchema, Mixed, or, map } from '../lib/index.js';
import _ from 'lodash';

describe('#transformAsync', function() {

	it('test1', function(done) {
		const schema = createSchema([ { foo: String, a: Boolean } ]);
		let obj = [ {}, { a: true } ];
		schema.transformAsync(obj, {
			onField(field, value) {
				return new Promise(function(resolve) {
					setTimeout(function() {
						if (_.isPlainObject(value)) {
							value.addedThing = true;
						}
						resolve(value);
					}, 5);
				});
			}
		}).then(function(result) {
			expect(result).to.deep.equal([ { addedThing: true }, { addedThing: true, a: true } ]);
			done();
		}).catch(done);
	});

	it('test1 stop transform', function(done) {
		const schema = createSchema([ { foo: String, a: Boolean, b: { foo: String } } ]);
		let obj = [ {}, { a: true, b: {} } ];
		schema.transformAsync(obj, {
			onField(field, value) {
				return new Promise(function(resolve) {
					setTimeout(function() {
						if (value && value.a) return resolve(schema.stopTransform());
						if (_.isPlainObject(value)) {
							value.addedThing = true;
						}
						resolve(value);
					}, 5);
				});
			}
		}).then(function(result) {
			expect(result).to.deep.equal([ { addedThing: true }, { a: true, b: {} } ]);
			done();
		}).catch(done);
	});

	it('test1 set and stop transform', function(done) {
		const schema = createSchema([ { foo: String, a: Boolean, b: { foo: String } } ]);
		let obj = [ {}, { a: true, b: {} } ];
		schema.transformAsync(obj, {
			onField(field, value) {
				return new Promise(function(resolve) {
					setTimeout(function() {
						if (value && value.a) return resolve(schema.setAndStopTransform({}));
						if (_.isPlainObject(value)) {
							value.addedThing = true;
						}
						resolve(value);
					}, 5);
				});
			}
		}).then(function(result) {
			expect(result).to.deep.equal([ { addedThing: true }, { } ]);
			done();
		}).catch(done);
	});

	it('test2', function(done) {

		const schema = createSchema({
			foo: {
				bar: String,
				baz: Number
			},
			miss: Date,
			arr: [ {
				zip: Date
			} ],
			map: map(Number),
			bin: Buffer,
			boo: Boolean,
			mix: Mixed,
			o: or({}, Number, String, {
				qux: {
					type: Number,
					required: true
				},
				bam: String
			})
		});

		let obj = schema.normalize({
			foo: {
				bar: 8,
				baz: '8'
			},
			arr: [
				{
					zip: '2014-01-01T00:00:00Z'
				},
				{
					zip: 1427982068722
				},
				{
					zip: new Date()
				},
				{}
			],
			map: {
				foo: 2,
				bar: '4'
			},
			bin: 'YXNkZg==',
			boo: 'yes',
			mix: { a: [ function() {} ] },
			o: {
				qux: '4',
				bam: '7'
			},
			extraField: 'foo'
		}, { allowUnknownFields: true });

		schema.transformAsync(obj, {

			onField(field, value) {
				return new Promise(function(resolve) {
					setTimeout(function() {
						if (typeof value === 'string') {
							value = 'a' + value;
						} else if (_.isNumber(value)) {
							value = value + 1;
						} else if (_.isPlainObject(value)) {
							value.addedThing = true;
						}
						resolve(value);
					}, 5);
				});
			},

			onUnknownField(field, value) {
				return new Promise(function(resolve) {
					setTimeout(function() {
						if (typeof value === 'string') {
							value = 'b' + value;
						} else if (_.isNumber(value)) {
							value = value + 2;
						} else if (_.isPlainObject(value)) {
							value.addedThing2 = true;
						}
						resolve(value);
					}, 5);
				});
			},

			postField(field, value) {
				return new Promise(function(resolve) {
					setTimeout(function() {
						if (typeof value === 'string') {
							value = 'c' + value;
						} else if (_.isNumber(value)) {
							value = value + 4;
						} else if (_.isPlainObject(value)) {
							value.addedThing3 = true;
						}
						resolve(value);
					}, 5);
				});
			}

		}).then(function(result) {
			expect(result).to.deep.equal({
				'foo': {
					'bar': 'ca8',
					'baz': 13,
					'addedThing': true,
					'addedThing3': true
				},
				'arr': [
					{
						'zip': new Date('2014-01-01T00:00:00.000Z'),
						'addedThing': true,
						'addedThing3': true
					},
					{
						'zip': new Date('2015-04-02T13:41:08.722Z'),
						'addedThing': true,
						'addedThing3': true
					},
					{
						'zip': obj.arr[2].zip,
						'addedThing': true,
						'addedThing3': true
					},
					{
						'addedThing': true,
						'addedThing3': true
					}
				],
				'map': {
					'foo': 7,
					'bar': 9,
					'addedThing': true,
					'addedThing3': true
				},
				'bin': obj.bin,
				'boo': true,
				'mix': {
					'a': [
						obj.mix.a[0]
					],
					'addedThing': true,
					'addedThing3': true
				},
				'o': {
					'qux': 9,
					'bam': 'ca7',
					'addedThing': true,
					'addedThing3': true
				},
				'extraField': 'bfoo',
				'addedThing': true,
				'addedThing3': true
			});
			done();
		}).catch(done);

	});

	it('autodetect', function(done) {
		const schema = createSchema({ type: 'autodetect' });
		let obj = {
			foo: {
				bar: {
					baz: 5,
					biz: 'buz'
				}
			}
		};
		schema.transformAsync(obj, {
			async onField(field, value) {
				if (typeof value === 'number') return value + 1;
				if (typeof value === 'string') return value + '_';
				return value;
			}
		}).then(function(result) {
			expect(result).to.deep.equal({
				foo: {
					bar: {
						baz: 6,
						biz: 'buz_'
					}
				}
			});
			done();
		}).catch(done);
	});

});
