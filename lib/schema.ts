import { SchemaError } from './schema-error.js';
import { ValidationError } from './validation-error.js';
import { Normalizer } from './normalizer.js';
import { Validator } from './validator.js';
import { SchemaFactory } from './schema-factory.js';
import { SchemaType } from './schema-type.js';
import { FieldError } from './field-error.js';
import * as objtools from 'objtools';

export type SchemaOptions = {
	skipNormalize?: boolean;
};

export type SubschemaType = {
	type: string;
	[param: string]: any;
};

export type SchemaTraverseHandlers = {
	onSubschema?: (subschema: SubschemaType, path?: string, subschemaType?: SchemaType, rawPath?: string) => boolean | undefined;
};

export type SchemaTraverseOptions = {
	includePathArrays?: boolean;
};

export type TraverseHandlers = {
	onField?: (field: string, value: any, subschema?: SubschemaType, subschemaType?: SchemaType) => boolean | undefined;
	onUnknownField?: (field: string, value: any) => void;
};

export type TransformHandlers = {
	onField?: (field: string, value: any, subschema?: SubschemaType, subschemaType?: SchemaType) => any;
	onUnknownField?: (field: string, value: any) => any;
	postField?: (field: string, value: any, subschema?: SubschemaType, subschemaType?: SchemaType) => any;
};

export type TransformAsyncHandlers = {
	onField?: (field: string, value: any, subschema?: SubschemaType, subschemaType?: SchemaType) => Promise<any>;
	onUnknownField?: (field: string, value: any) => Promise<any>;
	postField?: (field: string, value: any, subschema?: SubschemaType, subschemaType?: SchemaType) => Promise<any>;
};

export interface ValidatorConstructor {
	new (schema: Schema, options: ValidateOptions): Validator;
};

export type ValidateOptions = {
	allowUnknownFields?: boolean;
	allowMissingFields?: boolean;
	Validator?: ValidatorConstructor;
};

export interface NormalizerConstructor {
	new (schema: Schema, options: NormalizeOptions): Normalizer;
};

export type NormalizeOptions = {
	allowUnknownFields?: boolean;
	allowMissingFields?: boolean;
	removeUnknownFields?: boolean;
	ignoreDefaults?: boolean;
	serialize?: boolean;
	Normalizer?: NormalizerConstructor;
};

export type HasParentTypeOptions = {
	skipLastField?: boolean;
};

export type ListFieldsOptions = {
	stopAtArrays?: boolean;
	onlyLeaves?: boolean;
	maxDepth?: number;
	includePathArrays?: boolean;
};


const symbolStopTransform = Symbol.for('common-schema.stopTransform');



/**
 * This class wraps a schema definition and provides methods to utilize it.
 *
 * Schemas are normalized on construction to an internal format.  Either this internal format
 * or a shorthand format, or a combination, can be supplied to the constructor.  For details,
 * see the readme.
 *
 * This class should not be instantiated directly.  Instead, use SchemaFactory.createSchema().
 *
 * @class Schema
 * @constructor
 * @throws {SchemaError} - On invalid schema
 * @param {Object} schemaData - The raw schema data in full or shorthand form
 * @param {SchemaFactory} schemaFactory - The schema factory constructing this schema.
 * @param {Object} [options]
 *   @param {Boolean} options.skipNormalize - If true, assume the schema is already normalized
 *     and does not need to be additionally normalized.
 */
export class Schema {
	_schemaData: any;
	_schemaFactory: SchemaFactory;
	_isCommonSchema: boolean = true;
	jsonSchemaDefinitions: { [key: string]: any } = null;

	constructor(schemaData: any, schemaFactory: SchemaFactory, options: SchemaOptions = {}) {
		this._schemaData = schemaData;
		this._schemaFactory = schemaFactory;
		if (!options.skipNormalize) {
			this.normalizeSchema();
		}
		// Used to register JSON Schema definitions by schema types.
		this.jsonSchemaDefinitions = null;
	}

	/**
	 * Traverses a schema, calling handlers for each component reached.
	 *
	 * @method traverseSchema
	 * @param {Object} handlers
	 *   @param {Function} handlers.onSubschema - Called for each subschema.
	 *     @param {Object} handlers.onSubschema.subschema - Subschema object
	 *     @param {String} handlers.onSubschema.path - Dot-separated path, skipping arrays
	 *     @param {SchemaType} handlers.onSubschema.subschemaType
	 * @param {Object} options
	 *   @param {Boolean} options.includePathArrays - By default, arrays are skipped in the path.
	 *     If this option is set to true, keys to arrays are represented by an '$' key such as
	 *     `foo.$.bar` .
	 */
	traverseSchema(handlers: SchemaTraverseHandlers, options: SchemaTraverseOptions = {}): void {
		this._traverseSubschema(this._schemaData, '', '', handlers, options);
	}

