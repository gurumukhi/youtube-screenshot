import { buildEsbuild } from "./common.mjs";
import webExt from "web-ext";

async function buildWebExt() {
  await webExt.cmd.lint(
    {
      sourceDir: "src",
    },
    {
      shouldExitProgram: true,
    }
  );
}

await buildEsbuild();
await buildWebExt();
