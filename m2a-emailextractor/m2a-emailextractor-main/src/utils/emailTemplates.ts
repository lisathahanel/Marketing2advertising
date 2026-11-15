export type EmailTemplatePreset = 'newsletter' | 'launch' | 'promo' | 'minimal';

export interface HtmlTemplateConfig {
  preset: EmailTemplatePreset;
  brandName: string;
  accentColor: string;
  subject: string;
  preheader: string;
  headline: string;
  greeting: string;
  bodyCopy: string;
  highlightBox: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}

export const TEMPLATE_ACCENT_SWATCHES: Array<{ label: string; value: string }> = [
  { label: 'Sky Blue', value: '#0284c7' },
  { label: 'Slate Ink', value: '#0f172a' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Indigo', value: '#4f46e5' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Amber', value: '#d97706' },
];

export const TEMPLATE_PRESET_META: Record<
  EmailTemplatePreset,
  {
    label: string;
    description: string;
    defaults: Omit<HtmlTemplateConfig, 'preset' | 'brandName' | 'accentColor' | 'footerNote'>;
  }
> = {
  newsletter: {
    label: 'Newsletter',
    description: 'Editorial header, structured paragraphs, callout box, and CTA.',
    defaults: {
      subject: 'Monthly Highlights for {{name}}',
      preheader: 'Key updates, guides, and resources curated for {{domain}}.',
      headline: 'Your Monthly Product & Industry Digest',
      greeting: 'Hi {{name}},',
      bodyCopy: `Here is a quick roundup of the updates, tools, and practical insights we put together for your team at {{domain}}.\n\nWe focused on workflow speed, deliverability best practices, and cleaner list hygiene so every campaign lands cleanly in the primary inbox.`,
      highlightBox:
        'Tip of the month: Always verify newly collected contacts and keep your unsubscribe link clear to protect sender reputation.',
      ctaLabel: 'Read the Full Update',
      ctaUrl: 'https://example.com/updates',
    },
  },
  launch: {
    label: 'Product Launch',
    description: 'High-contrast announcement banner with spotlight feature block.',
    defaults: {
      subject: 'Introducing our newest release — built for {{name}}',
      preheader: 'Faster setup, cleaner reporting, and instant campaign previews.',
      headline: 'Meet the Faster Way to Ship Campaigns',
      greeting: 'Hello {{name}},',
      bodyCopy: `We just released a major upgrade designed to help teams at {{domain}} build, preview, and deliver personalized emails in minutes.\n\nEverything works directly with your existing SMTP server or preferred email API provider.`,
      highlightBox:
        'Included in this release: Responsive HTML templates, custom merge tags, and CSV delivery logs out of the box.',
      ctaLabel: 'Explore What Is New',
      ctaUrl: 'https://example.com/launch',
    },
  },
  promo: {
    label: 'Promotional Offer',
    description: 'Focused campaign card built around a clear offer and action button.',
    defaults: {
      subject: 'Special invitation for {{name}} at {{domain}}',
      preheader: 'Unlock early access and priority onboarding this week.',
      headline: 'Unlock Early Access for Your Team',
      greeting: 'Hi {{name}},',
      bodyCopy: `We are extending a limited-time partner invitation to teams at {{domain}}.\n\nActivate your workspace before Friday to lock in priority onboarding and full access to all campaign tools.`,
      highlightBox: 'Offer Window: Valid through the end of this week for {{email}}.',
      ctaLabel: 'Claim Early Access',
      ctaUrl: 'https://example.com/offer',
    },
  },
  minimal: {
    label: 'Minimal Card',
    description: 'Clean top-rule layout ideal for founder notes and direct outreach.',
    defaults: {
      subject: 'Quick note for {{name}}',
      preheader: 'Following up regarding {{domain}}.',
      headline: 'A Quick Note From Our Team',
      greeting: 'Hi {{name}},',
      bodyCopy: `I wanted to share a brief update regarding our work with teams like {{domain}}.\n\nIf you are reviewing email workflows this quarter, feel free to reply directly to this message and I will be glad to share details.`,
      highlightBox: '',
      ctaLabel: 'Schedule a Quick Chat',
      ctaUrl: 'https://example.com/contact',
    },
  },
};

export function createInitialTemplateConfig(): HtmlTemplateConfig {
  const starter = TEMPLATE_PRESET_META.newsletter.defaults;
  return {
    preset: 'newsletter',
    brandName: 'Acme Updates',
    accentColor: '#0284c7',
    footerNote: 'Acme Updates · Sent via your configured SMTP / Email API',
    ...starter,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHexColor(input: string): string {
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) return trimmed;
  return '#0284c7';
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return escapeHtml(`https://${trimmed}`);
}

function formatBodyParagraphs(bodyCopy: string): string {
  const paragraphs = bodyCopy
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return '';

  return paragraphs
    .map((para) => {
      const safeLines = escapeHtml(para).replace(/\n/g, '<br/>');
      return `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#334155;">${safeLines}</p>`;
    })
    .join('\n                ');
}

export function generateHtmlEmailTemplate(config: HtmlTemplateConfig): string {
  const accent = sanitizeHexColor(config.accentColor);
  const brand = escapeHtml(config.brandName.trim() || 'Your Brand');
  const preheader = escapeHtml(config.preheader.trim());
  const headline = escapeHtml(config.headline.trim() || 'Campaign Update');
  const greeting = escapeHtml(config.greeting.trim());
  const bodyHtml = formatBodyParagraphs(config.bodyCopy);
  const highlight = config.highlightBox.trim()
    ? escapeHtml(config.highlightBox.trim()).replace(/\n/g, '<br/>')
    : '';
  const ctaLabel = escapeHtml(config.ctaLabel.trim());
  const ctaHref = sanitizeUrl(config.ctaUrl);
  const footerNote = escapeHtml(config.footerNote.trim() || brand);

  const isBannerHero = config.preset === 'launch' || config.preset === 'promo';
  const isMinimal = config.preset === 'minimal';

  const preheaderBlock = preheader
    ? `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>`
    : '';

  const headerBlock = isBannerHero
    ? `<tr>
            <td style="background-color:${accent};padding:28px 32px;border-radius:10px 10px 0 0;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#e2e8f0;margin-bottom:8px;">
                ${brand}
              </div>
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">
                ${headline}
              </h1>
            </td>
          </tr>`
    : isMinimal
      ? `<tr>
            <td style="border-top:4px solid ${accent};padding:28px 32px 12px 32px;">
              <div style="font-size:13px;font-weight:700;color:${accent};margin-bottom:10px;">
                ${brand}
              </div>
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:#0f172a;">
                ${headline}
              </h1>
            </td>
          </tr>`
      : `<tr>
            <td style="background-color:#ffffff;padding:24px 32px 18px 32px;border-bottom:2px solid ${accent};border-radius:10px 10px 0 0;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${accent};margin-bottom:8px;">
                ${brand}
              </div>
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:#0f172a;">
                ${headline}
              </h1>
            </td>
          </tr>`;

  const highlightBlock = highlight
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
                  <tr>
                    <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 18px;font-size:14px;line-height:1.6;color:#1e293b;">
                      ${highlight}
                    </td>
                  </tr>
                </table>`
    : '';

  const ctaBlock =
    ctaLabel && config.ctaUrl.trim()
      ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px 0;">
                  <tr>
                    <td align="center" bgcolor="${accent}" style="border-radius:8px;">
                      <a href="${ctaHref}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>`
      : '';

  const greetingHtml = greeting
    ? `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;font-weight:600;color:#0f172a;">${greeting}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(config.subject || headline)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  ${preheaderBlock}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f6f8;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          ${headerBlock}
          <tr>
            <td style="padding:26px 32px 28px 32px;">
              ${greetingHtml}
              ${bodyHtml}
              ${highlightBlock}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;font-size:12px;line-height:1.5;color:#64748b;">
              ${footerNote}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function injectUnsubscribeIntoHtml(html: string, recipientEmail: string): string {
  const safeEmail = escapeHtml(recipientEmail);
  const snippet = `<div style="max-width:600px;margin:14px auto 0 auto;padding:0 16px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#64748b;">Sent to ${safeEmail}. Reply with &ldquo;unsubscribe&rdquo; to opt out of future emails.</div>`;

  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}\n</body>`);
  }

  return `${html}<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 12px;"/><p style="font-size:12px;color:#64748b;">Sent to ${safeEmail}. Reply with "unsubscribe" to opt out of future emails.</p>`;
}

export function extractPlainTextFromHtml(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<div[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h1|h2|h3|h4|div|tr|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