	/**
	 * Calls the handlers on a subschema and asks it to traverse further subschemas.
	 * If the handler returns false (not falsy), it will stop traversing that path.
	 *
	 * @method _traverseSubschema
	 * @private
	 * @param {Object} subschema - The subschema object
	 * @param {String} path - Object path to current subschema (eg. path in the type of objects that the schema represents)
	 * @param {String} rawPath - Schema path to current subschema (eg. including .elements for arrays, .values for maps, .properties for objects)
	 * @param {Object} handlers
	 * @param {Object} options
	 */
	_traverseSubschema(subschema: SubschemaType, path: string, rawPath: string, handlers: SchemaTraverseHandlers, options: SchemaTraverseOptions = {}): void {
		let result: boolean | undefined = undefined;
		let subschemaType = this._getType(subschema.type);
		if (handlers.onSubschema) {
			result = handlers.onSubschema(subschema, path, subschemaType, rawPath);
		}
		if (result !== false) {
			subschemaType.traverseSchema(subschema, path, rawPath, handlers, this, options);
		}
	}

	/**
	 * Normalizes and validates the encapsulated schema data.  This occurs automatically on
	 * construction but may be called additional times if the schema data is manually modified.
	 *
	 * @method normalizeSchema
	 * @throws {SchemaError} - On invalid schema
	 */
	normalizeSchema(): void {
		this._schemaData = this._normalizeSubschema(this._schemaData);
	}

	/**
	 * Returns normalized subschema data.
	 *
	 * @method _normalizeSubschema
	 * @private
	 * @param {Mixed} subschema - Subschema data to normalize
	 * @return {Object} - Normalized subschema
	 */
	_normalizeSubschema(subschema: any): SubschemaType {
		if (objtools.isPlainObject(subschema) && typeof subschema.type === 'string') {
			// Full schema
			let schemaType: SchemaType = this._getType(subschema.type);
			schemaType.normalizeSchema(subschema, this);
			return subschema;
		} else if (typeof subschema === 'string') {
			// Plain type name
			let schemaType: SchemaType = this._getType(subschema);
			subschema = {
				type: subschema
			};
			schemaType.normalizeSchema(subschema, this);
			return subschema;
		} else if (objtools.isPlainObject(subschema) && subschema.type) {
			// Full schema with shorthand type
			let schemaType: SchemaType, schemaTypeName: string;
			for (schemaTypeName in this._schemaFactory._schemaTypes) {
				if (this._schemaFactory._schemaTypes[schemaTypeName].matchShorthandType(subschema.type)) {
					schemaType = this._schemaFactory._schemaTypes[schemaTypeName];
					break;
				}
			}
			if (!schemaType) throw new SchemaError('Unknown schema type: ' + subschema.type);
			subschema = schemaType.normalizeShorthandSchema(subschema, this);
			subschema = schemaType.normalizeSchema(subschema, this);
			subschema.type = schemaTypeName;
			return subschema;
		} else {
			// Shorthand schema
			let schemaType: SchemaType, schemaTypeName: string;
			for (schemaTypeName in this._schemaFactory._schemaTypes) {
				if (this._schemaFactory._schemaTypes[schemaTypeName].matchShorthandType(subschema)) {
					schemaType = this._schemaFactory._schemaTypes[schemaTypeName];
					break;
				}
			}
			if (!schemaType) throw new SchemaError('Unknown schema type: ' + subschema);
			subschema = schemaType.normalizeShorthandSchema({ type: subschema }, this);
			subschema = schemaType.normalizeSchema(subschema, this);
			subschema.type = schemaTypeName;
			return subschema;
		}
	}

