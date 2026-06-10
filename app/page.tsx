import { BrandHeader } from "@/components/BrandHeader";
import { IntakeForm } from "@/components/IntakeForm";

export default function HomePage() {
  return (
    <main>
      <BrandHeader
        title="VS-165 Vital Statistics Form"
        subtitle="Information on Suit Affecting the Family Relationship"
      />
      <div className="page-shell">
        <div className="page-heading">
          <p className="eyebrow">Texas VS-165</p>
          <h2>Vital statistics form information</h2>
          <p>
            Complete the client information below. Court, order, transfer, and continuing
            jurisdiction details are completed by office staff after submission.
          </p>
        </div>
        <IntakeForm />
      </div>
    </main>
  );
}
