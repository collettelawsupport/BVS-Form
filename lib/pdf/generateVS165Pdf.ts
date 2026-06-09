import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { formatAddress, formatChildBirthplace, formatName } from "../format";
import { getIntakeWarnings } from "../intakeWarnings";
import type { IntakeSubmission } from "../validation/intakeSchema";
import { EXPECTED_ATTORNEY_VALUES, VS165_FIELD_MAPPING } from "./fieldMapping";

export type GenerateVS165PdfOptions = {
  templatePath?: string;
};

export type GenerateVS165PdfResult = {
  pdfBytes: Uint8Array;
  warnings: string[];
  filledFields: string[];
};

const DEFAULT_TEMPLATE_PATH = path.join(process.cwd(), "public", "forms", "VS165.pdf");

function pickFontSize(value: string): number {
  if (value.length > 95) return 6;
  if (value.length > 70) return 7;
  return 8;
}

export async function generateVS165Pdf(
  submission: IntakeSubmission,
  options: GenerateVS165PdfOptions = {}
): Promise<GenerateVS165PdfResult> {
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE_PATH;
  const pdfBytes = await readFile(templatePath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const mapping = VS165_FIELD_MAPPING;
  const filledFields: string[] = [];

  const setText = (fieldName: string, value: string | number | undefined) => {
    const textValue = value === undefined ? "" : String(value);
    const field = form.getTextField(fieldName);
    field.setText(textValue);
    field.setFontSize(pickFontSize(textValue));
    filledFields.push(fieldName);
  };

  setText(mapping.petitioner.name, formatName(submission.petitioner));
  setText(mapping.petitioner.maidenName, submission.petitioner.maidenName);
  setText(mapping.petitioner.placeOfBirth, submission.petitioner.placeOfBirth);
  setText(mapping.petitioner.race, submission.petitioner.race);
  setText(mapping.petitioner.dateOfBirth, submission.petitioner.dateOfBirth);
  setText(mapping.petitioner.residence, formatAddress(submission.petitioner.residence));

  setText(mapping.respondent.name, formatName(submission.respondent));
  setText(mapping.respondent.maidenName, submission.respondent.maidenName);
  setText(mapping.respondent.placeOfBirth, submission.respondent.placeOfBirth);
  setText(mapping.respondent.race, submission.respondent.race);
  setText(mapping.respondent.dateOfBirth, submission.respondent.dateOfBirth);
  setText(mapping.respondent.residence, formatAddress(submission.respondent.residence));

  setText(mapping.marriage.numberOfMinorChildren, submission.marriage.numberOfMinorChildren);
  setText(mapping.marriage.dateOfMarriage, submission.marriage.dateOfMarriage);
  setText(mapping.marriage.placeOfMarriage, submission.marriage.placeOfMarriage);

  mapping.children.forEach((childFields, index) => {
    const child = submission.children[index];
    setText(childFields.name, child ? formatName(child) : "");
    setText(childFields.dateOfBirth, child?.dateOfBirth ?? "");
    setText(childFields.sex, child?.sex ?? "");
    setText(childFields.birthplace, child ? formatChildBirthplace(child.birthplace) : "");
    setText(childFields.priorName, child?.priorName ?? "");
  });

  const additionalChildrenCheckbox = form.getCheckBox(mapping.additionalChildrenOnBack);
  if (submission.children.length > 3) {
    additionalChildrenCheckbox.check();
  } else {
    additionalChildrenCheckbox.uncheck();
  }
  filledFields.push(mapping.additionalChildrenOnBack);

  for (const [fieldName, expectedValue] of Object.entries(EXPECTED_ATTORNEY_VALUES)) {
    const currentValue = form.getTextField(fieldName).getText() ?? "";
    if (currentValue !== expectedValue) {
      throw new Error(`Attorney field "${fieldName}" did not match the expected prefilled value.`);
    }
  }

  form.updateFieldAppearances();

  return {
    pdfBytes: await pdfDoc.save({ updateFieldAppearances: false }),
    warnings: getIntakeWarnings(submission),
    filledFields
  };
}
