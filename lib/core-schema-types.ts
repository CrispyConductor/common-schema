import { SchemaType } from './schema-type.js';
import { SchemaError } from './schema-error.js';
import { FieldError } from './field-error.js';
import { ValidationError } from './validation-error.js';
import { Mixed } from './mixed.js';
import _ from 'lodash';
import * as objtools from 'objtools';
import { SubschemaType, Schema, SchemaTraverseHandlers, SchemaTraverseOptions, TraverseHandlers, TransformHandlers, TransformAsyncHandlers, ValidateOptions, NormalizeOptions } from './schema.js';


export class SchemaTypeObject extends SchemaType {

	constructor(name: string = 'object') {
		super(name || 'object', true, true);
	}

	matchShorthandType(subschema: any): boolean {
		return objtools.isPlainObject(subschema);
	}

	/*traverseSchema(subschema: SubschemaType, path: string, rawPath: string, handlers: SchemaTraverseHandlers, schema: Schema, options: SchemaTraverseOptions): void {
		for (let prop in subschema.properties) {
			schema._traverseSubschema(
				subschema.properties[prop],
				path ? (path + '.' + prop) : prop,
				rawPath ? (rawPath + '.properties.' + prop) : ('properties.' + prop),
				handlers,
				options
			);
		}
	}*/


	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		return subschema.properties[pathComponent] || undefined;
	}


	normalizeShorthandSchema(subschema: any, schema: Schema): SubschemaType {
		if (objtools.isPlainObject(subschema.type)) {
			subschema.properties = subschema.type;
		}
		return subschema;
	}


	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		if (!objtools.isPlainObject(subschema.properties)) {
			throw new SchemaError('Object in schema must have properties field');
		}
		for (let prop in subschema.properties) {
			subschema.properties[prop] = schema._normalizeSubschema(subschema.properties[prop]);
		}
		return subschema;
	}

	listSchemaSubfields(subschema: SubschemaType, schema: Schema): string[] {
		return Object.keys(subschema.properties);
	}

	listValueSubfields(value: any, subschema: SubschemaType, schema: Schema): string[] {
		if (typeof value === 'object' && value) {
			return Object.keys(value);
		} else {
			return [];
		}
	}

	getValueSubfield(value: any, subschema: SubschemaType, field: string, schema: Schema): any {
		if (typeof value === 'object' && value) {
			return value[field];
		} else {
			return undefined;
		}
	}

	setValueSubfield(value: any, subschema: SubschemaType, field: string, fieldValue: any, schema: Schema): void {
		if (typeof value === 'object' && value) {
			if (fieldValue !== undefined) {
				value[field] = fieldValue;
			} else {
				delete value[field];
			}
		}
	}

	getFieldSubschemaPath(subschema: SubschemaType, field: string, schema: Schema): string {
		return 'properties.' + field;
	}

	/*traverse(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers, schema: Schema): void {
		for (let prop in subschema.properties) {
			schema._traverseSubschemaValue(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			);
		}
		for (let prop in value) {
			if (!(prop in subschema.properties)) {
				schema._traverseSubschemaValue(
					value[prop],
					undefined,
					field ? (field + '.' + prop) : prop,
					handlers
				);
			}
		}
	}

	transform(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers, schema: Schema): any {
		for (let prop in subschema.properties) {
			let newValue = schema._transformSubschemaValue(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			);
			if (newValue === undefined) {
				delete value[prop];
			} else {
				value[prop] = newValue;
			}
		}
		for (let prop in value) {
			if (!(prop in subschema.properties)) {
				let newValue = schema._transformSubschemaValue(
					value[prop],
					undefined,
					field ? (field + '.' + prop) : prop,
					handlers
				);
				if (newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			}
		}
		return value;
	}


	transformAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers, schema: Schema): Promise<any> {
		return Promise.all(_.map(_.union(_.keys(subschema.properties), _.keys(value)), function(prop) {
			return schema._transformSubschemaValueAsync(
				value[prop],
				subschema.properties[prop],
				field ? (field + '.' + prop) : prop,
				handlers
			).then(function(newValue) {
				if (newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			});
		})).then( () => value );
	}
	*/


	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (!objtools.isPlainObject(value)) {
			throw new FieldError('invalid_type', 'Must be an object');
		}
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		return (objtools.isPlainObject(value) ? 1 : 0);
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		let properties = {};
		let required = [];
		for (let key in (subschema.properties || [])) {
			properties[key] = schema._subschemaToJSONSchema(subschema.properties[key]);
			if (subschema.properties[key].required) {
				required.push(key);
			}
		}
		let jsonSchema: any = {
			type: 'object',
			properties
		};
		if (required.length) jsonSchema.required = required;
		return jsonSchema;
	}

	newEmptyContainer(valueTemplate: any, subschema: SubschemaType, schema: Schema): any {
		return {};
	}

}

