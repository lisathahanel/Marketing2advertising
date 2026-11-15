import { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  Eye,
  Monitor,
  RotateCcw,
  Smartphone,
  Wand2,
} from 'lucide-react';
import {
  EmailTemplatePreset,
  HtmlTemplateConfig,
  TEMPLATE_ACCENT_SWATCHES,
  TEMPLATE_PRESET_META,
  generateHtmlEmailTemplate,
} from '../utils/emailTemplates';

export interface PreviewRecipientSample {
  email: string;
  name: string;
}

interface HtmlTemplateBuilderProps {
  config: HtmlTemplateConfig;
  onChange: (next: HtmlTemplateConfig) => void;
  previewRecipient: PreviewRecipientSample;
  applyMergeTags: (template: string, recipient: PreviewRecipientSample) => string;
  onApplyToCampaign: (subject: string, html: string, openTab: 'compose' | 'preview') => void;
}

export function HtmlTemplateBuilder({
  config,
  onChange,
  previewRecipient,
  applyMergeTags,
  onApplyToCampaign,
}: HtmlTemplateBuilderProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [previewKind, setPreviewKind] = useState<'rendered' | 'source'>('rendered');
  const [copiedHtml, setCopiedHtml] = useState(false);

  const generatedRawHtml = useMemo(() => generateHtmlEmailTemplate(config), [config]);
  const generatedMergedHtml = useMemo(
    () => applyMergeTags(generatedRawHtml, previewRecipient),
    [generatedRawHtml, previewRecipient, applyMergeTags]
  );

  const updateField = <K extends keyof HtmlTemplateConfig>(
    field: K,
    value: HtmlTemplateConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  const handleLoadPresetDefaults = (preset: EmailTemplatePreset) => {
    const defaults = TEMPLATE_PRESET_META[preset].defaults;
    onChange({
      ...config,
      preset,
      subject: defaults.subject,
      preheader: defaults.preheader,
      headline: defaults.headline,
      greeting: defaults.greeting,
      bodyCopy: defaults.bodyCopy,
      highlightBox: defaults.highlightBox,
      ctaLabel: defaults.ctaLabel,
      ctaUrl: defaults.ctaUrl,
    });
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(generatedRawHtml);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 1800);
    } catch {
      // Clipboard blocked in restricted contexts; ignore silently
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([generatedRawHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `email-template-${config.preset}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Preset Style Selector */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-700">1. Choose Layout Style</span>
          <button
            type="button"
            onClick={() => handleLoadPresetDefaults(config.preset)}
            className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline underline-offset-4 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" />
            Load {TEMPLATE_PRESET_META[config.preset].label} Sample Copy
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(TEMPLATE_PRESET_META) as EmailTemplatePreset[]).map((presetKey) => {
            const meta = TEMPLATE_PRESET_META[presetKey];
            const isSelected = config.preset === presetKey;
            return (
              <button
                key={presetKey}
                type="button"
                onClick={() => updateField('preset', presetKey)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-sky-600 bg-sky-50/70 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-semibold">{meta.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-500 line-clamp-2">
                  {meta.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand, Color & Copy Inputs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="tpl-brand" className="block text-xs font-semibold text-slate-700 mb-1">
            Brand / Sender Header
          </label>
          <input
            id="tpl-brand"
            type="text"
            value={config.brandName}
            onChange={(e) => updateField('brandName', e.target.value)}
            placeholder="Acme Updates"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1">Accent Color</span>
          <div className="flex flex-wrap items-center gap-2">
            {TEMPLATE_ACCENT_SWATCHES.map((swatch) => {
              const active = config.accentColor.toLowerCase() === swatch.value.toLowerCase();
              return (
                <button
                  key={swatch.value}
                  type="button"
                  title={swatch.label}
                  aria-label={`Select ${swatch.label} accent color`}
                  onClick={() => updateField('accentColor', swatch.value)}
                  className={`h-7 w-7 rounded-md border transition-transform cursor-pointer ${
                    active ? 'scale-105 ring-2 ring-slate-900 ring-offset-1 border-white' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: swatch.value }}
                />
              );
            })}
            <input
              type="color"
              aria-label="Custom accent color"
              value={/^#[0-9a-fA-F]{6}$/.test(config.accentColor) ? config.accentColor : '#0284c7'}
              onChange={(e) => updateField('accentColor', e.target.value)}
              className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
            />
          </div>
        </div>

        <div>
          <label htmlFor="tpl-subject" className="block text-xs font-semibold text-slate-700 mb-1">
            Campaign Subject
          </label>
          <input
            id="tpl-subject"
            type="text"
            value={config.subject}
            onChange={(e) => updateField('subject', e.target.value)}
            placeholder="Monthly Highlights for {{name}}"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tpl-preheader" className="block text-xs font-semibold text-slate-700 mb-1">
            Inbox Preheader Text
          </label>
          <input
            id="tpl-preheader"
            type="text"
            value={config.preheader}
            onChange={(e) => updateField('preheader', e.target.value)}
            placeholder="Short preview line shown in recipient inbox"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tpl-headline" className="block text-xs font-semibold text-slate-700 mb-1">
            Email Headline
          </label>
          <input
            id="tpl-headline"
            type="text"
            value={config.headline}
            onChange={(e) => updateField('headline', e.target.value)}
            placeholder="Your Monthly Digest"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tpl-greeting" className="block text-xs font-semibold text-slate-700 mb-1">
            Greeting Line
          </label>
          <input
            id="tpl-greeting"
            type="text"
            value={config.greeting}
            onChange={(e) => updateField('greeting', e.target.value)}
            placeholder="Hi {{name}},"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <label htmlFor="tpl-body" className="text-xs font-semibold text-slate-700">
            Body Paragraphs (separate paragraphs with a blank line)
          </label>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-slate-500">Insert tag:</span>
            {['{{name}}', '{{email}}', '{{domain}}'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  updateField(
                    'bodyCopy',
                    `${config.bodyCopy}${config.bodyCopy.endsWith(' ') || !config.bodyCopy ? '' : ' '}${tag}`
                  )
                }
                className="font-mono font-medium text-sky-700 hover:underline underline-offset-2 cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <textarea
          id="tpl-body"
          rows={4}
          value={config.bodyCopy}
          onChange={(e) => updateField('bodyCopy', e.target.value)}
          placeholder="Write your message paragraphs here..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs leading-relaxed text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="tpl-highlight" className="block text-xs font-semibold text-slate-700 mb-1">
            Highlight Callout Box (optional)
          </label>
          <input
            id="tpl-highlight"
            type="text"
            value={config.highlightBox}
            onChange={(e) => updateField('highlightBox', e.target.value)}
            placeholder="Key takeaway, coupon code, or deadline note..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tpl-cta-label" className="block text-xs font-semibold text-slate-700 mb-1">
            CTA Button Label (optional)
          </label>
          <input
            id="tpl-cta-label"
            type="text"
            value={config.ctaLabel}
            onChange={(e) => updateField('ctaLabel', e.target.value)}
            placeholder="Read More"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="tpl-cta-url" className="block text-xs font-semibold text-slate-700 mb-1">
            CTA Button URL
          </label>
          <input
            id="tpl-cta-url"
            type="url"
            value={config.ctaUrl}
            onChange={(e) => updateField('ctaUrl', e.target.value)}
            placeholder="https://yourdomain.com/offer"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="tpl-footer" className="block text-xs font-semibold text-slate-700 mb-1">
            Template Footer Line
          </label>
          <input
            id="tpl-footer"
            type="text"
            value={config.footerNote}
            onChange={(e) => updateField('footerNote', e.target.value)}
            placeholder="Company Name · City, Country"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Generated Template Preview & Actions */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">Template Preview</span>
            <span className="text-[11px] text-slate-500">
              for {previewRecipient.name} &lt;{previewRecipient.email}&gt;
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {previewKind === 'rendered' && (
              <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  aria-label="Desktop preview width"
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                    viewportMode === 'desktop'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="h-3 w-3" aria-hidden="true" />
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  aria-label="Mobile preview width"
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                    viewportMode === 'mobile'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="h-3 w-3" aria-hidden="true" />
                  Mobile
                </button>
              </div>
            )}

            <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setPreviewKind('rendered')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                  previewKind === 'rendered'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="h-3 w-3" aria-hidden="true" />
                Visual
              </button>
              <button
                type="button"
                onClick={() => setPreviewKind('source')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                  previewKind === 'source'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="h-3 w-3" aria-hidden="true" />
                HTML
              </button>
            </div>
          </div>
        </div>

        {previewKind === 'rendered' ? (
          <div className="flex justify-center overflow-x-auto rounded-lg border border-slate-200 bg-slate-200/60 p-2">
            <iframe
              title="Generated HTML email template preview"
              srcDoc={generatedMergedHtml}
              sandbox=""
              className={`h-[340px] rounded border border-slate-200 bg-white transition-all duration-200 ${
                viewportMode === 'mobile' ? 'w-[360px] max-w-full' : 'w-full'
              }`}
            />
          </div>
        ) : (
          <pre className="h-[340px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
            <code>{generatedRawHtml}</code>
          </pre>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onApplyToCampaign(config.subject, generatedRawHtml, 'preview')
              }
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer whitespace-nowrap"
            >
              <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
              Generate &amp; Preview Campaign
            </button>
            <button
              type="button"
              onClick={() =>
                onApplyToCampaign(config.subject, generatedRawHtml, 'compose')
              }
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              Apply to HTML Editor
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCopyHtml()}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              {copiedHtml ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  Copied HTML
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                  Copy HTML
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Download .HTML
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
