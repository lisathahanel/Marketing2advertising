import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Monitor,
  Pause,
  Play,
  Plug,
  Send,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Wand2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { extractEmailsFromText } from '../utils/emailTools';
import {
  HtmlTemplateConfig,
  createInitialTemplateConfig,
  extractPlainTextFromHtml,
  injectUnsubscribeIntoHtml,
} from '../utils/emailTemplates';
import { HtmlTemplateBuilder } from './HtmlTemplateBuilder';
import {
  VerificationIntegrationPanel,
  VERIFICATION_PROVIDERS,
  type ListVerificationEntry,
  type VerificationProviderId,
} from './VerificationIntegrationPanel';

interface EmailSenderProps {
  extractedEmails: string[];
}

type TransportMode = 'smtp' | 'api';
type ApiProvider = 'resend' | 'sendgrid' | 'brevo' | 'postmark' | 'custom';
type DeliveryState = 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Skipped';

interface RecipientEntry {
  email: string;
  name: string;
}

interface DeliveryLogRow {
  email: string;
  name: string;
  status: DeliveryState;
  detail: string;
}

const API_PROVIDER_PRESETS: Record<
  ApiProvider,
  { label: string; endpoint: string; headerName: string }
> = {
  resend: {
    label: 'Resend',
    endpoint: 'https://api.resend.com/emails',
    headerName: 'Authorization',
  },
  sendgrid: {
    label: 'SendGrid v3',
    endpoint: 'https://api.sendgrid.com/v3/mail/send',
    headerName: 'Authorization',
  },
  brevo: {
    label: 'Brevo (Sendinblue)',
    endpoint: 'https://api.brevo.com/v3/smtp/email',
    headerName: 'api-key',
  },
  postmark: {
    label: 'Postmark',
    endpoint: 'https://api.postmarkapp.com/email',
    headerName: 'X-Postmark-Server-Token',
  },
  custom: {
    label: 'Custom REST API',
    endpoint: '',
    headerName: 'Authorization',
  },
};

const SMTP_PRESETS: Array<{
  id: string;
  label: string;
  host: string;
  port: string;
  secure: boolean;
  defaultUsername?: string;
  hint?: string;
}> = [
  { id: 'custom', label: 'Custom SMTP', host: '', port: '587', secure: false },
  {
    id: 'sendgrid',
    label: 'SendGrid SMTP',
    host: 'smtp.sendgrid.net',
    port: '587',
    secure: false,
    defaultUsername: 'apikey',
    hint: 'SendGrid SMTP uses "apikey" as SMTP Username and your SendGrid API Key as Password. Verify your From Email below.',
  },
  {
    id: 'smtpcom',
    label: 'smtp.com',
    host: 'send.smtp.com',
    port: '587',
    secure: false,
    hint: 'smtp.com relay uses send.smtp.com (ports 587, 2525, or 465 SSL). Verify your From Email or match your authorized sender.',
  },
  {
    id: 'gmail',
    label: 'Gmail SMTP (App Password)',
    host: 'smtp.gmail.com',
    port: '587',
    secure: false,
    hint: 'Gmail requires an App Password and From Email matching your Gmail username or verified alias.',
  },
  {
    id: 'outlook',
    label: 'Outlook / Microsoft 365',
    host: 'smtp.office365.com',
    port: '587',
    secure: false,
    hint: 'Microsoft 365 typically requires From Email to match your authenticated SMTP Username.',
  },
  {
    id: 'zoho',
    label: 'Zoho Mail',
    host: 'smtp.zoho.com',
    port: '465',
    secure: true,
    hint: 'Zoho SMTP requires From Email to match your Zoho account email or verified alias.',
  },
  {
    id: 'ses',
    label: 'Amazon SES (us-east-1)',
    host: 'email-smtp.us-east-1.amazonaws.com',
    port: '587',
    secure: false,
    hint: 'Amazon SES requires From Email (or its sending domain) to be verified in SES.',
  },
];

function isValidEmailFormat(value: string): boolean {
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(value.trim());
}

const CAMPAIGN_TEMPLATES: Record<
  'newsletter' | 'launch' | 'outreach',
  { label: string; subject: string; body: string }
> = {
  newsletter: {
    label: 'Newsletter Update',
    subject: 'Monthly Highlights for {{name}}',
    body: `<p>Hi {{name}},</p>
<p>Here are our latest updates, resources, and tips curated for <strong>{{domain}}</strong>.</p>
<p>Reply directly to this email if you have any questions.</p>
<p>Best regards,<br/>The Team</p>`,
  },
  launch: {
    label: 'Product Announcement',
    subject: 'Introducing our latest release — built for {{name}}',
    body: `<p>Hello {{name}},</p>
<p>We just launched a faster workflow to help teams save hours every week.</p>
<p>Let us know what you think!</p>
<p>Cheers,<br/>Product Team</p>`,
  },
  outreach: {
    label: 'Direct Outreach',
    subject: 'Quick question for {{name}} at {{domain}}',
    body: `<p>Hi {{name}},</p>
<p>I noticed your work at {{domain}} and wanted to share a brief note regarding a potential collaboration.</p>
<p>Would you be open to a quick chat this week?</p>
<p>Best,<br/>Alex</p>`,
  },
};

const SAMPLE_RECIPIENTS = `sarah.jenkins@acme-corp.com, Sarah Jenkins
elena.rostova@northstar-labs.io, Elena Rostova
dchen@pacificventures.co.uk, David Chen`;

