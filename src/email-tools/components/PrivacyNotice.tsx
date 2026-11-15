import { ShieldCheck } from 'lucide-react';

export function PrivacyNotice() {
  return (
    <section
      id="privacy-guarantee"
      aria-label="Privacy guarantee"
      className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3.5 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        </div>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-700">
          <strong className="font-semibold text-slate-900">Privacy Guarantee: </strong>
          Extractions and validations are performed locally / securely. No data is sent to or stored
          on our servers for the extraction process. The email validator is completely discreet and
          does not send any messages while testing email addresses.
        </p>
      </div>
    </section>
  );
}
