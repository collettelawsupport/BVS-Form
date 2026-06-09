import type { IntakeSubmission } from "./validation/intakeSchema";

export function getIntakeWarnings(submission: Pick<IntakeSubmission, "children">): string[] {
  const warnings: string[] = [];

  if (submission.children.length > 6) {
    warnings.push(
      "More than six children were entered. The generated VS-165 contains the first six children only; staff must attach a continuation form for the remaining children."
    );
  }

  return warnings;
}
