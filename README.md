# VS-165 Intake and PDF Workflow

Client-facing intake form for Texas VS-165, "Information on Suit Affecting the Family Relationship (Excluding Adoptions)." The app collects only client-provided information, fills the uploaded VS-165 PDF, keeps the PDF fillable/editable, and emails the completed draft to office staff.

## What This App Does

- Omits Section I court/order fields from the client intake.
- Preserves the attorney fields already present in the source PDF.
- Fills existing AcroForm fields with `pdf-lib` and does not flatten the PDF.
- Marks the "additional children listed on back of form" checkbox when more than three children are entered.
- Fills children 1-6. When more than six children are entered, the generated PDF includes the first six and the email/client confirmation warns staff to attach a continuation form.
- Sends the generated fillable PDF through Power Automate, with SMTP available as a fallback.
- Stores no intake submissions by default.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Confirm the source PDF is present:

   ```bash
   ls public/forms/VS165.pdf
   ```

3. Create an environment file:

   ```bash
   cp .env.example .env.local
   ```

4. Update `.env.local` with staff email and either Power Automate or SMTP settings.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Recommended Power Automate setup:

- `STAFF_EMAIL` - office recipient for VS-165 submissions.
- `POWER_AUTOMATE_WEBHOOK_URL` - HTTP trigger URL for the Power Automate flow.
- `POWER_AUTOMATE_SHARED_SECRET` - optional shared secret sent as the `x-vs165-secret` header.

SMTP fallback, only required when `POWER_AUTOMATE_WEBHOOK_URL` is not set:

- `FROM_EMAIL` - verified sender address.
- `SMTP_HOST` - SMTP server host.
- `SMTP_PORT` - SMTP server port.
- `SMTP_USER` - SMTP username.
- `SMTP_PASS` - SMTP password.

Optional:

- `EMAIL_DRY_RUN=true` - validates and generates the PDF without sending email.

No credentials are hard-coded.

## Power Automate Email Flow

Create a Power Automate cloud flow:

1. Choose **Instant cloud flow**.
2. Use the trigger **When an HTTP request is received**.
3. Paste this JSON schema into the trigger:

   ```json
   {
     "type": "object",
     "properties": {
       "submissionType": { "type": "string" },
       "subject": { "type": "string" },
       "body": { "type": "string" },
       "staffEmail": { "type": "string" },
       "warnings": {
         "type": "array",
         "items": { "type": "string" }
       },
       "summary": {
         "type": "object",
         "properties": {
           "petitioner": { "type": "string" },
           "respondent": { "type": "string" },
           "petitionerLastName": { "type": "string" },
           "respondentLastName": { "type": "string" },
           "dateOfMarriage": { "type": "string" },
           "placeOfMarriage": { "type": "string" },
           "numberOfMinorChildren": { "type": "number" },
           "childrenAffected": { "type": "boolean" },
           "childrenEntered": { "type": "number" }
         }
       },
       "attachment": {
         "type": "object",
         "properties": {
           "fileName": { "type": "string" },
           "contentType": { "type": "string" },
           "contentBase64": { "type": "string" }
         }
       }
     }
   }
   ```

4. Add **Send an email (V2)** from Office 365 Outlook.
5. Set **To** to `staffEmail` from the HTTP trigger, or hard-code your office inbox.
6. Set **Subject** to `subject`.
7. Set **Body** to `body`.
8. For the attachment, set the name to:

   ```text
   attachment/fileName
   ```

9. Set attachment content with this expression:

   ```text
   base64ToBinary(triggerBody()?['attachment']?['contentBase64'])
   ```

10. Save the flow, copy the HTTP POST URL from the trigger, and set it in Netlify as `POWER_AUTOMATE_WEBHOOK_URL`.

If you set `POWER_AUTOMATE_SHARED_SECRET`, add a condition near the top of the flow that checks:

```text
triggerOutputs()?['headers']?['x-vs165-secret']
```

against your secret value before sending the email.

## PDF Field Inspection

List the AcroForm field names in the VS-165 PDF:

```bash
npm run inspect:pdf
```

You can also inspect another PDF:

```bash
npm run inspect:pdf -- /path/to/other.pdf
```

The mapping lives in `lib/pdf/fieldMapping.ts` so staff/developers can adjust field names without changing the form UI or generation workflow.

## Sample PDF Generation

Generate a sample filled, editable PDF without sending email:

```bash
npm run sample
```

The sample output is written to `outputs/sample-vs165-fillable.pdf`.

## Browser Preview Without Email

After dependencies are installed, you can preview the intake flow without sending email:

```bash
npm run preview
```

Then open [http://localhost:3000](http://localhost:3000). Preview mode writes the generated PDF to `outputs/latest-preview-vs165.pdf` and provides a browser link to open it.

## Tests

Run validation and PDF generation checks:

```bash
npm test
```

The PDF test verifies that Section I remains blank, attorney fields remain prefilled, client fields are populated, the additional-children checkbox is marked when applicable, and the output still has AcroForm fields.

## Deployment

Deploy to any Node-capable Next.js host such as Vercel, Netlify with Next support, or a Node server.

1. Commit the app code and `public/forms/VS165.pdf`.
2. Set all required environment variables in the host dashboard.
3. Build with `npm run build`.
4. Start with the host's normal Next.js runtime.

The submit route uses the Node runtime because it reads the PDF template and sends the generated PDF to Power Automate or SMTP. Do not deploy the submit route as an edge function.

## Privacy Notes

The app does not write submissions to a database or local storage on the server. Production logs should not include full personally identifiable information. The API route returns validation or delivery errors without echoing submitted client data.
