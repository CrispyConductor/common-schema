import { FieldError } from './field-error.js';

/**
 * Class representing object validation error.
 *
 * @class ValidationError
 * @extends Error
 * @constructor
 * @param {FieldError[]} [fieldErrors] - Array of errors for individual fields
 * @param {String} [message] - Message to use for the error.  By default, the message of the first
 *   field error is used.
 */
export class ValidationError extends Error {
	code: string = 'validation_error'; // machine-readable error code
	fieldErrors?: FieldError[] = null; // errors on each of the schema fields

	constructor(fieldErrors: FieldError[] = null) {
		if (!fieldErrors.length) {
			fieldErrors = null;
		}
		let message: string;
		if (fieldErrors) {
			message = fieldErrors[0].message || 'Validation failure';
		} else {
			message = 'Validation failure';
		}
		if (fieldErrors?.[0]?.field) {
			message += ': ' + fieldErrors?.[0]?.field;
		}
		super(message);
		this.code = 'validation_error';
		this.fieldErrors = fieldErrors;
		Object.defineProperty(this, '_isValidationError', { value: true });
	}

	static isValidationError(value: any): boolean {
		return !!(value && value._isValidationError);
	}

}