	/**
	 * Creates a new schema from this one, including only subschemas that pass a provided test.
	 *
	 * @method filterSchema
	 * @param {Function} fn - Called for each subschema. Return true/false to include/exclude the
	 *   subchema and all of its descendants. Return null or undefined to traverse into child
	 *   subschemas and determine inclusion individually. Returning anything else will throw
	 *   an internal error.
	 *   @param {Object} fn.subschema - Subschema object
	 *   @param {String} fn.path - Path to subschema within schema
	 *   @param {String} fn.rawPath - Dot-separated path to the current subschema data
	 *     within the root schema data
	 *
	 * @return {Schema} - A copy of the schema, without subschemas that fail the test.
	 */
	filterSchema(fn: (subschema: SubschemaType, path?: string, rawPath?: string) => boolean): Schema {
		// Build filtered schema object using shorthand.
		let filtered: any = objtools.deepCopy(this.getData());
		this.traverseSchema({
			onSubschema: (subschema, path, subschemaType, rawPath) => {
				let include: boolean = fn(subschema, path, rawPath);
				if (include === true) {
					// Include entire subschema and stop traversal
					return false;
				} else if (include === false) {
					// Exclude entire subchema and stop traversal
					objtools.deletePath(filtered, rawPath);
					return false;
				} else if (include === null || include === undefined) {
					// No action; continue to traverse
					return true;
				} else {
					throw new Error(`Invalid fn return value ${include}`);
				}
			}
		}, { includePathArrays: true });

		return new Schema(filtered, this._schemaFactory);
	}

	/**
	 * Returns the current raw schema data object.
	 *
	 * @method getData
	 * @return {Mixed} - Raw schema data
	 */
	getData(): SubschemaType {
		return this._schemaData;
	}

	/**
	 * Returns the value at the given path in the obj.  Similar to objtools.getPath, but this is
	 * schema-aware for eg. arraysets.
	 */
	getObjectPath(obj: any, path: string): any | undefined {
		return this._getObjPathSubschemaValue(obj, this.getData(), path.split('.'), 0);
	}

	_getObjPathSubschemaValue(value: any, subschema: SubschemaType, pathParts: string[], partsIdx: number): any {
		if (partsIdx >= pathParts.length) return value;
		if (value === null || value === undefined) return undefined;
		const part: string = pathParts[partsIdx];
		if (!subschema) return value && value[part];
		const schemaType: SchemaType = this._getType(subschema.type);
		if (!schemaType.isContainer(value, subschema, this)) return undefined;
		const fieldValue = schemaType.getValueSubfield(value, subschema, part, this);
		const fieldSubschema: SubschemaType = schemaType.getFieldValueSubschema(value, subschema, part, this);
		return this._getObjPathSubschemaValue(fieldValue, fieldSubschema, pathParts, partsIdx + 1);
	}

	setObjectPath(obj: any, path: string, newValue: any): void {
		this._setObjPathSubschemaValue(obj, this.getData(), path.split('.'), 0, newValue);
	}

	// If partsIdx === pathParts.length - 1 (last part): Set the field [part] to the value at the current container.  Throw if current value is not a container.
	// Otherwise, recurse into value[part].  If value[part] does not exist, create it.  If value[part] is not a container, throw.
	_setObjPathSubschemaValue(value: any, subschema: SubschemaType, pathParts: string[], partsIdx: number, newValue: any): void {
		if (value === null || value === undefined) throw new Error('Cannot set field on undefined or null object');
		if (partsIdx >= pathParts.length) throw new Error('Invalid path');
		const part: string = pathParts[partsIdx];
		if (!subschema) throw new Error('No subschema for object path ' + pathParts.join('.'));
		const schemaType: SchemaType = this._getType(subschema.type);
		if (!schemaType.isContainer(value, subschema, this)) throw new Error('Subschema is not container for path ' + pathParts.join('.'));
		if (partsIdx === pathParts.length - 1) {
			// This is last path component, need to set the value
			schemaType.setValueSubfield(value, subschema, part, newValue, this);
		} else {
			// Not the last component; descend into or create container
			let subvalue: any = schemaType.getValueSubfield(value, subschema, part, this);
			const subsubschema = schemaType.getFieldValueSubschema(value, subschema, part, this);
			if (!subsubschema) throw new Error('No subschema for object path ' + pathParts.join('.'));
			const subschemaType: SchemaType = this._getType(subsubschema.type);
			if (subvalue === null || subvalue === undefined) {
				try {
					const newContainer = subschemaType.newEmptyContainer(null, subsubschema, this);
					schemaType.setValueSubfield(value, subschema, part, newContainer, this);
					subvalue = newContainer;
				} catch (e) {
					throw new Error('Cannot create empty container for setting value ' + pathParts.join('.'));
				}
			}
			this._setObjPathSubschemaValue(subvalue, subsubschema, pathParts, partsIdx + 1, newValue);
		}
	}

