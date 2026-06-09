import { z } from "zod";

const text = (label: string, max = 120) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const optionalText = (max = 120) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    },
    z.string().trim().max(max, `Must be ${max} characters or fewer.`).optional()
  );

export function normalizeUsDateInput(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1800) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
}

const usDate = (label: string) =>
  z
    .string({ required_error: `${label} is required.` })
    .trim()
    .transform((value, ctx) => {
      const normalized = normalizeUsDateInput(value);
      if (!normalized) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be a valid date in mm/dd/yyyy format.`
        });
        return z.NEVER;
      }
      return normalized;
    });

const addressSchema = z.object({
  street: text("Street address", 160),
  city: text("City", 80),
  state: text("State", 40),
  zip: text("ZIP", 20)
});

const partySchema = z.object({
  firstName: text("First name", 80),
  middleName: optionalText(80),
  lastName: text("Last name", 80),
  suffix: optionalText(30),
  maidenName: optionalText(80),
  placeOfBirth: text("Place of birth", 160),
  race: text("Race", 80),
  dateOfBirth: usDate("Date of birth"),
  residence: addressSchema
});

const childSchema = z.object({
  firstName: text("Child first name", 80),
  middleName: optionalText(80),
  lastName: text("Child last name", 80),
  suffix: optionalText(30),
  dateOfBirth: usDate("Child date of birth"),
  sex: text("Child sex", 40),
  birthplace: z.object({
    city: text("Birthplace city", 80),
    county: text("Birthplace county", 80),
    state: text("Birthplace state", 40)
  }),
  priorName: optionalText(160)
});

export const intakeSchema = z
  .object({
    petitioner: partySchema,
    respondent: partySchema,
    marriage: z.object({
      numberOfMinorChildren: z.preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
        z.coerce
          .number({
            required_error: "Number of minor children is required.",
            invalid_type_error: "Number of minor children is required."
          })
          .int("Number of minor children must be a whole number.")
          .min(0, "Number of minor children cannot be negative.")
          .max(99, "Number of minor children must be 99 or fewer.")
      ),
      dateOfMarriage: usDate("Date of marriage"),
      placeOfMarriage: text("Place of marriage", 160)
    }),
    childrenAffected: z.boolean({ required_error: "Choose whether children are affected by this suit." }),
    children: z.array(childSchema).max(20, "Enter no more than 20 children in one submission.")
  })
  .superRefine((submission, ctx) => {
    if (submission.childrenAffected && submission.children.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["children"],
        message: "Add at least one child or choose that no children are affected by this suit."
      });
    }

    if (!submission.childrenAffected && submission.children.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["childrenAffected"],
        message: "Choose yes if child information is included."
      });
    }
  });

export type IntakeSubmission = z.infer<typeof intakeSchema>;
