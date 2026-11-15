import { useMemo, useState } from 'react';
import { Check, Copy, Download, Globe, Search } from 'lucide-react';
import {
  extractDomainsFromEmails,
  extractEmailsFromText,
  type DomainCategory,
} from '../utils/emailTools';

import { isModifiedClick } from '../utils/routes';

interface DomainExtractorProps {
  extractedEmails: string[];
  onNavigate?: (path: string) => void;
}

export function DomainExtractor({ extractedEmails, onNavigate }: DomainExtractorProps) {
  const [sourceMode, setSourceMode] = useState<'synced' | 'custom'>('synced');
  const [customInput, setCustomInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DomainCategory>('all');
  const [sortBy, setSortBy] = useState<'count' | 'alpha'>('count');
  const [copiedDomains, setCopiedDomains] = useState(false);

  const activeEmails = useMemo(() => {
    if (sourceMode === 'custom') {
      return extractEmailsFromText(customInput).uniqueEmails;
    }
    return extractedEmails;
  }, [sourceMode, customInput, extractedEmails]);

  const domainStats = useMemo(() => extractDomainsFromEmails(activeEmails), [activeEmails]);

  const filteredDomains = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = domainStats.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (q && !item.domain.includes(q)) return false;
      return true;
    });

    if (sortBy === 'alpha') {
      return [...filtered].sort((a, b) => a.domain.localeCompare(b.domain));
    }
    return [...filtered].sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
  }, [domainStats, searchQuery, categoryFilter, sortBy]);

  const totalEmailsCount = activeEmails.length;

  const handleCopyDomains = async () => {
    if (filteredDomains.length === 0) return;
    const text = filteredDomains.map((d) => `${d.domain} (${d.count})`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDomains(true);
      setTimeout(() => setCopiedDomains(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const handleDownloadTxt = () => {
    if (filteredDomains.length === 0) return;
    const content = filteredDomains.map((d) => d.domain).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'unique-email-domains.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (filteredDomains.length === 0) return;
    const rows = [
      'Domain,Email Count,Share Percentage,Category',
      ...filteredDomains.map(
        (d) => `"${d.domain}",${d.count},${d.percentage}%,"${d.category}"`
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'email-domains-breakdown.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="domain-extractor" aria-labelledby="domain-extractor-heading" className="scroll-mt-20">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="domain-extractor-heading"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
          >
            Domain Extractor
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Automatically parses extracted email addresses to identify unique domains and their
            occurrence counts in your list.
          </p>
        </div>

        <div
          role="group"
          aria-label="Domain extractor input source"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setSourceMode('synced')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              sourceMode === 'synced'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Synced with Extractor ({extractedEmails.length})
          </button>
          <button
            type="button"
            onClick={() => setSourceMode('custom')}
            className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              sourceMode === 'custom'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paste Custom List
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        {sourceMode === 'custom' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="domain-custom-textarea"
                className="text-xs font-semibold text-slate-800"
              >
                Paste Emails or Text to Parse Domains
              </label>
              {extractedEmails.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCustomInput(extractedEmails.join('\n'))}
                  className="text-xs font-medium text-blue-600 hover:underline underline-offset-4 cursor-pointer"
                >
                  Import {extractedEmails.length} from Extractor
                </button>
              )}
            </div>
            <textarea
              id="domain-custom-textarea"
              rows={4}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Paste email addresses (e.g. alice@gmail.com, bob@company.org)..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none"
            />
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span>
              <strong className="font-semibold text-slate-900">{domainStats.length}</strong> unique
              domain{domainStats.length === 1 ? '' : 's'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              from <strong className="font-semibold text-slate-900">{totalEmailsCount}</strong>{' '}
              email{totalEmailsCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={filteredDomains.length === 0}
              onClick={handleCopyDomains}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
            >
              {copiedDomains ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Copy Domains
                </>
              )}
            </button>
            <button
              type="button"
              disabled={filteredDomains.length === 0}
              onClick={handleDownloadTxt}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              TXT
            </button>
            <button
              type="button"
              disabled={filteredDomains.length === 0}
              onClick={handleDownloadCsv}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>

        {domainStats.length > 0 ? (
          <>
            {/* Search & Sort Controls */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter domains (e.g. gmail.com)..."
                  aria-label="Filter unique domains"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filter domain category"
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as 'all' | DomainCategory)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Business / Custom">Business / Custom</option>
                  <option value="Free Webmail">Free Webmail</option>
                  <option value="Disposable">Disposable</option>
                </select>

                <select
                  aria-label="Sort domains"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'count' | 'alpha')}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-blue-600 focus:outline-none"
                >
                  <option value="count">Highest Count</option>
                  <option value="alpha">Alphabetical (A–Z)</option>
                </select>
              </div>
            </div>

            {/* Domain Table */}
            <div className="max-h-[340px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th scope="col" className="w-12 py-2.5 pl-3.5 pr-2 font-semibold text-right">
                      #
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-semibold">
                      Domain
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-semibold">
                      Category
                    </th>
                    <th scope="col" className="py-2.5 px-3 font-semibold text-right">
                      Share
                    </th>
                    <th scope="col" className="py-2.5 pl-3 pr-4 font-semibold text-right">
                      Count
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDomains.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-slate-500">
                        No domains match your current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDomains.map((item, idx) => (
                      <tr key={item.domain} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 pl-3.5 pr-2 text-right font-mono text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-sm font-medium text-slate-900">
                          {item.domain}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span
                            className={
                              item.category === 'Disposable'
                                ? 'text-red-700 font-medium'
                                : item.category === 'Business / Custom'
                                  ? 'text-blue-700 font-medium'
                                  : 'text-slate-600'
                            }
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                          {item.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2.5 pl-3 pr-4 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                          {item.count}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <Globe className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-slate-800">No domains extracted yet</p>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              {sourceMode === 'synced'
                ? 'Run the Email Extractor above (or click "Load Sample Text") and unique domains with their counts will appear here automatically.'
                : 'Paste a list of email addresses above to inspect unique domains and counts.'}
            </p>
            {sourceMode === 'synced' && (
              <a
                href="/extractor"
                onClick={(e) => {
                  if (onNavigate && !isModifiedClick(e)) {
                    e.preventDefault();
                    onNavigate('/extractor');
                  }
                }}
                className="mt-3 text-xs font-medium text-sky-700 hover:underline underline-offset-4"
              >
                Go to Email Extractor
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
