let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;
let ValidationError = require('../lib').ValidationError;
let Mixed = require('../lib').Mixed;
let or = require('../lib').or;

describe('CommonSchema', function() {

	describe('#normalize', function() {

		it('raw string', function() {
			let schema = createSchema({
				type: 'string'
			});
			expect(schema.normalize('foo')).to.equal('foo');
			expect(schema.normalize(3)).to.equal('3');
			expect(schema.normalize(3)).to.not.equal(3);
			expect(schema.normalize(false)).to.equal('false');
		});

		it('shorthand string', function() {
			let schema = createSchema(String);
			expect(schema.normalize('foo')).to.equal('foo');
			expect(schema.normalize(3)).to.equal('3');
			expect(schema.normalize(3)).to.not.equal(3);
			expect(schema.normalize(false)).to.equal('false');
		});

		it('object', function() {
			let schema = createSchema({
				type: 'object',
				properties: {
					foo: {
						type: 'string'
					},
					bar: {
						type: 'string'
					}
				}
			});
			expect(schema.normalize({ foo: 3 })).to.deep.equal({ foo: '3' });
			expect(schema.normalize({ bar: 3 })).to.deep.equal({ bar: '3' });
			expect(schema.normalize({ foo: 3, bar: 3 })).to.deep.equal({ foo: '3', bar: '3' });
			expect(() => schema.normalize(3)).to.throw(ValidationError);
		});

		it('shorthand object', function() {
			let schema = createSchema({
				foo: String,
				bar: String
			});
			expect(schema.getData()).to.deep.equal({
				type: 'object',
				properties: {
					foo: {
						type: 'string'
					},
					bar: {
						type: 'string'
					}
				}
			});
			expect(schema.normalize({ foo: 3 })).to.deep.equal({ foo: '3' });
			expect(schema.normalize({ bar: 3 })).to.deep.equal({ bar: '3' });
			expect(schema.normalize({ foo: 3, bar: 3 })).to.deep.equal({ foo: '3', bar: '3' });
			expect(() => schema.normalize(3)).to.throw(ValidationError);
		});

		it('string errors', function() {
			let schema = createSchema({
				type: String,
				minLength: 4,
				maxLength: 8,
				match: /foo/
			});
			expect(schema.normalize('fooa')).to.equal('fooa');
			expect(schema.normalize('fooasdfg')).to.equal('fooasdfg');
			expect(() => schema.normalize('foo')).to.throw(ValidationError);
			expect(() => schema.normalize('fooasdfgh')).to.throw(ValidationError);
			expect(() => schema.normalize('bara')).to.throw(ValidationError);
		});

		it('required and missing fields', function() {
			let schema = createSchema({
				foo: {
					type: String,
					required: true
				}
			});
			expect(schema.normalize({ foo: 3 })).to.deep.equal({ foo: '3' });
			expect(() => schema.normalize({})).to.throw(ValidationError);
			expect(() => schema.normalize({ foo: 3, bar: 3 })).to.throw(ValidationError);
			expect(schema.normalize({ foo: 3, bar: 3 }, { allowUnknownFields: true }))
				.to.deep.equal({ foo: '3', bar: 3 });
			expect(schema.normalize({}, { allowMissingFields: true })).to.deep.equal({});
			expect(schema.normalize({ foo: 3, bar: 3 }, { removeUnknownFields: true }))
				.to.deep.equal({ foo: '3' });
		});

		it('array', function() {
			let schema = createSchema({
				type: 'array',
				elements: {
					type: 'string'
				}
			});
			expect(schema.normalize([ 2, 3 ])).to.deep.equal([ '2', '3' ]);
			expect(() => schema.normalize({})).to.throw(ValidationError);
		});

		it('shorthand array', function() {
			let schema = createSchema({
				foo: [ {
					bar: String
				} ]
			});
			expect(schema.normalize({
				foo: [
					{
						bar: 3
					},
					{
						bar: 4
					}
				]
			})).to.deep.equal({
				foo: [
					{
						bar: '3'
					},
					{
						bar: '4'
					}
				]
			});
		});

		it('array empty elements', function() {
			let schema = createSchema([ String ]);
			expect(schema.normalize([])).to.deep.equal([]);
			expect(schema.normalize([ 3 ])).to.deep.equal([ '3' ]);
			expect( () => schema.normalize([ 3, undefined ]) ).to.throw(ValidationError);
		});

		it('map', function() {
			let schema = createSchema({
				type: 'map',
				values: String
			});
			expect(schema.normalize({
				foo: 5,
				bar: 6,
				baz: 7
			})).to.deep.equal({
				foo: '5',
				bar: '6',
				baz: '7'
			});
		});

		it('or string/number', function() {
			let schema = createSchema(or({}, String, Number));
			expect(schema.normalize('abc')).to.equal('abc');
			expect(schema.normalize(123)).to.equal(123);
			expect(schema.normalize('123')).to.equal('123');
			expect(schema.normalize(true)).to.equal('true');
			expect(schema.normalize({})).to.equal('[object Object]');
		});

		it('defaults', function() {
			let schema = createSchema({
				foo: {
					type: String,
					default: 5
				}
			});
			expect(schema.normalize({})).to.deep.equal({ foo: '5' });
		});

		it('number', function() {
			let schema = createSchema({
				type: Number,
				min: 5,
				max: 10,
				minError: 'foobar'
			});
			expect(schema.normalize(5)).to.equal(5);
			expect(schema.normalize(10)).to.equal(10);
			expect(schema.normalize('6.5')).to.equal(6.5);
			expect(() => schema.normalize('')).to.throw(ValidationError);
			expect(() => schema.normalize('123a')).to.throw(ValidationError);
			expect(() => schema.normalize(11)).to.throw(ValidationError);
			expect(() => schema.normalize(4)).to.throw(ValidationError);
			expect(() => schema.normalize(4)).to.throw('foobar');
		});

		it('date', function() {
			let schema = createSchema({
				type: Date,
				min: new Date('2010-01-01T00:00:00Z'),
				max: '2016-01-01T00:00:00Z',
				default: Date.now
			});
			expect(schema.normalize(new Date('2014-01-01T00:00:00Z')).getTime())
				.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
			expect(schema.normalize(1388534400000).getTime())
				.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
			expect(schema.normalize('2014-01-01T00:00:00Z').getTime())
				.to.equal(new Date('2014-01-01T00:00:00Z').getTime());
			expect(schema.normalize(undefined).getTime())
				.be.within(new Date().getTime() - 1000, new Date().getTime() + 1000);
			expect(() => schema.normalize('2009-01-01T00:00:00Z')).to.throw(ValidationError);
			expect(() => schema.normalize('2017-01-01T00:00:00Z')).to.throw(ValidationError);
			expect(schema.serialize('2014-01-01T00:00:00Z'))
				.to.equal('2014-01-01T00:00:00.000Z');
		});

		it('binary', function() {
			let schema = createSchema(Buffer);
			expect(schema.normalize('AQIDBAU=').toString('base64')).to.equal('AQIDBAU=');
			expect(schema.normalize([ 1, 2, 3, 4, 5 ]).toString('base64')).to.equal('AQIDBAU=');
			expect(schema.normalize(new Buffer([ 1, 2, 3, 4, 5 ])).toString('base64')).to.equal('AQIDBAU=');
		});

		it('boolean', function() {
			let schema = createSchema(Boolean);
			expect(schema.normalize(true)).to.equal(true);
			expect(schema.normalize('false')).to.equal(false);
			expect(schema.normalize(0)).to.equal(false);
			expect( () => schema.normalize('zip') ).to.throw(ValidationError);
		});

		it('mixed', function() {
			let schema = createSchema(Mixed);
			let obj = {
				foo: 12,
				bar: {
					baz: 'abc'
				}
			};
			expect(schema.normalize(obj)).to.equal(obj);
		});

	});

});


