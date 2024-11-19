import { expect, test, describe } from "bun:test";
import { jsonToValibotSchema } from "../src/jsonToValibotSchema";
import { $ } from "bun";
import { sampleData } from "./data";

test("Converter Test", async () => {
	const result = jsonToValibotSchema(sampleData);
	const testCode = `${result.code}
const sampleJson = ${JSON.stringify(sampleData)};
console.log(JSON.stringify(v.parse(schema, sampleJson)));
    `;
	Bun.write("test.ts", testCode);

	const output = await $`bun test.ts`.text();
	const parsedOutput = JSON.parse(output);
	await $`rm test.ts`;
	expect(parsedOutput).toEqual(sampleData);
});