function removeArrayUndefinedValues(ar: any[]) {
	if (!Array.isArray(ar)) return;
	let dstidx = 0;
	let srcidx = 0;
	while (srcidx < ar.length) {
		const v = ar[srcidx];
		if (v !== undefined) {
			ar[dstidx] = v;
			dstidx++;
		}
		srcidx++;
	}
	ar.length = dstidx;
}

export class SchemaTypeArray extends SchemaType {

	constructor(name: string = 'array') {
		super(name || 'array', true, false);
	}

	matchShorthandType(subschema: any): boolean {
		return (Array.isArray(subschema) && subschema.length === 1);
	}

	/*traverseSchema(subschema: SubschemaType, path: string, rawPath: string, handlers: SchemaTraverseHandlers, schema: Schema, options: SchemaTraverseOptions): void {
		let newPath;
		let newRawPath = rawPath ? (rawPath + '.elements') : 'elements';
		if (options.includePathArrays) {
			newPath = path ? (path + '.$') : '$';
		} else {
			newPath = path;
		}
		schema._traverseSubschema(
			subschema.elements,
			newPath,
			newRawPath,
			handlers,
			options
		);
	}*/

	getFieldSubschemaPath(subschema: SubschemaType, field: string, schema: Schema): string {
		return 'elements';
	}

	listSchemaSubfields(subschema: SubschemaType, schema: Schema): string[] {
		return [ '$' ];
	}

	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		// We include the extra values here so this function can work with various standard
		// array index placeholders.  If used to index into an actual array object, they'll
		// return undefined.
		if (
			/^[0-9]+$/.test(pathComponent) ||
			pathComponent === '$' ||
			pathComponent === '#' ||
			pathComponent === '_' ||
			pathComponent === '*'
		) {
			return subschema.elements;
		} else {
			return undefined;
		}
	}

	listValueSubfields(value: any, subschema: SubschemaType, schema: Schema): string[] {
		let ret: string[] = [];
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				ret.push(String(i));
			}
		}
		return ret;
	}


	getValueSubfield(value: any, subschema: SubschemaType, field: string, schema: Schema): any {
		return value[parseInt(field)];
	}

	setValueSubfield(value: any, subschema: SubschemaType, field: string, fieldValue: any, schema: Schema): void {
		value[parseInt(field)] = fieldValue;
	}

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		if (!subschema.elements) {
			throw new SchemaError('Array schema must have elements field');
		}
		subschema.elements = schema._normalizeSubschema(subschema.elements);
		return subschema;
	}

	normalizeShorthandSchema(subschema: any, schema: Schema): SubschemaType {
		if (this.matchShorthandType(subschema.type)) {
			subschema.elements = subschema.type[0];
		}
		return subschema;
	}


	/*traverse(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers, schema: Schema): void {
		for (let i = 0; i < value.length; i++) {
			schema._traverseSubschemaValue(
				value[i],
				subschema.elements,
				field ? (field + '.' + i) : ('' + i),
				handlers
			);
		}
	}*/

	/*transform(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers, schema: Schema): any {
		let hasDeletions: boolean = false;
		for (let i = 0; i < value.length; i++) {
			value[i] = schema._transformSubschemaValue(
				value[i],
				subschema.elements,
				field ? (field + '.' + i) : ('' + i),
				handlers
			);
			if (value[i] === undefined) {
				hasDeletions = true;
			}
		}
		if (hasDeletions) {
			return _.filter(value, elem => elem !== undefined);
		} else {
			return value;
		}
	}*/

	/*transformAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers, schema: Schema): Promise<any> {
		let hasDeletions = false;
		return Promise.all(_.map(value, function(elem, i) {
			return schema._transformSubschemaValueAsync(
				elem,
				subschema.elements,
				field ? (field + '.' + i) : ('' + i),
				handlers
			).then(function(newElem) {
				value[i] = newElem;
				if (newElem === undefined) {
					hasDeletions = true;
				}
			});
		})).then(function() {
			if (hasDeletions) {
				return _.filter(value, elem => elem !== undefined);
			} else {
				return value;
			}
		});
	}*/


	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (!_.isArray(value)) {
			throw new FieldError('invalid_type', 'Must be an array');
		}
		for (let elem of value) {
			if (elem === undefined) {
				throw new FieldError('invalid', 'Arrays may not contain undefined elements');
			}
		}
	}


	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		removeArrayUndefinedValues(value);
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		return (_.isArray(value) ? 1 : 0);
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return {
			type: 'array',
			items: schema._subschemaToJSONSchema(subschema.elements)
		};
	}

	newEmptyContainer(valueTemplate: any, subschema: SubschemaType, schema: Schema): any {
		return [];
	}
}


