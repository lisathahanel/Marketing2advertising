import { useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  Check,
  Copy,
  Download,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { extractEmailsFromText } from '../utils/emailTools';

interface EmailFormatterProps {
  extractedEmails: string[];
  onFormattedCountChange?: (count: number) => void;
}

const SAMPLE_MESSY_LIST = `  Sarah.Jenkins@Acme-Corp.COM
<mailto:bob.smith@COMPANY.ORG>, alice.wong@Gmail.com
sarah.jenkins@acme-corp.com
"David.Chen@PacificVentures.co.uk"; ELENA.ROSTOVA@NORTHSTAR.IO
bob.smith@company.org
  support@Acme-Corp.com
Alice.Wong@gmail.com
marcus.vance+leads@Gmail.com`;

const STRICT_EMAIL_CHECK =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,24}$/;

export function EmailFormatter({
  extractedEmails,
  onFormattedCountChange,
}: EmailFormatterProps) {
  const [rawInput, setRawInput] = useState(SAMPLE_MESSY_LIST);
  const [toLowercase, setToLowercase] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(true);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | 'none'>('asc');
  const [stripInvalid, setStripInvalid] = useState(true);
  const [outputSeparator, setOutputSeparator] = useState<'newline' | 'comma' | 'semicolon'>(
    'newline'
  );
  const [copied, setCopied] = useState(false);
  const [formatFeedback, setFormatFeedback] = useState<string | null>(null);

  const formattedResult = useMemo(() => {
    if (!rawInput.trim()) {
      return {
        items: [] as string[],
        outputText: '',
        rawTokenCount: 0,
        duplicatesRemoved: 0,
        invalidRemoved: 0,
      };
    }

    // Split by newlines, commas, semicolons, or whitespace
    const rawTokens = rawInput
      .split(/[\n\r,;]+|\s+/)
      .map((token) =>
        token
          .trim()
          .replace(/^mailto:/i, '')
          .replace(/^[<("']+|[>)"']+$/g, '')
          .trim()
      )
      .filter(Boolean);

    let invalidRemoved = 0;
    const validOrKept: string[] = [];

    for (const token of rawTokens) {
      if (stripInvalid) {
        // Fallback extract in case token still has surrounding characters
        const extracted = extractEmailsFromText(token).uniqueEmails;
        if (extracted.length > 0) {
          for (const e of extracted) {
            validOrKept.push(toLowercase ? e.toLowerCase() : e);
          }
        } else if (STRICT_EMAIL_CHECK.test(token)) {
          validOrKept.push(toLowercase ? token.toLowerCase() : token);
        } else {
          invalidRemoved++;
        }
      } else {
        validOrKept.push(toLowercase ? token.toLowerCase() : token);
      }
    }

    let finalItems = validOrKept;
    let duplicatesRemoved = 0;

    if (removeDuplicates) {
      const seen = new Set<string>();
      const deduped: string[] = [];
      for (const item of validOrKept) {
        const key = item.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(item);
        } else {
          duplicatesRemoved++;
        }
      }
      finalItems = deduped;
    }

    if (sortDirection === 'asc') {
      finalItems = [...finalItems].sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      );
    } else if (sortDirection === 'desc') {
      finalItems = [...finalItems].sort((a, b) =>
        b.toLowerCase().localeCompare(a.toLowerCase())
      );
    }

    const sep =
      outputSeparator === 'comma' ? ', ' : outputSeparator === 'semicolon' ? '; ' : '\n';

    return {
      items: finalItems,
      outputText: finalItems.join(sep),
      rawTokenCount: rawTokens.length,
      duplicatesRemoved,
      invalidRemoved,
    };
  }, [rawInput, toLowercase, removeDuplicates, sortDirection, stripInvalid, outputSeparator]);

  const handleApplyNormalize = () => {
    if (formattedResult.items.length === 0) return;
    onFormattedCountChange?.(formattedResult.items.length);
    setFormatFeedback(
      `Normalized ${formattedResult.items.length} email${
        formattedResult.items.length === 1 ? '' : 's'
      }${
        formattedResult.duplicatesRemoved > 0
          ? ` (${formattedResult.duplicatesRemoved} duplicate${
              formattedResult.duplicatesRemoved === 1 ? '' : 's'
            } removed)`
          : ''
      }.`
    );
    setTimeout(() => setFormatFeedback(null), 3000);
  };

  const handleImportFromExtractor = () => {
    if (extractedEmails.length === 0) return;
    setRawInput(extractedEmails.join('\n'));
    setFormatFeedback(`Imported ${extractedEmails.length} extracted emails.`);
    setTimeout(() => setFormatFeedback(null), 2500);
  };

  const handleCopyOutput = async () => {
    if (!formattedResult.outputText) return;
    try {
      await navigator.clipboard.writeText(formattedResult.outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleDownloadTxt = () => {
    if (!formattedResult.outputText) return;
    const blob = new Blob([formattedResult.outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formatted-emails.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (formattedResult.items.length === 0) return;
    const rows = ['Email', ...formattedResult.items.map((email) => `"${email.replace(/"/g, '""')}"`)];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'formatted-emails.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="formatter" aria-labelledby="formatter-heading" className="scroll-mt-20">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="formatter-heading"
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Email Formatter
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Clean and normalize lists of emails by lowercasing addresses, removing duplicates,
            stripping stray characters, and sorting alphabetically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setRawInput(SAMPLE_MESSY_LIST)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Load Messy Sample
          </button>
          {extractedEmails.length > 0 && (
            <button
              type="button"
              onClick={handleImportFromExtractor}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 hover:bg-sky-100 cursor-pointer whitespace-nowrap"
            >
              Import {extractedEmails.length} Extracted
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-5">
        {/* Normalization Controls Bar */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs font-medium text-slate-700">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={toLowercase}
                onChange={(e) => setToLowercase(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              Lowercase all
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(e) => setRemoveDuplicates(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              Remove duplicates
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={stripInvalid}
                onChange={(e) => setStripInvalid(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
              />
              Strip non-email text &amp; mailto:
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1.5">
              <ArrowDownAZ className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <label htmlFor="formatter-sort" className="sr-only">
                Sort order
              </label>
              <select
                id="formatter-sort"
                value={sortDirection}
                onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc' | 'none')}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-sky-600 focus:bg-white focus:outline-none"
              >
                <option value="asc">Sort A–Z</option>
                <option value="desc">Sort Z–A</option>
                <option value="none">Original Order</option>
              </select>
            </div>

            <label htmlFor="formatter-sep" className="sr-only">
              Output separator
            </label>
            <select
              id="formatter-sep"
              value={outputSeparator}
              onChange={(e) =>
                setOutputSeparator(e.target.value as 'newline' | 'comma' | 'semicolon')
              }
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-sky-600 focus:bg-white focus:outline-none"
            >
              <option value="newline">One per line</option>
              <option value="comma">Comma-separated</option>
              <option value="semicolon">Semicolon-separated</option>
            </select>
          </div>
        </div>

        {/* Dual Pane Input / Cleaned Output */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-6 flex flex-col space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="formatter-raw-input" className="font-semibold text-slate-800">
                Raw Email List
              </label>
              <span className="font-mono text-slate-500 tabular-nums">
                {formattedResult.rawTokenCount} raw entr
                {formattedResult.rawTokenCount === 1 ? 'y' : 'ies'}
              </span>
            </div>

            <textarea
              id="formatter-raw-input"
              rows={9}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste mixed-case, duplicate, or comma-separated email addresses here..."
              className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 font-mono text-xs leading-relaxed text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600/15"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleApplyNormalize}
                  disabled={!rawInput.trim()}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer whitespace-nowrap"
                >
                  <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Normalize &amp; Clean
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawInput('');
                    setFormatFeedback(null);
                  }}
                  disabled={!rawInput}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-45 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Clear
                </button>
              </div>
              {formatFeedback && (
                <span className="text-xs font-medium text-emerald-700" role="status">
                  {formatFeedback}
                </span>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-800">Cleaned &amp; Normalized List</span>
              <div className="flex items-center gap-2 text-slate-500 tabular-nums">
                <span>
                  <strong className="font-semibold text-slate-900">
                    {formattedResult.items.length}
                  </strong>{' '}
                  cleaned
                </span>
                <span aria-hidden="true">·</span>
                <span>{formattedResult.duplicatesRemoved} duplicates removed</span>
                {formattedResult.invalidRemoved > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{formattedResult.invalidRemoved} invalid stripped</span>
                  </>
                )}
              </div>
            </div>

            <textarea
              readOnly
              rows={9}
              value={formattedResult.outputText}
              aria-label="Cleaned and normalized email list"
              placeholder="Normalized emails will appear here..."
              className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none"
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyOutput}
                disabled={!formattedResult.outputText}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    Copy Formatted
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={!formattedResult.outputText}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Download TXT
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={formattedResult.items.length === 0}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
