import React from 'react';
import {
  ArrowLeft,
  RotateCw,
  ExternalLink,
  Shield,
  FileText,
  Mail,
  Info,
  AlertCircle,
  Share2,
} from 'lucide-react';
import { AdMobBanner } from '../AdMobBanner';
import { showToast } from '../Toast';

interface PageScreenProps {
  path: string;
  defaultTitle: string;
  onBack: () => void;
}

type LocalPage = { title: string; contentHtml: string };

const WEBSITE_PAGES: Record<string, LocalPage> = {
  '/p/about-us.html': {
    title: 'About Us',
    contentHtml: `
      <p><strong>Marketing2Advertising (M2A)</strong> is a digital agency and online platform founded in 2015, built around one idea: closing the gap between learning and earning.</p>
      <p>We create useful web applications and digital content, and share learning resources, career guidance and opportunities that help people participate in the digital economy.</p>
      <h2>Our Mission</h2>
      <p>Our mission is to help individuals build skills, grow their careers and create lasting value in their communities through accessible education, useful software and digital opportunities.</p>
      <h2>What We Do</h2>
      <ul>
        <li><strong>Digital content:</strong> articles, guides and resources designed to inform and help our readers.</li>
        <li><strong>Education and careers:</strong> learning resources, career information and opportunities for personal and professional development.</li>
        <li><strong>Web development:</strong> websites, web applications and practical digital tools.</li>
        <li><strong>Marketing and advertising:</strong> promotional solutions for businesses, events and profiles.</li>
        <li><strong>Entertainment and technology:</strong> digital tools, apps, games, movie and series discovery, and live-channel listings.</li>
      </ul>
      <h2>Our Values</h2>
      <ul>
        <li><strong>Accessibility:</strong> making useful information and digital tools easier to reach.</li>
        <li><strong>Quality:</strong> working to publish helpful, relevant and reliable resources.</li>
        <li><strong>Innovation:</strong> improving our services as technology and user needs evolve.</li>
        <li><strong>Community:</strong> supporting learning, creativity and business growth.</li>
      </ul>
      <h2>Get in Touch</h2>
      <p>Have a question, suggestion or business enquiry? We would be glad to hear from you.</p>
      <p><a href="mailto:marketing2advertising.com@gmail.com">marketing2advertising.com@gmail.com</a></p>
      <p>Marketing2Advertising — empowering your education, career and business journey since 2015.</p>
    `,
  },
  '/p/contact-us.html': {
    title: 'Contact Us',
    contentHtml: `
      <p>Thank you for visiting Marketing2Advertising (M2A). We welcome your questions, feedback, suggestions and business enquiries.</p>
      <h2>Email</h2>
      <p>For general enquiries, support, advertising, partnerships or feedback, contact us at:</p>
      <p><a href="mailto:marketing2advertising.com@gmail.com">marketing2advertising.com@gmail.com</a></p>
      <h2>Business and Advertising Enquiries</h2>
      <p>If you are interested in website services, advertising, promotions, collaborations or other business opportunities, please include a short description of what you need in your email.</p>
      <h2>Technical Support and Feedback</h2>
      <p>If you are reporting a problem with the website or app, please tell us which page or feature you were using, what happened and which device or browser you were using. Please do not email passwords or sensitive financial information.</p>
      <p>We appreciate your interest in M2A and will review your message as soon as reasonably possible.</p>
    `,
  },
  '/p/privacy-policy.html': {
    title: 'Privacy Policy',
    contentHtml: `
      <p>This Privacy Policy explains how Marketing2Advertising (M2A) handles information when you visit our website or use our apps and digital services.</p>
      <h2>Information We Collect</h2>
      <p>Depending on how you use our services, information may include details you choose to send us, such as your name or email address when you contact us; basic technical information such as browser type, device information and pages visited; and cookie or similar identifiers used for site functionality, analytics or advertising.</p>
      <h2>How Information Is Used</h2>
      <p>Information may be used to operate and maintain our services, respond to enquiries, understand site usage, improve content and features, protect the service against abuse, and support advertising where enabled.</p>
      <h2>Cookies and Advertising</h2>
      <p>Our website and third-party partners may use cookies or similar technologies to store preferences, measure performance and deliver or measure advertisements. Google and other advertising partners may use data collected through their technologies in accordance with their own privacy policies and settings. You can manage cookies through your browser settings and, where offered, use the site's consent choices.</p>
      <h2>Third-Party Services and Links</h2>
      <p>Our services may contain links, embedded content or features provided by third parties. Those providers may collect information under their own privacy policies. We do not control the privacy practices of external websites, so please review their policies before using them.</p>
      <h2>Data Sharing</h2>
      <p>We do not sell your personal contact information. Information may be processed by service providers that help us operate the website, or disclosed where required by law, to protect rights and safety, or with your direction or consent.</p>
      <h2>Data Security and Retention</h2>
      <p>We take reasonable steps to protect information, but no online service can guarantee absolute security. We retain information only for as long as reasonably needed for the purposes described here, or as required by law.</p>
      <h2>Your Choices</h2>
      <p>You can choose not to provide optional information, adjust cookie settings in your browser, and use available advertising or consent controls. You may contact us to ask about personal information you have sent directly to us.</p>
      <h2>Children's Privacy</h2>
      <p>Our services are not intended to knowingly collect personal information from children where parental consent is required. If you believe a child has provided personal information to us, please contact us so we can review the matter.</p>
      <h2>Changes to This Policy</h2>
      <p>We may update this policy as our services or legal requirements change. The current version will be available on this page.</p>
      <h2>Contact</h2>
      <p>For privacy questions, email <a href="mailto:marketing2advertising.com@gmail.com">marketing2advertising.com@gmail.com</a>.</p>
    `,
  },
  '/p/terms-and-conditions.html': {
    title: 'Terms & Conditions',
    contentHtml: `
      <p>Welcome to Marketing2Advertising (M2A). By accessing or using this website, app or related services, you agree to these Terms &amp; Conditions. If you do not agree, please discontinue use of the service.</p>
      <h2>Use of Our Services</h2>
      <p>You agree to use M2A lawfully and responsibly. You must not attempt to disrupt, damage, gain unauthorised access to, or misuse the website, app, accounts, content or infrastructure.</p>
      <h2>Content and Information</h2>
      <p>We aim to provide useful and current information, tools and resources. Content is provided for general informational and educational purposes and may change without notice. We do not guarantee that every item is complete, accurate, available or suitable for every purpose. You are responsible for decisions you make based on information found through M2A.</p>
      <h2>Third-Party Content and Services</h2>
      <p>Some features may link to or rely on third-party websites, apps, streams, advertisements or services. Those services are operated by their respective providers and may have separate terms, availability rules and privacy policies. M2A is not responsible for third-party content or services that it does not control.</p>
      <h2>Intellectual Property</h2>
      <p>Unless otherwise stated, the M2A name, branding, original site design, software and original content are protected by applicable intellectual property laws. You may access and use the service for personal, lawful purposes. You must not copy, republish, sell or commercially exploit our original materials without permission, except where the law allows.</p>
      <h2>Advertising and Affiliate Links</h2>
      <p>The website or app may display advertisements and may contain affiliate links. We may receive advertising revenue or a commission when users interact with certain links or make qualifying purchases. This does not change the price you pay unless the third-party provider states otherwise.</p>
      <h2>Availability and Changes</h2>
      <p>We may modify, suspend or discontinue any part of the service at any time. We do not guarantee uninterrupted or error-free access.</p>
      <h2>Limitation of Liability</h2>
      <p>To the extent permitted by applicable law, M2A is not liable for indirect or consequential loss, loss of data, loss of profits, or issues arising from third-party services or interruptions beyond our reasonable control. Nothing in these terms excludes liability that cannot legally be excluded.</p>
      <h2>Changes to These Terms</h2>
      <p>We may revise these terms from time to time. Continued use of the service after updated terms are posted means you accept the revised terms.</p>
      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <a href="mailto:marketing2advertising.com@gmail.com">marketing2advertising.com@gmail.com</a>.</p>
    `,
  },
  '/p/affiliate-marketing-and-adsense.html': {
    title: 'Affiliate Disclosure',
    contentHtml: `
      <p>Marketing2Advertising (M2A) believes in transparency with our readers. Some pages on this website may contain affiliate links or sponsored content, and the website or app may display third-party advertisements.</p>
      <h2>Affiliate Links</h2>
      <p>Some links are affiliate links. If you click an affiliate link and complete a qualifying purchase, registration or other action, M2A may receive a commission or referral fee at no additional cost to you, unless the offer clearly states otherwise.</p>
      <h2>Advertising</h2>
      <p>We may use advertising partners, including Google AdSense, to display advertisements. These partners may use cookies or similar technologies to provide, personalise, measure or improve advertising, subject to their policies and your available consent or privacy settings.</p>
      <h2>Sponsored Content</h2>
      <p>Where content is sponsored or otherwise materially supported by a business or partner, we aim to identify that relationship clearly. Opinions and editorial information are intended to remain useful to readers.</p>
      <h2>Our Commitment to Readers</h2>
      <p>Affiliate relationships and advertising do not require you to buy anything. We encourage you to research products and services, review the provider's terms, and make decisions that fit your needs. Availability, prices, features and offers are controlled by the relevant provider and may change.</p>
      <h2>Questions</h2>
      <p>If you have questions about this disclosure, contact <a href="mailto:marketing2advertising.com@gmail.com">marketing2advertising.com@gmail.com</a>.</p>
    `,
  },
};