/**
 * This schema type is a variant of an array that actually represents a set/map of unique items.
 * In paths, this is represented as a string key (matching the value) instead of an array index.
 *
 * Schemas look like this:
 * {
 * 	type: 'arrayset',
 * 	elements: <Subschema for Elements>,
 * 	keyField: <Subfield within elements to get unique key; defaults to whole element>
 * }
 */
export class SchemaTypeArraySet extends SchemaType {

	
	constructor(name: string = 'arrayset') {
		super(name, true, false);
	}

	matchShorthandType(subschema: any): boolean {
		return false;
	}

	getFieldSubschemaPath(subschema: SubschemaType, field: string, schema: Schema): string {
		if (subschema.keySchemas && subschema.keySchemas[field]) {
			return 'keySchemas.' + field;
		}
		return 'elements';
	}

	listSchemaSubfields(subschema: SubschemaType, schema: Schema): string[] {
		let r: string[] = [ '$' ];
		if (subschema.keySchemas) {
			r.push(...(Object.keys(subschema.keySchemas)));
		}
		return r;
	}

	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		if (subschema.keySchemas && subschema.keySchemas[pathComponent]) {
			return subschema.keySchemas[pathComponent];
		}
		return subschema.elements;
	}

	getFieldSubschemaForModify(subschema: SubschemaType, field: string, schema: Schema): any | undefined {
		if (subschema.keySchemas && subschema.keySchemas[field]) {
			return subschema.keySchemas[field];
		} else if (field === '$') { // generic array placeholder always returns generic elements schema
			return subschema.elements;
		} else {
			if (!subschema.keySchemas) {
				subschema.keySchemas = {};
			}
			subschema.keySchemas[field] = objtools.deepCopy(subschema.elements);
			return subschema.keySchemas[field];
		}
	}

	// Return a unique key string used to index the element based on keyField
	_getElementKey(elementValue: any, subschema: SubschemaType, schema: Schema, throwOnUndefined: boolean = false): string | undefined {
		const encodeValue = (v: any): string | undefined => {
			if (v === undefined) return undefined;
			if (Array.isArray(v)) {
				return v.map(encodeValue).join('$');
			} else if (objtools.isScalar(v)) {
				return String(v);
			} else {
				return objtools.objectHash(v);
			}
		};
		let r: any;
		if (subschema.keyField && Array.isArray(subschema.keyField)) {
			r = encodeValue(subschema.keyField.map((f: string) => objtools.getPath(elementValue, f)));
		} else if (subschema.keyField) {
			r = encodeValue(objtools.getPath(elementValue, subschema.keyField));
		} else {
			r = encodeValue(elementValue);
		}
		if (r === undefined && throwOnUndefined) {
			throw new SchemaError('ArraySet element key does not exist');
		}
		return r;
	}

	listValueSubfields(value: any, subschema: SubschemaType, schema: Schema): string[] {
		let ret: string[] = [];
		if (Array.isArray(value)) {
			for (let el of value) {
				ret.push(this._getElementKey(el, subschema, schema, true));
			}
			return _.uniq(ret);
		}
		return ret;
	}


	listValueSubfieldEntries(value: any, subschema: SubschemaType, schema: Schema): [ string, any ][] {
		let retMap: Map<string, any> = new Map();
		if (Array.isArray(value)) {
			for (let el of value) {
				retMap.set(this._getElementKey(el, subschema, schema, true), el);
			}
			let retAr: [ string, any ][] = [];
			for (let [ k, v ] of retMap.entries()) {
				retAr.push([ k, v ]);
			}
			return retAr;
		}
		return [];
	}

	setValueSubfieldBatch(value: any, subschema: SubschemaType, newValues: { [subfield: string]: any }, schema: Schema): void {
		let keyToIndexMap: Map<string, number> = new Map();
		for (let i = 0; i < value.length; i++) {
			let key: string = this._getElementKey(value[i], subschema, schema, true);
			keyToIndexMap.set(key, i);
		}
		for (let newValue of newValues.values()) {
			// note: ignore given key for value and recalculate it ourselves
			let key: string = this._getElementKey(newValue, subschema, schema, true);
			if (keyToIndexMap.has(key)) {
				value[keyToIndexMap.get(key)] = newValue;
			} else {
				value.push(newValue);
			}
		}
	}

	getValueSubfield(value: any, subschema: SubschemaType, field: string, schema: Schema): any {
		for (let el of value) {
			if (this._getElementKey(el, subschema, schema) === field) {
				return el;
			}
		}
		return undefined;
	}

	setValueSubfield(value: any, subschema: SubschemaType, field: string, fieldValue: any, schema: Schema): void {
		for (let i = 0; i < value.length; i++) {
			if (this._getElementKey(value[i], subschema, schema) === field) {
				value[i] = fieldValue;
				return;
			}
		}
		value.push(fieldValue);
	}

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		if (!subschema.elements) {
			throw new SchemaError('ArraySet schema must have elements field');
		}
		subschema.elements = schema._normalizeSubschema(subschema.elements);
		if (subschema.keySchemas) {
			for (let k in subschema.keySchemas) {
				subschema.keySchemas[k] = schema._normalizeSubschema(subschema.keySchemas[k]);
			}
		}
		return subschema;
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (!_.isArray(value)) {
			throw new FieldError('invalid_type', 'Must be an array');
		}
		for (let elem of value) {
			if (elem === undefined) {
				throw new FieldError('invalid', 'Arrays may not contain undefined elements');
			}
			if (this._getElementKey(elem, subschema, schema) === undefined) {
				throw new FieldError('invalid', 'ArraySet element has no key');
			}
		}
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		const seenKeys: Set<string> = new Set();
		for (let i = 0; i < value.length; i++) {
			const k: string = this._getElementKey(value[i], subschema, schema);
			if (seenKeys.has(k)) {
				value[i] = undefined;
			} else {
				seenKeys.add(k);
			}
		}
		removeArrayUndefinedValues(value);
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		return (_.isArray(value) ? 1 : 0);
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return {
			type: 'array',
			items: schema._subschemaToJSONSchema(subschema.elements)
		};
	}

	newEmptyContainer(valueTemplate: any, subschema: SubschemaType, schema: Schema): any {
		return [];
	}

	transform(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers, schema: Schema): any {
		if (!Array.isArray(value)) return value;
		const newArr: any[] = value.map((el) => {
			const key = this._getElementKey(el, subschema, schema, false);
			return schema._transformSubschemaValue(
				el,
				subschema.elements,
				field ? (field + '.' + key) : key,
				handlers
			);
		}).filter((el) => el !== undefined);
		// sync keys in value
		for (let i = 0; i < newArr.length; i++) {
			value[i] = newArr[i];
		}
		value.length = newArr.length;
		return value;
	}

	async transformAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers, schema: Schema): Promise<any> {
		if (!Array.isArray(value)) return value;
		const newArr: any[] = [];
		for (const el of value) {
			const key = this._getElementKey(el, subschema, schema, false);
			const newValue = await schema._transformSubschemaValueAsync(
				el,
				subschema.elements,
				field ? (field + '.' + key) : key,
				handlers
			);
			if (newValue !== undefined) newArr.push(newValue);
		}
		// sync keys in value
		for (let i = 0; i < newArr.length; i++) {
			value[i] = newArr[i];
		}
		value.length = newArr.length;
		return value;
	}

	traverse(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers, schema: Schema): void {
		if (!Array.isArray(value)) return value;
		for (const el of value) {
			const key = this._getElementKey(el, subschema, schema, false);
			schema._traverseSubschemaValue(
				el,
				subschema.elements,
				field ? (field + '.' + key) : key,
				handlers
			);
		}
	}
}

