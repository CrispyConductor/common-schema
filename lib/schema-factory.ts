import { Schema, SchemaOptions } from './schema.js';
import { SchemaType } from './schema-type.js';
import * as coreSchemaTypes from './core-schema-types.js';
import * as geoSchemaTypes from './geo-schema-types.js';

/**
 * Class that creates schemas.  Custom schema types can be registered to a factory and schemas
 * created from that factory will be able to use those types.
 *
 * @class SchemaFactory
 * @constructor
 */
export class SchemaFactory {
	_schemaTypes: { [schemaTypeName: string]: SchemaType };
	_schemaRegistry: { [schemaName: string ]: Schema };

	constructor() {
		this._schemaTypes = {};
		this._schemaRegistry = {};
		this._loadTypes(coreSchemaTypes);
		this._loadTypes(geoSchemaTypes);
	}

	/**
	 * Instantiates and loads all the given schema types.
	 *
	 * @method _loadTypes
	 * @private
	 * @param {Object} typeMap - A mapping from arbitrary keys to SchemaType constructors
	 */
	_loadTypes(typeMap: { [schemaTypeName: string]: any }): void {
		for (let key in typeMap) {
			let Constructor = typeMap[key];
			let instance = new Constructor();
			this.registerType(instance.getName(), instance);
		}
	}

	/**
	 * Registers a new schema type.
	 *
	 * @method registerType
	 * @param {String} name - String name of type
	 * @param {SchemaType} schemaType - Instance of a SchemaType
	 */
	registerType(name: string, schemaType: SchemaType): void {
		this._schemaTypes[name] = schemaType;
	}

	/**
	 * Creates a Schema from this factory.
	 *
	 * @method createSchema
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} schemaData - Data for this schema.
	 * @param {Object} [options] - Schema options.
	 * @return {Schema} - The created schema.
	 */
	createSchema(schemaData: any, options: SchemaOptions): Schema {
		return new Schema(schemaData, this, options);
	}


	/**
	 * Registers a new schema.
	 *
	 * @method registerSchema
	 * @param {String} name - String name of schema
	 * @param {Schema} schema - Instance of a Schema
	 */
	registerSchema(name: string, schema: Schema): void {
		this._schemaRegistry[name] = schema;
	}


	/**
	 * Retreieve a registered schema.
	 *
	 * @method getRegisteredSchema
	 * @param {String} name - String name of schema
	 * @return {Schema} - The registered schema.
	 */
	getRegisteredSchema(name: string): Schema {
		return this._schemaRegistry[name];
	}
}

