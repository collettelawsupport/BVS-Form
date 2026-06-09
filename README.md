# VS-165 Intake and PDF Workflow

Client-facing intake form for Texas VS-165, "Information on Suit Affecting the Family Relationship (Excluding Adoptions)." The app collects only client-provided information, fills the uploaded VS-165 PDF, keeps the PDF fillable/editable, and emails the completed draft to office staff.

## What This App Does

- Omits Section I court/order fields from the client intake.
- Preserves the attorney fields already present in the source PDF.
- Fills existing AcroForm fields with `pdf-lib` and does not flatten the PDF.
- Marks the "additional children listed on back of form" checkbox when more than three children are entered.
- Fills children 1-6. When more than six children are entered, the generated PDF includes the first six and the email/client confirmation warns staff to attach a continuation form.
- Sends the generated fillable PDF by SMTP using environment variables.
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

4. Update `.env.local` with staff email and SMTP credentials.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Required:

- `STAFF_EMAIL` - office recipient for VS-165 submissions.
- `FROM_EMAIL` - verified sender address.
- `SMTP_HOST` - SMTP server host.
- `SMTP_PORT` - SMTP server port.
- `SMTP_USER` - SMTP username.
- `SMTP_PASS` - SMTP password.

Optional:

- `EMAIL_DRY_RUN=true` - validates and generates the PDF without sending email.

No credentials are hard-coded.

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

The submit route uses the Node runtime because it reads the PDF template and sends SMTP mail. Do not deploy the submit route as an edge function.

## Privacy Notes

The app does not write submissions to a database or local storage on the server. Production logs should not include full personally identifiable information. The API route returns validation or delivery errors without echoing submitted client data.
