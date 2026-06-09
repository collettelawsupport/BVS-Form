import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

async function main() {
  const pdfPath = path.resolve(process.argv[2] ?? "public/forms/VS165.pdf");
  const pdfBytes = await readFile(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();

  const fields = form.getFields().map((field) => {
    const type = field.constructor.name;
    let value: string | boolean | string[] | undefined;

    if (type === "PDFTextField") {
      value = form.getTextField(field.getName()).getText() ?? "";
    } else if (type === "PDFCheckBox") {
      value = form.getCheckBox(field.getName()).isChecked();
    } else if (type === "PDFRadioGroup") {
      value = form.getRadioGroup(field.getName()).getSelected();
    } else if (type === "PDFDropdown") {
      value = form.getDropdown(field.getName()).getSelected();
    }

    return {
      name: field.getName(),
      type,
      value
    };
  });

  console.log(JSON.stringify({ pdfPath, pageCount: pdfDoc.getPageCount(), fieldCount: fields.length, fields }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
