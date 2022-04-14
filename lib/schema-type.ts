import { Schema, SchemaTraverseHandlers, SchemaTraverseOptions, TraverseHandlers, SubschemaType, TransformHandlers, TransformAsyncHandlers, ValidateOptions, NormalizeOptions } from './schema.js';

/**
 * Superclass for schema type definitions.
 *
 * @class SchemaType
 * @constructor
 * @param {String} name - Name of schema type.
 * @param {boolean} isContainer - True if this is a container type.
 * @param {boolean} containerSchemaKeysMatchValueKeys - true if the container's schema keys from
 *   listSchemaSubfields() lines up with a value's actual subfields from listValueSubfields().
 *   For example, this is true for objects and false for arrays.
 */
export abstract class SchemaType {
	_typeName: string;
	_defaultIsContainer: boolean;
	containerSchemaKeysMatchValueKeys: boolean;

	constructor(name: string, isContainer: boolean, containerSchemaKeysMatchValueKeys: boolean = false) {
		this._typeName = name;
		this._defaultIsContainer = isContainer;
		this.containerSchemaKeysMatchValueKeys = containerSchemaKeysMatchValueKeys;
	}

	/**
	 * Returns the name of this type.
	 *
	 * @method getName
	 * @return {String}
	 */
	getName(): string {
		return this._typeName;
	}

	/**
	 * Returns whether or not this value is a container type.  Usually this will just return whether
	 * or not the schema itself represents a container type, but can be overridden for complex types
	 * where whether or not the value is a container depends on the value.
	 *
	 * If undefined is passed for the value, return the default for the schema.
	 *
	 * @method isContainer
	 */
	isContainer(value: any, subschema: SubschemaType, schema: Schema): boolean {
		return this._defaultIsContainer;
	}

	/**
	 * Determines whether this subschema handles a shorthand type, ex. `Number` .
	 *
	 * @method matchShorthandType
	 * @param {Mixed} subschema - The shorthand type value
	 * @return {Boolean} - True if this type can normalize the shorthand type into a full,
	 *   proper subschema.
	 */
	matchShorthandType(subschema: any): boolean {
		return false;
	}

	/**
	 * Traverses subschema components of this schema.  This is not responsible for calling
	 * handlers on itself; it only needs to recurse into subcomponents.
	 *
	 * @param {Object} subschema
	 * @param {String} path
	 * @param {Object} handlers
	 * @param {Schema} schema
	 * @param {Object} options
	 */
	traverseSchema(subschema: SubschemaType, path: string, rawPath: string, handlers: SchemaTraverseHandlers, schema: Schema, options: SchemaTraverseOptions): void {
		if (this.isContainer(undefined, subschema, schema)) {
			for (let subfield of this.listSchemaSubfields(subschema, schema)) {
				let subschemaPathPart = this.getFieldSubschemaPath(subschema, subfield, schema);
				schema._traverseSubschema(
					this.getFieldSubschema(subschema, subfield, schema),
					path ? (path + '.' + subfield) : subfield,
					rawPath ? (rawPath + '.' + subschemaPathPart) : subschemaPathPart,
					handlers,
					options
				);
			}
		}
	}

	/**
	 * Returns a list of subfields associated with a schema, such that the field passed
	 * to getFieldSubschema() will return the appropriate subschema.  For objects, this
	 * is the object key.  For arrays, it'll be the array index placeholder value $.
	 *
	 * @method listSchemaSubfields
	 * @param {Object} subschema
	 * @param {Schema} schema
	 * @return {String[]}
	 */
	listSchemaSubfields(subschema: SubschemaType, schema: Schema): string[] {
		return [];
	}

