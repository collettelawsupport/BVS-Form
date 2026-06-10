"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

type AddressDraft = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

type PersonDraft = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  maidenName: string;
  placeOfBirth: string;
  race: string;
  dateOfBirth: string;
  residence: AddressDraft;
};

type ChildDraft = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  dateOfBirth: string;
  sex: string;
  birthplace: {
    city: string;
    county: string;
    state: string;
  };
  priorName: string;
};

type DraftSubmission = {
  petitioner: PersonDraft;
  respondent: PersonDraft;
  marriage: {
    numberOfMinorChildren: string;
    dateOfMarriage: string;
    placeOfMarriage: string;
  };
  childrenAffected: boolean;
  children: ChildDraft[];
};

const emptyAddress = (): AddressDraft => ({
  street: "",
  city: "",
  state: "TX",
  zip: ""
});

const emptyPerson = (): PersonDraft => ({
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  maidenName: "",
  placeOfBirth: "",
  race: "",
  dateOfBirth: "",
  residence: emptyAddress()
});

const emptyChild = (): ChildDraft => ({
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",
  dateOfBirth: "",
  sex: "",
  birthplace: {
    city: "",
    county: "",
    state: "TX"
  },
  priorName: ""
});

const initialForm: DraftSubmission = {
  petitioner: emptyPerson(),
  respondent: emptyPerson(),
  marriage: {
    numberOfMinorChildren: "0",
    dateOfMarriage: "",
    placeOfMarriage: ""
  },
  childrenAffected: false,
  children: []
};

type PartyKey = "petitioner" | "respondent";
type PersonTextField = Exclude<keyof PersonDraft, "residence">;
type AddressField = keyof AddressDraft;
type ChildTextField = Exclude<keyof ChildDraft, "birthplace">;
type ChildBirthplaceField = keyof ChildDraft["birthplace"];

