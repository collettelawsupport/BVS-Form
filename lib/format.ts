import type { IntakeSubmission } from "./validation/intakeSchema";

type NameParts = {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
};

type AddressParts = IntakeSubmission["petitioner"]["residence"];
type ChildBirthplace = IntakeSubmission["children"][number]["birthplace"];

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function formatName(person: NameParts): string {
  return [person.firstName, person.middleName, person.lastName, person.suffix]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

export function formatAddress(address: AddressParts): string {
  const stateZip = [address.state, address.zip].map(clean).filter(Boolean).join(" ");
  const locality = [address.city, stateZip].map(clean).filter(Boolean).join(", ");
  return [address.street, locality].map(clean).filter(Boolean).join(", ");
}

export function formatChildBirthplace(birthplace: ChildBirthplace): string {
  const county = birthplace.county.toLowerCase().includes("county")
    ? birthplace.county
    : `${birthplace.county} County`;

  return [birthplace.city, county, birthplace.state].map(clean).filter(Boolean).join(", ");
}

export function safeFileNamePart(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .toLowerCase();
}
