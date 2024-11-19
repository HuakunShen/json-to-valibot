# json-to-valibot

JSR: https://jsr.io/@hk/json-to-valibot/
NPM: https://www.npmjs.com/package/json-to-valibot

```ts
import { jsonToValibotSchema } from "json-to-valibot";

const schema = jsonToValibotSchema({
	name: "Kun",
	age: 25
});

console.log(schema.code);
```

## Output

```ts
import * as v from "valibot";

export const schema = v.object({
	name: v.string(),
	age: v.number()
});
```
