import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import sampleSubmission from "./fixtures/sample-submission.json";
import { generateVS165Pdf } from "../lib/pdf/generateVS165Pdf";
import { ATTORNEY_FIELDS, SECTION_I_STAFF_ONLY_FIELDS, VS165_FIELD_MAPPING } from "../lib/pdf/fieldMapping";
import { intakeSchema } from "../lib/validation/intakeSchema";

describe("VS-165 PDF generation", () => {
  it("fills client fields while preserving editable staff fields", async () => {
    const submission = intakeSchema.parse(sampleSubmission);
    const generated = await generateVS165Pdf(submission);
    const pdfDoc = await PDFDocument.load(generated.pdfBytes, { ignoreEncryption: true });
    const form = pdfDoc.getForm();

    expect(form.getTextField(VS165_FIELD_MAPPING.petitioner.name).getText()).toBe(
      "Alex Marie Petitioner"
    );
    expect(form.getTextField(VS165_FIELD_MAPPING.respondent.name).getText()).toBe(
      "Jordan Lee Respondent Jr."
    );
    expect(form.getTextField(VS165_FIELD_MAPPING.marriage.numberOfMinorChildren).getText()).toBe("4");
    expect(form.getCheckBox(VS165_FIELD_MAPPING.additionalChildrenOnBack).isChecked()).toBe(true);

    for (const fieldName of SECTION_I_STAFF_ONLY_FIELDS) {
      const field = form.getField(fieldName);
      if (field.constructor.name === "PDFTextField") {
        expect(form.getTextField(fieldName).getText() ?? "").toBe("");
      }
      if (field.constructor.name === "PDFCheckBox") {
        expect(form.getCheckBox(fieldName).isChecked()).toBe(false);
      }
    }

    expect(form.getTextField(ATTORNEY_FIELDS.name).getText()).toBe("Daylene Collette");
    expect(form.getFields().length).toBeGreaterThan(0);
  });
});
