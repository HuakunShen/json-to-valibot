import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["./mod.ts"],
	dts: true,
	format: ["cjs", "esm"],
	clean: true
});
