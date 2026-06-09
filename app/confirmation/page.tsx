import { ConfirmationDetails } from "@/components/ConfirmationDetails";

export default function ConfirmationPage() {
  return (
    <main className="page-shell confirmation-shell">
      <section className="confirmation-panel" aria-labelledby="confirmation-title">
        <p className="eyebrow">Submission received</p>
        <h1 id="confirmation-title">Thank you</h1>
        <p>
          Your intake was submitted to the office. Staff will review the fillable VS-165 PDF and
          complete the remaining court information.
        </p>
        <ConfirmationDetails />
      </section>
    </main>
  );
}