	/**
	 * Traverses a schema along with an object, calling onField for each field defined by the schema.
	 * onField is called for each field along the path, including parent fields.  Ie, if the schema
	 * contains an object, onField is called first for the object itself, then for each field inside
	 * the object.
	 *
	 * onField is called for each field defined by the schema, even fields not defined in the object.
	 * In this case, the value is set to undefined.  The exception to this is when traversing arrays.
	 * onField is first called for the array object itself, then for each element in the array,
	 * recursively.  If the array has zero elements, it will not be recursed into.
	 *
	 * The onUnknownField handler will be called for each field that exists in the object but is not
	 * recognized by the schema.  Such fields will not be recursively traversed.
	 *
	 * The results are undefined if this is called on an object that does not validate against the
	 * schema.
	 *
	 * @method traverse
	 * @throws {SchemaError} - On invalid schema
	 * @param {Object} obj - The object to traverse alongside the schema.
	 * @param {Object} handlers - Handler functions to call while traversing.
	 *   @param {Function} handlers.onField - Function called for each field in the schema.  This
	 *     function can return a boolean false to skip descending into child values.
	 *     @param {String} handlers.onField.field - String dot-separated path to the field.
	 *     @param {Mixed} handlers.onField.value - Value of the field on the object.
	 *     @param {Object} handlers.onField.schema - Normalized schema component corresponding to the
	 *       field.
	 *     @param {SchemaType} handlers.onField.subschemaType - The type object corresponding to
	 *       the subschema.
	 *   @param {Function} handlers.onUnknownField - Function called when a field is defined on
	 *     the object that is not defined in the schema.
	 *     @param {String} handlers.onUnknownField.field - Path to field.
	 *     @param {Mixed} handlers.onUnknownField.value - Value of the field.
	 */
	traverse(obj: any, handlers: TraverseHandlers): void {
		this._traverseSubschemaValue(obj, this._schemaData, '', handlers);
	}

	/**
	 * Calls the relevant handler for the given field, then calls traverse() on the type relevant
	 * to the given subschema.  If subschema is null, it is treated as an unknown field.
	 *
	 * @method _traverseSubschemaValue
	 * @private
	 * @param {Mixed} value - Value of the field.
	 * @param {Object|Null} subschema - Subschema corresponding to the field.  If falsy, the field is
	 *   treated as an unschema'd field.
	 * @param {String} field - Dot-separated field name.
	 * @param {Object} handlers
	 */
	_traverseSubschemaValue(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers): void {
		if (subschema) {
			let subschemaType: SchemaType = this._getType(subschema.type);
			let handlerResult: boolean | undefined = true;
			if (handlers.onField) {
				handlerResult = handlers.onField(field, value, subschema, subschemaType);
			}
			if (handlerResult !== false && value !== null && value !== undefined) {
				subschemaType.traverse(value, subschema, field, handlers, this);
			}
		} else if (value !== undefined) {
			if (handlers.onUnknownField) {
				handlers.onUnknownField(field, value);
			}
		}
	}

	/**
	 * Like traverse(), but each handler can return a replacement value for its respective
	 * field.  Returning a value of undefined will cause the field to be deleted.
	 *
	 * The "parent" object handler is always executed and the transformation completed before any
	 * handlers of child object.  Child
	 * handlers are executed on the transformed values of the parent handlers.
	 *
	 * @method transform
	 * @throws {SchemaError}
	 * @param {Mixed} obj
	 * @param {Object} handlers - Handler functions to call while traversing.
	 *   @param {Function} handlers.onField - Function called for each field in the schema.  Returns
	 *       new value for the field.
	 *     @param {String} handlers.onField.field - String dot-separated path to the field.
	 *     @param {Mixed} handlers.onField.value - Value of the field on the object.
	 *     @param {Object} handlers.onField.schema - Normalized schema component corresponding to the
	 *       field.
	 *     @param {SchemaType} handlers.onField.subschemaType - The type object corresponding to
	 *       the subschema.
	 *   @param {Function} handlers.onUnknownField - Function called when a field is defined on
	 *     the object that is not defined in the schema.
	 *     @param {String} handlers.onUnknownField.field - Path to field.
	 *     @param {Mixed} handlers.onUnknownField.value - Value of the field.
	 *   @param {Function} handlers.postField - Like onField, but executed on a field after all of
	 *     its subfields are transformed.
	 *     @param {String} handlers.postField.field
	 *     @param {Mixed} handlers.postField.value
	 *     @param {Object} handlers.postField.schema
	 *     @param {SchemaType} handlers.postField.subschemaType
	 * @return {Mixed} - Transformed object.
	 */
	transform(obj: any, handlers: TransformHandlers): any {
		return this._transformSubschemaValue(obj, this._schemaData, '', handlers);
	}

