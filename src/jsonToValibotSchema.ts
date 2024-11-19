import {
	type BaseSchema,
	object,
	string,
	number,
	boolean,
	array,
	nullable,
	union,
	optional
} from "valibot";
import type { JsonValue } from "./types.ts";

function getUniqueTypes(items: JsonValue[]): Set<string> {
	return new Set(items.map((item) => (item === null ? "null" : typeof item)));
}

function mergeObjectSchemas(objects: Record<string, JsonValue>[]): {
	schema: Record<string, BaseSchema<any, any, any>>;
	code: string[];
} {
	// Collect all possible keys and their nested values
	const allKeys = new Set<string>();
	const valuesByKey: Record<string, JsonValue[]> = {};

	objects.forEach((obj) => {
		Object.entries(obj).forEach(([key, value]) => {
			allKeys.add(key);
			if (!valuesByKey[key]) {
				valuesByKey[key] = [];
			}
			valuesByKey[key].push(value);
		});
	});

	const schemaObject: Record<string, BaseSchema<any, any, any>> = {};
	const codeLines: string[] = [];

	// For each key, check if it's present in all objects
	for (const key of allKeys) {
		const values = valuesByKey[key] || [];
		let isOptional = values.length < objects.length;

		// Check if we have nested objects that need merging
		const nestedObjects = values.filter(
			(v) => v !== null && typeof v === "object" && !Array.isArray(v)
		) as Record<string, JsonValue>[];

		let result;
		if (nestedObjects.length > 0 && nestedObjects.length === values.length) {
			// All values are objects, merge them recursively
			const merged = mergeObjectSchemas(nestedObjects);
			result = {
				schema: object(merged.schema),
				code: `v.object({\n${merged.code.join(",\n")}\n})`
			};
		} else if (values.length === 0) {
			result = jsonToValibotSchema(null);
		} else if (getUniqueTypes(values).size === 1) {
			result = jsonToValibotSchema(values[0]);
		} else {
			result = createUnionSchema(values);
		}

		if (isOptional) {
			schemaObject[key] = optional(result.schema);
			codeLines.push(`  ${key}: v.optional(${result.code})`);
		} else {
			schemaObject[key] = result.schema;
			codeLines.push(`  ${key}: ${result.code}`);
		}
	}

	return { schema: schemaObject, code: codeLines };
}

function createUnionSchema(values: JsonValue[]): {
	schema: BaseSchema<any, any, any>;
	code: string;
} {
	const schemas = values.map((value) => jsonToValibotSchema(value));
	return {
		schema: union(schemas.map((s) => s.schema)),
		code: `v.union([${schemas.map((s) => s.code).join(", ")}])`
	};
}

function handleArray(arr: JsonValue[]): {
	schema: BaseSchema<any, any, any>;
	code: string;
} {
	if (arr.length === 0) {
		return {
			schema: array(string()),
			code: "v.array(v.string())"
		};
	}

	// Check if array contains objects
	const objectItems = arr.filter(
		(item) => item !== null && typeof item === "object" && !Array.isArray(item)
	) as Record<string, JsonValue>[];

	if (objectItems.length > 0 && objectItems.length === arr.length) {
		// All items are objects, merge their schemas
		const { schema, code } = mergeObjectSchemas(objectItems);
		return {
			schema: array(object(schema)),
			code: `v.array(v.object({\n${code.join(",\n")}\n}))`
		};
	}

	// Handle mixed types using union
	const uniqueTypes = getUniqueTypes(arr);
	if (uniqueTypes.size === 1) {
		const result = jsonToValibotSchema(arr[0]);
		return {
			schema: array(result.schema),
			code: `v.array(${result.code})`
		};
	} else {
		return {
			schema: array(createUnionSchema(arr).schema),
			code: `v.array(${createUnionSchema(arr).code})`
		};
	}
}

export function jsonToValibotSchema(json: JsonValue): {
	schema: BaseSchema<any, any, any>;
	code: string;
} {
	if (json === null) {
		return {
			schema: nullable(string()),
			code: "v.nullable(v.string())"
		};
	}

	switch (typeof json) {
		case "string":
			return {
				schema: string(),
				code: "v.string()"
			};
		case "number":
			return {
				schema: number(),
				code: "v.number()"
			};
		case "boolean":
			return {
				schema: boolean(),
				code: "v.boolean()"
			};
		case "object":
			if (Array.isArray(json)) {
				return handleArray(json);
			}

			let { schema, code } = mergeObjectSchemas([json]);

			return {
				schema: object(schema),
				code: `import * as v from "valibot";\nconst schema = v.object({\n${code.join(",\n")}\n})`
			};
		default:
			throw new Error(`Unsupported type: ${typeof json}`);
	}
}
