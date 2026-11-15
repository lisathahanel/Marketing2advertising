import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  HelpCircle,
  ListChecks,
  Loader2,
  MailCheck,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  exportValidationResultsCsv,
  parseBulkEmailInputs,
  validateEmailAddress,
  type ValidationResult,
  type ValidationStatus,
} from '../utils/emailTools';

interface EmailValidatorProps {
  externalEmailRequest: { email: string; triggerId: number } | null;
  externalBulkRequest: { emails: string[]; triggerId: number } | null;
  extractedEmails: string[];
}

const STATUS_STYLES: Record<
  ValidationStatus,
  {
    container: string;
    label: string;
    iconBg: string;
    Icon: typeof CheckCircle2;
  }
> = {
  Valid: {
    container: 'border-emerald-200 bg-emerald-50/50',
    label: 'text-emerald-800',
    iconBg: 'bg-emerald-100 text-emerald-700',
    Icon: CheckCircle2,
  },
  Invalid: {
    container: 'border-red-200 bg-red-50/50',
    label: 'text-red-800',
    iconBg: 'bg-red-100 text-red-700',
    Icon: XCircle,
  },
  Unknown: {
    container: 'border-slate-300 bg-slate-100/70',
    label: 'text-slate-800',
    iconBg: 'bg-slate-200 text-slate-700',
    Icon: HelpCircle,
  },
  'Catch-all': {
    container: 'border-amber-200 bg-amber-50/60',
    label: 'text-amber-900',
    iconBg: 'bg-amber-100 text-amber-700',
    Icon: AlertTriangle,
  },
  'Grey-listed': {
    container: 'border-indigo-200 bg-indigo-50/50',
    label: 'text-indigo-900',
    iconBg: 'bg-indigo-100 text-indigo-700',
    Icon: Clock,
  },
  'Role-based': {
    container: 'border-sky-200 bg-sky-50/60',
    label: 'text-sky-900',
    iconBg: 'bg-sky-100 text-sky-700',
    Icon: Users,
  },
};

const QUICK_TEST_SAMPLES: Array<{ label: string; email: string }> = [
  { label: 'Valid', email: 'alex.morgan@gmail.com' },
  { label: 'Role-based', email: 'support@google.com' },
  { label: 'Catch-all', email: 'catchall@example.com' },
  { label: 'Grey-listed', email: 'greylist@outlook.com' },
  { label: 'Unknown', email: 'alex@gmial.com' },
  { label: 'Invalid', email: 'broken-address@nonexistent.invalid' },
];

const BULK_SAMPLE_INPUT = `alex.morgan@gmail.com
support@google.com, catchall@example.com
greylist@outlook.com
alex@gmial.com
broken-address@nonexistent.invalid
tempuser@mailinator.com
sales@microsoft.com`;

