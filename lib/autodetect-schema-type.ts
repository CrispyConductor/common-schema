import { SchemaType } from './schema-type.js';
import { SchemaError } from './schema-error.js';
import { FieldError } from './field-error.js';
import { ValidationError } from './validation-error.js';
import { Mixed } from './mixed.js';
import _ from 'lodash';
import * as objtools from 'objtools';
import { SubschemaType, Schema, SchemaTraverseHandlers, SchemaTraverseOptions, TraverseHandlers, TransformHandlers, TransformAsyncHandlers, ValidateOptions, NormalizeOptions } from './schema.js';


export class SchemaTypeAutodetect extends SchemaType {

	constructor() {
		super('autodetect', true, false);
	}


	isContainer(value: any, subschema: SubschemaType, schema: Schema): boolean {
		return Array.isArray(value) || (typeof value === 'object' && value);
	}


	newEmptyContainer(valueTemplate: any, subschema: SubschemaType, schema: Schema): any {
		if (Array.isArray(valueTemplate)) {
			return [];
		} else if (valueTemplate && typeof valueTemplate === 'object') {
			return {};
		} else {
			throw new Error('Value template is not a container type');
		}
	}

	listSchemaSubfields(subschema: SubschemaType, schema: Schema): string[] {
		return [];
	}


	getFieldValueSubschema(value: any, subschema: SubschemaType, field: string, schema: Schema): any | undefined {
		if (typeof value === 'string') return { type: 'string' };
		if (typeof value === 'number') return { type: 'number' };
		if (typeof value === 'boolean') return { type: 'boolean' };
		return { type: 'autodetect' };
	}

	listValueSubfields(value: any, subschema: SubschemaType, schema: Schema): string[] {
		if (Array.isArray(value)) {
			const ret = [];
			for (let i = 0; i < value.length; i++) ret.push(String(i));
			return ret;
		} else if (value && typeof value === 'object') {
			return Object.keys(value);
		} else {
			return [];
		}
	}

	getValueSubfield(value: any, subschema: SubschemaType, field: string, schema: Schema): any {
		return value[field];
	}

	setValueSubfield(value: any, subschema: SubschemaType, field: string, fieldValue: any, schema: Schema): void {
		value[field] = fieldValue;
	}

}

