import { useState } from 'react';
import { X } from 'lucide-react';

type FooterDocKey = 'contact' | 'privacy' | 'disclosure' | 'terms';

interface FooterProps {
  onNavigateHome: () => void;
}

const FOOTER_DOCS: Record<FooterDocKey, { title: string; body: string[] }> = {
  contact: {
    title: 'Contact M2A Free Vpn',
    body: [
      'M2A Free Vpn is maintained and supported by Marketing2Advertising.',
      'For technical support, server node requests, abuse reports, or partnership inquiries, reach our team at marketing2advertising.com.',
    ],
  },
  privacy: {
    title: 'Privacy Policy — Zero-Log Commitment',
    body: [
      'M2A Free Vpn does not log, store, or sell your browsing history, DNS queries, session timestamps, or originating IP addresses.',
      'Diagnostic leak checks (IP header check, WebRTC probe, and DNS latency audit) execute on demand and are never retained on persistent storage.',
      'Preferences such as your favorite exit servers and split-tunneling rules are stored locally inside your own browser storage.',
    ],
  },
  disclosure: {
    title: 'Advertising & Affiliate Disclosure',
    body: [
      'To keep M2A Free Vpn accessible at zero cost across browser, mobile, and PC, this application displays non-intrusive Google AdSense placements.',
      'Ad scripts run independently from your encrypted VPN tunnel settings and do not have access to your WireGuard keys or tunnel payloads.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    body: [
      'By using M2A Free Vpn, you agree to comply with applicable local laws and refrain from abusive network activity including spam, unauthorized intrusion, or denial-of-service traffic.',
      'Service availability, exit node IP addresses, and regional catalog compatibility are provided on a best-effort basis without warranty.',
    ],
  },
};

export function Footer({ onNavigateHome }: FooterProps) {
  const [activeDoc, setActiveDoc] = useState<FooterDocKey | null>(null);

  return (
    <>
      <footer className="mt-auto border-t border-slate-200 bg-white px-5 py-5 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#0E1525] dark:text-slate-400 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-3 sm:flex-row">
          <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onNavigateHome}
              className="font-medium hover:text-slate-900 hover:underline dark:hover:text-slate-100"
            >
              Home
            </button>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setActiveDoc('contact')}
              className="font-medium hover:text-slate-900 hover:underline dark:hover:text-slate-100"
            >
              Contact
            </button>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setActiveDoc('privacy')}
              className="font-medium hover:text-slate-900 hover:underline dark:hover:text-slate-100"
            >
              Privacy
            </button>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setActiveDoc('disclosure')}
              className="font-medium hover:text-slate-900 hover:underline dark:hover:text-slate-100"
            >
              Disclosure
            </button>
            <span aria-hidden="true" className="text-slate-400 dark:text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setActiveDoc('terms')}
              className="font-medium hover:text-slate-900 hover:underline dark:hover:text-slate-100"
            >
              Terms
            </button>
          </nav>

          <div className="text-center sm:text-right">
            <span>Powered by m2a</span>
            <span className="mx-2 text-slate-400 dark:text-slate-600" aria-hidden="true">·</span>
            <span>
              Developed by{' '}
              <a
                href="https://marketing2advertising.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-600 hover:underline dark:text-sky-400"
              >
                marketing2advertising.com
              </a>
            </span>
          </div>
        </div>
      </footer>

      {activeDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-doc-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
              <h2
                id="footer-doc-title"
                className="font-display text-base font-semibold text-slate-900 dark:text-white"
              >
                {FOOTER_DOCS[activeDoc].title}
              </h2>
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                aria-label="Close dialog"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {FOOTER_DOCS[activeDoc].body.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveDoc(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
