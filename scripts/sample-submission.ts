import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateVS165Pdf } from "../lib/pdf/generateVS165Pdf";
import { intakeSchema } from "../lib/validation/intakeSchema";

async function main() {
  const fixturePath = path.resolve("tests/fixtures/sample-submission.json");
  const outputPath = path.resolve("outputs/sample-vs165-fillable.pdf");
  const raw = await readFile(fixturePath, "utf8");
  const parsed = intakeSchema.parse(JSON.parse(raw));
  const generated = await generateVS165Pdf(parsed);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, generated.pdfBytes);

  console.log(`Wrote ${outputPath}`);
  if (generated.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of generated.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
