import * as fs from "fs";
import * as path from "path";

function findBuildInfoFor(sourceSuffix: string) {
  const dir = path.join(process.cwd(), "artifacts", "build-info");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const full = path.join(dir, f);
    const json = JSON.parse(fs.readFileSync(full, "utf-8"));
    const sources = Object.keys(json.input?.sources || {});
    if (sources.some((s) => s.endsWith(sourceSuffix))) {
      return json;
    }
  }
  throw new Error(`Build info not found for ${sourceSuffix}`);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log(
      "Usage: npx ts-node scripts/exportStandardJson.ts <sourcePath or ContractName>\n" +
        "Examples:\n  src/ResourceNFT1155.sol\n  ResourceNFT1155\n"
    );
    process.exit(1);
  }

  const suffix = arg.endsWith(".sol") ? arg : path.posix.join("src", `${arg}.sol`);
  const info = findBuildInfoFor(suffix);
  const outDir = path.join(process.cwd(), "verify");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, path.basename(suffix).replace(/\.sol$/, ".standard-input.json"));
  fs.writeFileSync(outFile, JSON.stringify(info.input, null, 2));
  console.log(`Standard JSON input written to ${outFile}`);
}

main();

