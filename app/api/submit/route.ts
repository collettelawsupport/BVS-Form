import { NextResponse } from "next/server";
import { sendStaffEmail } from "@/lib/email/sendStaffEmail";
import { generateVS165Pdf } from "@/lib/pdf/generateVS165Pdf";
import { intakeSchema } from "@/lib/validation/intakeSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "The submission could not be read. Please try again." },
      { status: 400 }
    );
  }

  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Please review the required information and submit again.",
        errors: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  try {
    const generated = await generateVS165Pdf(parsed.data);
    await sendStaffEmail({
      submission: parsed.data,
      pdfBytes: generated.pdfBytes,
      warnings: generated.warnings
    });

    return NextResponse.json({
      ok: true,
      warnings: generated.warnings
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown submission error.";
    console.error("VS-165 submission failed:", message);
    return NextResponse.json(
      {
        ok: false,
        message:
          "The intake was received but the PDF could not be generated or delivered. Please contact the office."
      },
      { status: 500 }
    );
  }
}
