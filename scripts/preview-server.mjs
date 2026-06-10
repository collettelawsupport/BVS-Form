import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const ROOT = process.cwd();
const TEMPLATE_PATH = path.join(ROOT, "public", "forms", "VS165.pdf");
const OUTPUT_PATH = path.join(ROOT, "outputs", "latest-preview-vs165.pdf");

const SECTION_I_STAFF_ONLY_FIELDS = [
  "1a COUNTY",
  "1b COURT NO",
  "1c CAUSE NO",
  "1d DATE OF ORDER mmddyyyy",
  "Divorce/Annulment without children",
  "Divorce/annulment with children (sections 1, 2 and 3)",
  "ESTABLISHMENT OF COURT OF CONTINUING JURISDICTION (SEC 1 AND 3)",
  "Change in the name of the child (Section 1 and 3)",
  "Transfer of court or continuing jurisdiction (Section 1, 3 and information below)",
  "TRANSFER TO COUNTY",
  "COURT NO",
  "STATE COURT ID"
];

const ATTORNEY_FIELDS = {
  name: "3a NAME OF ATTORNEY FOR PETITIONER",
  phone: "3b TELEPHONE NUMBER including area code",
  mailingAddress: "3c CURRENT MAILING ADDRESS STREET AND NUMBER OR PO BOX CITY STATE ZIP"
};

const EXPECTED_ATTORNEY_VALUES = {
  [ATTORNEY_FIELDS.name]: "Daylene Collette",
  [ATTORNEY_FIELDS.phone]: "903-729-0131",
  [ATTORNEY_FIELDS.mailingAddress]: "600 N. John St., Palestine, TX 75801"
};

const FIELDS = {
  petitioner: {
    name: "4 NAME FIRST MIDDLE LAST SUFFIX",
    maidenName: "5 MAIDEN LAST NAME NAME BEFORE 1ST MARRIAGE",
    placeOfBirth: "6 PLACE OF BIRTH CITY AND STATE OR FOREIGN COUNTRY",
    race: "7 RACE",
    dateOfBirth: "8 DATE OF BIRTH mmddyyyy",
    residence: "9 USUAL RESIDENCE STREET NAME  NUMBER CITY STATE ZIP"
  },
  respondent: {
    name: "10 NAME FIRST MIDDLE LAST SUFFIX",
    maidenName: "11 MAIDEN LAST NAME NAME BEFORE 1ST MARRIAGE",
    placeOfBirth: "12 PLACE OF BIRTH CITY AND STATE OR FOREIGN COUNTRY",
    race: "13 RACE",
    dateOfBirth: "14 DATE OF BIRTH mmddyyyy",
    residence: "15 USUAL RESIDENCE STREET AND NUMBER CITY STATE ZIP"
  },
  marriage: {
    numberOfMinorChildren: "16 NUMBER OF MINOR CHILDREN",
    dateOfMarriage: "17 DATE OF MARRIAGE mmddyyyy",
    placeOfMarriage: "18 PLACE OF MARRIAGE CITY AND STATE OR FOREIGN COUNTRY"
  },
  additionalChildren: "Check here if additional children listed on back of form",
  children: [
    {
      name: "19a CHILD CURRENT NAME FIRST MIDDLE LAST SUFFIX",
      dateOfBirth: "19b DATE OF BIRTH mmddyyyy",
      sex: "19c SEX",
      birthplace: "19d BIRTHPLACE CITY COUNTY AND STATE",
      priorName: "19e PRIOR NAME OF CHILD FIRST MIDDLE LAST SUFFIX  IF APPLICABLE"
    },
    {
      name: "20a CHILD CURRENT NAME FIRST MIDDLE LAST SUFFIX",
      dateOfBirth: "20b DATE OF BIRTH mmddyyyy",
      sex: "20c SEX",
      birthplace: "20d BIRTHPLACE CITY COUNTY AND STATE",
      priorName: "20e PRIOR NAME OF CHILD FIRST MIDDLE LAST SUFFIX  IF APPLICABLE"
    },
    {
      name: "21a CHILD CURRENT NAME FIRST MIDDLE LAST SUFFIX",
      dateOfBirth: "21b DATE OF BIRTH mmddyyyy",
      sex: "21c SEX",
      birthplace: "21d BIRTHPLACE CITY COUNTY AND STATE",
      priorName: "21e PRIOR NAME OF CHILD FIRST MIDDLE LAST SUFFIX  IF APPLICABLE"
    },
    {
      name: "23a CHild current name",
      dateOfBirth: "23b DATE OF BIRTH mmddyyyy",
      sex: "23c SEX",
      birthplace: "23d BIRTHPLACE CITY COUNTY AND STATE",
      priorName: "23e PRIOR NAME OF CHILD FIRST MIDDLE LAST SUFFIX  IF APPLICABLE"
    },
    {
      name: "24a CHILD CURRENT NAME FIRST MIDDLE LAST SUFFIX",
      dateOfBirth: "24b DATE OF BIRTH mmddyyyy",
      sex: "24c SEX",
      birthplace: "24d BIRTHPLACE CITY COUNTY AND STATE",
      priorName: "24e PRIOR NAME OF CHILD FIRST MIDDLE LAST SUFFIX  IF APPLICABLE"
    },
    {
      name: "25a CHILD CURRENT NAME FIRST MIDDLE LAST SUFFIX",
      dateOfBirth: "25b DATE OF BIRTH mmddyyyy",
      sex: "25c SEX",
      birthplace: "25d BIRTHPLACE CITY COUNTY AND STATE",
      priorName: "25e PRIOR NAME OF CHILD FIRST MIDDLE LAST SUFFIX  IF APPLICABLE"
    }
  ]
};

