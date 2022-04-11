import { expect } from 'chai';
import { createSchema, ValidationError, Mixed, or, map } from '../lib/index.js';


describe('#validate', function() {
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
		}),
		point: 'geopoint',
		geojsons: [ { type: 'geojson', allowedTypes: [
			'Point', 'LineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'
		] } ]
	});

	it('valid', function() {
		expect(schema.validate({
			foo: {
				bar: '8',
				baz: 8
			},
			arr: [
				{
					zip: new Date('2014-01-01T00:00:00Z')
				},
				{
					zip: new Date(1427982068722)
				},
				{
					zip: new Date()
				},
				{}
			],
			map: {
				foo: 2,
				bar: 4
			},
			bin: new Buffer('YXNkZg==', 'base64'),
			boo: true,
			mix: { a: [ function() {} ], b: 5 },
			o: {
				qux: 4,
				bam: '7'
			},
			point: [ 23, 23 ],
			geojsons: [
				{
					type: 'Point',
					coordinates: [ 23, 23 ]
				},
				{
					type: 'LineString',
					coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
				},
				{
					type: 'Polygon',
					coordinates: [ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ]
				},
				{
					type: 'MultiPolygon',
					coordinates: [
						[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ],
						[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ]
					]
				},
				{
					type: 'GeometryCollection',
					geometries: [
						{
							type: 'Point',
							coordinates: [ 23, 23 ]
						},
						{
							type: 'LineString',
							coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
						}
					]
				}
			]
		})).to.equal(undefined);
	});

	it('invalid', function() {
		const expectedErrors = [
			{
				'field': 'foo.bar',
				'code': 'invalid_type',
				'message': 'Must be a string',
				'details': undefined
			},
			{
				'field': 'foo.baz',
				'code': 'invalid_type',
				'message': 'Must be a number',
				'details': undefined
			},
			{
				'field': 'arr.0.zip',
				'code': 'invalid_type',
				'message': 'Must be a date',
				'details': undefined
			},
			{
				'field': 'arr.1.zip',
				'code': 'invalid_type',
				'message': 'Must be a date',
				'details': undefined
			},
			{
				'field': 'map.bar',
				'code': 'invalid_type',
				'message': 'Must be a number',
				'details': undefined
			},
			{
				'field': 'bin',
				'code': 'invalid_type',
				'message': 'Must be a buffer',
				'details': undefined
			},
			{
				'field': 'boo',
				'code': 'invalid_type',
				'message': 'Must be a boolean',
				'details': undefined
			},
			{
				'field': 'o.qux',
				'code': 'invalid_type',
				'message': 'Must be a number',
				'details': undefined
			},
			{
				'field': 'point',
				'code': 'invalid_type',
				'message': 'Must be array in form [ long, lat ]',
				'details': undefined
			},
			{
				'field': 'geojsons.0',
				'code': 'invalid_format',
				'message': 'Latitude must be between -90 and 90',
				'details': undefined
			},
			{
				'field': 'geojsons.2',
				'code': 'invalid_format',
				'message': 'Latitude must be between -90 and 90',
				'details': undefined
			},
			{
				'field': 'geojsons.4',
				'code': 'invalid_format',
				'message': 'Latitude must be between -90 and 90',
				'details': undefined
			},
			{
				'field': 'geojsons.5',
				'code': 'invalid_type',
				'message':
					'GeoJSON object must have type Point, LineString, Polygon, MultiPolygon, GeometryCollection',
				'details': undefined
			}
		];

		try {
			schema.validate({
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
				point: 'foo',
				geojsons: [
					{
						type: 'Point',
						coordinates: [ 23, 230 ]
					},
					{
						type: 'LineString',
						coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
					},
					{
						type: 'Polygon',
						coordinates: [ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 223 ] ] ]
					},
					{
						type: 'MultiPolygon',
						coordinates: [
							[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ],
							[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ]
						]
					},
					{
						type: 'GeometryCollection',
						geometries: [
							{
								type: 'Point',
								coordinates: [ 23, 23 ]
							},
							{
								type: 'LineString',
								coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 444 ] ]
							}
						]
					},
					{
						type: 'MultiPoint',
						coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
					}
				]
			});
		} catch (ex) {
			expect(ex instanceof ValidationError).to.equal(true);
			expect(ex.fieldErrors).to.deep.equal(expectedErrors);
			return;
		}
		throw new Error('Should not reach');
	});
});

describe('#isValid', function() {
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
		}),
		point: 'geopoint',
		geojsons: [ { type: 'geojson', allowedTypes: [
			'Point', 'LineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'
		] } ]
	});

	it('valid', function() {
		expect(schema.isValid({
			foo: {
				bar: '8',
				baz: 8
			},
			arr: [
				{
					zip: new Date('2014-01-01T00:00:00Z')
				},
				{
					zip: new Date(1427982068722)
				},
				{
					zip: new Date()
				},
				{}
			],
			map: {
				foo: 2,
				bar: 4
			},
			bin: new Buffer('YXNkZg==', 'base64'),
			boo: true,
			mix: { a: [ function() {} ], b: 5 },
			o: {
				qux: 4,
				bam: '7'
			},
			point: [ 23, 23 ],
			geojsons: [
				{
					type: 'Point',
					coordinates: [ 23, 23 ]
				},
				{
					type: 'LineString',
					coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
				},
				{
					type: 'Polygon',
					coordinates: [ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ]
				},
				{
					type: 'MultiPolygon',
					coordinates: [
						[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ],
						[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ]
					]
				},
				{
					type: 'GeometryCollection',
					geometries: [
						{
							type: 'Point',
							coordinates: [ 23, 23 ]
						},
						{
							type: 'LineString',
							coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
						}
					]
				}
			]
		})).to.equal(true);
	});

	it('invalid', function() {
		expect(schema.isValid({
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
			point: 'foo',
			geojsons: [
				{
					type: 'Point',
					coordinates: [ 23, 230 ]
				},
				{
					type: 'LineString',
					coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
				},
				{
					type: 'Polygon',
					coordinates: [ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 223 ] ] ]
				},
				{
					type: 'MultiPolygon',
					coordinates: [
						[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ],
						[ [ [ 23, 23 ], [ 33, 33 ], [ 33, 23 ], [ 23, 23 ] ] ]
					]
				},
				{
					type: 'GeometryCollection',
					geometries: [
						{
							type: 'Point',
							coordinates: [ 23, 23 ]
						},
						{
							type: 'LineString',
							coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 444 ] ]
						}
					]
				},
				{
					type: 'MultiPoint',
					coordinates: [ [ 23, 23 ], [ 33, 33 ], [ 44, 44 ] ]
				}
			]
		})).to.equal(false);
	});
});
