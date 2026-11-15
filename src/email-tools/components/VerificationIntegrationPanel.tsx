import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Plug,
  ShieldCheck,
  Square,
  Trash2,
  XCircle,
} from 'lucide-react';

export type VerificationProviderId =
  | 'zerobounce'
  | 'hunter'
  | 'neverbounce'
  | 'kickbox'
  | 'abstract'
  | 'myemailverifier'
  | 'custom';

export type VerificationVerdict =
  | 'Valid'
  | 'Invalid'
  | 'Catch-all'
  | 'Risky'
  | 'Role-based'
  | 'Unknown'
  | 'Error';

export interface ListVerificationEntry {
  email: string;
  verdict: VerificationVerdict;
  rawStatus: string;
  detail: string;
  safeToSend: boolean;
}

export const VERIFICATION_PROVIDERS: Record<
  VerificationProviderId,
  { label: string; keyHint: string; docsEndpoint: string }
> = {
  zerobounce: {
    label: 'ZeroBounce',
    keyHint: 'Enter your ZeroBounce API key',
    docsEndpoint: 'https://api.zerobounce.net/v2/validate',
  },
  hunter: {
    label: 'Hunter.io',
    keyHint: 'Enter your Hunter API key',
    docsEndpoint: 'https://api.hunter.io/v2/email-verifier',
  },
  neverbounce: {
    label: 'NeverBounce',
    keyHint: 'Enter your NeverBounce API key (secret_...)',
    docsEndpoint: 'https://api.neverbounce.com/v4/single/check',
  },
  kickbox: {
    label: 'Kickbox',
    keyHint: 'Enter your Kickbox API key (live_... or test_...)',
    docsEndpoint: 'https://api.kickbox.com/v2/verify',
  },
  abstract: {
    label: 'AbstractAPI',
    keyHint: 'Enter your Abstract Email Validation API key',
    docsEndpoint: 'https://emailvalidation.abstractapi.com/v1/',
  },
  myemailverifier: {
    label: 'MyEmailVerifier',
    keyHint: 'Enter your MyEmailVerifier API key',
    docsEndpoint: 'https://client.myemailverifier.com/verifier/validate_single/',
  },
  custom: {
    label: 'Custom Verification API',
    keyHint: 'Enter API key / Bearer token (optional if embedded in URL)',
    docsEndpoint: 'https://your-verifier.example.com/verify?email={email}&apiKey={apiKey}',
  },
};

interface VerificationIntegrationPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  provider: VerificationProviderId;
  onProviderChange: (provider: VerificationProviderId) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  customEndpoint: string;
  onCustomEndpointChange: (url: string) => void;
  skipUndeliverableOnSend: boolean;
  onSkipUndeliverableChange: (skip: boolean) => void;
  recipients: Array<{ email: string; name: string }>;
  resultsByEmail: Record<string, ListVerificationEntry>;
  onResultsChange: (next: Record<string, ListVerificationEntry>) => void;
  onRemoveUndeliverable: (emailsToRemove: Set<string>) => void;
}