export class SchemaTypeMap extends SchemaType {

	constructor(name: string = 'map') {
		super(name || 'map', true, false);
	}

	matchShorthandType(subschema: any): boolean {
		return false;
	}

	/*traverseSchema(subschema: SubschemaType, path: string, rawPath: string, handlers: SchemaTraverseHandlers, schema: Schema, options: SchemaTraverseOptions): void {
		let newPath: string;
		let newRawPath: string = rawPath ? (rawPath + '.values') : 'values';
		if (options.includePathArrays) {
			newPath = path ? (path + '.$') : '$';
		} else {
			newPath = path;
		}
		schema._traverseSubschema(
			subschema.values,
			newPath,
			newRawPath,
			handlers,
			options
		);
	}*/

	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		if (subschema.keySchemas && subschema.keySchemas[pathComponent]) {
			return subschema.keySchemas[pathComponent];
		}
		return subschema.values;
	}

	getFieldSubschemaForModify(subschema: SubschemaType, field: string, schema: Schema): any | undefined {
		if (subschema.keySchemas && subschema.keySchemas[field]) {
			return subschema.keySchemas[field];
		} else if (field === '$') {
			return subschema.values;
		} else {
			if (!subschema.keySchemas) {
				subschema.keySchemas = {};
			}
			subschema.keySchemas[field] = objtools.deepCopy(subschema.values);
			return subschema.keySchemas[field];
		}
	}

	getFieldSubschemaPath(subschema: SubschemaType, field: string, schema: Schema): string {
		if (subschema.keySchemas && subschema.keySchemas[field]) {
			return 'keySchemas.' + field;
		}
		return 'values';
	}

	listSchemaSubfields(subschema: SubschemaType, schema: Schema): string[] {
		let r: string[] = [ '$' ];
		if (subschema.keySchemas) {
			r.push(...(Object.keys(subschema.keySchemas)));
		}
		return r;
	}

	listValueSubfields(value: any, subschema: SubschemaType, schema: Schema): string[] {
		if (typeof value === 'object' && value) {
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

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		if (!subschema.values) {
			throw new SchemaError('Map schema must have values field');
		}
		subschema.values = schema._normalizeSubschema(subschema.values);
		if (subschema.keySchemas) {
			for (let k in subschema.keySchemas) {
				subschema.keySchemas[k] = schema._normalizeSubschema(subschema.keySchemas[k]);
			}
		}
		return subschema;
	}

/*	traverse(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers, schema: Schema): void {
		for (let prop in value) {
			schema._traverseSubschemaValue(
				value[prop],
				subschema.values,
				field ? (field + '.' + prop) : prop,
				handlers
			);
		}
	}

	transform(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers, schema: Schema): any {
		for (let prop in value) {
			let newValue = schema._transformSubschemaValue(
				value[prop],
				subschema.values,
				field ? (field + '.' + prop) : prop,
				handlers
			);
			if (newValue === undefined) {
				delete value[prop];
			} else {
				value[prop] = newValue;
			}
		}
		return value;
	}

	transformAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers, schema: Schema): Promise<any> {
		return Promise.all(_.map(_.keys(value), function(prop) {
			return schema._transformSubschemaValueAsync(
				value[prop],
				subschema.values,
				field ? (field + '.' + prop) : prop,
				handlers
			).then(function(newValue) {
				if (newValue === undefined) {
					delete value[prop];
				} else {
					value[prop] = newValue;
				}
			});
		})).then( () => value );
	}*/

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (!objtools.isPlainObject(value)) {
			throw new FieldError('invalid_type', 'Must be an object');
		}
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		this.validate(value, subschema, field, options, schema);
		return value;
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		return (objtools.isPlainObject(value) ? 1 : 0);
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return {
			type: 'object',
			patternProperties: {
				'^.*$': schema._subschemaToJSONSchema(subschema.values)
			}
		};
	}

	newEmptyContainer(valueTemplate: any, subschema: SubschemaType, schema: Schema): any {
		return {};
	}
}