export function EmailValidator({
  externalEmailRequest,
  externalBulkRequest,
  extractedEmails,
}: EmailValidatorProps) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single email state
  const [emailInput, setEmailInput] = useState('');
  const [isCheckingSingle, setIsCheckingSingle] = useState(false);
  const [singleResult, setSingleResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<ValidationResult[]>([]);

  // Bulk email state
  const [bulkInput, setBulkInput] = useState('');
  const [isCheckingBulk, setIsCheckingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [bulkResults, setBulkResults] = useState<ValidationResult[]>([]);
  const [bulkFilterQuery, setBulkFilterQuery] = useState('');
  const [bulkStatusFilter, setBulkStatusFilter] = useState<'all' | ValidationStatus>('all');
  const [copiedValid, setCopiedValid] = useState(false);

  const parsedBulkCandidates = useMemo(() => parseBulkEmailInputs(bulkInput), [bulkInput]);

  const runSingleValidation = async (targetEmail: string) => {
    const trimmed = targetEmail.trim();
    if (!trimmed) return;
    setIsCheckingSingle(true);
    const res = await validateEmailAddress(trimmed);
    setSingleResult(res);
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.email !== res.email);
      return [res, ...filtered].slice(0, 10);
    });
    setIsCheckingSingle(false);
  };

  const runBulkValidation = async (candidates: string[]) => {
    if (candidates.length === 0) return;
    setIsCheckingBulk(true);
    setBulkProgress({ done: 0, total: candidates.length });
    setBulkFilterQuery('');
    setBulkStatusFilter('all');

    const results: ValidationResult[] = new Array(candidates.length);
    const batchSize = 4;

    for (let i = 0; i < candidates.length; i += batchSize) {
      const slice = candidates.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        slice.map((candidate) => validateEmailAddress(candidate))
      );
      batchResults.forEach((res, offset) => {
        results[i + offset] = res;
      });
      setBulkProgress({
        done: Math.min(i + slice.length, candidates.length),
        total: candidates.length,
      });
    }

    setBulkResults(results);
    setIsCheckingBulk(false);
  };

  useEffect(() => {
    if (!externalEmailRequest) return;
    setMode('single');
    setEmailInput(externalEmailRequest.email);
    void runSingleValidation(externalEmailRequest.email);
  }, [externalEmailRequest]);

  useEffect(() => {
    if (!externalBulkRequest || externalBulkRequest.emails.length === 0) return;
    setMode('bulk');
    setBulkInput(externalBulkRequest.emails.join('\n'));
    void runBulkValidation(externalBulkRequest.emails);
  }, [externalBulkRequest]);

  const handleSingleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSingleValidation(emailInput);
  };

  const handleBulkSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runBulkValidation(parsedBulkCandidates);
  };

  const handleApplySuggestion = (suggested: string) => {
    setEmailInput(suggested);
    void runSingleValidation(suggested);
  };

  const handleDownloadCsv = (rowsToExport: ValidationResult[], filename: string) => {
    if (rowsToExport.length === 0) return;
    const csvContent = exportValidationResultsCsv(rowsToExport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const bulkStatusCounts = useMemo(() => {
    const counts: Record<ValidationStatus, number> = {
      Valid: 0,
      Invalid: 0,
      Unknown: 0,
      'Catch-all': 0,
      'Grey-listed': 0,
      'Role-based': 0,
    };
    for (const item of bulkResults) {
      counts[item.status]++;
    }
    return counts;
  }, [bulkResults]);

  const filteredBulkResults = useMemo(() => {
    const q = bulkFilterQuery.trim().toLowerCase();
    return bulkResults.filter((item) => {
      if (bulkStatusFilter !== 'all' && item.status !== bulkStatusFilter) return false;
      if (q && !item.email.toLowerCase().includes(q) && !item.status.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [bulkResults, bulkFilterQuery, bulkStatusFilter]);

  const handleCopyValidBulk = async () => {
    const validList = bulkResults
      .filter((r) => r.status === 'Valid')
      .map((r) => r.email);
    if (validList.length === 0) return;
    try {
      await navigator.clipboard.writeText(validList.join('\n'));
      setCopiedValid(true);
      setTimeout(() => setCopiedValid(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const statusMeta = singleResult ? STATUS_STYLES[singleResult.status] : null;
  const StatusIcon = statusMeta?.Icon;

  const activeExportRows =
    mode === 'bulk'
      ? filteredBulkResults.length > 0
        ? filteredBulkResults
        : bulkResults
      : history;

  return (
    <section id="validator" aria-labelledby="validator-heading" className="scroll-mt-20">
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <h2
              id="validator-heading"
              className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
            >
              Email Address Validator
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
              Validate email instantly with our free online email verification tool. Simply enter
              the email address below and get real-time deliverability results. Our free email
              checker ensures proper formatting and verifies the existence of the mailbox,
              confirming its ability to receive emails. The process is completely discreet — we do
              not send any messages while testing email addresses.
            </p>
          </div>

          {/* Mode Toggle + CSV Download */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Validation mode"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1"
            >
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'single'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Single Email
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'bulk'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Bulk Validation
              </button>
            </div>

            <button
              type="button"
              disabled={activeExportRows.length === 0}
              onClick={() =>
                handleDownloadCsv(
                  activeExportRows,
                  mode === 'bulk'
                    ? 'bulk-email-validation-results.csv'
                    : 'email-validation-results.csv'
                )
              }
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Download as CSV
            </button>
          </div>
        </div>

        {/* SINGLE EMAIL MODE */}
        {mode === 'single' ? (
          <>
            <form onSubmit={handleSingleSubmit} className="mt-6">
              <label htmlFor="validator-email-input" className="sr-only">
                Email address to validate
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <input
                  id="validator-email-input"
                  type="text"
                  inputMode="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter an email address (e.g. name@company.com)"
                  className="flex-1 min-h-[46px] rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-2.5 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15"
                />
                <button
                  type="submit"
                  disabled={!emailInput.trim() || isCheckingSingle}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isCheckingSingle ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <MailCheck className="h-4 w-4" aria-hidden="true" />
                      Validate Email
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Clean inline text sample triggers */}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
              <span>Try sample status:</span>
              {QUICK_TEST_SAMPLES.map((sample, idx) => (
                <span key={sample.label} className="inline-flex items-center gap-3">
                  {idx > 0 && (
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(sample.email);
                      void runSingleValidation(sample.email);
                    }}
                    className="font-medium text-slate-700 hover:text-blue-600 hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                  >
                    {sample.label}
                  </button>
                </span>
              ))}
            </div>

            {/* Single Validation Result Panel */}
            {singleResult && statusMeta && StatusIcon && (
              <div
                aria-live="polite"
                className={`mt-6 rounded-xl border p-5 sm:p-6 transition-colors ${statusMeta.container}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${statusMeta.iconBg}`}
                    >
                      <StatusIcon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className={`text-lg font-bold tracking-tight ${statusMeta.label}`}>
                          {singleResult.status}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">
                          ·
                        </span>
                        <span className="font-mono text-sm font-medium text-slate-800 break-all">
                          {singleResult.email}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        {singleResult.summary}
                      </p>

                      {singleResult.suggestion && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-slate-700">Did you mean:</span>
                          <button
                            type="button"
                            onClick={() => handleApplySuggestion(singleResult.suggestion!)}
                            className="font-mono text-sm font-semibold text-blue-700 underline underline-offset-4 hover:text-blue-800 cursor-pointer"
                          >
                            {singleResult.suggestion}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-xs text-slate-500 tabular-nums">
                    Checked at {singleResult.checkedAt}
                  </div>
                </div>

                {/* Diagnostic Breakdown */}
                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200/80 pt-4 md:grid-cols-3">
                  {singleResult.checks.map((check) => (
                    <div key={check.label} className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                        {check.passed === true && (
                          <CheckCircle2
                            className="h-3.5 w-3.5 text-emerald-600"
                            aria-hidden="true"
                          />
                        )}
                        {check.passed === false && (
                          <XCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />
                        )}
                        {check.passed === 'warning' && (
                          <ShieldAlert
                            className="h-3.5 w-3.5 text-amber-600"
                            aria-hidden="true"
                          />
                        )}
                        {check.passed === 'neutral' && (
                          <HelpCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                        )}
                        <span>{check.label}</span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600">{check.detail}</p>
                    </div>
                  ))}
                </div>

                {singleResult.mxRecords.length > 0 && (
                  <div className="mt-4 border-t border-slate-200/80 pt-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">MX Hosts: </span>
                    <span className="font-mono">{singleResult.mxRecords.slice(0, 3).join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Recent Single Checks in Session */}
            {history.length > 1 && (
              <div className="mt-6 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-500">
                    Validated History ({history.length} checked)
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv(history, 'email-validation-history.csv')}
                    className="text-xs font-medium text-blue-600 hover:underline underline-offset-4 cursor-pointer"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {history.map((item) => {
                    const meta = STATUS_STYLES[item.status];
                    const ItemIcon = meta.Icon;
                    return (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() => {
                          setEmailInput(item.email);
                          setSingleResult(item);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <span className="truncate font-mono text-slate-800">{item.email}</span>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 font-medium ${meta.label}`}
                        >
                          <ItemIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {item.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* BULK EMAIL VALIDATION MODE */
          <div className="mt-6 space-y-6">
            <form onSubmit={handleBulkSubmit} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="validator-bulk-input"
                  className="text-sm font-semibold text-slate-800"
                >
                  Bulk Email Addresses (comma, semicolon, or newline separated)
                </label>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-mono text-slate-500 tabular-nums">
                    {parsedBulkCandidates.length} unique address
                    {parsedBulkCandidates.length === 1 ? '' : 'es'} ready
                  </span>
                  <button
                    type="button"
                    onClick={() => setBulkInput(BULK_SAMPLE_INPUT)}
                    className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-blue-600 hover:underline underline-offset-4 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                    Load Sample List
                  </button>
                  {extractedEmails.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setBulkInput(extractedEmails.join('\n'))}
                      className="font-medium text-blue-600 hover:underline underline-offset-4 cursor-pointer"
                    >
                      Import {extractedEmails.length} Extracted Email
                      {extractedEmails.length === 1 ? '' : 's'}
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id="validator-bulk-input"
                rows={6}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Paste multiple email addresses separated by commas or new lines..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 font-mono text-sm leading-relaxed text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="submit"
                    disabled={parsedBulkCandidates.length === 0 || isCheckingBulk}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer whitespace-nowrap"
                  >
                    {isCheckingBulk ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Validating {bulkProgress.done} / {bulkProgress.total}...
                      </>
                    ) : (
                      <>
                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                        Validate All Emails
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={!bulkInput && bulkResults.length === 0}
                    onClick={() => {
                      setBulkInput('');
                      setBulkResults([]);
                      setBulkFilterQuery('');
                      setBulkStatusFilter('all');
                    }}
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    Clear
                  </button>
                </div>

                {bulkResults.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyValidBulk}
                      disabled={bulkStatusCounts.Valid === 0}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                    >
                      {copiedValid ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                          Copied Valid
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                          Copy Valid ({bulkStatusCounts.Valid})
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadCsv(filteredBulkResults, 'bulk-email-validation-results.csv')
                      }
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                    >
                      <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      Download as CSV
                    </button>
                  </div>
                )}
              </div>
            </form>

            {/* Bulk Tabular Results */}
            {bulkResults.length > 0 && (
              <div className="border-t border-slate-200 pt-5 space-y-4" aria-live="polite">
                {/* Summary strip + filter controls */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 tabular-nums">
                    <span>
                      <strong className="font-semibold text-slate-900">{bulkResults.length}</strong>{' '}
                      validated
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-emerald-700 font-medium">
                      {bulkStatusCounts.Valid} Valid
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-sky-700 font-medium">
                      {bulkStatusCounts['Role-based']} Role-based
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-amber-700 font-medium">
                      {bulkStatusCounts['Catch-all']} Catch-all
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-indigo-700 font-medium">
                      {bulkStatusCounts['Grey-listed']} Grey-listed
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-700 font-medium">
                      {bulkStatusCounts.Unknown} Unknown
                    </span>
                    <span className="text-slate-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-red-700 font-medium">
                      {bulkStatusCounts.Invalid} Invalid
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <input
                        type="search"
                        value={bulkFilterQuery}
                        onChange={(e) => setBulkFilterQuery(e.target.value)}
                        placeholder="Search results..."
                        aria-label="Search bulk validation results"
                        className="w-full sm:w-48 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                      />
                    </div>
                    <select
                      aria-label="Filter by validation status"
                      value={bulkStatusFilter}
                      onChange={(e) =>
                        setBulkStatusFilter(e.target.value as 'all' | ValidationStatus)
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Valid">Valid</option>
                      <option value="Role-based">Role-based</option>
                      <option value="Catch-all">Catch-all</option>
                      <option value="Grey-listed">Grey-listed</option>
                      <option value="Unknown">Unknown</option>
                      <option value="Invalid">Invalid</option>
                    </select>
                  </div>
                </div>

                {/* Clean Tabular Results Grid */}
                <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th scope="col" className="w-12 py-2.5 pl-3.5 pr-2 font-semibold text-right">
                          #
                        </th>
                        <th scope="col" className="py-2.5 px-3 font-semibold">
                          Email Address
                        </th>
                        <th scope="col" className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          Status
                        </th>
                        <th scope="col" className="py-2.5 px-3 font-semibold hidden md:table-cell">
                          MX Host / Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredBulkResults.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-xs text-slate-500">
                            No validation rows match your current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredBulkResults.map((row, index) => {
                          const meta = STATUS_STYLES[row.status];
                          const RowIcon = meta.Icon;
                          return (
                            <tr key={row.email} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 pl-3.5 pr-2 text-right font-mono text-slate-400 tabular-nums">
                                {index + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-sm text-slate-900 break-all">
                                {row.email}
                                {row.suggestion && (
                                  <span className="block font-sans text-xs text-blue-700 mt-0.5">
                                    Did you mean{' '}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMode('single');
                                        setEmailInput(row.suggestion!);
                                        void runSingleValidation(row.suggestion!);
                                      }}
                                      className="font-mono font-semibold underline underline-offset-2 cursor-pointer"
                                    >
                                      {row.suggestion}
                                    </button>
                                    ?
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 font-semibold ${meta.label}`}
                                >
                                  <RowIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 hidden md:table-cell">
                                {row.mxRecords.length > 0 ? (
                                  <span className="font-mono text-xs text-slate-700">
                                    {row.mxRecords[0]}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">{row.summary}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
