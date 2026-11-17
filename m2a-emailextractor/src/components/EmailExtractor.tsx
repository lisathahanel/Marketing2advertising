import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileUp,
  FileImage,
  ListChecks,
  MailSearch,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  extractEmailsFromText,
  isDisposableDomain,
  isRoleBasedEmail,
  type ExtractionResult,
} from '../utils/emailTools';

const MAX_CHARS = 100000;

const SAMPLE_TEXT = `From: Sarah Jenkins <sarah.jenkins@acme-corp.com>
To: sales@acme-corp.com, support@acme-corp.com
Cc: Marcus Vance <m.vance+leads@gmail.com>, SARAH.JENKINS@ACME-CORP.COM

Hi team,
Please follow up with the conference attendees below:
- Elena Rostova (elena.rostova@northstar-labs.io)
- David Chen <mailto:dchen@pacificventures.co.uk>
- Info Desk: info@northstar-labs.io
- Admin contact: admin@pacificventures.co.uk
- Typo lead: alex.rivera@gmial.com
- Temp signup: testuser99@mailinator.com
- Duplicate entry: elena.rostova@northstar-labs.io`;

type SeparatorType = 'newline' | 'comma' | 'pipe' | 'colon' | 'other';

interface EmailExtractorProps {
  onValidateEmail: (email: string) => void;
  onValidateAll: (emails: string[]) => void;
  onExtractedChange: (emails: string[]) => void;
}

