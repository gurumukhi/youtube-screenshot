import * as esbuild from "esbuild";

export async function createEsbuildContext() {
  const ctx = await esbuild.context({
    entryPoints: ["src/background.js"],
    bundle: true,
    format: "esm",
    outfile: "src/background.dist.js",
  });

  return ctx;
}

export async function buildEsbuild()
{
  const ctx = await createEsbuildContext();
  await ctx.rebuild();
  await ctx.dispose();
}