	/**
	 * Calls the relevant transform handler on the field and returns the value.
	 *
	 * @method _transformSubschemaValue
	 * @private
	 * @param {Mixed} value - Value of the field.
	 * @param {Object|Null} subschema - Subschema corresponding to the field.
	 * @param {String} field - Dot-separated field name.
	 * @param {Object} handlers - Object of transform handlers.
	 * @return {Mixed} - The new value of the field.
	 */
	_transformSubschemaValue(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers): any {
		let newValue: any = value;
		if (subschema) {
			let subschemaType: SchemaType = this._getType(subschema.type);
			if (handlers.onField) {
				newValue = handlers.onField(field, newValue, subschema, subschemaType);
				const isStopTransform: boolean = typeof newValue === 'object' && newValue && newValue[symbolStopTransform];
				if (isStopTransform) {
					if (newValue[symbolStopTransform].setNewValue) {
						return newValue[symbolStopTransform].newValue;
					} else {
						return value;
					}
				}
			}
			if (newValue !== null && newValue !== undefined) {
				newValue = subschemaType.transform(newValue, subschema, field, handlers, this);
			}
			if (handlers.postField) {
				newValue = handlers.postField(field, newValue, subschema, subschemaType);
			}
		} else if (value !== undefined) {
			if (handlers.onUnknownField) {
				newValue = handlers.onUnknownField(field, value);
			}
		}
		return newValue;
	}

	/**
	 * Asynchronous (promise-based) version of transform().  Looks just like transform, but the
	 * handlers may return promises.
	 *
	 * @method transformAsync
	 * @param {Mixed} obj
	 * @param {Object} handlers
	 * @return {Promise} - Resolves with result object
	 */
	transformAsync(obj: any, handlers: TransformAsyncHandlers): Promise<any> {
		try {
			return this._transformSubschemaValueAsync(obj, this._schemaData, '', handlers);
		} catch (ex) {
			return Promise.reject(ex);
		}
	}