export class SchemaTypeOr extends SchemaType {

	constructor(name: string = 'or') {
		super(name || 'or', true, false);
	}

	matchShorthandType(subschema: any): boolean {
		return false;
	}

	traverseSchema(subschema: SubschemaType, path: string, rawPath: string, handlers: SchemaTraverseHandlers, schema: Schema, options: SchemaTraverseOptions): void {
		for (let alt of subschema.alternatives) {
			schema._traverseSubschema(
				alt,
				path,
				rawPath ? (rawPath + '.alternatives.' + alt) : ('alternatives.' + alt),
				handlers,
				options
			);
		}
	}

	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		// We don't have a whole lot of information to go off of here, so just return the
		// first alternative that returns a non-undefined subschema.
		for (let alt of subschema.alternatives) {
			let type = schema._getType(alt.type);
			let altSubcomponent = type.getFieldSubschema(alt, pathComponent, schema);
			if (altSubcomponent !== undefined) {
				return altSubcomponent;
			}
		}
		return undefined;
	}

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		if (!Array.isArray(subschema.alternatives)) {
			throw new SchemaError('Or schema must have alternatives field');
		}
		if (subschema.alternatives.length < 2) {
			throw new SchemaError('Or schema must have at least 2 options');
		}
		for (let i = 0; i < subschema.alternatives.length; i++) {
			subschema.alternatives[i] = schema._normalizeSubschema(subschema.alternatives[i]);
		}
		return subschema;
	}

	traverse(value: any, subschema: SubschemaType, field: string, handlers: TraverseHandlers, schema: Schema): void {
		let altSchema = this._matchAlternative(value, subschema, schema);
		schema._traverseSubschemaValue(
			value,
			altSchema,
			field,
			handlers
		);
	}

	transform(value: any, subschema: SubschemaType, field: string, handlers: TransformHandlers, schema: Schema): any {
		let altSchema = this._matchAlternative(value, subschema, schema);
		let newValue = schema._transformSubschemaValue(
			value,
			altSchema,
			field,
			handlers
		);
		return newValue;
	}

	transformAsync(value: any, subschema: SubschemaType, field: string, handlers: TransformAsyncHandlers, schema: Schema): Promise<any> {
		let altSchema = this._matchAlternative(value, subschema, schema);
		return schema._transformSubschemaValueAsync(
			value,
			altSchema,
			field,
			handlers
		);
	}

	// Returns the subschema that best matches
	_matchAlternative(value: any, subschema: SubschemaType, schema: Schema) {
		// Get types and type match values for each alternative, and group by
		// type match value.
		let alternativesByTypeMatch: { [matchLevel: string]: SubschemaType[] } = {
			0: [],
			1: [],
			2: [],
			3: []
		};
		for (let alt of subschema.alternatives) {
			let type = schema._getType(alt.type);
			let typeMatch = type.checkTypeMatch(value, alt, schema);
			alternativesByTypeMatch[typeMatch].push(alt);
		}
		// Find the best matching alternative.
		let tiebreakers: SubschemaType[];
		for (let i = 3; i > 0; i--) {
			if (alternativesByTypeMatch[i].length === 1) {
				return alternativesByTypeMatch[i][0];
			} else if (alternativesByTypeMatch[i].length >= 2) {
				tiebreakers = alternativesByTypeMatch[i];
				break;
			}
		}
		if (!tiebreakers) {
			// No valid matches found.  Just return the first alternative (alternatives
			// should be listed in order of preference)
			return subschema.alternatives[0];
		}
		// Multiple alternatives match equally well.  Check for any alternatives that
		// strictly validate.
		for (let alt of tiebreakers) {
			try {
				schema._createSubschema(alt).validate(value);
				return alt;
			} catch (ex) {
				if (!ValidationError.isValidationError(ex)) {
					throw ex;
				}
			}
		}
		// Nothing strictly validates, so see if anything will normalize to the alternative.
		for (let alt of tiebreakers) {
			try {
				schema._createSubschema(alt).normalize(objtools.deepCopy(value));
				return alt;
			} catch (ex) {
				if (!ValidationError.isValidationError(ex)) {
					throw ex;
				}
			}
		}
		// Still nothing validates :(  Time for a last resort.
		for (let alt of tiebreakers) {
			try {
				schema._createSubschema(alt).normalize(objtools.deepCopy(value), {
					allowUnknownFields: true
				});
				return alt;
			} catch (ex) {
				if (!ValidationError.isValidationError(ex)) {
					throw ex;
				}
			}
		}
		// Still couldn't find a match.  Give up.
		return tiebreakers[0];
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		// Find the max match value of any of the alternatives
		let maxTypeMatch: 0 | 1 | 2 | 3 = 0;
		for (let alt of subschema.alternatives) {
			let type = schema._getType(alt.type);
			let typeMatch = type.checkTypeMatch(value, alt, schema);
			if (typeMatch > maxTypeMatch) {
				maxTypeMatch = typeMatch;
			}
		}
		return maxTypeMatch;
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		let alternatives = [];

		subschema.alternatives.forEach(function(alternative) {
			alternatives.push(schema._subschemaToJSONSchema(alternative));
		});

		return {
			anyOf: alternatives
		};
	}

}

