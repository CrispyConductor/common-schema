/**
 * Class representing errors in the syntax of a schema.
 *
 * @class SchemaError
 * @extends Error
 * @constructor
 * @param {String} message
 */
export class SchemaError extends Error {

	constructor(message: string = null) {
		super(message || 'Schema syntax error');
	}

}