function TextInput({
  id,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  inputMode,
  type = "text",
  autoComplete
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal" | "tel" | "search" | "email" | "url";
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {required && <em aria-hidden="true">*</em>}
      </span>
      <input
        id={id}
        name={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        type={type}
        autoComplete={autoComplete}
      />
    </label>
  );
}

function DateInput(props: Omit<Parameters<typeof TextInput>[0], "placeholder" | "inputMode">) {
  return <TextInput {...props} placeholder="mm/dd/yyyy" inputMode="numeric" />;
}

function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

export function IntakeForm() {
  const router = useRouter();
  const [form, setForm] = useState<DraftSubmission>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continuationWarning = useMemo(
    () =>
      form.children.length > 6
        ? "Only the first six children fit on VS-165. Staff will need a continuation form for the rest."
        : null,
    [form.children.length]
  );

  const setPartyText = (party: PartyKey, field: PersonTextField, value: string) => {
    setForm((current) => ({
      ...current,
      [party]: {
        ...current[party],
        [field]: value
      }
    }));
  };

  const setPartyAddress = (party: PartyKey, field: AddressField, value: string) => {
    setForm((current) => ({
      ...current,
      [party]: {
        ...current[party],
        residence: {
          ...current[party].residence,
          [field]: value
        }
      }
    }));
  };

  const setMarriage = (field: keyof DraftSubmission["marriage"], value: string) => {
    setForm((current) => ({
      ...current,
      marriage: {
        ...current.marriage,
        [field]: value
      }
    }));
  };

  const setChildrenAffected = (value: boolean) => {
    setForm((current) => ({
      ...current,
      childrenAffected: value,
      children: value ? (current.children.length > 0 ? current.children : [emptyChild()]) : []
    }));
  };

  const addChild = () => {
    setForm((current) => ({
      ...current,
      childrenAffected: true,
      children: [...current.children, emptyChild()]
    }));
  };

  const removeChild = (index: number) => {
    setForm((current) => {
      const children = current.children.filter((_, childIndex) => childIndex !== index);
      return {
        ...current,
        children,
        childrenAffected: children.length > 0
      };
    });
  };

  const setChildText = (index: number, field: ChildTextField, value: string) => {
    setForm((current) => ({
      ...current,
      children: current.children.map((child, childIndex) =>
        childIndex === index ? { ...child, [field]: value } : child
      )
    }));
  };

  const setChildBirthplace = (index: number, field: ChildBirthplaceField, value: string) => {
    setForm((current) => ({
      ...current,
      children: current.children.map((child, childIndex) =>
        childIndex === index
          ? {
              ...child,
              birthplace: {
                ...child.birthplace,
                [field]: value
              }
            }
          : child
      )
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const payload = {
      ...form,
      children: form.childrenAffected ? form.children : []
    };

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        setError(result.message ?? "Please check the form and submit again.");
        return;
      }

      window.sessionStorage.setItem("vs165-warnings", JSON.stringify(result.warnings ?? []));
      router.push("/confirmation");
    } catch {
      setError("The form could not be submitted. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit} noValidate={false}>
      {error && (
        <div className="error-block" role="alert">
          {error}
        </div>
      )}

      <fieldset>
        <SectionHeader title="Petitioner" />
        <div className="grid name-grid">
          <TextInput
            id="petitioner-first"
            label="First legal name"
            value={form.petitioner.firstName}
            onChange={(value) => setPartyText("petitioner", "firstName", value)}
            required
            autoComplete="given-name"
          />
          <TextInput
            id="petitioner-middle"
            label="Middle name"
            value={form.petitioner.middleName}
            onChange={(value) => setPartyText("petitioner", "middleName", value)}
            autoComplete="additional-name"
          />
          <TextInput
            id="petitioner-last"
            label="Last legal name"
            value={form.petitioner.lastName}
            onChange={(value) => setPartyText("petitioner", "lastName", value)}
            required
            autoComplete="family-name"
          />
          <TextInput
            id="petitioner-suffix"
            label="Suffix"
            value={form.petitioner.suffix}
            onChange={(value) => setPartyText("petitioner", "suffix", value)}
          />
        </div>
        <div className="grid two-col">
          <TextInput
            id="petitioner-maiden"
            label="Maiden last name / name before first marriage"
            value={form.petitioner.maidenName}
            onChange={(value) => setPartyText("petitioner", "maidenName", value)}
          />
          <TextInput
            id="petitioner-birthplace"
            label="Place of birth"
            value={form.petitioner.placeOfBirth}
            onChange={(value) => setPartyText("petitioner", "placeOfBirth", value)}
            placeholder="City and state or foreign country"
            required
          />
          <TextInput
            id="petitioner-race"
            label="Race"
            value={form.petitioner.race}
            onChange={(value) => setPartyText("petitioner", "race", value)}
            required
          />
          <DateInput
            id="petitioner-dob"
            label="Date of birth"
            value={form.petitioner.dateOfBirth}
            onChange={(value) => setPartyText("petitioner", "dateOfBirth", value)}
            required
          />
        </div>
        <div className="grid address-grid">
          <TextInput
            id="petitioner-street"
            label="Usual residence street address"
            value={form.petitioner.residence.street}
            onChange={(value) => setPartyAddress("petitioner", "street", value)}
            required
            autoComplete="address-line1"
          />
          <TextInput
            id="petitioner-city"
            label="City"
            value={form.petitioner.residence.city}
            onChange={(value) => setPartyAddress("petitioner", "city", value)}
            required
            autoComplete="address-level2"
          />
          <TextInput
            id="petitioner-state"
            label="State"
            value={form.petitioner.residence.state}
            onChange={(value) => setPartyAddress("petitioner", "state", value)}
            required
            autoComplete="address-level1"
          />
          <TextInput
            id="petitioner-zip"
            label="ZIP"
            value={form.petitioner.residence.zip}
            onChange={(value) => setPartyAddress("petitioner", "zip", value)}
            required
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </div>
      </fieldset>

      <fieldset>
        <SectionHeader title="Respondent" />
        <div className="grid name-grid">
          <TextInput
            id="respondent-first"
            label="First legal name"
            value={form.respondent.firstName}
            onChange={(value) => setPartyText("respondent", "firstName", value)}
            required
            autoComplete="given-name"
          />
          <TextInput
            id="respondent-middle"
            label="Middle name"
            value={form.respondent.middleName}
            onChange={(value) => setPartyText("respondent", "middleName", value)}
            autoComplete="additional-name"
          />
          <TextInput
            id="respondent-last"
            label="Last legal name"
            value={form.respondent.lastName}
            onChange={(value) => setPartyText("respondent", "lastName", value)}
            required
            autoComplete="family-name"
          />
          <TextInput
            id="respondent-suffix"
            label="Suffix"
            value={form.respondent.suffix}
            onChange={(value) => setPartyText("respondent", "suffix", value)}
          />
        </div>
        <div className="grid two-col">
          <TextInput
            id="respondent-maiden"
            label="Maiden last name / name before first marriage"
            value={form.respondent.maidenName}
            onChange={(value) => setPartyText("respondent", "maidenName", value)}
          />
          <TextInput
            id="respondent-birthplace"
            label="Place of birth"
            value={form.respondent.placeOfBirth}
            onChange={(value) => setPartyText("respondent", "placeOfBirth", value)}
            placeholder="City and state or foreign country"
            required
          />
          <TextInput
            id="respondent-race"
            label="Race"
            value={form.respondent.race}
            onChange={(value) => setPartyText("respondent", "race", value)}
            required
          />
          <DateInput
            id="respondent-dob"
            label="Date of birth"
            value={form.respondent.dateOfBirth}
            onChange={(value) => setPartyText("respondent", "dateOfBirth", value)}
            required
          />
        </div>
        <div className="grid address-grid">
          <TextInput
            id="respondent-street"
            label="Usual residence street address"
            value={form.respondent.residence.street}
            onChange={(value) => setPartyAddress("respondent", "street", value)}
            required
            autoComplete="address-line1"
          />
          <TextInput
            id="respondent-city"
            label="City"
            value={form.respondent.residence.city}
            onChange={(value) => setPartyAddress("respondent", "city", value)}
            required
            autoComplete="address-level2"
          />
          <TextInput
            id="respondent-state"
            label="State"
            value={form.respondent.residence.state}
            onChange={(value) => setPartyAddress("respondent", "state", value)}
            required
            autoComplete="address-level1"
          />
          <TextInput
            id="respondent-zip"
            label="ZIP"
            value={form.respondent.residence.zip}
            onChange={(value) => setPartyAddress("respondent", "zip", value)}
            required
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </div>
      </fieldset>

      <fieldset>
        <SectionHeader title="Marriage" />
        <div className="grid three-col">
          <TextInput
            id="minor-children"
            label="Number of minor children"
            value={form.marriage.numberOfMinorChildren}
            onChange={(value) => setMarriage("numberOfMinorChildren", value)}
            required
            type="number"
            inputMode="numeric"
          />
          <DateInput
            id="date-of-marriage"
            label="Date of marriage"
            value={form.marriage.dateOfMarriage}
            onChange={(value) => setMarriage("dateOfMarriage", value)}
            required
          />
          <TextInput
            id="place-of-marriage"
            label="Place of marriage"
            value={form.marriage.placeOfMarriage}
            onChange={(value) => setMarriage("placeOfMarriage", value)}
            placeholder="City and state or foreign country"
            required
          />
        </div>
      </fieldset>

      <fieldset>
        <SectionHeader title="Children affected by this suit">
          Add each child whose information should appear on the VS-165.
        </SectionHeader>
        <div className="segmented-control" role="radiogroup" aria-label="Children affected">
          <label>
            <input
              type="radio"
              name="childrenAffected"
              checked={!form.childrenAffected}
              onChange={() => setChildrenAffected(false)}
            />
            <span>No</span>
          </label>
          <label>
            <input
              type="radio"
              name="childrenAffected"
              checked={form.childrenAffected}
              onChange={() => setChildrenAffected(true)}
            />
            <span>Yes</span>
          </label>
        </div>

        {form.childrenAffected && (
          <div className="children-stack">
            {form.children.map((child, index) => (
              <div className="child-panel" key={index}>
                <div className="child-panel-header">
                  <h3>Child {index + 1}</h3>
                  <button type="button" className="text-button" onClick={() => removeChild(index)}>
                    Remove
                  </button>
                </div>
                <div className="grid name-grid">
                  <TextInput
                    id={`child-${index}-first`}
                    label="First legal name"
                    value={child.firstName}
                    onChange={(value) => setChildText(index, "firstName", value)}
                    required
                  />
                  <TextInput
                    id={`child-${index}-middle`}
                    label="Middle name"
                    value={child.middleName}
                    onChange={(value) => setChildText(index, "middleName", value)}
                  />
                  <TextInput
                    id={`child-${index}-last`}
                    label="Last legal name"
                    value={child.lastName}
                    onChange={(value) => setChildText(index, "lastName", value)}
                    required
                  />
                  <TextInput
                    id={`child-${index}-suffix`}
                    label="Suffix"
                    value={child.suffix}
                    onChange={(value) => setChildText(index, "suffix", value)}
                  />
                </div>
                <div className="grid two-col">
                  <DateInput
                    id={`child-${index}-dob`}
                    label="Date of birth"
                    value={child.dateOfBirth}
                    onChange={(value) => setChildText(index, "dateOfBirth", value)}
                    required
                  />
                  <label className="field" htmlFor={`child-${index}-sex`}>
                    <span>
                      Sex<em aria-hidden="true">*</em>
                    </span>
                    <select
                      id={`child-${index}-sex`}
                      value={child.sex}
                      onChange={(event) => setChildText(index, "sex", event.target.value)}
                      required
                    >
                      <option value="">Select</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </label>
                  <TextInput
                    id={`child-${index}-birth-city`}
                    label="Birthplace city"
                    value={child.birthplace.city}
                    onChange={(value) => setChildBirthplace(index, "city", value)}
                    required
                  />
                  <TextInput
                    id={`child-${index}-birth-county`}
                    label="Birthplace county"
                    value={child.birthplace.county}
                    onChange={(value) => setChildBirthplace(index, "county", value)}
                    required
                  />
                  <TextInput
                    id={`child-${index}-birth-state`}
                    label="Birthplace state"
                    value={child.birthplace.state}
                    onChange={(value) => setChildBirthplace(index, "state", value)}
                    required
                  />
                  <TextInput
                    id={`child-${index}-prior-name`}
                    label="Prior name of child"
                    value={child.priorName}
                    onChange={(value) => setChildText(index, "priorName", value)}
                  />
                </div>
              </div>
            ))}

            {continuationWarning && (
              <div className="warning-block" role="status">
                {continuationWarning}
              </div>
            )}

            <button type="button" className="secondary-action" onClick={addChild}>
              Add child
            </button>
          </div>
        )}
      </fieldset>

      <div className="form-actions">
        <p>
          Required fields are marked with <span aria-hidden="true">*</span>.
        </p>
        <button type="submit" className="primary-action" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit form"}
        </button>
      </div>
    </form>
  );
}
