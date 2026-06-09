import { IntakeForm } from "@/components/IntakeForm";

export default function HomePage() {
  return (
    <main className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">Texas VS-165</p>
        <h1>Family relationship suit intake</h1>
        <p>
          Complete the client information below. Court, order, transfer, and continuing jurisdiction
          details are completed by office staff after submission.
        </p>
      </div>
      <IntakeForm />
    </main>
  );
}
