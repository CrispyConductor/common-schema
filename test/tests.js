let expect = require('chai').expect;
let createSchema = require('../lib').createSchema;
let ValidationError = require('../lib').ValidationError;

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

	});

});


