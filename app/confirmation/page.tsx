import { BrandHeader } from "@/components/BrandHeader";
import { ConfirmationDetails } from "@/components/ConfirmationDetails";

export default function ConfirmationPage() {
  return (
    <main>
      <BrandHeader
        title="VS-165 Vital Statistics Form"
        subtitle="Information on Suit Affecting the Family Relationship"
      />
      <div className="page-shell confirmation-shell">
        <section className="confirmation-panel" aria-labelledby="confirmation-title">
          <p className="eyebrow">Submission received</p>
          <h2 id="confirmation-title">Thank you</h2>
          <p>
            Your VS-165 information was submitted to the office. Staff will review the fillable PDF
            and complete the remaining court information.
          </p>
          <ConfirmationDetails />
        </section>
      </div>
    </main>
  );
}