	/**
	 * Recursive helper function for `transformAsync()`.
	 *
	 * @param {Mixed} value - Value of object corresponding to this subschema
	 * @param {Object} subschema - Subschema data
	 * @param {String} field - Path to the current field
	 * @param {Object} handlers
	 * @return {Promise} - Promise that resolves to the new value
	 */
	_transformSubschemaValueAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers): Promise<any> {
		if (subschema) {
			let subschemaType: SchemaType = this._getType(subschema.type);
			let promise: Promise<any> = Promise.resolve(value);
			if (handlers.onField) {
				promise = promise.then( (newValue: any): Promise<any> => handlers.onField(field, newValue, subschema, subschemaType) );
			}
			promise = promise.then( (newValue: any): Promise<any> => {
				const isStopTransform: boolean = typeof newValue === 'object' && newValue && newValue[symbolStopTransform];
				if (isStopTransform) {
					return Promise.resolve(newValue[symbolStopTransform].setNewValue ? newValue[symbolStopTransform].newValue : value);
				} else if (newValue !== null && newValue !== undefined) {
					return subschemaType.transformAsync(newValue, subschema, field, handlers, this);
				} else {
					return Promise.resolve(newValue);
				}
			} );
			if (handlers.postField) {
				promise = promise.then( (newValue: any): Promise<any> => handlers.postField(field, newValue, subschema, subschemaType) );
			}
			return promise;
		} else {
			if (handlers.onUnknownField && value !== undefined) {
				return handlers.onUnknownField(field, value);
			} else {
				return Promise.resolve(value);
			}
		}
	}

	/**
	 * Generate a special value to return from transform onField() that
	 * stops traversal down that branch.
	 */
	stopTransform(): any {
		return {
			[symbolStopTransform]: {
				stopTraverse: true,
				setNewValue: false
			}
		};
	}

	/**
	 * Generate a special value to return from transform onField() that
	 * stops traversal down that branch after setting a new value.
	 */
	setAndStopTransform(newValue: any): any {
		return {
			[symbolStopTransform]: {
				stopTraverse: true,
				setNewValue: true,
				newValue: newValue
			}
		};
	}

	/**
	 * Validates a value against the schema.  Values are strictly validated as if already normalized.
	 * Ie, even though a numeric string may be able to be normalized to a Number type, it fails
	 * validation.  Also, a missing required field fails validation even if it has a default value.
	 * If this is not desired behavior, use normalize() instead.
	 *
	 * @method validate
	 * @throws {ValidationError} - On invalid value
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} value - Value/object to validate
	 * @param {Object} [options]
	 *   @param {Boolean} options.allowUnknownFields - By default, an error is thrown if fields are
	 *     defined on an object that aren't defined on the schema.  If this is set to true, that error
	 *     is suppressed.
	 *   @param {Boolean} options.allowMissingFields - By default, an error is thrown if a required
	 *     field is missing.  If this is true, required field errors are suppressed.
	 * @return {Boolean} true
	 */
	validate(value: any, options: ValidateOptions = {}): void {
		let validator: Validator;
		if (options.Validator) {
			validator = new (options.Validator)(this, options);
		} else {
			validator = new Validator(this, options);
		}
		this.traverse(value, validator);
		if (validator.getFieldErrors().length) {
			throw new ValidationError(validator.getFieldErrors());
		}
	}

	/**
	 * Calls `validate`, translating the error to a boolean.
	 *
	 * @method isValid
	 * @return {Boolean}
	 */
	isValid(value: any, options: ValidateOptions = {}): boolean {
		try {
			this.validate(value, options);
			return true;
		} catch (ex) {
			return false;
		}
	}

	/**
	 * Normalizes a value according to the schema.  If the value is an object, normalization
	 * is performed in-place.  Full validation is performed as part of the normalization.
	 *
	 * @method normalize
	 * @throws {ValidationError} - On invalid value
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} value - Value to normalize
	 * @param {Object} [options]
	 *   @param {Boolean} options.allowUnknownFields - By default, an error is thrown if fields are
	 *     defined on an object that aren't defined on the schema.  If this is set to true, that error
	 *     is suppressed.
	 *   @param {Boolean} options.allowMissingFields - By default, an error is thrown if a required
	 *     field is missing.  If this is true, required field errors are suppressed.
	 *   @param {Boolean} options.removeUnknownFields - If any fields not in the schema are found,
	 *     remove them instead of throwing an error.
	 *   @param {Boolean} options.serialize - Default normalization normalizes to internal javascript
	 *     types (such as a Date object) that may not easily stringify.  If this option is set, types
	 *     are normalized into easily serializable values (ie, JSON types).
	 *   @param {Boolean} options.ignoreDefaults - Do not create/run field defaults
	 * @return {Mixed} - The normalized value; if an object, the same as the value parameter
	 */
	normalize(value: any, options: NormalizeOptions = {}): any {
		let normalizer: Normalizer;
		if (options.Normalizer) {
			normalizer = new (options.Normalizer)(this, options);
		} else {
			normalizer = new Normalizer(this, options);
		}
		let normalizedValue: any = this.transform(value, normalizer);
		const fieldErrors: FieldError[] = normalizer.getFieldErrors();
		if (fieldErrors.length) {
			throw new ValidationError(fieldErrors);
		}
		return normalizedValue;
	}

	/**
	 * Alias for normalize() with the `serialize` option set.
	 *
	 * @method serialize
	 * @throws {ValidationError} - On invalid value
	 * @throws {SchemaError} - On invalid schema
	 * @param {Mixed} value
	 * @param {Object} [options]
	 * @return {Mixed}
	 */
	serialize(value: any, options: NormalizeOptions = {}): any {
		options.serialize = true;
		return this.normalize(value, options);
	}

	/**
	 * Creates a function that validates objects passed in.
	 *
	 * @method createValidateFn
	 * @throws {SchemaError} - On invalid schema
	 * @param {Object} [options] - Options to validate()
	 * @return {Function} - function(value) that validates the value
	 */
	createValidateFn(options: ValidateOptions = {}): (value: any) => void {
		return (value) => this.validate(value, options);
	}

	/**
	 * Creates a function that normalizes objects passed in.
	 *
	 * @method createNormalizeFn
	 * @throws {SchemaError} - On invalid schema
	 * @param {Object} [options] - Options to normalize()
	 * @return {Function} - function(value) that normalizes the value
	 */
	createNormalizeFn(options: NormalizeOptions = {}): (value: any) => any {
		return (value) => this.normalize(value, options);
	}

	/**
	 * Returns a SchemaType by name.
	 *
	 * @method _getType
	 * @protected
	 * @throws {SchemaError} - On type not found
	 * @param {String} name
	 * @return {SchemaType}
	 */
	_getType(name: string): SchemaType {
		return this._schemaFactory.getType(name);
	}

	getType(name: string): SchemaType {
		return this._getType(name);
	}

	/**
	 * Returns the SchemaType corresponding to a subschema.
	 *
	 * @method getSchemaType
	 * @throws {SchemaError} - On type not found
	 * @param {Object} subschema - The subschema data
	 * @return {SchemaType}
	 */
	getSchemaType(subschema: SubschemaType): SchemaType {
		return this._getType(subschema.type);
	}

	/**
	 * Returns the data for a subschema at the given path to a field.
	 *
	 * @method getSubschemaData
	 * @throws {SchemaError}
	 * @param {String} path - Path to field to get subschema for
	 * @return {Object|Undefined} - The subschema, or undefined if a matching subschema
	 *   couldn't be found.
	 */
	getSubschemaData(path: string): SubschemaType {
		// Edge case for root path
		if (!path) return this.getData();

		// Traverse schema along path
		let pathComponents: string[] = path.split('.');
		let currentSubschema: SubschemaType = this.getData();
		for (let pathComponent of pathComponents) {
			if (!currentSubschema) return undefined;
			currentSubschema = this
				.getSchemaType(currentSubschema)
				.getFieldSubschema(currentSubschema, pathComponent, this);
		}
		return currentSubschema;
	}

	/**
	 * Returns the subschema data at the path in such a way that the subschema can be modified
	 * and it will apply to the specific named field.
	 *
	 * @method getSubschemaDataForModify
	 */
	getSubschemaDataForModify(path: string): SubschemaType {
		// Edge case for root path
		if (!path) return this.getData();

		// Traverse schema along path
		let pathComponents: string[] = path.split('.');
		let currentSubschema: SubschemaType = this.getData();
		for (let pathComponent of pathComponents) {
			if (!currentSubschema) return undefined;
			currentSubschema = this
				.getSchemaType(currentSubschema)
				.getFieldSubschemaForModify(currentSubschema, pathComponent, this);
		}
		return currentSubschema;
	}

	/**
	 * Sets a schema option at the given path.
	 */
	setSubschemaOption(subschemaPath: string, optionName: string, optionValue: any): void {
		let subschema = this.getSubschemaDataForModify(subschemaPath);
		if (!subschema) throw new Error('Subschema path ' + subschemaPath + ' does not exist on schema');
		objtools.setPath(subschema, optionName, optionValue);
	}

	/**
	 * Creates a schema that represents a subcomponent of this schema.
	 *
	 * @method _createSubschema
	 * @private
	 * @param {Mixed} schemaData - Data for the subschema
	 * @return {Schema}
	 */
	_createSubschema(schemaData: SubschemaType): Schema {
		return new Schema(schemaData, this._schemaFactory, { skipNormalize: true });
	}

	/**
	 * Check if path contains a specific schema type somewhere as a parent.
	 *
	 * @method hasParentType
	 * @throws {SchemaError} - When field doesn't exist.
	 * @param {String} path - The subschema path to check.
	 * @param {String} type - The type to check for.
	 * @param {Object} [opts={}]
	 *   @param {Boolean} [opts.skipLastField=false] - If truthy, skip the last field in the path.
	 * @returns {Boolean} Whether this path contains a parent with the given type name.
	 * NOTE: this will also return true in the result of an issue (ie, path not existing).
	 */
	hasParentType(path: string, type: string, opts: HasParentTypeOptions = {}): boolean {
		let pathParts: string[] = path.split('.');
		if (opts.skipLastField) {
			pathParts = pathParts.splice(0, pathParts.length - 2);
		}
		let field: string = '';
		for (let pathPart of pathParts) {
			field = (field) ? `${field}.${pathPart}` : pathPart;
			let subschemaData: SubschemaType = this.getSubschemaData(field);
			if (!subschemaData) {
				let msg: string = `Did not find field in schema: ${field}`;
				throw new SchemaError(msg);
			}
			// accessing field within an array
			if (subschemaData.type === type) {
				return true;
			}
		}
		// arrived at field without going through array
		return false;
	}

	/**
	 * Returns an array of field strings represented by this schema. Any subschema type other
	 * than object (and optionally array) is treated as a field.
	 *
	 * @method listFields
	 * @param {Boolean} [options.stopAtArrays=true] - By default, array fields are terminal (and returned
	 *   as a single field). If this is false, arrays are traversed.
	 * @param {Boolean} [options.includePathArrays=false] - Only relevant if `stopAtArrays` is false. This
	 *   option has the same meaning as with `traverseSchema()`. If true, `$` elements are included in the
	 *   field paths as array index placeholders.
	 * @param {Number} [options.maxDepth] - If set, stop traversing after a specified depth. A depth of `1`
	 *   will result in single fields that don't include dot separators.
	 * @param {Boolean} [options.onlyLeaves=false] - If true, only leaf paths are returned.
	 * @return {String[]}
	 */
	listFields(options: ListFieldsOptions = {}): string[] {
		let fields: string[] = [];
		let stopAtArrays: boolean = options.stopAtArrays === undefined || options.stopAtArrays;
		let lastField: string;
		this.traverseSchema({
			onSubschema(subschema, path) {
				if (!path) return true;
				if (
					options.onlyLeaves &&
					lastField !== undefined &&
					lastField.length < path.length &&
					path.slice(0, lastField.length + 1) === lastField + '.'
				) {
					fields.pop();
				} else if (lastField === path) {
					fields.pop();
				}
				fields.push(path);
				lastField = path;
				if (stopAtArrays && (subschema.type === 'array' || subschema.type === 'map')) {
					return false;
				}
				if (typeof options.maxDepth === 'number') {
					let depth = 0;
					let lastIndex = -1;
					do {
						depth++;
						if (depth >= options.maxDepth) return false;
						lastIndex = path.indexOf('.', lastIndex + 1);
					} while (lastIndex !== -1);
				}
				return true;
			}
		}, {
			includePathArrays: options.includePathArrays || false
		});
		return fields;
	}

	/**
	 * Converts a common-schema format schema to a JSON schema (json-schema.org)
	 * standard schema.  JSON schema does not support some things that common-schema
	 * does, so the conversion may not be exact.
	 *
	 * @method toJSONSchema
	 * @return {Object}
	 */
	toJSONSchema(): any {
		// Used to register JSON Schema definitions at the root of the schema.
		this.jsonSchemaDefinitions = {};

		let data: SubschemaType = this.getData();
		let jsonSchema: any = this._subschemaToJSONSchema(data);

		// Attach definitions, if any
		if (Object.keys(this.jsonSchemaDefinitions).length) {
			jsonSchema.definitions = objtools.deepCopy(this.jsonSchemaDefinitions);
		}
		// Clean up temporary registry
		this.jsonSchemaDefinitions = null;

		return jsonSchema;
	}

	/**
	 * Converts a given subschema to the JSON schema equivalent.
	 *
	 * @method _subschemaToJSONSchema
	 * @private
	 * @param {Object} subschema
	 * @return {Object}
	 */
	_subschemaToJSONSchema(subschema: SubschemaType): any {
		let schemaType: SchemaType = this._getType(subschema.type);
		let jsonSchema: any = schemaType.toJSONSchema(subschema, this);
		if (!jsonSchema) return null;
		if (subschema.description) jsonSchema.description = subschema.description;
		if (subschema.enum) jsonSchema.enum = objtools.deepCopy(subschema.enum);
		if (subschema.default) jsonSchema.default = objtools.deepCopy(subschema.default);
		return jsonSchema;
	}

	/**
	 * Tests for whether a value is a Schema instance
	 *
	 * @method isSchema
	 * @static
	 * @param {*} value - Value to test
	 * @return {Boolean}
	 */
	static isSchema(value: any): boolean {
		return !!(value && value._isCommonSchema === true);
	}

	/**
	 * Internal method for setting properties nested within objects and arrays.
	 *
	 * @method _setPathWithArrays
	 * @private
	 * @static
	 * @param {Object|Array} obj - The object
	 * @param {String} path - The path, dot-separated, with array paths as '$'.
	 * @param {Mixed} value - Value to set
	 */
	static _setPathWithArrays(obj: any, path: string, value: any): any {
		let cur = obj;
		let parts = path.split('.');
		for (let i = 0; i < parts.length; i++) {
			let key: any = parts[i];
			if (key === '$') key = 0;
			if (i === parts.length - 1) {
				cur[key] = value;
			} else {
				if (objtools.isScalar(cur[key])) {
					if (parts[i + 1] === '$') {
						cur[key] = [];
					} else {
						cur[key] = {};
					}
				}
				cur = cur[key];
			}
		}
		return obj;
	}

}

