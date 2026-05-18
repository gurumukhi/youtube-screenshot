import { createEsbuildContext } from "./common.mjs";
import webExt from "web-ext";

async function startEsbuild() {
  const ctx = await createEsbuildContext();
  await ctx.watch();
  return ctx;
}

async function runWebExt() {
  return await webExt.cmd.run(
    {
      sourceDir: "src",
      startUrl: "https://youtube.com",
    },
    {
      shouldExitProgram: false,
    }
  );
}

async function main() {
  const esbuildCtx = await startEsbuild();
  const webExtRunner = await runWebExt();

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");

    await esbuildCtx.dispose();

    if (webExtRunner?.extensionRunner?.exit) {
      await webExtRunner.extensionRunner.exit();
    }

    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
