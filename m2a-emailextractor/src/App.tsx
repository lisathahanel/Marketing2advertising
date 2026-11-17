import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FileImage,
  Globe,
  LayoutGrid,
  MailCheck,
  MailSearch,
  Send,
  Wand2,
} from 'lucide-react';
import { AdSenseUnit } from './components/AdSenseUnit';
import { DomainExtractor } from './components/DomainExtractor';
import { EmailExtractor } from './components/EmailExtractor';
import { EmailFormatter } from './components/EmailFormatter';
import { EmailSender } from './components/EmailSender';
import { EmailValidator } from './components/EmailValidator';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { PrivacyNotice } from './components/PrivacyNotice';
import { extractDomainsFromEmails } from './utils/emailTools';
import {
  isModifiedClick,
  resolveRouteFromLocation,
  ROUTES,
  type ToolRoute,
} from './utils/routes';

const ROUTE_ICONS: Record<ToolRoute, typeof LayoutGrid> = {
  all: LayoutGrid,
  extractor: MailSearch,
  'pdf-jpg': FileImage,
  validator: MailCheck,
  formatter: Wand2,
  domains: Globe,
  sender: Send,
};

export default function App() {
  const [activeRoute, setActiveRoute] = useState(() => resolveRouteFromLocation());
  const [extractedEmails, setExtractedEmails] = useState<string[]>([]);
  const [formattedCount, setFormattedCount] = useState<number>(0);
  const [validatorRequest, setValidatorRequest] = useState<{
    email: string;
    triggerId: number;
  } | null>(null);
  const [bulkValidatorRequest, setBulkValidatorRequest] = useState<{
    emails: string[];
    triggerId: number;
  } | null>(null);
  const validatorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = activeRoute.title;
  }, [activeRoute]);

  useEffect(() => {
    const handlePopState = () => {
      setActiveRoute(resolveRouteFromLocation());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string, options?: { skipScrollTop?: boolean }) => {
    const targetRoute = ROUTES.find((r) => r.path === path) ?? ROUTES[0];
    if (window.location.pathname !== targetRoute.path) {
      window.history.pushState({}, '', targetRoute.path);
    }
    setActiveRoute(targetRoute);
    if (!options?.skipScrollTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const uniqueDomainsCount = useMemo(
    () => extractDomainsFromEmails(extractedEmails).length,
    [extractedEmails]
  );

  const goToValidatorPage = (focusSingleInput = true) => {
    navigateTo('/m2a-emailextractor/validator', { skipScrollTop: true });
    setTimeout(() => {
      validatorContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusSingleInput) {
        setTimeout(() => {
          const input = document.getElementById('validator-email-input') as HTMLInputElement | null;
          input?.focus({ preventScroll: true });
        }, 250);
      }
    }, 40);
  };

  const handleSendToValidator = (email: string) => {
    setValidatorRequest({ email, triggerId: Date.now() });
    goToValidatorPage(true);
  };

  const handleValidateAll = (emails: string[]) => {
    if (emails.length === 0) return;
    setBulkValidatorRequest({ emails, triggerId: Date.now() });
    goToValidatorPage(false);
  };

  const showSection = (section: Exclude<ToolRoute, 'all'>) =>
    activeRoute.id === 'all' || activeRoute.id === section;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F4F6F8] text-slate-900">
      <Header
        currentPath={activeRoute.path}
        onNavigate={(path) => navigateTo(path)}
        onJumpToValidator={() => goToValidatorPage(true)}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        {/* Compact App Hero & Workspace Bar */}
        <section className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Email Extraction, Verification &amp; Bulk Campaign Suite
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Extract unique addresses, normalize messy lists, inspect domains, verify
                deliverability, and send bulk campaigns using your own SMTP or Email API.
              </p>
            </div>

            {/* Live Session Counters (purely real state) */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 tabular-nums shrink-0 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
              <div>
                <span className="block text-slate-400">Extracted</span>
                <strong className="font-mono text-sm font-semibold text-slate-900">
                  {extractedEmails.length}
                </strong>
              </div>
              <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
              <div>
                <span className="block text-slate-400">Domains</span>
                <strong className="font-mono text-sm font-semibold text-slate-900">
                  {uniqueDomainsCount}
                </strong>
              </div>
              <div className="h-6 w-px bg-slate-200" aria-hidden="true" />
              <div>
                <span className="block text-slate-400">Formatted</span>
                <strong className="font-mono text-sm font-semibold text-slate-900">
                  {formattedCount}
                </strong>
              </div>
            </div>
          </div>

          <PrivacyNotice />

          {/* Clean URL Tool Page Switcher */}
          <nav aria-label="Tool pages" className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
            {ROUTES.map((route) => {
              const Icon = ROUTE_ICONS[route.id];
              const active = activeRoute.id === route.id;
              return (
                <a
                  key={route.path}
                  href={route.path}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => {
                    if (!isModifiedClick(e)) {
                      e.preventDefault();
                      navigateTo(route.path);
                    }
                  }}
                  className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {route.label}
                </a>
              );
            })}
          </nav>
        </section>

        {/* Main 2-Column App Workspace: Tools on Left, Sticky Advertisement & Quick Jump Rail on Right */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Primary Tool Workbench (kept mounted with HTML hidden so state persists across pages) */}
          <div className="min-w-0 flex-1 space-y-8 order-2 lg:order-1">
            <div hidden={!showSection('extractor')}>
              <EmailExtractor
                onValidateEmail={handleSendToValidator}
                onValidateAll={handleValidateAll}
                onExtractedChange={setExtractedEmails}
              />
            </div>

            <div hidden={!showSection('pdf-jpg')}>
              <section className="mb-5 rounded-xl border border-sky-200 bg-white p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                    <FileImage className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                      PDF &amp; Image Email Extractor
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
                      Extract email addresses from selectable PDFs, scanned PDF pages, and JPG,
                      JPEG or PNG images. OCR and extraction run locally in your browser; unique
                      results appear in the familiar Email Extractor results panel.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Maximum file size: 25 MB · Up to 30 PDF pages · Duplicate addresses are removed automatically.
                    </p>
                  </div>
                </div>
              </section>
              <EmailExtractor
                onValidateEmail={handleSendToValidator}
                onValidateAll={handleValidateAll}
                onExtractedChange={setExtractedEmails}
              />
            </div>

            <div ref={validatorContainerRef} hidden={!showSection('validator')}>
              <EmailValidator
                externalEmailRequest={validatorRequest}
                externalBulkRequest={bulkValidatorRequest}
                extractedEmails={extractedEmails}
              />
            </div>

            <div hidden={!showSection('formatter')}>
              <EmailFormatter
                extractedEmails={extractedEmails}
                onFormattedCountChange={setFormattedCount}
              />
            </div>

            <div hidden={!showSection('domains')}>
              <DomainExtractor
                extractedEmails={extractedEmails}
                onNavigate={(path) => navigateTo(path)}
              />
            </div>

            <div hidden={!showSection('sender')}>
              <EmailSender extractedEmails={extractedEmails} />
            </div>
          </div>

          {/* Sticky Right Rail: Keeps Advertisement positioned high and visible across every page */}
          <div className="w-full shrink-0 space-y-4 order-1 lg:order-2 lg:w-[290px] xl:w-[310px] lg:sticky lg:top-[76px]">
            <AdSenseUnit />

            <div className="hidden lg:block rounded-xl border border-slate-200/90 bg-white p-4 space-y-3">
              <h2 className="text-xs font-semibold text-slate-900">Tool Pages</h2>
              <div className="divide-y divide-slate-100 text-xs">
                {[
                  { path: '/m2a-emailextractor/extractor', id: 'extractor' as const, name: 'Email Extractor', note: '/m2a-emailextractor/extractor' },
                  { path: '/m2a-emailextractor/pdf-jpg-extractor', id: 'pdf-jpg' as const, name: 'PDF & Image Extractor', note: '/m2a-emailextractor/pdf-jpg-extractor' },
                  { path: '/m2a-emailextractor/validator', id: 'validator' as const, name: 'Address Validator', note: '/m2a-emailextractor/validator' },
                  { path: '/m2a-emailextractor/formatter', id: 'formatter' as const, name: 'Email Formatter', note: '/m2a-emailextractor/formatter' },
                  { path: '/m2a-emailextractor/domains', id: 'domains' as const, name: 'Domain Extractor', note: '/m2a-emailextractor/domains' },
                  { path: '/m2a-emailextractor/sender', id: 'sender' as const, name: 'Bulk Email Sender', note: '/m2a-emailextractor/sender' },
                ].map((item) => (
                  <a
                    key={item.path}
                    href={item.path}
                    aria-current={activeRoute.id === item.id ? 'page' : undefined}
                    onClick={(e) => {
                      if (!isModifiedClick(e)) {
                        e.preventDefault();
                        navigateTo(item.path);
                      }
                    }}
                    className={`flex w-full items-center justify-between py-2 text-left transition-colors ${
                      activeRoute.id === item.id
                        ? 'font-semibold text-sky-700'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="font-mono text-[11px] text-slate-400">{item.note}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer onNavigate={(path) => navigateTo(path)} />
    </div>
  );
}