function parseRecipientLines(raw: string): RecipientEntry[] {
  if (!raw.trim()) return [];
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const seen = new Set<string>();
  const recipients: RecipientEntry[] = [];

  for (const line of lines) {
    const commaParts = line.split(',');
    const extractedFromLine = extractEmailsFromText(line).uniqueEmails;

    if (extractedFromLine.length === 1 && commaParts.length >= 2) {
      const email = extractedFromLine[0];
      if (!seen.has(email)) {
        seen.add(email);
        // Find non-email part as name
        const namePart = commaParts
          .find((part) => !part.toLowerCase().includes(email))
          ?.trim();
        const fallbackName = email.split('@')[0].replace(/[._+-]+/g, ' ');
        recipients.push({
          email,
          name: namePart || capitalizeWords(fallbackName),
        });
      }
    } else {
      for (const email of extractedFromLine) {
        if (!seen.has(email)) {
          seen.add(email);
          const fallbackName = email.split('@')[0].replace(/[._+-]+/g, ' ');
          recipients.push({
            email,
            name: capitalizeWords(fallbackName),
          });
        }
      }
    }
  }

  return recipients;
}

function capitalizeWords(text: string): string {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function applyMergeTags(template: string, recipient: RecipientEntry): string {
  const domain = recipient.email.split('@')[1] ?? '';
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, recipient.name || 'there')
    .replace(/\{\{\s*email\s*\}\}/gi, recipient.email)
    .replace(/\{\{\s*domain\s*\}\}/gi, domain);
}

function stripHtmlTags(html: string): string {
  return extractPlainTextFromHtml(html);
}

