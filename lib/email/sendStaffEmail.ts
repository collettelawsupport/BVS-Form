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
  provider?: "power-automate" | "smtp";
  messageId?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function buildSubject(submission: IntakeSubmission): string {
  return `VS-165 Intake Submission - ${submission.petitioner.lastName} / ${submission.respondent.lastName}`;
}

export function buildBody(submission: IntakeSubmission, warnings: string[]): string {
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

function buildAttachmentFileName(submission: IntakeSubmission): string {
  return `vs165-${safeFileNamePart(submission.petitioner.lastName)}-${safeFileNamePart(
    submission.respondent.lastName
  )}.pdf`;
}

function buildPowerAutomatePayload(
  submission: IntakeSubmission,
  pdfBytes: Uint8Array,
  warnings: string[]
) {
  return {
    submissionType: "VS-165",
    subject: buildSubject(submission),
    body: buildBody(submission, warnings),
    staffEmail: process.env.STAFF_EMAIL ?? "",
    warnings,
    summary: {
      petitioner: formatName(submission.petitioner),
      respondent: formatName(submission.respondent),
      petitionerLastName: submission.petitioner.lastName,
      respondentLastName: submission.respondent.lastName,
      dateOfMarriage: submission.marriage.dateOfMarriage,
      placeOfMarriage: submission.marriage.placeOfMarriage,
      numberOfMinorChildren: submission.marriage.numberOfMinorChildren,
      childrenAffected: submission.childrenAffected,
      childrenEntered: submission.children.length
    },
    attachment: {
      fileName: buildAttachmentFileName(submission),
      contentType: "application/pdf",
      contentBase64: Buffer.from(pdfBytes).toString("base64")
    }
  };
}

async function sendViaPowerAutomate({
  submission,
  pdfBytes,
  warnings
}: SendStaffEmailInput): Promise<SendStaffEmailResult> {
  const webhookUrl = requiredEnv("POWER_AUTOMATE_WEBHOOK_URL");
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (process.env.POWER_AUTOMATE_SHARED_SECRET) {
    headers["x-vs165-secret"] = process.env.POWER_AUTOMATE_SHARED_SECRET;
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(buildPowerAutomatePayload(submission, pdfBytes, warnings))
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Power Automate delivery failed with status ${response.status}: ${responseText.slice(0, 300)}`
    );
  }

  return { skipped: false, provider: "power-automate" };
}

export async function sendStaffEmail({
  submission,
  pdfBytes,
  warnings
}: SendStaffEmailInput): Promise<SendStaffEmailResult> {
  if (process.env.EMAIL_DRY_RUN === "true") {
    return { skipped: true };
  }

  if (process.env.POWER_AUTOMATE_WEBHOOK_URL) {
    return sendViaPowerAutomate({ submission, pdfBytes, warnings });
  }

  const staffEmail = requiredEnv("STAFF_EMAIL");
  const fromEmail = requiredEnv("FROM_EMAIL");
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
    auth: { user, pass }
  });

  const result = await transporter.sendMail({
    to: staffEmail,
    from: fromEmail,
    subject: buildSubject(submission),
    text: buildBody(submission, warnings),
    attachments: [
      {
        filename: buildAttachmentFileName(submission),
        content: Buffer.from(pdfBytes),
        contentType: "application/pdf"
      }
    ]
  });

  return { skipped: false, provider: "smtp", messageId: result.messageId };
}