export class SchemaTypePrimitive extends SchemaType {
	_shorthands: any[];

	constructor(name: string, shorthands: any[] = null) {
		super(name, false);
		this._shorthands = shorthands || [];
	}

	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): any | undefined {
		return undefined;
	}

	matchShorthandType(subschema: any): boolean {
		return this._shorthands.indexOf(subschema) !== -1;
	}

	normalizeShorthandSchema(subschema: any, schema: Schema): SubschemaType {
		return subschema;
	}

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		return subschema;
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		this.normalize(value, subschema, field, options, schema);
	}

}

export class SchemaTypeString extends SchemaTypePrimitive {

	constructor(name: string = 'string') {
		super(name || 'string', [ String ]);
	}

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		subschema = super.normalizeSchema(subschema, schema);
		if (subschema.match instanceof RegExp) {
			subschema.match = subschema.match.toString().slice(1, -1);
		}
		return subschema;
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		let strValue = '' + value;
		if (typeof subschema.maxLength === 'number' && strValue.length > subschema.maxLength) {
			throw new FieldError('too_long', subschema.maxLengthError || 'String is too long');
		}
		if (typeof subschema.minLength === 'number' && strValue.length < subschema.minLength) {
			throw new FieldError('too_short', subschema.minLengthError || 'String is too short');
		}
		if (typeof subschema.match === 'string' && !new RegExp(subschema.match).test(strValue)) {
			throw new FieldError(
				'invalid_format',
				subschema.matchError || 'Invalid format',
				{ regex: subschema.match }
			);
		}
		return strValue;
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (typeof value !== 'string') {
			throw new FieldError('invalid_type', 'Must be a string');
		}
		super.validate(value, subschema, field, options, schema);
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		if (typeof value === 'string') {
			return 3;
		} else if (!value || typeof value !== 'object') {
			return 2;
		} else {
			return 0;
		}
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		let jsonSchema = {
			type: 'string',
			minLength: subschema.minLength,
			maxLength: subschema.maxLength,
			pattern: subschema.match
		};
		for (let key in jsonSchema) {
			if (jsonSchema[key] === undefined) delete jsonSchema[key];
		}
		return jsonSchema;
	}

}