export function EmailSender({ extractedEmails }: EmailSenderProps) {
  // Transport configuration
  const [transportMode, setTransportMode] = useState<TransportMode>('smtp');

  // SMTP fields
  const [smtpPreset, setSmtpPreset] = useState('custom');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [smtpTestState, setSmtpTestState] = useState<{
    status: 'idle' | 'testing' | 'ok' | 'error';
    message?: string;
  }>({ status: 'idle' });

  // API fields
  const [apiProvider, setApiProvider] = useState<ApiProvider>('resend');
  const [apiEndpoint, setApiEndpoint] = useState(API_PROVIDER_PRESETS.resend.endpoint);
  const [apiAuthHeader, setApiAuthHeader] = useState(API_PROVIDER_PRESETS.resend.headerName);
  const [apiToken, setApiToken] = useState('');
  const [showApiToken, setShowApiToken] = useState(false);

  // Campaign details
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [useSmtpUserAsFrom, setUseSmtpUserAsFrom] = useState(false);
  const [senderVerifyState, setSenderVerifyState] = useState<{
    status: 'idle' | 'verifying' | 'verified' | 'error';
    verifiedEmail?: string;
    message?: string;
  }>({ status: 'idle' });
  const [replyTo, setReplyTo] = useState('');
  const [sendDelayMs, setSendDelayMs] = useState(500);
  const [recipientsRaw, setRecipientsRaw] = useState('');
  const [subject, setSubject] = useState(CAMPAIGN_TEMPLATES.newsletter.subject);
  const [bodyContent, setBodyContent] = useState(CAMPAIGN_TEMPLATES.newsletter.body);
  const [contentFormat, setContentFormat] = useState<'html' | 'text'>('html');
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(true);
  const [composerTab, setComposerTab] = useState<'compose' | 'generator' | 'preview'>('compose');
  const [templateConfig, setTemplateConfig] = useState<HtmlTemplateConfig>(() =>
    createInitialTemplateConfig()
  );
  const [previewRecipientIdx, setPreviewRecipientIdx] = useState(0);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewFormatView, setPreviewFormatView] = useState<'rendered' | 'source'>('rendered');
  const [copiedPreviewHtml, setCopiedPreviewHtml] = useState(false);
  const [templateAppliedMsg, setTemplateAppliedMsg] = useState<string | null>(null);

  // Third-party Email Verification Integration settings
  const [integrationOpen, setIntegrationOpen] = useState(true);
  const [verificationProvider, setVerificationProvider] =
    useState<VerificationProviderId>('zerobounce');
  const [verificationApiKey, setVerificationApiKey] = useState('');
  const [verificationCustomEndpoint, setVerificationCustomEndpoint] = useState('');
  const [skipUndeliverableOnSend, setSkipUndeliverableOnSend] = useState(true);
  const [verificationResultsByEmail, setVerificationResultsByEmail] = useState<
    Record<string, ListVerificationEntry>
  >({});

  // Dispatch state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<DeliveryLogRow[]>([]);

  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);

  const smtpUserTrimmed = smtpUser.trim();
  const smtpUserIsEmail = isValidEmailFormat(smtpUserTrimmed);
  const effectiveFromEmail =
    transportMode === 'smtp' && useSmtpUserAsFrom ? smtpUserTrimmed : fromEmail.trim();
  const matchesSmtpUsername =
    transportMode === 'smtp' &&
    smtpUserIsEmail &&
    effectiveFromEmail.toLowerCase() === smtpUserTrimmed.toLowerCase();
  const isFromEmailVerified =
    senderVerifyState.status === 'verified' &&
    senderVerifyState.verifiedEmail === effectiveFromEmail.toLowerCase();
  const senderIdentityReady =
    isValidEmailFormat(effectiveFromEmail) && (matchesSmtpUsername || isFromEmailVerified);

  const activeSmtpPresetMeta = SMTP_PRESETS.find((p) => p.id === smtpPreset);

  const recipients = useMemo(() => parseRecipientLines(recipientsRaw), [recipientsRaw]);

  const safePreviewIndex =
    recipients.length > 0 ? Math.min(previewRecipientIdx, recipients.length - 1) : 0;

  const previewRecipient: RecipientEntry = recipients[safePreviewIndex] ?? {
    email: 'alex.morgan@company.com',
    name: 'Alex Morgan',
  };

  const renderedPreviewSubject = useMemo(
    () => applyMergeTags(subject, previewRecipient),
    [subject, previewRecipient]
  );

  const buildMessageBodies = (recipient: RecipientEntry) => {
    const merged = applyMergeTags(bodyContent, recipient);
    const unsubText = includeUnsubscribe
      ? `\n\n---\nSent to ${recipient.email}. Reply with "unsubscribe" to opt out.`
      : '';

    if (contentFormat === 'html') {
      const html = includeUnsubscribe ? injectUnsubscribeIntoHtml(merged, recipient.email) : merged;
      const text = `${stripHtmlTags(merged)}${unsubText}`;
      return { html, text };
    }
    return {
      html: undefined,
      text: `${merged}${unsubText}`,
    };
  };

  const previewBodies = useMemo(
    () => buildMessageBodies(previewRecipient),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bodyContent, contentFormat, includeUnsubscribe, previewRecipient]
  );

  const wrapPreviewHtmlDocument = (htmlFragmentOrDoc: string): string => {
    if (/<!doctype|<html[\s>]/i.test(htmlFragmentOrDoc)) {
      return htmlFragmentOrDoc;
    }
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:24px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.65;color:#1e293b;">
${htmlFragmentOrDoc}
</body>
</html>`;
  };

  const handleApplyGeneratedTemplate = (
    nextSubject: string,
    generatedHtml: string,
    openTab: 'compose' | 'preview'
  ) => {
    setSubject(nextSubject);
    setBodyContent(generatedHtml);
    setContentFormat('html');
    setPreviewFormatView('rendered');
    setComposerTab(openTab);
    setTemplateAppliedMsg('Generated HTML template applied to your campaign.');
    setTimeout(() => setTemplateAppliedMsg(null), 3500);
  };

  const handleCopyPreviewHtml = async () => {
    if (!previewBodies.html) return;
    try {
      await navigator.clipboard.writeText(previewBodies.html);
      setCopiedPreviewHtml(true);
      setTimeout(() => setCopiedPreviewHtml(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadPreviewHtml = () => {
    if (!previewBodies.html) return;
    const blob = new Blob([wrapPreviewHtmlDocument(previewBodies.html)], {
      type: 'text/html;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-email-template.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectSmtpPreset = (presetId: string) => {
    setSmtpPreset(presetId);
    const found = SMTP_PRESETS.find((p) => p.id === presetId);
    if (found && found.id !== 'custom') {
      setSmtpHost(found.host);
      setSmtpPort(found.port);
      setSmtpSecure(found.secure);
      if (found.defaultUsername) {
        setSmtpUser(found.defaultUsername);
        setUseSmtpUserAsFrom(false);
      } else if (smtpUser.trim() === 'apikey') {
        setSmtpUser('');
      }
    }
    setSmtpTestState({ status: 'idle' });
  };

  const handleSelectApiProvider = (provider: ApiProvider) => {
    setApiProvider(provider);
    setApiEndpoint(API_PROVIDER_PRESETS[provider].endpoint);
    setApiAuthHeader(API_PROVIDER_PRESETS[provider].headerName);
  };

  const handleVerifyFromEmail = async () => {
    const candidate = effectiveFromEmail.trim();
    if (!isValidEmailFormat(candidate)) {
      setSenderVerifyState({
        status: 'error',
        message: 'Enter a valid From Email address first.',
      });
      return;
    }

    setSenderVerifyState({
      status: 'verifying',
      message: `Checking MX, SPF, and DMARC records for ${candidate}...`,
    });
    setValidationError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_EMAIL_API_BASE || ''}/api/campaign/verify-sender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: candidate,
          smtpUsername: transportMode === 'smtp' ? smtpUser.trim() : undefined,
          smtpHost: transportMode === 'smtp' ? smtpHost.trim() : undefined,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        email?: string;
        message?: string;
        error?: string;
      };

      if (data.ok && data.email) {
        setSenderVerifyState({
          status: 'verified',
          verifiedEmail: data.email.toLowerCase(),
          message: data.message ?? `Sender ${data.email} verified.`,
        });
      } else {
        setSenderVerifyState({
          status: 'error',
          message: data.error ?? 'Sender verification failed.',
        });
      }
    } catch {
      setSenderVerifyState({
        status: 'error',
        message: 'Could not reach verification server.',
      });
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpHost.trim() || !smtpPort.trim()) {
      setSmtpTestState({ status: 'error', message: 'Enter SMTP host and port first.' });
      return;
    }
    setSmtpTestState({ status: 'testing', message: 'Testing SMTP handshake...' });
    try {
      const res = await fetch(`${import.meta.env.VITE_EMAIL_API_BASE || ''}/api/campaign/test-smtp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: Number(smtpPort),
          secure: smtpSecure,
          username: smtpUser.trim(),
          password: smtpPass,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; error?: string };
      if (data.ok) {
        setSmtpTestState({ status: 'ok', message: data.message ?? 'SMTP verified.' });
      } else {
        setSmtpTestState({ status: 'error', message: data.error ?? 'Connection failed.' });
      }
    } catch {
      setSmtpTestState({
        status: 'error',
        message: 'Could not reach local relay server.',
      });
    }
  };

  const handleImportExtracted = () => {
    if (extractedEmails.length === 0) return;
    setRecipientsRaw(extractedEmails.join('\n'));
    setValidationError(null);
  };

  const handleRemoveUndeliverable = (emailsToRemove: Set<string>) => {
    if (emailsToRemove.size === 0) return;
    const keptLines = recipientsRaw
      .split(/\r?\n/)
      .filter((line) => {
        const lineEmails = extractEmailsFromText(line).uniqueEmails;
        if (lineEmails.length === 0) return line.trim().length > 0;
        return !lineEmails.every((email) => emailsToRemove.has(email.toLowerCase()));
      });
    setRecipientsRaw(keptLines.join('\n'));
  };

  const handleStartCampaign = async () => {
    setValidationError(null);

    if (!isValidEmailFormat(effectiveFromEmail)) {
      setValidationError(
        transportMode === 'smtp' && useSmtpUserAsFrom
          ? 'Your SMTP Username must be a valid email address when "Use SMTP Username as From Email" is enabled.'
          : 'Please enter a valid From Email address.'
      );
      return;
    }
    if (!senderIdentityReady) {
      setValidationError(
        transportMode === 'smtp'
          ? 'From Email must be verified or match your SMTP Username. Click "Verify Sender" or enable "Use SMTP Username as From Email".'
          : 'Please verify your From Email address by clicking "Verify Sender" before sending.'
      );
      return;
    }
    if (recipients.length === 0) {
      setValidationError('Please add at least one valid recipient email address.');
      return;
    }
    if (!subject.trim() || !bodyContent.trim()) {
      setValidationError('Subject line and message body are required.');
      return;
    }
    if (transportMode === 'smtp' && (!smtpHost.trim() || !smtpPort.trim())) {
      setValidationError('Please enter your SMTP Host and Port.');
      return;
    }
    if (transportMode === 'api' && (!apiEndpoint.trim() || !apiToken.trim())) {
      setValidationError('Please enter your API Endpoint URL and API Key / Token.');
      return;
    }

    const initialLogs: DeliveryLogRow[] = recipients.map((r) => ({
      email: r.email,
      name: r.name,
      status: 'Queued',
      detail: 'Waiting in queue',
    }));
    setLogs(initialLogs);
    setIsSending(true);
    setIsPaused(false);
    pausedRef.current = false;
    stoppedRef.current = false;

    for (let i = 0; i < recipients.length; i++) {
      if (stoppedRef.current) {
        setLogs((prev) =>
          prev.map((row, idx) =>
            idx >= i && row.status === 'Queued'
              ? { ...row, status: 'Skipped', detail: 'Stopped by user' }
              : row
          )
        );
        break;
      }

      while (pausedRef.current && !stoppedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (stoppedRef.current) {
        setLogs((prev) =>
          prev.map((row, idx) =>
            idx >= i && row.status === 'Queued'
              ? { ...row, status: 'Skipped', detail: 'Stopped by user' }
              : row
          )
        );
        break;
      }

      const recipient = recipients[i];
      const verificationEntry = verificationResultsByEmail[recipient.email.toLowerCase()];
      if (
        skipUndeliverableOnSend &&
        verificationEntry &&
        (verificationEntry.verdict === 'Invalid' || verificationEntry.verdict === 'Risky')
      ) {
        setLogs((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  status: 'Skipped',
                  detail: `Skipped — Flagged ${verificationEntry.verdict} by ${VERIFICATION_PROVIDERS[verificationProvider].label}`,
                }
              : row
          )
        );
        continue;
      }

      setLogs((prev) =>
        prev.map((row, idx) =>
          idx === i ? { ...row, status: 'Sending', detail: 'Connecting...' } : row
        )
      );

      const personalizedSubject = applyMergeTags(subject, recipient);
      const { html, text } = buildMessageBodies(recipient);

      try {
        const res = await fetch(`${import.meta.env.VITE_EMAIL_API_BASE || ''}/api/campaign/send-one`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: transportMode,
            smtp:
              transportMode === 'smtp'
                ? {
                    host: smtpHost.trim(),
                    port: Number(smtpPort),
                    secure: smtpSecure,
                    username: smtpUser.trim(),
                    password: smtpPass,
                  }
                : undefined,
            api:
              transportMode === 'api'
                ? {
                    provider: apiProvider,
                    endpointUrl: apiEndpoint.trim(),
                    authHeaderName: apiAuthHeader.trim(),
                    authToken: apiToken.trim(),
                  }
                : undefined,
            fromName: fromName.trim(),
            fromEmail: effectiveFromEmail,
            replyTo: replyTo.trim() || undefined,
            to: recipient.email,
            subject: personalizedSubject,
            html,
            text,
          }),
        });

        const data = (await res.json()) as {
          ok: boolean;
          messageId?: string;
          detail?: string;
          error?: string;
        };

        setLogs((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? {
                  ...row,
                  status: data.ok ? 'Sent' : 'Failed',
                  detail: data.ok
                    ? data.messageId
                      ? `${data.detail ?? 'Sent'} (${data.messageId})`
                      : data.detail ?? 'Sent'
                    : data.error ?? 'Delivery failed',
                }
              : row
          )
        );
      } catch {
        setLogs((prev) =>
          prev.map((row, idx) =>
            idx === i
              ? { ...row, status: 'Failed', detail: 'Network error reaching relay server' }
              : row
          )
        );
      }

      if (i < recipients.length - 1 && sendDelayMs > 0 && !stoppedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, sendDelayMs));
      }
    }

    setIsSending(false);
    setIsPaused(false);
    pausedRef.current = false;
  };

  const handleTogglePause = () => {
    const next = !isPaused;
    pausedRef.current = next;
    setIsPaused(next);
  };

  const handleStopCampaign = () => {
    stoppedRef.current = true;
    pausedRef.current = false;
    setIsPaused(false);
  };

  const handleExportReport = () => {
    if (logs.length === 0) return;
    const rows = [
      'Email,Name,Status,Detail',
      ...logs.map(
        (r) =>
          `"${r.email.replace(/"/g, '""')}","${r.name.replace(/"/g, '""')}","${r.status}","${r.detail.replace(/"/g, '""')}"`
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-delivery-report.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const logCounts = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let queued = 0;
    for (const row of logs) {
      if (row.status === 'Sent') sent++;
      else if (row.status === 'Failed') failed++;
      else if (row.status === 'Queued' || row.status === 'Sending') queued++;
    }
    return { sent, failed, queued };
  }, [logs]);

  const progressPct =
    logs.length > 0
      ? Math.round(((logs.length - logCounts.queued) / logs.length) * 100)
      : 0;

  return (
    <section id="sender" aria-labelledby="sender-heading" className="scroll-mt-20 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="sender-heading"
            className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Bulk Email Sender
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Free email marketing software to personalize and send bulk campaigns using your own
            SMTP server or Email API provider.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div
            role="tablist"
            aria-label="Sending transport mode"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={transportMode === 'smtp'}
              onClick={() => setTransportMode('smtp')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                transportMode === 'smtp'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Server className="h-3.5 w-3.5" aria-hidden="true" />
              Own SMTP Server
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={transportMode === 'api'}
              onClick={() => setTransportMode('api')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                transportMode === 'api'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Webhook className="h-3.5 w-3.5" aria-hidden="true" />
              Own Email API
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setIntegrationOpen(true);
              document
                .getElementById('sender-integration-panel')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer whitespace-nowrap"
          >
            <Plug className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Integration
          </button>
        </div>
      </div>

      {/* Step 1: Transport Configuration */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-3.5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {transportMode === 'smtp'
                ? '01. Configure Your SMTP Server'
                : '01. Configure Your Email API Provider'}
            </h3>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              Credentials stay in your browser session and are never stored on our servers.
            </p>
          </div>

          {transportMode === 'smtp' && (
            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={smtpTestState.status === 'testing'}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              {smtpTestState.status === 'testing' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Testing...
                </>
              ) : (
                'Test SMTP Connection'
              )}
            </button>
          )}
        </div>

        {transportMode === 'smtp' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="smtp-preset" className="block text-xs font-semibold text-slate-700 mb-1">
                  Provider Preset
                </label>
                <select
                  id="smtp-preset"
                  value={smtpPreset}
                  onChange={(e) => handleSelectSmtpPreset(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
                >
                  {SMTP_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label htmlFor="smtp-host" className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Host
                </label>
                <input
                  id="smtp-host"
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.yourdomain.com"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="smtp-port" className="block text-xs font-semibold text-slate-700 mb-1">
                    Port
                  </label>
                  <input
                    id="smtp-port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="smtp-security" className="block text-xs font-semibold text-slate-700 mb-1">
                    Encryption
                  </label>
                  <select
                    id="smtp-security"
                    value={smtpSecure ? 'ssl' : 'starttls'}
                    onChange={(e) => {
                      const isSsl = e.target.value === 'ssl';
                      setSmtpSecure(isSsl);
                      if (smtpPort === '587' && isSsl) setSmtpPort('465');
                      if (smtpPort === '465' && !isSsl) setSmtpPort('587');
                    }}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
                  >
                    <option value="starttls">STARTTLS</option>
                    <option value="ssl">SSL / TLS</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="smtp-user" className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Username
                </label>
                <input
                  id="smtp-user"
                  type="text"
                  autoComplete="off"
                  value={smtpUser}
                  onChange={(e) => {
                    const nextUser = e.target.value;
                    setSmtpUser(nextUser);
                    if (useSmtpUserAsFrom) {
                      setFromEmail(nextUser.trim());
                    }
                  }}
                  placeholder={smtpPreset === 'sendgrid' ? 'apikey' : 'you@yourdomain.com'}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="smtp-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                  SMTP Password / App Password
                </label>
                <div className="relative">
                  <input
                    id="smtp-pass"
                    type={showSmtpPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder={
                      smtpPreset === 'sendgrid'
                        ? 'Paste your SendGrid API Key (SG....)'
                        : 'Enter SMTP password'
                    }
                    className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-3 pr-9 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass((v) => !v)}
                    aria-label={showSmtpPass ? 'Hide SMTP password' : 'Show SMTP password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {activeSmtpPresetMeta?.hint && (
              <p className="text-xs text-slate-500">{activeSmtpPresetMeta.hint}</p>
            )}

            {smtpTestState.status !== 'idle' && smtpTestState.message && (
              <div
                role="status"
                className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${
                  smtpTestState.status === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : smtpTestState.status === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {smtpTestState.status === 'ok' && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                )}
                {smtpTestState.status === 'error' && (
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
                )}
                <span>{smtpTestState.message}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="api-provider" className="block text-xs font-semibold text-slate-700 mb-1">
                API Provider
              </label>
              <select
                id="api-provider"
                value={apiProvider}
                onChange={(e) => handleSelectApiProvider(e.target.value as ApiProvider)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
              >
                {Object.entries(API_PROVIDER_PRESETS).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label htmlFor="api-endpoint" className="block text-xs font-semibold text-slate-700 mb-1">
                API Endpoint URL
              </label>
              <input
                id="api-endpoint"
                type="url"
                value={apiEndpoint}
                onChange={(e) => setApiEndpoint(e.target.value)}
                placeholder="https://api.yourprovider.com/v1/send"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="api-header" className="block text-xs font-semibold text-slate-700 mb-1">
                Auth Header
              </label>
              <input
                id="api-header"
                type="text"
                value={apiAuthHeader}
                onChange={(e) => setApiAuthHeader(e.target.value)}
                readOnly={apiProvider !== 'custom'}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-700 focus:border-sky-600 focus:bg-white focus:outline-none read-only:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="api-token" className="block text-xs font-semibold text-slate-700 mb-1">
                API Key / Bearer Token
              </label>
              <div className="relative">
                <input
                  id="api-token"
                  type={showApiToken ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Paste your provider token or key"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-3 pr-9 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowApiToken((v) => !v)}
                  aria-label={showApiToken ? 'Hide token' : 'Show token'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showApiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Integration Settings Panel: Third-Party Email Verification APIs */}
      <VerificationIntegrationPanel
        isOpen={integrationOpen}
        onToggleOpen={() => setIntegrationOpen((prev) => !prev)}
        provider={verificationProvider}
        onProviderChange={setVerificationProvider}
        apiKey={verificationApiKey}
        onApiKeyChange={setVerificationApiKey}
        customEndpoint={verificationCustomEndpoint}
        onCustomEndpointChange={setVerificationCustomEndpoint}
        skipUndeliverableOnSend={skipUndeliverableOnSend}
        onSkipUndeliverableChange={setSkipUndeliverableOnSend}
        recipients={recipients}
        resultsByEmail={verificationResultsByEmail}
        onResultsChange={setVerificationResultsByEmail}
        onRemoveUndeliverable={handleRemoveUndeliverable}
      />

      {/* Step 2: Sender Identity, Recipients & Composer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Left: Sender & Recipients */}
        <div className="lg:col-span-5 flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              02. Sender &amp; Audience List
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sender-from-name" className="block text-xs font-semibold text-slate-700 mb-1">
                From Name
              </label>
              <input
                id="sender-from-name"
                type="text"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Acme Updates"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="sender-from-email" className="text-xs font-semibold text-slate-700">
                  From Email *
                </label>
                {transportMode === 'smtp' && (
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSmtpUserAsFrom}
                      disabled={!smtpUserIsEmail && !useSmtpUserAsFrom}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseSmtpUserAsFrom(checked);
                        if (checked && smtpUserTrimmed) {
                          setFromEmail(smtpUserTrimmed);
                        }
                        setValidationError(null);
                      }}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-600 disabled:opacity-40"
                    />
                    <span className={!smtpUserIsEmail ? 'text-slate-400' : 'text-slate-700'}>
                      Use SMTP Username
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="sender-from-email"
                  type="email"
                  value={effectiveFromEmail}
                  readOnly={transportMode === 'smtp' && useSmtpUserAsFrom}
                  onChange={(e) => {
                    setFromEmail(e.target.value);
                    if (senderVerifyState.status !== 'idle') {
                      setSenderVerifyState({ status: 'idle' });
                    }
                  }}
                  placeholder="newsletter@yourdomain.com"
                  className="w-full min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none read-only:bg-slate-100 read-only:text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => void handleVerifyFromEmail()}
                  disabled={senderVerifyState.status === 'verifying' || !effectiveFromEmail}
                  className="inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {senderVerifyState.status === 'verifying' ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                      Verify Sender
                    </>
                  )}
                </button>
              </div>

              {/* Sender verification / SMTP match status */}
              {matchesSmtpUsername && (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Matches your SMTP Username ({smtpUserTrimmed}). Ready to send.
                </p>
              )}
              {!matchesSmtpUsername && isFromEmailVerified && senderVerifyState.message && (
                <p className="flex items-start gap-1.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{senderVerifyState.message}</span>
                </p>
              )}
              {senderVerifyState.status === 'error' && senderVerifyState.message && (
                <p className="flex items-start gap-1.5 text-[11px] font-medium text-red-700">
                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{senderVerifyState.message}</span>
                </p>
              )}
              {!matchesSmtpUsername &&
                !isFromEmailVerified &&
                senderVerifyState.status !== 'error' &&
                senderVerifyState.status !== 'verifying' && (
                  <p className="text-[11px] text-slate-500">
                    {transportMode === 'smtp'
                      ? 'From Email must be verified with "Verify Sender" or match your SMTP Username.'
                      : 'Verify your From Email domain before launching your campaign.'}
                  </p>
                )}
            </div>
            <div>
              <label htmlFor="sender-reply-to" className="block text-xs font-semibold text-slate-700 mb-1">
                Reply-To (optional)
              </label>
              <input
                id="sender-reply-to"
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
                placeholder="support@yourdomain.com"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 font-mono text-xs text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="sender-delay" className="block text-xs font-semibold text-slate-700 mb-1">
                Send Throttle
              </label>
              <select
                id="sender-delay"
                value={sendDelayMs}
                onChange={(e) => setSendDelayMs(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
              >
                <option value={0}>No delay (Fastest)</option>
                <option value={500}>500 ms between emails</option>
                <option value={1000}>1 sec between emails</option>
                <option value={2000}>2 sec between emails</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <label htmlFor="sender-recipients" className="text-xs font-semibold text-slate-800">
              Recipients ({recipients.length} unique)
            </label>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setRecipientsRaw(SAMPLE_RECIPIENTS)}
                className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-sky-700 hover:underline underline-offset-4 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-sky-600" aria-hidden="true" />
                Load Sample
              </button>
              {extractedEmails.length > 0 && (
                <button
                  type="button"
                  onClick={handleImportExtracted}
                  className="font-medium text-sky-700 hover:underline underline-offset-4 cursor-pointer"
                >
                  Import Extracted ({extractedEmails.length})
                </button>
              )}
              {recipientsRaw && (
                <button
                  type="button"
                  onClick={() => setRecipientsRaw('')}
                  className="font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            id="sender-recipients"
            rows={8}
            value={recipientsRaw}
            onChange={(e) => setRecipientsRaw(e.target.value)}
            placeholder={`One recipient per line (optional name after comma):\nalice@company.com, Alice\nbob@startup.io, Bob`}
            className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs leading-relaxed text-slate-800 placeholder:font-sans placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
          />
        </div>

        {/* Right: Campaign Composer */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <h3 className="text-sm font-semibold text-slate-900">
              03. Campaign Composer &amp; Personalization
            </h3>

            <div className="flex items-center gap-2">
              <div
                role="tablist"
                aria-label="Composer mode"
                className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={composerTab === 'compose'}
                  onClick={() => setComposerTab('compose')}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    composerTab === 'compose'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compose
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={composerTab === 'generator'}
                  onClick={() => setComposerTab('generator')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    composerTab === 'generator'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wand2 className="h-3 w-3 text-sky-600" aria-hidden="true" />
                  HTML Template Generator
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={composerTab === 'preview'}
                  onClick={() => setComposerTab('preview')}
                  className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap ${
                    composerTab === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="h-3 w-3 text-slate-500" aria-hidden="true" />
                  Live Preview
                </button>
              </div>
            </div>
          </div>

          {templateAppliedMsg && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{templateAppliedMsg}</span>
            </div>
          )}

          {composerTab === 'compose' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-500">Quick Snippets:</span>
                  {Object.entries(CAMPAIGN_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSubject(tpl.subject);
                        setBodyContent(
                          contentFormat === 'html' ? tpl.body : stripHtmlTags(tpl.body)
                        );
                      }}
                      className="font-medium text-sky-700 hover:underline underline-offset-4 cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => setComposerTab('generator')}
                    className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-sky-700 hover:underline underline-offset-4 cursor-pointer"
                  >
                    <Wand2 className="h-3 w-3 text-sky-600" aria-hidden="true" />
                    Build Styled HTML Template
                  </button>
                </div>

                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setContentFormat('html')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium cursor-pointer ${
                      contentFormat === 'html'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentFormat('text')}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium cursor-pointer ${
                      contentFormat === 'text'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="campaign-subject" className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Line
                </label>
                <input
                  id="campaign-subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line (supports {{name}}, {{email}}, {{domain}})"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="campaign-body" className="text-xs font-semibold text-slate-700">
                  Message Body ({contentFormat === 'html' ? 'HTML' : 'Plain Text'})
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500">Insert tag:</span>
                  {['{{name}}', '{{email}}', '{{domain}}'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBodyContent((prev) => `${prev}${prev.endsWith(' ') ? '' : ' '}${tag}`)}
                      className="font-mono font-medium text-sky-700 hover:underline underline-offset-2 cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                id="campaign-body"
                rows={8}
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                className="w-full flex-1 rounded-lg border border-slate-200 bg-slate-50/70 p-3 font-mono text-xs leading-relaxed text-slate-800 focus:border-sky-600 focus:bg-white focus:outline-none"
              />

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUnsubscribe}
                  onChange={(e) => setIncludeUnsubscribe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600"
                />
                Include opt-out / unsubscribe footer note
              </label>
            </>
          ) : composerTab === 'generator' ? (
            <HtmlTemplateBuilder
              config={templateConfig}
              onChange={setTemplateConfig}
              previewRecipient={previewRecipient}
              applyMergeTags={applyMergeTags}
              onApplyToCampaign={handleApplyGeneratedTemplate}
            />
          ) : (
            <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              {/* Preview Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-700">Preview as:</span>
                  {recipients.length > 0 ? (
                    <select
                      aria-label="Select recipient to preview"
                      value={safePreviewIndex}
                      onChange={(e) => setPreviewRecipientIdx(Number(e.target.value))}
                      className="max-w-[240px] rounded-md border border-slate-200 bg-white px-2.5 py-1 font-mono text-xs text-slate-800 focus:border-sky-600 focus:outline-none"
                    >
                      {recipients.map((r, idx) => (
                        <option key={r.email} value={idx}>
                          {r.name} &lt;{r.email}&gt;
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-mono text-slate-700">
                      {previewRecipient.name} &lt;{previewRecipient.email}&gt; (sample)
                    </span>
                  )}
                </div>

                {contentFormat === 'html' && previewBodies.html && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {previewFormatView === 'rendered' && (
                      <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() => setPreviewViewport('desktop')}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                            previewViewport === 'desktop'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Monitor className="h-3 w-3" aria-hidden="true" />
                          Desktop
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewViewport('mobile')}
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                            previewViewport === 'mobile'
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
                        onClick={() => setPreviewFormatView('rendered')}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                          previewFormatView === 'rendered'
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Eye className="h-3 w-3" aria-hidden="true" />
                        Rendered
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFormatView('source')}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                          previewFormatView === 'source'
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Code2 className="h-3 w-3" aria-hidden="true" />
                        HTML Source
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Envelope Metadata */}
              <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs space-y-1">
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800">From: </span>
                  <span className="font-mono">
                    {fromName.trim()
                      ? `${fromName.trim()} <${effectiveFromEmail || 'you@yourdomain.com'}>`
                      : effectiveFromEmail || 'you@yourdomain.com'}
                  </span>
                </div>
                {replyTo.trim() && (
                  <div className="text-slate-600">
                    <span className="font-semibold text-slate-800">Reply-To: </span>
                    <span className="font-mono">{replyTo.trim()}</span>
                  </div>
                )}
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800">To: </span>
                  <span className="font-mono">
                    {previewRecipient.name} &lt;{previewRecipient.email}&gt;
                  </span>
                </div>
                <div className="text-slate-900 pt-0.5">
                  <span className="font-semibold">Subject: </span>
                  {renderedPreviewSubject || '(No subject)'}
                </div>
              </div>

              {/* Preview Body */}
              {contentFormat === 'html' && previewBodies.html ? (
                <>
                  {previewFormatView === 'rendered' ? (
                    <div className="flex justify-center overflow-x-auto rounded-lg border border-slate-200 bg-slate-200/60 p-2">
                      <iframe
                        title="Campaign HTML email preview"
                        srcDoc={wrapPreviewHtmlDocument(previewBodies.html)}
                        sandbox=""
                        className={`h-[380px] rounded border border-slate-200 bg-white transition-all duration-200 ${
                          previewViewport === 'mobile' ? 'w-[360px] max-w-full' : 'w-full'
                        }`}
                      />
                    </div>
                  ) : (
                    <pre className="h-[380px] overflow-auto rounded-lg border border-slate-200 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-100">
                      <code>{wrapPreviewHtmlDocument(previewBodies.html)}</code>
                    </pre>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setComposerTab('generator')}
                      className="inline-flex items-center gap-1 font-medium text-sky-700 hover:underline underline-offset-4 cursor-pointer"
                    >
                      <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Customize in HTML Template Generator
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopyPreviewHtml()}
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        {copiedPreviewHtml ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            Copied HTML
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            Copy Final HTML
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPreviewHtml}
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                        Download .HTML
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <pre className="rounded-lg border border-slate-200 bg-white p-4 font-sans text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {previewBodies.text}
                </pre>
              )}
            </div>
          )}

          {validationError && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <div className="flex flex-wrap items-center gap-2.5">
              {!isSending ? (
                <button
                  type="button"
                  onClick={() => void handleStartCampaign()}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send Bulk Campaign ({recipients.length})
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleTogglePause}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 text-amber-600" aria-hidden="true" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleStopCampaign}
                    className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 cursor-pointer whitespace-nowrap"
                  >
                    <Square className="h-4 w-4" aria-hidden="true" />
                    Stop
                  </button>
                </>
              )}
            </div>

            {logs.length > 0 && !isSending && (
              <button
                type="button"
                onClick={() => setLogs([])}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                Clear Log
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Live Delivery Log */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Campaign Delivery Log</h3>
              <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-600 tabular-nums">
                <span>Progress: {progressPct}%</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-medium text-emerald-700">{logCounts.sent} Sent</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-medium text-red-700">{logCounts.failed} Failed</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>{logCounts.queued} Remaining</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Download Report CSV
            </button>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-sky-600 transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="max-h-[320px] overflow-auto rounded-lg border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="w-12 py-2.5 pl-3.5 pr-2 font-semibold text-right">
                    #
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">
                    Recipient
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-semibold">
                    Server Response
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((row, idx) => (
                  <tr key={row.email} className="hover:bg-slate-50/80">
                    <td className="py-2.5 pl-3.5 pr-2 text-right font-mono text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs text-slate-900">{row.email}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          row.status === 'Sent'
                            ? 'text-emerald-700'
                            : row.status === 'Failed'
                              ? 'text-red-700'
                              : row.status === 'Sending'
                                ? 'text-sky-700'
                                : 'text-slate-500'
                        }`}
                      >
                        {row.status === 'Sent' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {row.status === 'Failed' && <XCircle className="h-3.5 w-3.5" />}
                        {row.status === 'Sending' && (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        )}
                        {(row.status === 'Queued' || row.status === 'Skipped') && (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 break-all">
                      {row.detail || <Mail className="h-3.5 w-3.5 text-slate-300" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