export const PageScreen: React.FC<PageScreenProps> = ({
  path,
  defaultTitle,
  onBack,
}) => {
  const data = WEBSITE_PAGES[path] || {
    title: defaultTitle,
    contentHtml: '<p>This information page is not available in the app yet. You can use the official website link below to view it.</p>',
  };

  const fullUrl = `https://www.marketing2advertising.com${path}`;

  const getIcon = () => {
    if (path.includes('privacy')) return <Shield className="w-5 h-5 text-amber-400" />;
    if (path.includes('terms')) return <FileText className="w-5 h-5 text-amber-400" />;
    if (path.includes('contact')) return <Mail className="w-5 h-5 text-amber-400" />;
    if (path.includes('about')) return <Info className="w-5 h-5 text-amber-400" />;
    return <AlertCircle className="w-5 h-5 text-amber-400" />;
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: data.title, url: fullUrl }).catch(() => {});
    } else if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(fullUrl);
      showToast('Link copied to clipboard!', 'success');
    } else {
      showToast('Unable to share this link on this device.', 'error');
    }
  };

  return (
    <div className="pb-28 max-w-xl mx-auto px-3.5 space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between p-2 rounded-2xl bg-[#14141e] border border-white/5 sticky top-14 z-30 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition"
            title="Open on site"
          >
            <span>Open on Site</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={() => window.location.reload()}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 transition"
            title="Reload"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleShare}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-amber-400 transition"
            title="Share"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <article className="rounded-3xl bg-[#14141e] border border-white/10 p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white">{data.title}</h1>
            <p className="text-[10px] text-slate-400">marketing2advertising.com</p>
          </div>
        </div>

        <div
          className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3 pt-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_a]:text-amber-400 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: data.contentHtml }}
        />

        <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-amber-400 hover:underline font-bold"
          >
            <span>View official page on marketing2advertising.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </article>

      <AdMobBanner format="banner" />
    </div>
  );
};
