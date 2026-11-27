import { useEffect } from 'react';
import { X } from 'lucide-react';

export type LegalDocId = 'privacy' | 'terms' | 'affiliate';

interface LegalModalProps {
  doc: LegalDocId | null;
  onSelectDoc: (doc: LegalDocId) => void;
  onClose: () => void;
}

const LEGAL_TABS: { id: LegalDocId; label: string }[] = [
  { id: 'privacy', label: 'Privacy Policy' },
  { id: 'terms', label: 'Terms & Conditions' },
  { id: 'affiliate', label: 'Affiliate Disclosure' },
];

export function LegalModal({ doc, onSelectDoc, onClose }: LegalModalProps) {
  useEffect(() => {
    if (!doc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Legal policies"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-6 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#121215] shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-4">
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#09090B] p-1">
            {LEGAL_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectDoc(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  doc === tab.id
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal notice"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-6 sm:p-8 space-y-5 text-sm leading-relaxed text-zinc-300">
          {doc === 'privacy' && (
            <>
              <div>
                <h2 className="font-display text-2xl font-bold text-zinc-50">
                  Privacy Policy
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  marketing2advertising.com
                </p>
              </div>
              <p>
                This Privacy Policy explains how Marketing2Advertising (M2A)
                handles information when you visit our website or use our apps
                and digital services.
              </p>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Information We Collect
                </h3>
                <p>
                  Depending on how you use our services, information may include
                  details you choose to send us, such as your name or email
                  address when you contact us; basic technical information such
                  as browser type, device information and pages visited; and
                  cookie or similar identifiers used for site functionality,
                  analytics or advertising.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  How Information Is Used
                </h3>
                <p>
                  Information may be used to operate and maintain our services,
                  respond to enquiries, understand site usage, improve content
                  and features, protect the service against abuse, and support
                  advertising where enabled.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Cookies and Advertising
                </h3>
                <p>
                  Our website and third-party partners may use cookies or
                  similar technologies to store preferences, measure performance
                  and deliver or measure advertisements. Google and other
                  advertising partners may use data collected through their
                  technologies in accordance with their own privacy policies and
                  settings. You can manage cookies through your browser settings
                  and, where offered, use the site&apos;s consent choices.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Third-Party Services and Links
                </h3>
                <p>
                  Our services may contain links, embedded content or features
                  provided by third parties. Those providers may collect
                  information under their own privacy policies. We do not
                  control the privacy practices of external websites, so please
                  review their policies before using them.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Data Sharing</h3>
                <p>
                  We do not sell your personal contact information. Information
                  may be processed by service providers that help us operate the
                  website, or disclosed where required by law, to protect rights
                  and safety, or with your direction or consent.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Data Security and Retention
                </h3>
                <p>
                  We take reasonable steps to protect information, but no online
                  service can guarantee absolute security. We retain information
                  only for as long as reasonably needed for the purposes
                  described here, or as required by law.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Your Choices</h3>
                <p>
                  You can choose not to provide optional information, adjust
                  cookie settings in your browser, and use available advertising
                  or consent controls. You may contact us to ask about personal
                  information you have sent directly to us.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Children&apos;s Privacy
                </h3>
                <p>
                  Our services are not intended to knowingly collect personal
                  information from children where parental consent is required.
                  If you believe a child has provided personal information to us,
                  please contact us so we can review the matter.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Changes to This Policy
                </h3>
                <p>
                  We may update this policy as our services or legal
                  requirements change. The current version will be available on
                  this page.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Contact</h3>
                <p>
                  For privacy questions, email{' '}
                  <a
                    href="mailto:m2a@marketing2advertising.com"
                    className="text-rose-400 hover:underline"
                  >
                    m2a@marketing2advertising.com
                  </a>
                </p>
              </section>
            </>
          )}

          {doc === 'terms' && (
            <>
              <div>
                <h2 className="font-display text-2xl font-bold text-zinc-50">
                  Terms &amp; Conditions
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  marketing2advertising.com
                </p>
              </div>
              <p>
                Welcome to Marketing2Advertising (M2A). By accessing or using
                this website, app or related services, you agree to these Terms
                &amp; Conditions. If you do not agree, please discontinue use of
                the service.
              </p>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Use of Our Services
                </h3>
                <p>
                  You agree to use M2A lawfully and responsibly. You must not
                  attempt to disrupt, damage, gain unauthorised access to, or
                  misuse the website, app, accounts, content or infrastructure.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Content and Information
                </h3>
                <p>
                  We aim to provide useful and current information, tools and
                  resources. Content is provided for general informational and
                  educational purposes and may change without notice. We do not
                  guarantee that every item is complete, accurate, available or
                  suitable for every purpose. You are responsible for decisions
                  you make based on information found through M2A.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Third-Party Content and Services
                </h3>
                <p>
                  Some features may link to or rely on third-party websites,
                  apps, streams, advertisements or services. Those services are
                  operated by their respective providers and may have separate
                  terms, availability rules and privacy policies. M2A is not
                  responsible for third-party content or services that it does
                  not control.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Intellectual Property
                </h3>
                <p>
                  Unless otherwise stated, the M2A name, branding, original site
                  design, software and original content are protected by
                  applicable intellectual property laws. You may access and use
                  the service for personal, lawful purposes. You must not copy,
                  republish, sell or commercially exploit our original materials
                  without permission, except where the law allows.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Advertising and Affiliate Links
                </h3>
                <p>
                  The website or app may display advertisements and may contain
                  affiliate links. We may receive advertising revenue or a
                  commission when users interact with certain links or make
                  qualifying purchases. This does not change the price you pay
                  unless the third-party provider states otherwise.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Availability and Changes
                </h3>
                <p>
                  We may modify, suspend or discontinue any part of the service
                  at any time. We do not guarantee uninterrupted or error-free
                  access.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Limitation of Liability
                </h3>
                <p>
                  To the extent permitted by applicable law, M2A is not liable
                  for indirect or consequential loss, loss of data, loss of
                  profits, or issues arising from third-party services or
                  interruptions beyond our reasonable control. Nothing in these
                  terms excludes liability that cannot legally be excluded.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Changes to These Terms
                </h3>
                <p>
                  We may revise these terms from time to time. Continued use of
                  the service after updated terms are posted means you accept
                  the revised terms.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Contact</h3>
                <p>
                  Questions about these terms can be sent to{' '}
                  <a
                    href="mailto:m2a@marketing2advertising.com"
                    className="text-rose-400 hover:underline"
                  >
                    m2a@marketing2advertising.com
                  </a>
                </p>
              </section>
            </>
          )}

          {doc === 'affiliate' && (
            <>
              <div>
                <h2 className="font-display text-2xl font-bold text-zinc-50">
                  Affiliate Disclosure
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  marketing2advertising.com
                </p>
              </div>
              <p>
                Marketing2Advertising (M2A) believes in transparency with our
                readers. Some pages on this website may contain affiliate links
                or sponsored content, and the website or app may display
                third-party advertisements.
              </p>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Affiliate Links</h3>
                <p>
                  Some links are affiliate links. If you click an affiliate link
                  and complete a qualifying purchase, registration or other
                  action, M2A may receive a commission or referral fee at no
                  additional cost to you, unless the offer clearly states
                  otherwise.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Advertising</h3>
                <p>
                  We may use advertising partners, including Google AdSense, to
                  display advertisements. These partners may use cookies or
                  similar technologies to provide, personalise, measure or
                  improve advertising, subject to their policies and your
                  available consent or privacy settings.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Sponsored Content
                </h3>
                <p>
                  Where content is sponsored or otherwise materially supported
                  by a business or partner, we aim to identify that relationship
                  clearly. Opinions and editorial information are intended to
                  remain useful to readers.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">
                  Our Commitment to Readers
                </h3>
                <p>
                  Affiliate relationships and advertising do not require you to
                  buy anything. We encourage you to research products and
                  services, review the provider&apos;s terms, and make decisions
                  that fit your needs. Availability, prices, features and offers
                  are controlled by the relevant provider and may change.
                </p>
              </section>

              <section className="space-y-1.5">
                <h3 className="font-semibold text-zinc-100">Questions</h3>
                <p>
                  If you have questions about this disclosure, contact{' '}
                  <a
                    href="mailto:m2a@marketing2advertising.com"
                    className="text-rose-400 hover:underline"
                  >
                    m2a@marketing2advertising.com
                  </a>
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