export function VerificationIntegrationPanel({
  isOpen,
  onToggleOpen,
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  customEndpoint,
  onCustomEndpointChange,
  skipUndeliverableOnSend,
  onSkipUndeliverableChange,
  recipients,
  resultsByEmail,
  onResultsChange,
  onRemoveUndeliverable,
}: VerificationIntegrationPanelProps) {
  const [showKey, setShowKey] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [panelError, setPanelError] = useState<string | null>(null);
  const stopRef = useRef(false);

  const verifiedList = useMemo(() => {
    return recipients
      .map((r) => resultsByEmail[r.email.toLowerCase()])
      .filter((entry): entry is ListVerificationEntry => Boolean(entry));
  }, [recipients, resultsByEmail]);

  const counts = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    let riskyOrCatchAll = 0;
    let unknown = 0;

    for (const row of verifiedList) {
      if (row.verdict === 'Valid' || row.verdict === 'Role-based') valid++;
      else if (row.verdict === 'Invalid') invalid++;
      else if (row.verdict === 'Catch-all' || row.verdict === 'Risky') riskyOrCatchAll++;
      else unknown++;
    }
    return { valid, invalid, riskyOrCatchAll, unknown };
  }, [verifiedList]);

  const undeliverableSet = useMemo(() => {
    const set = new Set<string>();
    for (const row of verifiedList) {
      if (row.verdict === 'Invalid' || row.verdict === 'Risky') {
        set.add(row.email.toLowerCase());
      }
    }
    return set;
  }, [verifiedList]);

  const handleRunVerification = async () => {
    setPanelError(null);
    if (recipients.length === 0) {
      setPanelError('Add at least one recipient in Step 02 before running deliverability checks.');
      return;
    }
    if (provider !== 'custom' && !apiKey.trim()) {
      setPanelError(`Enter your ${VERIFICATION_PROVIDERS[provider].label} API key first.`);
      return;
    }
    if (provider === 'custom' && !customEndpoint.trim()) {
      setPanelError('Enter a valid HTTPS Custom Verification API URL.');
      return;
    }

    setIsVerifying(true);
    setProgressIndex(0);
    stopRef.current = false;

    const updatedMap: Record<string, ListVerificationEntry> = { ...resultsByEmail };

    for (let i = 0; i < recipients.length; i++) {
      if (stopRef.current) break;
      const email = recipients[i].email.toLowerCase();
      setProgressIndex(i + 1);

      try {
        const res = await fetch(`${import.meta.env.VITE_EMAIL_API_BASE || ''}/api/campaign/verify-recipient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider,
            apiKey: apiKey.trim(),
            customEndpoint: provider === 'custom' ? customEndpoint.trim() : undefined,
            email,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          deliverability?: VerificationVerdict;
          rawStatus?: string;
          detail?: string;
          safeToSend?: boolean;
          error?: string;
        };

        if (data.ok && data.deliverability) {
          updatedMap[email] = {
            email,
            verdict: data.deliverability,
            rawStatus: data.rawStatus ?? data.deliverability,
            detail: data.detail ?? 'Verified',
            safeToSend: Boolean(data.safeToSend),
          };
        } else {
          updatedMap[email] = {
            email,
            verdict: 'Error',
            rawStatus: 'error',
            detail: data.error ?? 'Provider check failed',
            safeToSend: true,
          };
          // Abort loop immediately if API key is invalid / unauthorized
          if (
            res.status === 400 ||
            /invalid api|unauthorized|forbidden|key/i.test(data.error ?? '')
          ) {
            setPanelError(data.error ?? 'Verification provider rejected the API key.');
            onResultsChange({ ...updatedMap });
            break;
          }
        }
      } catch {
        updatedMap[email] = {
          email,
          verdict: 'Error',
          rawStatus: 'network_error',
          detail: 'Unable to reach verification proxy',
          safeToSend: true,
        };
      }

      onResultsChange({ ...updatedMap });

      if (i < recipients.length - 1 && !stopRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }
    }

    setIsVerifying(false);
  };

  const handleExportCsv = () => {
    if (verifiedList.length === 0) return;
    const rows = [
      'Email,Verdict,Raw Provider Status,Detail',
      ...verifiedList.map(
        (r) =>
          `"${r.email.replace(/"/g, '""')}","${r.verdict}","${r.rawStatus.replace(/"/g, '""')}","${r.detail.replace(/"/g, '""')}"`
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `list-verification-${provider}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const progressPct =
    recipients.length > 0 && isVerifying
      ? Math.round((progressIndex / recipients.length) * 100)
      : verifiedList.length > 0 && recipients.length > 0
        ? Math.min(100, Math.round((verifiedList.length / recipients.length) * 100))
        : 0;

  return (
    <div
      id="sender-integration-panel"
      className="rounded-xl border border-slate-200/90 bg-white overflow-hidden"
    >
      <div className="flex flex-col gap-2 p-5 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Plug className="h-4 w-4 text-sky-600 shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-slate-900">
              Integration: Email Verification API
            </h3>
            {apiKey.trim() && (
              <span className="text-xs font-medium text-emerald-700">
                · {VERIFICATION_PROVIDERS[provider].label} key ready
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Connect ZeroBounce, Hunter, NeverBounce, Kickbox, or your preferred verifier API to
            check list deliverability before sending.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          {isOpen ? 'Hide Integration' : 'Configure Integration'}
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-200 p-5 sm:p-6 space-y-4 bg-slate-50/30">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label
                htmlFor="verify-provider"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Verification Provider
              </label>
              <select
                id="verify-provider"
                value={provider}
                onChange={(e) => {
                  onProviderChange(e.target.value as VerificationProviderId);
                  setPanelError(null);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-600 focus:outline-none"
              >
                {Object.entries(VERIFICATION_PROVIDERS).map(([id, cfg]) => (
                  <option key={id} value={id}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={provider === 'custom' ? '' : 'lg:col-span-2'}>
              <label
                htmlFor="verify-api-key"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                API Key / Token
              </label>
              <div className="relative">
                <input
                  id="verify-api-key"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={apiKey}
                  onChange={(e) => {
                    onApiKeyChange(e.target.value);
                    setPanelError(null);
                  }}
                  placeholder={VERIFICATION_PROVIDERS[provider].keyHint}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 font-mono text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={showKey ? 'Hide verification API key' : 'Show verification API key'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {provider === 'custom' && (
              <div>
                <label
                  htmlFor="verify-custom-endpoint"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Custom HTTPS Endpoint
                </label>
                <input
                  id="verify-custom-endpoint"
                  type="url"
                  value={customEndpoint}
                  onChange={(e) => onCustomEndpointChange(e.target.value)}
                  placeholder="https://api.example.com/verify?email={email}&api_key={apiKey}"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={skipUndeliverableOnSend}
                onChange={(e) => onSkipUndeliverableChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              Automatically skip recipients flagged Invalid or Risky when sending campaign
            </label>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              API keys remain in your browser session only.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {!isVerifying ? (
                <button
                  type="button"
                  onClick={() => void handleRunVerification()}
                  disabled={recipients.length === 0}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                >
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Verify Mailing List ({recipients.length})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    stopRef.current = true;
                  }}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer whitespace-nowrap"
                >
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  Stop Verification ({progressIndex}/{recipients.length})
                </button>
              )}

              {undeliverableSet.size > 0 && !isVerifying && (
                <button
                  type="button"
                  onClick={() => onRemoveUndeliverable(undeliverableSet)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove {undeliverableSet.size} Invalid/Risky from List
                </button>
              )}
            </div>

            {verifiedList.length > 0 && !isVerifying && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Download Verification CSV
                </button>
                <button
                  type="button"
                  onClick={() => onResultsChange({})}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer"
                >
                  Clear Results
                </button>
              </div>
            )}
          </div>

          {panelError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800"
            >
              <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{panelError}</span>
            </div>
          )}

          {(isVerifying || verifiedList.length > 0) && (
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 tabular-nums">
                <div className="flex flex-wrap items-center gap-2">
                  {isVerifying && (
                    <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Checking {progressIndex} of {recipients.length}...
                    </span>
                  )}
                  <span className="font-medium text-emerald-700">{counts.valid} Valid</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="font-medium text-red-700">{counts.invalid} Invalid</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span className="font-medium text-amber-700">
                    {counts.riskyOrCatchAll} Catch-all / Risky
                  </span>
                  {counts.unknown > 0 && (
                    <>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span>{counts.unknown} Unknown</span>
                    </>
                  )}
                </div>
                <span>{progressPct}% checked</span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-sky-600 transition-all duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {verifiedList.length > 0 && (
                <div className="max-h-[240px] overflow-auto rounded-lg border border-slate-200 bg-white">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600">
                      <tr>
                        <th scope="col" className="py-2 pl-3.5 pr-2 font-semibold w-10 text-right">
                          #
                        </th>
                        <th scope="col" className="py-2 px-3 font-semibold">
                          Recipient Email
                        </th>
                        <th scope="col" className="py-2 px-3 font-semibold">
                          Verdict
                        </th>
                        <th scope="col" className="py-2 px-3 font-semibold">
                          Provider Detail
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verifiedList.map((row, idx) => (
                        <tr key={row.email} className="hover:bg-slate-50/80">
                          <td className="py-2 pl-3.5 pr-2 text-right font-mono text-slate-400 tabular-nums">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-900">{row.email}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                row.verdict === 'Valid' || row.verdict === 'Role-based'
                                  ? 'text-emerald-700'
                                  : row.verdict === 'Invalid' || row.verdict === 'Error'
                                    ? 'text-red-700'
                                    : row.verdict === 'Catch-all' || row.verdict === 'Risky'
                                      ? 'text-amber-700'
                                      : 'text-slate-600'
                              }`}
                            >
                              {(row.verdict === 'Valid' || row.verdict === 'Role-based') && (
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {(row.verdict === 'Invalid' || row.verdict === 'Error') && (
                                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {(row.verdict === 'Catch-all' || row.verdict === 'Risky') && (
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {row.verdict === 'Unknown' && (
                                <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              {row.verdict}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{row.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
