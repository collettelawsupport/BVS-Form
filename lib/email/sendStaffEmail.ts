import nodemailer from "nodemailer";
import { formatName, safeFileNamePart } from "../format";
import type { IntakeSubmission } from "../validation/intakeSchema";

type SendStaffEmailInput = {
  submission: IntakeSubmission;
  pdfBytes: Uint8Array;
  warnings: string[];
};

type SendStaffEmailResult = {
  skipped: boolean;
  messageId?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function buildSubject(submission: IntakeSubmission): string {
  return `VS-165 Intake Submission - ${submission.petitioner.lastName} / ${submission.respondent.lastName}`;
}

function buildBody(submission: IntakeSubmission, warnings: string[]): string {
  const lines = [
    "A VS-165 intake submission was received.",
    "",
    `Petitioner: ${formatName(submission.petitioner)}`,
    `Respondent: ${formatName(submission.respondent)}`,
    `Date of marriage: ${submission.marriage.dateOfMarriage}`,
    `Place of marriage: ${submission.marriage.placeOfMarriage}`,
    `Number of minor children reported: ${submission.marriage.numberOfMinorChildren}`,
    `Children affected by this suit: ${submission.childrenAffected ? "Yes" : "No"}`,
    `Children entered in intake: ${submission.children.length}`,
    "",
    "The attached PDF remains fillable. Section I court/order fields were left blank for office staff."
  ];

  if (warnings.length > 0) {
    lines.push("", "Warnings:", ...warnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

export async function sendStaffEmail({
  submission,
  pdfBytes,
  warnings
}: SendStaffEmailInput): Promise<SendStaffEmailResult> {
  const staffEmail = requiredEnv("STAFF_EMAIL");
  const fromEmail = requiredEnv("FROM_EMAIL");

  if (process.env.EMAIL_DRY_RUN === "true") {
    return { skipped: true };
  }

  const host = requiredEnv("SMTP_HOST");
  const port = Number(requiredEnv("SMTP_PORT"));
  const user = requiredEnv("SMTP_USER");
  const pass = requiredEnv("SMTP_PASS");

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("SMTP_PORT must be a valid positive integer.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  const filename = `vs165-${safeFileNamePart(submission.petitioner.lastName)}-${safeFileNamePart(
    submission.respondent.lastName
  )}.pdf`;

  const result = await transporter.sendMail({
    to: staffEmail,
    from: fromEmail,
    subject: buildSubject(submission),
    text: buildBody(submission, warnings),
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf"
      }
    ]
  });

  return { skipped: false, messageId: result.messageId };
}