	/**
	 * Returns a single subschema of this schema based on a path component (ie, a field on the
	 * schema).
	 *
	 * @method getFieldSubschema
	 * @param {Object} subschema
	 * @param {String} pathComponent - Index into schema object
	 * @param {Schema} schema - Parent schema
	 * @return {Object|undefined} - Subschema, if it exists
	 */
	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		return undefined;
	}

	/**
	 * Returns the field in the schema that corresponds to the given field path in a corresponding value.
	 */
	getFieldSubschemaPath(subschema: SubschemaType, field: string, schema: Schema): string {
		// default implementation doesn't really work; display purposes only
		return 'SUBFIELDS.' + field;
	}

	/**
	 * Returns a list of subfields of this container object.
	 *
	 * @method listValueSubfields
	 * @param {Mixed} value - Value of this object.
	 * @param {Object} subschema - The subschema associated with this object.
	 * @param {Schema} schema - The top-level Schema object
	 * @return {String[]}
	 */
	listValueSubfields(value: any, subschema: SubschemaType, schema: Schema): string[] {
		return [];
	}

	/**
	 * Returns a list of [ subfield, subfieldValue ] entries in an object.
	 *
	 * @method listValueSubfieldEntries
	 */
	listValueSubfieldEntries(value: any, subschema: SubschemaType, schema: Schema): [ string, any ][] {
		return this.listValueSubfields(value, subschema, schema).map((subfield: string) => [ subfield, this.getValueSubfield(value, subschema, subfield, schema) ]);
	}

	/**
	 * Returns the value at one subfield of this value.
	 *
	 * @method getValueSubfield
	 * @param {Mixed} value - The base object
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Schema} schema
	 * @return {Mixed} - The value
	 */
	getValueSubfield(value: any, subschema: SubschemaType, field: string, schema: Schema): any {
	}

	setValueSubfield(value: any, subschema: SubschemaType, field: string, fieldValue: any, schema: Schema): void {
	}

	setValueSubfieldBatch(value: any, subschema: SubschemaType, newValues: { [subfield: string]: any }, schema: Schema): void {
		for (let key in newValues) {
			this.setValueSubfield(value, subschema, key, newValues[key], schema);
		}
	}

	/**
	 * Normalizes this subschema and, recursively, any of its subschemas.  Should also validate
	 * the schema.
	 *
	 * @method normalizeSchema
	 * @throws {SchemaError} - On invalid subschema
	 * @param {Mixed} subschema - The unnormalized subschema
	 * @param {Schema} schema - The parent Schema object
	 * @return {Object} - The normalized subschema.  Must have a `type` property.
	 */
	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		return subschema;
	}

	/**
	 * Called to normalize a shorthand schema into a full schema.  Does not need to recursively
	 * normalize subschemas - normalizeSchema() is called after this.
	 *
	 * @method normalizeShorthandSchema
	 * @throws {SchemaError}
	 * @param {Mixed} subschema - Shorthand schema.  Will always be an object containing a `type`.
	 * @param {Schema} schema
	 * @return {Object} - Normalized subschema
	 */
	normalizeShorthandSchema(subschema: any, schema: Schema): SubschemaType {
		return subschema;
	}

	/**
	 * Traverses an object or value according to a schema.  This is responsible for calling handlers
	 * on any subschemas or subcomponents.  It is not responsible for calling the onField handler
	 * for itself.
	 *
	 * @method traverse
	 * @param {Mixed} value - Value of the field corresponding to this subschema.
	 * @param {Object} subschema - Subschema corresponding to this field.
	 * @param {String} field - Dot-separated path to the field.  The root field is represented by empty string ('').
	 * @param {Object} handlers
	 * @param {Schema} schema - Root schema object.
	 */
	traverse(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers, schema: Schema): void {
		if (this.isContainer(value, subschema, schema)) {
			let subfieldSet: Set<string> = new Set();
			for (let [ subfield, subvalue ] of this.listValueSubfieldEntries(value, subschema, schema)) {
				let subsubschema = this.getFieldSubschema(subschema, subfield, schema);
				subfieldSet.add(subfield);
				schema._traverseSubschemaValue(
					subvalue,
					subsubschema,
					field ? (field + '.' + subfield) : subfield,
					handlers
				);
			}
			if (this.containerSchemaKeysMatchValueKeys) {
				for (let subfield of this.listSchemaSubfields(subschema, schema)) {
					if (!subfieldSet.has(subfield)) {
						//let subvalue = this.getValueSubfield(value, subschema, subfield, schema);
						let subvalue = undefined;
						let subsubschema = this.getFieldSubschema(subschema, subfield, schema);
						subfieldSet.add(subfield);
						schema._traverseSubschemaValue(
							subvalue,
							subsubschema,
							field ? (field + '.' + subfield) : subfield,
							handlers
						);
					}
				}
			}
		}
	}

	/**
	 * Transforms subfields of an object.  This method is responsible for calling the handlers on each
	 * subfield and setting the resulting fields.  This method is NOT responsible for calling the
	 * handlers on its own field, or for setting its own field.
	 *
	 * @method transform
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} handlers
	 * @param {Schema} schema
	 * @return {Mixed} New value for field (usually should be the same as value)
	 */
	transform(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers, schema: Schema): any {
		if (this.isContainer(value, subschema, schema) && value) {
			let subfieldSet: Set<string> = new Set();
			for (let [ subfield, subvalue ] of this.listValueSubfieldEntries(value, subschema, schema)) {
				let subsubschema = this.getFieldSubschema(subschema, subfield, schema);
				let newValue = schema._transformSubschemaValue(
					subvalue,
					subsubschema,
					field ? (field + '.' + subfield) : subfield,
					handlers
				);
				subfieldSet.add(subfield);
				this.setValueSubfield(value, subschema, subfield, newValue, schema);
			}
			if (this.containerSchemaKeysMatchValueKeys) {
				let newValueBatch = {};
				let changeCount = 0;
				for (let subfield of this.listSchemaSubfields(subschema, schema)) {
					if (!subfieldSet.has(subfield)) {
						//let subvalue = this.getValueSubfield(value, subschema, subfield, schema);
						let subvalue = undefined;
						let subsubschema = this.getFieldSubschema(subschema, subfield, schema);
						let newValue = schema._transformSubschemaValue(
							subvalue,
							subsubschema,
							field ? (field + '.' + subfield) : subfield,
							handlers
						);
						subfieldSet.add(subfield);
						//this.setValueSubfield(value, subschema, subfield, newValue, schema);
						newValueBatch[subfield] = newValue;
						changeCount++;
					}
				}
				if (changeCount > 0) {
					this.setValueSubfieldBatch(value, subschema, newValueBatch, schema);
				}
			}
			return value;
		} else {
			return value;
		}
	}

	/**
	 * Asynchronous promise-based version of transform().
	 *
	 * @method transformAsync
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} handlers
	 * @param {Schema} schema
	 * @return {Promise} - Resolve with new value for field
	 */
	async transformAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers, schema: Schema): Promise<any> {
		if (this.isContainer(value, subschema, schema) && value) {
			let subfieldSet: Set<string> = new Set();
			for (let [ subfield, subvalue ] of this.listValueSubfieldEntries(value, subschema, schema)) {
				let subsubschema = this.getFieldSubschema(subschema, subfield, schema);
				let newValue = await schema._transformSubschemaValueAsync(
					subvalue,
					subsubschema,
					field ? (field + '.' + subfield) : subfield,
					handlers
				);
				subfieldSet.add(subfield);
				this.setValueSubfield(value, subschema, subfield, newValue, schema);
			}
			if (this.containerSchemaKeysMatchValueKeys) {
				let newValueBatch = {};
				let changeCount = 0;
				for (let subfield of this.listSchemaSubfields(subschema, schema)) {
					if (!subfieldSet.has(subfield)) {
						//let subvalue = this.getValueSubfield(value, subschema, subfield, schema);
						let subvalue = undefined;
						let subsubschema = this.getFieldSubschema(subschema, subfield, schema);
						let newValue = await schema._transformSubschemaValueAsync(
							subvalue,
							subsubschema,
							field ? (field + '.' + subfield) : subfield,
							handlers
						);
						subfieldSet.add(subfield);
						//this.setValueSubfield(value, subschema, subfield, newValue, schema);
						newValueBatch[subfield] = newValue;
						changeCount++;
					}
				}
				if (changeCount > 0) {
					this.setValueSubfieldBatch(value, subschema, newValueBatch, schema);
				}
			}
			return value;
		} else {
			return value;
		}
	}

	/**
	 * Validates an object according to the schema.  This does not have to descend into subfields
	 * of an object.  The traverse() method is used for traversing subschemas.
	 *
	 * @method validate
	 * @throws {FieldError} - If the field is invalid
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {Object} options
	 * @param {Schema} schema
	 */
	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
	}

	/**
	 * Normalizes the schema value.  Returns the normalized value.  Should also perform full
	 * validation of the value.  This does not need to recurse.  It is executed inside of
	 * a transformObject() traversal.
	 *
	 * @method normalize
	 * @param {Mixed} value
	 * @param {Object} subschema
	 * @param {String} field
	 * @param {FieldError[]} fieldErrors
	 * @param {Object} options
	 * @param {Schema} schema
	 * @return {Mixed} - The normalized value
	 */
	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		return value;
	}

	/**
	 * Checks whether or not the given value is contained in the set of valid values.
	 *
	 * @method checkEnum
	 * @param {Mixed} value
	 * @param {Mixed[]} validValues
	 * @return {Boolean} - true if value is in the set of validValues
	 */
	checkEnum(value: any, validValues: any[]): boolean {
		return (validValues.indexOf(value) !== -1);
	}

	/**
	 * Checks whether the value roughly matches the type.  Returns a value that indicates
	 * approximately how well the value matches the type.
	 *
	 * The returned match value can be one of:
	 * - 3 - Value precisely matches the type.
	 * - 2 - Value does not exactly match the type, but can be coerced by `normalize()`.
	 * - 1 - Value matches the type, but the type is a complex type and requires further validation.
	 * - 0 - Value does not at all match the type.
	 *
	 * @method checkTypeMatch
	 * @param {Mixed} value - Value to match against.
	 * @return {Number} - See description above.
	 */
	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		// Default (inefficient) implement is to try to validate, then
		// to normalize the type.
		try {
			this.validate(value, subschema, '', {}, schema);
			return 3;
		} catch (ex) { }
		try {
			this.normalize(value, subschema, '', {}, schema);
			return 2;
		} catch (ex) { }
		return 0;
	}

	/**
	 * Convert this subschema to the JSON schema (json-schema.org) equivalent.
	 *
	 * @method toJSONSchema
	 * @param {Object} subschema
	 * @param {Schema} schema
	 * @return {Object}
	 */
	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		throw new Error('Cannot convert type to JSON schema');
	}

}

