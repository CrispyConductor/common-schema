import { FieldError } from './field-error.js';
import { Schema, ValidateOptions, SubschemaType } from './schema.js';
import { SchemaType } from './schema-type.js';

/**
 * Class containing handlers to validate an object according to a schema.  Instantiated in
 * Schema#validate.
 *
 * @class Validator
 * @constructor
 * @param {Schema} schema
 * @param {Object} options
 */
export class Validator {
	schema: Schema;
	options: ValidateOptions;
	fieldErrors: FieldError[];

	constructor(schema: Schema, options: ValidateOptions = {}) {
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

	onField(field: string, value: any, subschema: SubschemaType, subschemaType: SchemaType) {
		if (
			(value === undefined || value === null) &&
			subschema.default !== undefined && subschema.default !== null
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
			}
		} else {
			if (Array.isArray(subschema.enum) && !subschemaType.checkEnum(value, subschema.enum)) {
				this.addFieldError(new FieldError(
					'unrecognized',
					subschema.enumError || 'Unrecognized value',
					{ value, enum: subschema.enum },
					field
				));
			} else {
				try {
					subschemaType.validate(value, subschema, field, this.options, this.schema);
					if (typeof subschema.validate === 'function') {
						subschema.validate(value, subschema, field, this.options, this.schema);
					}
				} catch (ex) {
					if (FieldError.isFieldError(ex)) {
						ex.field = field;
						this.addFieldError(ex);
						return false;
					} else {
						throw ex;
					}
				}
			}
		}
	}

	onUnknownField(field: string, value: any): void {
		if (!this.options.allowUnknownFields) {
			this.addFieldError(new FieldError('unknown_field', 'Unknown field', field));
		}
	}

}

