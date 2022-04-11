export * from './schema.js';
export * from './schema-factory.js';
export { Normalizer } from './normalizer.js';
export { Validator } from './validator.js';
export * from './schema-type.js';
export { FieldError } from './field-error.js';
export { ValidationError } from './validation-error.js';
export { SchemaError } from './schema-error.js';
export { Mixed } from './mixed.js';
export { or } from './or.js';
export { map } from './map.js';

import { SchemaFactory } from './schema-factory.js';
import { SchemaOptions, Schema } from './schema.js';

export const defaultSchemaFactory: SchemaFactory = new SchemaFactory();
export function createSchema(schemaData: any, options: SchemaOptions = {}): Schema {
	return defaultSchemaFactory.createSchema(schemaData, options);
}

