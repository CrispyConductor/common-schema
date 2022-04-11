import { FieldError } from './field-error.js';
import { Schema, NormalizeOptions, SubschemaType } from './schema.js';
import { SchemaType } from './schema-type.js';



/**
 * Class containing handlers to normalize an object according to a schema.  Instantiated in
 * Schema#normalize.
 *
 * @class Normalizer
 * @constructor
 * @param {Schema} schema
 * @param {Object} options
 */
export class Normalizer {
	schema: Schema;
	options: NormalizeOptions;
	fieldErrors: FieldError[];

	constructor(schema: Schema, options: NormalizeOptions = {}) {
		this.schema = schema;
		this.options = options;
		this.fieldErrors = [];
	}

	addFieldError(fieldError: FieldError): void {
		this.fieldErrors.push(fieldError);
	}

	getFieldErrors(): FieldError[] {
		return this.fieldErrors;
	}

	onField(field: string, value: any, subschema: SubschemaType, subschemaType: SchemaType): any {
		if (
			(value === undefined || value === null) &&
			subschema.default !== undefined && subschema.default !== null &&
			!this.options.ignoreDefaults
		) {
			value = (typeof subschema.default === 'function') ? subschema.default() : subschema.default;
		}
		if (value === undefined || value === null) {
			if (subschema.required && !this.options.allowMissingFields) {
				this.addFieldError(new FieldError(
					'required',
					subschema.requiredError || 'Field is required',
					field
				));
				return undefined;
			}
		} else {
			try {
				if (typeof subschema.normalize === 'function') {
					value = subschema.normalize(value, subschema, field, this.options, this.schema);
				}
				value = subschemaType.normalize(value, subschema, field, this.options, this.schema);
				if (typeof subschema.validate === 'function') {
					subschema.validate(value, subschema, field, this.options, this.schema);
				}
			} catch (ex) {
				if (FieldError.isFieldError(ex)) {
					ex.field = field;
					this.addFieldError(ex);
					return undefined;
				} else {
					throw ex;
				}
			}
			if (Array.isArray(subschema.enum) && !subschemaType.checkEnum(value, subschema.enum)) {
				this.addFieldError(new FieldError(
					'unrecognized',
					subschema.enumError || 'Unrecognized value',
					{ value, enum: subschema.enum },
					field
				));
				return undefined;
			}
		}
		return value;
	}

	onUnknownField(field: string, value: any): any {
		if (this.options.removeUnknownFields) {
			return undefined;
		} else if (!this.options.allowUnknownFields) {
			this.addFieldError(new FieldError('unknown_field', 'Unknown field', field));
		}
		return value;
	}

}

