import { buildEsbuild } from "./common.mjs";
import webExt from "web-ext";

async function buildWebExt() {
  await webExt.cmd.build(
    {
      sourceDir: "src",
      artifactsDir: "build",
      overwriteDest: true,
      filename: "youtube_screenshot_button-{version}.xpi",
    },
    {
      shouldExitProgram: true,
    }
  );
}

await buildEsbuild();
await buildWebExt();