export function EmailExtractor({
  onValidateEmail,
  onValidateAll,
  onExtractedChange,
}: EmailExtractorProps) {
  const [rawText, setRawText] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [domainFilterInput, setDomainFilterInput] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'role'>('all');
  const [separatorType, setSeparatorType] = useState<SeparatorType>('newline');
  const [customSeparator, setCustomSeparator] = useState('; ');
  const [groupSizeInput, setGroupSizeInput] = useState('');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [resultView, setResultView] = useState<'list' | 'formatted'>('list');
  const [copiedAll, setCopiedAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isProcessingDocument, setIsProcessingDocument] = useState(false);
  const [documentProgress, setDocumentProgress] = useState('');
  const [csvMeta, setCsvMeta] = useState<{
    fileName: string;
    rowCount: number;
    truncatedPreview: boolean;
    totalChars: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const domainFilterTokens = useMemo(() => {
    if (!domainFilterInput.trim()) return [];
    return domainFilterInput
      .split(/[\n\r,;]+|\s+/)
      .map((token) => token.trim().toLowerCase().replace(/^[@*.]+/, ''))
      .filter(Boolean);
  }, [domainFilterInput]);

  const emailMatchesDomainFilter = (email: string, tokens: string[]): boolean => {
    if (tokens.length === 0) return true;
    const domain = (email.split('@')[1] ?? '').toLowerCase();
    if (!domain) return false;
    return tokens.some((clean) => {
      if (domain === clean) return true;
      if (domain.endsWith(`.${clean}`)) return true;
      if (!clean.includes('.') && domain.startsWith(`${clean}.`)) return true;
      return false;
    });
  };

  const charCount = rawText.length;
  const nearLimit = charCount >= MAX_CHARS * 0.9;

  const handleExtract = () => {
    const extracted = extractEmailsFromText(rawText);
    setResult(extracted);
    onExtractedChange(extracted.uniqueEmails);
    setFilterQuery('');
    setTypeFilter('all');
    if (extracted.uniqueEmails.length > 0) {
      setStatusMessage(
        `Extracted ${extracted.uniqueEmails.length} unique email${
          extracted.uniqueEmails.length === 1 ? '' : 's'
        }${
          extracted.duplicatesRemoved > 0
            ? ` (${extracted.duplicatesRemoved} duplicate${
                extracted.duplicatesRemoved === 1 ? '' : 's'
              } removed)`
            : ''
        }.`
      );
    } else {
      setStatusMessage('No valid email addresses were detected in the provided text.');
    }
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_TEXT);
    setCsvMeta(null);
    const extracted = extractEmailsFromText(SAMPLE_TEXT);
    setResult(extracted);
    onExtractedChange(extracted.uniqueEmails);
    setFilterQuery('');
    setTypeFilter('all');
    setStatusMessage('Sample text loaded and extracted.');
  };

  const processVisualDocument = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = /^image\\/(jpeg|png)$/i.test(file.type) || /\\.(jpe?g|png)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setStatusMessage('Please choose a PDF, JPG, JPEG, or PNG image.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setStatusMessage('This document is larger than 25 MB. Please choose a smaller file.');
      return;
    }

    setIsProcessingDocument(true);
    setDocumentProgress(isPdf ? 'Reading PDF pages…' : 'Preparing image for OCR…');
    setStatusMessage(null);
    setCsvMeta(null);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      let extractedText = '';
      let ocrPages = 0;

      try {
        if (isPdf) {
          const pdfjs = await import('pdfjs-dist');
          pdfjs.GlobalWorkerOptions.workerSrc = new URL(
            'pdfjs-dist/build/pdf.worker.min.mjs',
            import.meta.url
          ).toString();
          const pdf = await pdfjs.getDocument({
            data: new Uint8Array(await file.arrayBuffer()),
          }).promise;
          const pageLimit = Math.min(pdf.numPages, 30);

          for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber++) {
            setDocumentProgress(`Reading PDF page ${pageNumber} of ${pageLimit}…`);
            const page = await pdf.getPage(pageNumber);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item) => ('str' in item ? item.str : ''))
              .join(' ');
            extractedText += `\\n${pageText}\\n`;

            if (pageText.trim().length < 25) {
              setDocumentProgress(`Recognising text on PDF page ${pageNumber} of ${pageLimit}…`);
              const viewport = page.getViewport({ scale: 1.6 });
              const canvas = document.createElement('canvas');
              canvas.width = Math.ceil(viewport.width);
              canvas.height = Math.ceil(viewport.height);
              const context = canvas.getContext('2d');
              if (context) {
                await page.render({ canvas, canvasContext: context, viewport }).promise;
                const result = await worker.recognize(canvas);
                extractedText += `\\n${result.data.text}\\n`;
                ocrPages++;
              }
              canvas.width = 0;
              canvas.height = 0;
            }
          }

          if (pdf.numPages > pageLimit) {
            setStatusMessage(`Processed the first ${pageLimit} of ${pdf.numPages} PDF pages to keep processing responsive.`);
          }
        } else {
          setDocumentProgress('Recognising text in image…');
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Your browser could not prepare this image for text recognition.');
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          const result = await worker.recognize(canvas);
          extractedText = result.data.text;
          canvas.width = 0;
          canvas.height = 0;
          ocrPages = 1;
        }
      } finally {
        await worker.terminate();
      }

      setRawText(extractedText.slice(0, MAX_CHARS));
      const extracted = extractEmailsFromText(extractedText);
      setResult(extracted);
      onExtractedChange(extracted.uniqueEmails);
      setFilterQuery('');
      setTypeFilter('all');
      setDomainFilterInput('');
      const sourceLabel = isPdf ? 'PDF' : 'image';
      setStatusMessage(
        extracted.uniqueEmails.length
          ? `Extracted ${extracted.uniqueEmails.length.toLocaleString()} unique email address(es) from ${sourceLabel} "${file.name}" (${ocrPages} page(s) processed with OCR; duplicates removed: ${extracted.duplicatesRemoved.toLocaleString()}).`
          : `Read "${file.name}", but no valid email addresses were detected. Try a clearer scan or image.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown processing error';
      setStatusMessage(`Could not process "${file.name}". ${message}`);
    } finally {
      setIsProcessingDocument(false);
      setDocumentProgress('');
    }
  };

  const processImportedFile = (file: File, requireCsv = false) => {
    const isVisualDocument =
      file.type === 'application/pdf' ||
      /^image\\/(jpeg|png)$/i.test(file.type) ||
      /\\.(pdf|jpe?g|png)$/i.test(file.name);
    if (isVisualDocument && !requireCsv) {
      void processVisualDocument(file);
      return;
    }

    const isCsv =
      file.name.toLowerCase().endsWith('.csv') ||
      file.type.toLowerCase().includes('csv');

    if (requireCsv && !isCsv) {
      setStatusMessage(`Please select a valid .csv file (selected "${file.name}").`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const truncated = content.slice(0, MAX_CHARS);
      setRawText(truncated);

      // For CSV files, scan the full file locally so rows past MAX_CHARS are still extracted & deduplicated
      const sourceToExtract = isCsv ? content : truncated;
      const extracted = extractEmailsFromText(sourceToExtract);
      setResult(extracted);
      onExtractedChange(extracted.uniqueEmails);
      setFilterQuery('');
      setTypeFilter('all');

      if (isCsv) {
        const nonEmptyRows = content
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0).length;
        setCsvMeta({
          fileName: file.name,
          rowCount: nonEmptyRows,
          truncatedPreview: content.length > MAX_CHARS,
          totalChars: content.length,
        });
        setStatusMessage(
          `Extracted ${extracted.uniqueEmails.length.toLocaleString()} unique email${
            extracted.uniqueEmails.length === 1 ? '' : 's'
          } from CSV "${file.name}" (${extracted.duplicatesRemoved.toLocaleString()} duplicate${
            extracted.duplicatesRemoved === 1 ? '' : 's'
          } removed).`
        );
      } else {
        setCsvMeta(null);
        setStatusMessage(
          content.length > MAX_CHARS
            ? `Loaded first ${MAX_CHARS.toLocaleString()} characters from "${file.name}".`
            : `Loaded "${file.name}" locally in browser.`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportedFile(file, false);
    e.target.value = '';
  };

  const handleCsvUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImportedFile(file, true);
    e.target.value = '';
  };

  const handleDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processImportedFile(file, false);
  };

  const domainFilteredEmails = useMemo(() => {
    if (!result) return [];
    if (domainFilterTokens.length === 0) return result.uniqueEmails;
    return result.uniqueEmails.filter((email) =>
      emailMatchesDomainFilter(email, domainFilterTokens)
    );
  }, [result, domainFilterTokens]);

  useEffect(() => {
    onExtractedChange(domainFilteredEmails);
  }, [domainFilteredEmails, onExtractedChange]);

  const filteredEmails = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    const filtered = domainFilteredEmails.filter((email) => {
      if (q && !email.includes(q)) return false;
      const isRole = isRoleBasedEmail(email);
      if (typeFilter === 'personal' && isRole) return false;
      if (typeFilter === 'role' && !isRole) return false;
      return true;
    });

    if (sortAlphabetically) {
      return [...filtered].sort((a, b) => a.localeCompare(b));
    }
    return filtered;
  }, [domainFilteredEmails, filterQuery, typeFilter, sortAlphabetically]);

  const activeSeparator = useMemo(() => {
    switch (separatorType) {
      case 'comma':
        return ', ';
      case 'pipe':
        return ' | ';
      case 'colon':
        return ' : ';
      case 'other':
        return customSeparator || '\n';
      case 'newline':
      default:
        return '\n';
    }
  }, [separatorType, customSeparator]);

  const parsedGroupSize = useMemo(() => {
    const num = Number.parseInt(groupSizeInput, 10);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }, [groupSizeInput]);

  const formattedOutputText = useMemo(() => {
    if (filteredEmails.length === 0) return '';
    if (parsedGroupSize > 0) {
      const groups: string[] = [];
      for (let i = 0; i < filteredEmails.length; i += parsedGroupSize) {
        groups.push(filteredEmails.slice(i, i + parsedGroupSize).join(activeSeparator));
      }
      return groups.join('\n\n');
    }
    return filteredEmails.join(activeSeparator);
  }, [filteredEmails, parsedGroupSize, activeSeparator]);

  const handleCopyAll = async () => {
    if (!formattedOutputText) return;
    try {
      await navigator.clipboard.writeText(formattedOutputText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      setStatusMessage('Clipboard access was blocked. Please use Download as TXT.');
    }
  };

  const handleDownloadTxt = () => {
    if (!formattedOutputText) return;
    const blob = new Blob([formattedOutputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted-emails.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCsv = () => {
    if (filteredEmails.length === 0) return;
    const rows = [
      'Email,Domain,Type',
      ...filteredEmails.map((email) => {
        const domain = email.split('@')[1] ?? '';
        const type = isDisposableDomain(domain)
          ? 'Disposable'
          : isRoleBasedEmail(email)
            ? 'Role-based'
            : 'Standard';
        return `"${email}","${domain}","${type}"`;
      }),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'extracted-emails.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setRawText('');
    setResult(null);
    setCsvMeta(null);
    setFilterQuery('');
    setDomainFilterInput('');
    setTypeFilter('all');
    setStatusMessage(null);
    onExtractedChange([]);
  };

  return (
    <section id="extractor" aria-labelledby="extractor-heading" className="scroll-mt-20">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="extractor-heading"
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Email Extractor
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Paste raw text, email threads, logs, or CSV snippets to extract unique email addresses
            instantly in your browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Load Sample Text
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            className="sr-only"
            aria-label="Upload CSV file"
          />
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.csv,.log,.html,.md,.pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="sr-only"
            aria-label="Import local text file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            <FileUp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            Import Local File
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingDocument}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100 disabled:cursor-wait disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <FileImage className="h-3.5 w-3.5 text-sky-700" aria-hidden="true" />
            PDF / JPG / PNG
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Left: Input Panel */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isDraggingFile) setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDropFile}
          className={`lg:col-span-6 flex flex-col rounded-xl border bg-white p-5 sm:p-6 transition-colors ${
            isDraggingFile
              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20'
              : 'border-slate-200/90'
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-4">
            <label htmlFor="extractor-textarea" className="text-sm font-semibold text-slate-800">
              Source Text or CSV Input
            </label>
            <span
              className={`font-mono text-xs tabular-nums ${
                nearLimit ? 'font-semibold text-amber-700' : 'text-slate-500'
              }`}
            >
              {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
            </span>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>
                {csvMeta ? (
                  <>
                    Loaded <strong className="text-slate-900">{csvMeta.fileName}</strong> (
                    <span className="tabular-nums">{csvMeta.rowCount.toLocaleString()}</span> rows
                    {csvMeta.truncatedPreview
                      ? ` · full ${csvMeta.totalChars.toLocaleString()} chars extracted`
                      : ''}
                    )
                  </>
                ) : (
                  'Drag & drop a .csv file here or upload to extract & deduplicate all rows locally.'
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => csvInputRef.current?.click()}
              className="font-semibold text-sky-700 hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
            >
              {csvMeta ? 'Upload Another CSV' : 'Choose CSV File'}
            </button>
          </div>

          <textarea
            id="extractor-textarea"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value.slice(0, MAX_CHARS));
              if (csvMeta) setCsvMeta(null);
            }}
            maxLength={MAX_CHARS}
            rows={10}
            placeholder="Paste any text containing email addresses here (up to 100,000 characters), or upload a CSV file above..."
            className="w-full flex-1 resize-y rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 font-mono text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600/15"
          />

          {/* Extraction Formatting Options */}
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="extractor-separator"
                  className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  Separator:
                </label>
                <select
                  id="extractor-separator"
                  value={separatorType}
                  onChange={(e) => setSeparatorType(e.target.value as SeparatorType)}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-sky-600 focus:outline-none"
                >
                  <option value="comma">Comma (,)</option>
                  <option value="pipe">Pipe (|)</option>
                  <option value="colon">Colon (:)</option>
                  <option value="newline">New Line</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {separatorType === 'other' && (
                <div className="flex items-center gap-1.5">
                  <label htmlFor="extractor-custom-sep" className="sr-only">
                    Custom separator
                  </label>
                  <input
                    id="extractor-custom-sep"
                    type="text"
                    value={customSeparator}
                    onChange={(e) => setCustomSeparator(e.target.value)}
                    placeholder="e.g. ; "
                    className="w-20 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-800 focus:border-sky-600 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="extractor-group-size"
                  className="text-xs font-semibold text-slate-700 whitespace-nowrap"
                >
                  Group:
                </label>
                <input
                  id="extractor-group-size"
                  type="number"
                  min={0}
                  max={5000}
                  value={groupSizeInput}
                  onChange={(e) => setGroupSizeInput(e.target.value)}
                  placeholder="0"
                  className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-800 tabular-nums focus:border-sky-600 focus:outline-none"
                />
                <span className="text-xs text-slate-600">Emails</span>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="extractor-domain-filter"
                  className="text-xs font-semibold text-slate-700"
                >
                  Only extract domains (optional):
                </label>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                  <span>Quick add:</span>
                  {['@gmail', '@co.za', '@outlook', '@yahoo'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setDomainFilterInput((prev) => {
                          const existing = prev.trim();
                          if (!existing) return preset;
                          const parts = existing.split(/[\n\r,;]+|\s+/).map((p) => p.toLowerCase());
                          return parts.includes(preset) ? existing : `${existing}, ${preset}`;
                        })
                      }
                      className="font-mono font-medium text-sky-700 hover:underline underline-offset-2 cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                  {domainFilterInput && (
                    <button
                      type="button"
                      onClick={() => setDomainFilterInput('')}
                      className="font-medium text-slate-500 hover:text-slate-800 hover:underline underline-offset-2 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <input
                id="extractor-domain-filter"
                type="text"
                value={domainFilterInput}
                onChange={(e) => setDomainFilterInput(e.target.value)}
                placeholder="e.g. @gmail, @co.za, @company.com (leave empty for all domains)"
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sortAlphabetically}
                  onChange={(e) => setSortAlphabetically(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                />
                Sort Alphabetically
              </label>

              <div className="text-xs font-medium text-slate-700 tabular-nums">
                Email count:{' '}
                <strong className="font-mono font-semibold text-slate-900">
                  {filteredEmails.length}
                </strong>
              </div>
            </div>
          </div>

          {isProcessingDocument && (
            <p className="mt-3 text-xs font-medium text-sky-700" role="status">
              {documentProgress} Your file is being processed locally in this browser.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExtract}
                disabled={!rawText.trim()}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer whitespace-nowrap"
              >
                <MailSearch className="h-4 w-4" aria-hidden="true" />
                Extract Email
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={!rawText && !result}
                className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                Clear
              </button>
            </div>

            {statusMessage && (
              <p className="text-xs text-slate-500" role="status">
                {statusMessage}
              </p>
            )}
          </div>
        </div>

        {/* Right: Results Panel */}
        <div className="lg:col-span-6 flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Extracted Emails</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                <span>
                  Email count:{' '}
                  <strong className="font-semibold text-slate-900">
                    {filteredEmails.length}
                  </strong>
                  {result && filteredEmails.length !== domainFilteredEmails.length && (
                    <span className="text-slate-400">
                      {' '}
                      of {domainFilteredEmails.length}
                    </span>
                  )}
                </span>
                <span aria-hidden="true">·</span>
                <span>{result ? result.duplicatesRemoved : 0} duplicates removed</span>
                {result && result.roleBasedCount > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{result.roleBasedCount} role-based</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={filteredEmails.length === 0}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                {copiedAll ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    Copy All
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                disabled={filteredEmails.length === 0}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Download as TXT
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={filteredEmails.length === 0}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Download as CSV
              </button>

              <button
                type="button"
                onClick={() => onValidateAll(filteredEmails)}
                disabled={filteredEmails.length === 0}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-45 cursor-pointer whitespace-nowrap"
              >
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                Validate All
              </button>
            </div>
          </div>

          {/* Dedicated Real-Time Search Bar for Extracted Emails */}
          <div className="mt-4">
            <label htmlFor="extracted-emails-search" className="sr-only">
              Search extracted emails
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="extracted-emails-search"
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                disabled={!result || result.uniqueEmails.length === 0}
                placeholder="Search extracted emails in real time (name, prefix, or domain)..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  aria-label="Clear search filter"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {result && result.uniqueEmails.length > 0 ? (
            <>
              {/* Filter & View Switcher Toolbar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="text-xs text-slate-500 tabular-nums">
                  {filterQuery.trim() ? (
                    <span>
                      Matching{' '}
                      <strong className="font-semibold text-slate-800">
                        {filteredEmails.length}
                      </strong>{' '}
                      of {domainFilteredEmails.length}
                    </span>
                  ) : (
                    <span>Showing all {filteredEmails.length} unique addresses</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div
                    role="group"
                    aria-label="Filter by address type"
                    className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => setTypeFilter('all')}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        typeFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('personal')}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        typeFilter === 'personal'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter('role')}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        typeFilter === 'role'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Role
                    </button>
                  </div>

                  <div
                    role="group"
                    aria-label="Results display mode"
                    className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => setResultView('list')}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        resultView === 'list'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultView('formatted')}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        resultView === 'formatted'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Separated
                    </button>
                  </div>
                </div>
              </div>

              {resultView === 'formatted' ? (
                <textarea
                  readOnly
                  rows={12}
                  value={formattedOutputText}
                  aria-label="Separated and grouped email output"
                  className="mt-3 w-full flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3.5 font-mono text-xs leading-relaxed text-slate-800 focus:outline-none"
                />
              ) : (
                <div className="mt-3 max-h-[320px] flex-1 overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {filteredEmails.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No extracted emails match your current filter.
                    </div>
                  ) : (
                    filteredEmails.map((email, index) => {
                      const domain = email.split('@')[1] ?? '';
                      const isRole = isRoleBasedEmail(email);
                      const isDisp = isDisposableDomain(domain);
                      const showGroupHeader =
                        parsedGroupSize > 0 && index % parsedGroupSize === 0;
                      const groupNumber =
                        parsedGroupSize > 0 ? Math.floor(index / parsedGroupSize) + 1 : 0;

                      return (
                        <div key={email}>
                          {showGroupHeader && (
                            <div className="bg-slate-50 px-3.5 py-1.5 text-[11px] font-semibold text-slate-500 border-b border-slate-100 tabular-nums">
                              Group {groupNumber}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-50/80 transition-colors">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-400 tabular-nums">
                                {index + 1}
                              </span>
                              <span
                                className="truncate font-mono text-sm text-slate-800"
                                title={email}
                              >
                                {(() => {
                                  const q = filterQuery.trim().toLowerCase();
                                  if (!q) return email;
                                  const matchIdx = email.toLowerCase().indexOf(q);
                                  if (matchIdx === -1) return email;
                                  return (
                                    <>
                                      {email.slice(0, matchIdx)}
                                      <mark className="rounded-xs bg-amber-100 px-0.5 text-slate-900">
                                        {email.slice(matchIdx, matchIdx + q.length)}
                                      </mark>
                                      {email.slice(matchIdx + q.length)}
                                    </>
                                  );
                                })()}
                              </span>
                              {(isRole || isDisp) && (
                                <span className="hidden sm:inline shrink-0 text-xs text-slate-400">
                                  {isDisp ? 'Disposable' : 'Role'}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onValidateEmail(email)}
                              className="inline-flex min-h-[32px] shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-sky-700 transition-colors hover:border-sky-300 hover:bg-sky-50 cursor-pointer whitespace-nowrap"
                            >
                              Validate
                              <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Top Domains Summary */}
              {result.domainBreakdown.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">Top domains:</span>
                  {result.domainBreakdown.slice(0, 4).map((item, idx) => (
                    <span key={item.domain} className="tabular-nums">
                      {idx > 0 && <span className="mr-3 text-slate-300">·</span>}
                      <span className="font-mono text-slate-700">{item.domain}</span> ({item.count})
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <MailSearch className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium text-slate-800">
                {result ? 'No email addresses found' : 'Ready to extract emails'}
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                {result
                  ? 'Try pasting text containing standard email addresses or click "Load Sample Text" to test.'
                  : 'Paste any document or list on the left and click "Extract Email". Duplicates are automatically removed.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
