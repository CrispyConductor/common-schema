import { expect } from 'chai';
import { createSchema, or, map } from '../lib/index.js';



describe('#getFieldSubschema', function() {

	it('object', function() {
		let schema = createSchema({
			foo: Number
		});
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal( { type: 'number' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'bar',
			schema
		)).to.deep.equal(undefined);
	});

	it('array', function() {
		let schema = createSchema([ Number ]);
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'17',
			schema
		)).to.deep.equal( { type: 'number' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'length',
			schema
		)).to.deep.equal(undefined);
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'$',
			schema
		)).to.deep.equal( { type: 'number' } );
	});

	it('map', function() {
		let schema = createSchema(map(Number));
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal( { type: 'number' } );
	});

	it('or', function() {
		let schema = createSchema(or(Number, { foo: Number }, { bar: String }));
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal( { type: 'number' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'bar',
			schema
		)).to.deep.equal( { type: 'string' } );
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'baz',
			schema
		)).to.deep.equal(undefined);
	});

	it('primitive', function() {
		let schema = createSchema(Number);
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal(undefined);
	});

	it('mixed', function() {
		let schema = createSchema({ type: 'mixed' });
		expect(schema.getSchemaType(schema.getData()).getFieldSubschema(
			schema.getData(),
			'foo',
			schema
		)).to.deep.equal({ type: 'mixed' });
	});

});