function loadPdfLib() {
  try {
    return require("pdf-lib");
  } catch {
    throw new Error("pdf-lib is not available. Run npm install, or start this preview with NODE_PATH pointing to a pdf-lib installation.");
  }
}

function nameOf(person) {
  return [person.firstName, person.middleName, person.lastName, person.suffix]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
}

function addressOf(address) {
  const stateZip = [address.state, address.zip].map((value) => String(value || "").trim()).filter(Boolean).join(" ");
  const cityStateZip = [address.city, stateZip].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
  return [address.street, cityStateZip].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
}

function childBirthplaceOf(birthplace) {
  const county = String(birthplace.county || "").toLowerCase().includes("county")
    ? birthplace.county
    : `${birthplace.county} County`;
  return [birthplace.city, county, birthplace.state].map((value) => String(value || "").trim()).filter(Boolean).join(", ");
}

function warningsFor(submission) {
  if (submission.children.length > 6) {
    return [
      "More than six children were entered. The generated VS-165 contains the first six children only; staff must attach a continuation form for the remaining children."
    ];
  }
  return [];
}

function validateRequired(submission) {
  const missing = [];
  const check = (label, value) => {
    if (String(value ?? "").trim() === "") missing.push(label);
  };

  for (const party of ["petitioner", "respondent"]) {
    const person = submission[party] || {};
    check(`${party} first name`, person.firstName);
    check(`${party} last name`, person.lastName);
    check(`${party} place of birth`, person.placeOfBirth);
    check(`${party} race`, person.race);
    check(`${party} date of birth`, person.dateOfBirth);
    check(`${party} street address`, person.residence?.street);
    check(`${party} city`, person.residence?.city);
    check(`${party} state`, person.residence?.state);
    check(`${party} ZIP`, person.residence?.zip);
  }

  check("number of minor children", submission.marriage?.numberOfMinorChildren);
  check("date of marriage", submission.marriage?.dateOfMarriage);
  check("place of marriage", submission.marriage?.placeOfMarriage);

  if (submission.childrenAffected && submission.children.length === 0) {
    missing.push("at least one child");
  }

  submission.children.forEach((child, index) => {
    check(`child ${index + 1} first name`, child.firstName);
    check(`child ${index + 1} last name`, child.lastName);
    check(`child ${index + 1} date of birth`, child.dateOfBirth);
    check(`child ${index + 1} sex`, child.sex);
    check(`child ${index + 1} birthplace city`, child.birthplace?.city);
    check(`child ${index + 1} birthplace county`, child.birthplace?.county);
    check(`child ${index + 1} birthplace state`, child.birthplace?.state);
  });

  return missing;
}