export class SchemaTypeNumber extends SchemaTypePrimitive {

	constructor(name: string = 'number') {
		super(name || 'number', [ Number ]);
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		if (typeof value !== 'number') {
			if (typeof value === 'string') {
				// @ts-ignore
				if (!value || isNaN(value)) {
					throw new FieldError('invalid_type', 'Must be a number');
				}
				value = parseFloat(value);
			} else if (_.isDate(value)) {
				value = value.getTime();
			} else {
				throw new FieldError('invalid_type', 'Must be a number');
			}
		}
		if (typeof subschema.max === 'number' && value > subschema.max) {
			throw new FieldError('too_large', subschema.maxError || 'Too large');
		}
		if (typeof subschema.min === 'number' && value < subschema.min) {
			throw new FieldError('too_small', subschema.minError || 'Too small');
		}
		return value;
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (typeof value !== 'number') {
			throw new FieldError('invalid_type', 'Must be a number');
		}
		super.validate(value, subschema, field, options, schema);
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		if (typeof value === 'number') {
			return 3;
		// @ts-ignore
		} else if (typeof value === 'string' && value && !isNaN(value)) {
			return 2;
		} else {
			return 0;
		}
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		let jsonSchema = {
			type: 'number',
			minimum: subschema.minimum,
			maximum: subschema.maximum
		};
		for (let key in jsonSchema) {
			if (jsonSchema[key] === undefined) delete jsonSchema[key];
		}
		return jsonSchema;
	}

}

export class SchemaTypeDate extends SchemaTypePrimitive {

	constructor(name: string = 'date') {
		super(name || 'date', [ Date ]);
	}

	normalizeSchema(subschema: any, schema: Schema): SubschemaType {
		subschema = super.normalizeSchema(subschema, schema);
		if (subschema.default === Date.now) {
			subschema.default = () => new Date();
		}
		if (subschema.min) {
			subschema.min = this._toDate(subschema.min);
			if (subschema.min === null) {
				throw new SchemaError('Date min must be valid date');
			}
		}
		if (subschema.max) {
			subschema.max = this._toDate(subschema.max);
			if (subschema.max === null) {
				throw new SchemaError('Date max must be valid date');
			}
		}
		return subschema;
	}

	_toDate(value: any): Date {
		if (!_.isDate(value)) {
			if (typeof value === 'string') {
				value = new Date(value);
			} else if (typeof value === 'number') {
				value = new Date(value);
			} else {
				return null;
			}
		}
		if (isNaN(value.getTime())) {
			return null;
		}
		return value;
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		value = this._toDate(value);
		if (value === null) {
			throw new FieldError('invalid_type', 'Must be a date');
		}
		if (subschema.max && value.getTime() > subschema.max.getTime()) {
			throw new FieldError('too_large', subschema.maxError || 'Too large');
		}
		if (subschema.min && value.getTime() < subschema.min.getTime()) {
			throw new FieldError('too_small', subschema.minError || 'Too small');
		}
		return value;
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (!_.isDate(value)) {
			throw new FieldError('invalid_type', 'Must be a date');
		}
		super.validate(value, subschema, field, options, schema);
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		if (_.isDate(value)) {
			return 3;
		} else if (this._toDate(value)) {
			return 2;
		} else {
			return 0;
		}
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return {
			type: 'string',
			pattern: '^\d{4}(-\d\d(-\d\d(T\d\d:\d\d(:\d\d)?(\.\d+)?(([+-]\d\d:\d\d)|Z)?)?)?)?$'
		};
	}

}

