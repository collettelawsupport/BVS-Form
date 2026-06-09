export const SECTION_I_STAFF_ONLY_FIELDS = [
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
] as const;

export const ATTORNEY_FIELDS = {
  name: "3a NAME OF ATTORNEY FOR PETITIONER",
  phone: "3b TELEPHONE NUMBER including area code",
  mailingAddress: "3c CURRENT MAILING ADDRESS STREET AND NUMBER OR PO BOX CITY STATE ZIP"
} as const;

export const EXPECTED_ATTORNEY_VALUES = {
  [ATTORNEY_FIELDS.name]: "Daylene Collette",
  [ATTORNEY_FIELDS.phone]: "903-729-0131",
  [ATTORNEY_FIELDS.mailingAddress]: "600 N. John St., Palestine, TX 75801"
} as const;

export const VS165_FIELD_MAPPING = {
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
  additionalChildrenOnBack: "Check here if additional children listed on back of form",
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
} as const;