async function generatePdf(submission) {
  const { PDFDocument } = loadPdfLib();
  const pdfDoc = await PDFDocument.load(await readFile(TEMPLATE_PATH), { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  const filled = [];
  const setText = (fieldName, value) => {
    const text = String(value ?? "");
    const field = form.getTextField(fieldName);
    field.setText(text);
    field.setFontSize(text.length > 95 ? 6 : text.length > 70 ? 7 : 8);
    filled.push(fieldName);
  };

  setText(FIELDS.petitioner.name, nameOf(submission.petitioner));
  setText(FIELDS.petitioner.maidenName, submission.petitioner.maidenName);
  setText(FIELDS.petitioner.placeOfBirth, submission.petitioner.placeOfBirth);
  setText(FIELDS.petitioner.race, submission.petitioner.race);
  setText(FIELDS.petitioner.dateOfBirth, submission.petitioner.dateOfBirth);
  setText(FIELDS.petitioner.residence, addressOf(submission.petitioner.residence));

  setText(FIELDS.respondent.name, nameOf(submission.respondent));
  setText(FIELDS.respondent.maidenName, submission.respondent.maidenName);
  setText(FIELDS.respondent.placeOfBirth, submission.respondent.placeOfBirth);
  setText(FIELDS.respondent.race, submission.respondent.race);
  setText(FIELDS.respondent.dateOfBirth, submission.respondent.dateOfBirth);
  setText(FIELDS.respondent.residence, addressOf(submission.respondent.residence));

  setText(FIELDS.marriage.numberOfMinorChildren, submission.marriage.numberOfMinorChildren);
  setText(FIELDS.marriage.dateOfMarriage, submission.marriage.dateOfMarriage);
  setText(FIELDS.marriage.placeOfMarriage, submission.marriage.placeOfMarriage);

  FIELDS.children.forEach((childFields, index) => {
    const child = submission.children[index];
    setText(childFields.name, child ? nameOf(child) : "");
    setText(childFields.dateOfBirth, child?.dateOfBirth ?? "");
    setText(childFields.sex, child?.sex ?? "");
    setText(childFields.birthplace, child ? childBirthplaceOf(child.birthplace) : "");
    setText(childFields.priorName, child?.priorName ?? "");
  });

  const additionalChildren = form.getCheckBox(FIELDS.additionalChildren);
  if (submission.children.length > 3) additionalChildren.check();
  else additionalChildren.uncheck();

  for (const [fieldName, expected] of Object.entries(EXPECTED_ATTORNEY_VALUES)) {
    if ((form.getTextField(fieldName).getText() ?? "") !== expected) {
      throw new Error(`Attorney field "${fieldName}" did not match the expected prefilled value.`);
    }
  }

  for (const fieldName of SECTION_I_STAFF_ONLY_FIELDS) {
    const field = form.getField(fieldName);
    if (field.constructor.name === "PDFTextField" && (form.getTextField(fieldName).getText() ?? "") !== "") {
      throw new Error(`Section I field "${fieldName}" was unexpectedly filled.`);
    }
    if (field.constructor.name === "PDFCheckBox" && form.getCheckBox(fieldName).isChecked()) {
      throw new Error(`Section I checkbox "${fieldName}" was unexpectedly checked.`);
    }
  }

  form.updateFieldAppearances();
  const pdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, pdfBytes);
  return { warnings: warningsFor(submission), outputPath: OUTPUT_PATH, fieldCount: form.getFields().length, filled };
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const html = String.raw`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VS-165 Vital Statistics Form Preview</title>
  <style>
    :root { --bg: #f7f7f8; --card: #fff; --text: #20242b; --heading: #252a32; --muted: #667085; --line: #e7d9d5; --input-line: #cfd6e1; --navy: #0b1f3a; --navy-dark: #07172b; --rose: #d89b8c; --rose-deep: #9f5f68; --danger: #b42318; --warn: #fff7f4; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: Arial, Helvetica, sans-serif; line-height: 1.5; }
    .brand-header { color: #fff; background: radial-gradient(circle at 10% 0%, rgba(216,155,140,.16), transparent 28rem), linear-gradient(135deg, var(--navy-dark), var(--navy)); border-bottom: 5px solid var(--rose); }
    .brand-inner { display: flex; width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 26px 0 28px; gap: 22px; align-items: center; }
    .brand-logo { width: 118px; height: 118px; border: 1px solid rgba(216,155,140,.55); border-radius: 8px; background: rgba(255,255,255,.04); object-fit: contain; }
    .brand-kicker { margin: 0 0 4px; color: #f1c5bb; font-size: .82rem; font-weight: 800; text-transform: uppercase; }
    h1 { margin: 0; max-width: 840px; color: #fff; font-size: clamp(2rem, 5vw, 3.05rem); line-height: 1.05; letter-spacing: 0; }
    .brand-subtitle { display: block; margin-top: 8px; color: #f8e7e1; font-size: 1rem; }
    main { width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 56px; }
    h2 { margin: 0 0 14px; color: var(--heading); font-size: 1.22rem; letter-spacing: 0; }
    h3 { margin: 0; font-size: 1rem; letter-spacing: 0; }
    p { color: var(--muted); }
    .eyebrow { margin: 0 0 10px; color: var(--rose-deep); font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
    form { display: grid; gap: 18px; margin-top: 24px; }
    fieldset, .notice { min-width: 0; margin: 0; padding: 22px; border: 1px solid var(--line); border-radius: 8px; background: var(--card); box-shadow: 0 18px 48px rgba(11,31,58,.08); }
    form fieldset:nth-of-type(even) { background: #f7f4f3; }
    .grid { display: grid; gap: 14px; }
    .name-grid { grid-template-columns: minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(88px,.38fr); }
    .two-col { grid-template-columns: repeat(2,minmax(0,1fr)); margin-top: 14px; }
    .three-col { grid-template-columns: minmax(160px,.62fr) minmax(160px,.62fr) minmax(0,1.25fr); }
    .address-grid { grid-template-columns: minmax(0,1.6fr) minmax(0,.9fr) minmax(82px,.34fr) minmax(110px,.42fr); margin-top: 14px; }
    label { display: grid; gap: 6px; min-width: 0; color: var(--muted); font-size: .92rem; font-weight: 700; }
    input, select { width: 100%; min-height: 44px; border: 1px solid var(--input-line); border-radius: 6px; padding: 9px 11px; color: var(--text); background: #fff; font: inherit; }
    input:focus, select:focus, button:focus-visible, a:focus-visible { border-color: var(--rose); outline: none; box-shadow: 0 0 0 3px rgba(216,155,140,.28); }
    em { color: var(--danger); font-style: normal; }
    .row-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 14px; }
    .children { display: grid; gap: 14px; margin-top: 18px; }
    .child { padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.72); }
    .actions { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
    button, a.button { min-height: 42px; border-radius: 6px; font-weight: 800; font: inherit; text-decoration: none; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
    button.primary { border: 1px solid var(--navy); padding: 0 18px; color: #fff; background: var(--navy); }
    button.primary:hover { background: var(--navy-dark); }
    button.secondary, a.button { border: 1px solid rgba(159,95,104,.44); padding: 0 14px; color: var(--navy); background: #fff; }
    button.secondary:hover, a.button:hover { border-color: var(--rose-deep); background: #fff7f4; }
    button.text { border: 0; color: var(--danger); background: transparent; padding: 0 8px; }
    .choice { display: inline-grid; grid-template-columns: repeat(2, minmax(90px,1fr)); gap: 4px; padding: 4px; border: 1px solid rgba(159,95,104,.36); border-radius: 8px; background: #fff; }
    .choice label { position: relative; display: block; }
    .choice input { position: absolute; inset: 0; opacity: 0; }
    .choice span { display: grid; min-height: 38px; place-items: center; border-radius: 6px; color: var(--muted); font-weight: 800; }
    .choice input:checked + span { color: #fff; background: var(--navy); }
    .error { color: #7a1a12; background: #fff0ee; border-color: rgba(180,35,24,.38); }
    .warning { color: var(--rose-deep); background: var(--warn); border-color: rgba(216,155,140,.7); }
    .notice[hidden] { display: none; }
    @media (max-width: 860px) { .brand-inner { align-items: flex-start; } .brand-logo { width: 92px; height: 92px; } .name-grid, .two-col, .three-col, .address-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } .address-grid label:first-child, .three-col label:last-child { grid-column: 1 / -1; } }
    @media (max-width: 620px) { .brand-inner { width: min(100% - 24px,1080px); padding: 20px 0 22px; gap: 14px; } .brand-logo { width: 72px; height: 72px; } h1 { font-size: 1.8rem; } .brand-subtitle { font-size: .92rem; } main { width: min(100% - 24px,1080px); padding-top: 22px; } fieldset, .notice { padding: 16px; } .name-grid, .two-col, .three-col, .address-grid { grid-template-columns: 1fr; } .actions { display: grid; } button.primary, button.secondary, a.button { width: 100%; } }
  </style>
</head>
<body>
  <header class="brand-header">
    <div class="brand-inner">
      <img class="brand-logo" src="/collette-law-logo.png" alt="Collette Law PLLC logo" width="96" height="96">
      <div>
        <p class="brand-kicker">Collette Law</p>
        <h1>VS-165 Vital Statistics Form</h1>
        <span class="brand-subtitle">Information on Suit Affecting the Family Relationship</span>
      </div>
    </div>
  </header>
  <main>
    <p class="eyebrow">Texas VS-165 preview server</p>
    <h2>Vital statistics form information</h2>
    <p>Preview mode generates a fillable PDF locally and skips email delivery. The production Next app uses the same PDF field mapping.</p>
    <div id="notice" class="notice" hidden></div>
    <form id="form">
      <fieldset data-party="petitioner"><h2>Petitioner</h2></fieldset>
      <fieldset data-party="respondent"><h2>Respondent</h2></fieldset>
      <fieldset>
        <h2>Marriage</h2>
        <div class="grid three-col">
          ${field("minorChildren", "Number of minor children", "number", "0")}
          ${field("dateOfMarriage", "Date of marriage", "text", "", "mm/dd/yyyy")}
          ${field("placeOfMarriage", "Place of marriage", "text", "", "City and state or foreign country")}
        </div>
      </fieldset>
      <fieldset>
        <h2>Children affected by this suit</h2>
        <div class="choice" role="radiogroup" aria-label="Children affected">
          <label><input type="radio" name="childrenAffected" value="no" checked><span>No</span></label>
          <label><input type="radio" name="childrenAffected" value="yes"><span>Yes</span></label>
        </div>
        <div class="children" id="children"></div>
        <button type="button" class="secondary" id="addChild">Add child</button>
      </fieldset>
      <div class="actions">
        <p>Required fields are marked with <em>*</em>.</p>
        <button type="submit" class="primary" id="submit">Submit form</button>
      </div>
    </form>
  </main>
  <script>
    const form = document.getElementById("form");
    const notice = document.getElementById("notice");
    const childrenEl = document.getElementById("children");
    const addChildButton = document.getElementById("addChild");

    function input(id, label, options = {}) {
      const required = options.required === false ? "" : "required";
      const placeholder = options.placeholder ? ' placeholder="' + options.placeholder + '"' : "";
      const type = options.type || "text";
      const value = options.value || "";
      return '<label for="' + id + '"><span>' + label + (required ? '<em>*</em>' : '') + '</span><input id="' + id + '" name="' + id + '" type="' + type + '" value="' + value + '"' + placeholder + " " + required + "></label>";
    }

    function renderParty(party, title) {
      const el = document.querySelector('[data-party="' + party + '"]');
      el.innerHTML = '<h2>' + title + '</h2>' +
        '<div class="grid name-grid">' +
        input(party + "First", "First legal name") +
        input(party + "Middle", "Middle name", { required: false }) +
        input(party + "Last", "Last legal name") +
        input(party + "Suffix", "Suffix", { required: false }) +
        '</div><div class="grid two-col">' +
        input(party + "Maiden", "Maiden last name / name before first marriage", { required: false }) +
        input(party + "Birthplace", "Place of birth", { placeholder: "City and state or foreign country" }) +
        input(party + "Race", "Race") +
        input(party + "Dob", "Date of birth", { placeholder: "mm/dd/yyyy" }) +
        '</div><div class="grid address-grid">' +
        input(party + "Street", "Usual residence street address") +
        input(party + "City", "City") +
        input(party + "State", "State", { value: "TX" }) +
        input(party + "Zip", "ZIP") +
        '</div>';
    }

    function childMarkup(index) {
      return '<div class="child" data-child="' + index + '">' +
        '<div class="row-head"><h3>Child ' + (index + 1) + '</h3><button type="button" class="text" data-remove="' + index + '">Remove</button></div>' +
        '<div class="grid name-grid">' +
        input("child" + index + "First", "First legal name") +
        input("child" + index + "Middle", "Middle name", { required: false }) +
        input("child" + index + "Last", "Last legal name") +
        input("child" + index + "Suffix", "Suffix", { required: false }) +
        '</div><div class="grid two-col">' +
        input("child" + index + "Dob", "Date of birth", { placeholder: "mm/dd/yyyy" }) +
        '<label for="child' + index + 'Sex"><span>Sex<em>*</em></span><select id="child' + index + 'Sex" required><option value="">Select</option><option>Female</option><option>Male</option><option>Unknown</option></select></label>' +
        input("child" + index + "BirthCity", "Birthplace city") +
        input("child" + index + "BirthCounty", "Birthplace county") +
        input("child" + index + "BirthState", "Birthplace state", { value: "TX" }) +
        input("child" + index + "Prior", "Prior name of child", { required: false }) +
        '</div></div>';
    }

    function renumberChildren() {
      [...childrenEl.querySelectorAll(".child")].forEach((child, index) => {
        child.dataset.child = String(index);
        child.querySelector("h3").textContent = "Child " + (index + 1);
      });
    }

    function addChild() {
      const index = childrenEl.querySelectorAll(".child").length;
      childrenEl.insertAdjacentHTML("beforeend", childMarkup(index));
      document.querySelector('input[name="childrenAffected"][value="yes"]').checked = true;
    }

    function value(id) {
      return document.getElementById(id).value.trim();
    }

    function party(prefix) {
      return {
        firstName: value(prefix + "First"),
        middleName: value(prefix + "Middle"),
        lastName: value(prefix + "Last"),
        suffix: value(prefix + "Suffix"),
        maidenName: value(prefix + "Maiden"),
        placeOfBirth: value(prefix + "Birthplace"),
        race: value(prefix + "Race"),
        dateOfBirth: value(prefix + "Dob"),
        residence: {
          street: value(prefix + "Street"),
          city: value(prefix + "City"),
          state: value(prefix + "State"),
          zip: value(prefix + "Zip")
        }
      };
    }

    function collect() {
      const childrenAffected = document.querySelector('input[name="childrenAffected"]:checked').value === "yes";
      const children = [...childrenEl.querySelectorAll(".child")].map((childEl) => {
        const sourceIndex = childEl.querySelector("input").id.match(/^child(\d+)/)[1];
        return {
        firstName: value("child" + sourceIndex + "First"),
        middleName: value("child" + sourceIndex + "Middle"),
        lastName: value("child" + sourceIndex + "Last"),
        suffix: value("child" + sourceIndex + "Suffix"),
        dateOfBirth: value("child" + sourceIndex + "Dob"),
        sex: value("child" + sourceIndex + "Sex"),
        birthplace: {
          city: value("child" + sourceIndex + "BirthCity"),
          county: value("child" + sourceIndex + "BirthCounty"),
          state: value("child" + sourceIndex + "BirthState")
        },
        priorName: value("child" + sourceIndex + "Prior")
      };
      });

      return {
        petitioner: party("petitioner"),
        respondent: party("respondent"),
        marriage: {
          numberOfMinorChildren: value("minorChildren"),
          dateOfMarriage: value("dateOfMarriage"),
          placeOfMarriage: value("placeOfMarriage")
        },
        childrenAffected,
        children: childrenAffected ? children : []
      };
    }

    function showNotice(kind, html) {
      notice.hidden = false;
      notice.className = "notice " + kind;
      notice.innerHTML = html;
      notice.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    renderParty("petitioner", "Petitioner");
    renderParty("respondent", "Respondent");
    addChildButton.addEventListener("click", addChild);
    document.querySelectorAll('input[name="childrenAffected"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.value === "yes" && radio.checked && childrenEl.children.length === 0) addChild();
        if (radio.value === "no" && radio.checked) childrenEl.innerHTML = "";
      });
    });
    childrenEl.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove]");
      if (!button) return;
      button.closest(".child").remove();
      renumberChildren();
      if (childrenEl.children.length === 0) document.querySelector('input[name="childrenAffected"][value="no"]').checked = true;
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      document.getElementById("submit").disabled = true;
      showNotice("", "Generating PDF...");
      try {
        const response = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(collect())
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Submission failed.");
        const warnings = result.warnings.length ? "<p><strong>Warning:</strong> " + result.warnings.join("<br>") + "</p>" : "";
        showNotice("warning", "<h2>Submission generated</h2><p>The preview server wrote a fillable PDF locally. Email is skipped in preview mode.</p>" + warnings + '<p><a class="button" href="/download/latest-preview-vs165.pdf" target="_blank" rel="noreferrer">Open generated PDF</a></p>');
      } catch (error) {
        showNotice("error", "<strong>Could not submit:</strong> " + error.message);
      } finally {
        document.getElementById("submit").disabled = false;
      }
    });
  </script>
</body>
</html>`;

function field(id, label, type = "text", value = "", placeholder = "") {
  const place = placeholder ? ` placeholder="${placeholder}"` : "";
  return `<label for="${id}"><span>${label}<em>*</em></span><input id="${id}" name="${id}" type="${type}" value="${value}"${place} required></label>`;
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (request.method === "GET" && url.pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(html);
      return;
    }

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/collette-law-logo.png") {
      const logo = await readFile(path.join(ROOT, "public", "collette-law-logo.png"));
      response.writeHead(200, { "Content-Type": "image/png" });
      response.end(logo);
      return;
    }

    if (request.method === "GET" && url.pathname === "/download/latest-preview-vs165.pdf") {
      const pdf = await readFile(OUTPUT_PATH);
      response.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=latest-preview-vs165.pdf"
      });
      response.end(pdf);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/submit") {
      const submission = await readJson(request);
      const missing = validateRequired(submission);
      if (missing.length > 0) {
        sendJson(response, 400, { ok: false, message: `Missing required fields: ${missing.join(", ")}` });
        return;
      }

      const generated = await generatePdf(submission);
      sendJson(response, 200, {
        ok: true,
        warnings: generated.warnings,
        pdfPath: generated.outputPath,
        fieldCount: generated.fieldCount
      });
      return;
    }

    sendJson(response, 404, { ok: false, message: "Not found" });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown preview server error."
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`VS-165 preview server listening at http://localhost:${PORT}`);
  console.log("Email is skipped in preview mode; generated PDFs are written to outputs/latest-preview-vs165.pdf");
});