export class SchemaTypeBinary extends SchemaTypePrimitive {

	constructor(name: string = 'binary') {
		super(name || 'binary', [ Buffer ]);
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		if (!(value instanceof Buffer)) {
			if (typeof value === 'string') {
				if (/[^a-z0-9+\/=]/i.test(value)) {
					throw new FieldError('invalid_type', 'Must be base64 data');
				}
				value = new Buffer(value, 'base64');
			} else if (Array.isArray(value) && _.every(value, _.isNumber)) {
				value = new Buffer(value);
			} else {
				throw new FieldError('invalid_type', 'Must be binary data');
			}
		}
		if (typeof subschema.maxLength === 'number' && value.length > subschema.maxLength) {
			throw new FieldError('too_long', subschema.maxLengthError || 'Data is too long');
		}
		if (typeof subschema.minLength === 'number' && value.length < subschema.minLength) {
			throw new FieldError('too_short', subschema.minLengthError || 'Data is too short');
		}
		if (options.serialize) {
			value = value.toString('base64');
		}
		return value;
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (!(value instanceof Buffer)) {
			throw new FieldError('invalid_type', 'Must be a buffer');
		}
		super.validate(value, subschema, field, options, schema);
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		if (value instanceof Buffer) {
			return 3;
		} else if (Array.isArray(value) && _.every(value, _.isNumber)) {
			return 2;
		} else if (typeof value === 'string' && !/[^a-z0-9+\/=]/i.test(value)) {
			return 2;
		} else {
			return 0;
		}
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return { type: 'string' };
	}

}

export class SchemaTypeBoolean extends SchemaTypePrimitive {
	trueStringSet: any;
	falseStringSet: any;

	constructor(name: string = 'boolean') {
		super(name || 'boolean', [ Boolean ]);
		this.trueStringSet = {
			'true': 1,
			't': 1,
			'y': 1,
			'yes': 1,
			'1': 1,
			'on': 1,
			'totallydude': 1
		};
		this.falseStringSet = {
			'false': 1,
			'f': 1,
			'n': 1,
			'no': 1,
			'0': 1,
			'off': 1,
			'definitelynot': 1
		};
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		if (value === true || value === false) {
			return value;
		} else if (value === 0 || value === 1) {
			return value === 1;
		} else if (typeof value === 'string') {
			value = value.toLowerCase();
			if (this.trueStringSet[value]) {
				return true;
			}
			if (this.falseStringSet[value]) {
				return false;
			}
		}
		throw new FieldError('invalid_type', 'Must be boolean');
	}

	validate(value: any, subschema: SubschemaType, field: string, options: ValidateOptions, schema: Schema): void {
		if (value !== false && value !== true) {
			throw new FieldError('invalid_type', 'Must be a boolean');
		}
		super.validate(value, subschema, field, options, schema);
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		if (value === true || value === false) {
			return 3;
		} else if (value === 0 || value === 1) {
			return 2;
		} else {
			value = value.toLowerCase();
			if (this.falseStringSet[value] || this.trueStringSet[value]) {
				return 2;
			} else {
				return 0;
			}
		}
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return { type: 'boolean' };
	}

}

export class SchemaTypeMixed extends SchemaTypePrimitive {

	constructor(name: string = 'mixed') {
		super(name || 'mixed', [ Mixed ]);
	}

	getFieldSubschema(subschema: SubschemaType, pathComponent: string, schema: Schema): SubschemaType {
		return {
			type: 'mixed'
		};
	}

	normalize(value: any, subschema: SubschemaType, field: string, options: NormalizeOptions, schema: Schema): any {
		if (subschema.serializeMixed) {
			if (options.serialize) {
				if (typeof value === 'string') {
					throw new FieldError('invalid_type', 'Mixed type value must not be a string');
				}
				return JSON.stringify(value);
			}
			if (typeof value === 'string') {
				try {
					return JSON.parse(value);
				} catch (ex) {
					throw new FieldError('invalid_format', `can't parse string ${value}`);
				}
			}
		}
		return value;
	}

	checkTypeMatch(value: any, subschema: SubschemaType, schema: Schema): 0 | 1 | 2 | 3 {
		return 0;
	}

	toJSONSchema(subschema: SubschemaType, schema: Schema): any {
		return { type: 'string' };
	}

}
