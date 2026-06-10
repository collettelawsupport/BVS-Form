"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function ConfirmationDetails() {
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("vs165-warnings");
    if (!saved) return;

    try {
      setWarnings(JSON.parse(saved));
      window.sessionStorage.removeItem("vs165-warnings");
    } catch {
      setWarnings([]);
    }
  }, []);

  return (
    <>
      {warnings.length > 0 && (
        <div className="warning-block" role="status">
          <h2>Office follow-up needed</h2>
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}
      <Link className="secondary-action" href="/">
        Start another form
      </Link>
    </>
  );
}
