import { Download } from 'lucide-react';
import { M2A_MENU_LINKS } from './MenuDrawer';
import type { LegalDocId } from './LegalModal';

interface FooterProps {
  isInstalled: boolean;
  onInstallClick: () => void;
  onOpenLegal: (doc: LegalDocId) => void;
}

export function Footer({
  isInstalled,
  onInstallClick,
  onOpenLegal,
}: FooterProps) {
  return (
    <footer className="mt-14 border-t border-zinc-800/80 bg-[#09090B]">
      <div className="mx-auto max-w-[1440px] px-6 pt-10 pb-20 md:pb-10 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-zinc-800/70">
          {/* Brand Summary + Install */}
          <div className="md:col-span-4 space-y-3">
            <p className="inline-flex items-center gap-2.5 font-display text-lg font-bold text-zinc-50">
              <img src="/icon.svg" alt="M2A logo" className="h-8 w-8 rounded-lg shrink-0" />
              <span>marketing2advertising</span>
            </p>
            <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
              Family-safe, read-only video watchroom powered by
              marketing2advertising.com. Watch videos and endless Shorts with no
              login, comments, uploads, or posting.
            </p>
            {!isInstalled && (
              <button
                type="button"
                onClick={onInstallClick}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-rose-400" />
                <span>Install App</span>
              </button>
            )}
          </div>

          {/* M2A Links */}
          <div className="md:col-span-5">
            <h3 className="text-xs font-semibold text-zinc-200 mb-3">
              M2A Menu &amp; Services
            </h3>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {M2A_MENU_LINKS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Policies & Disclosures */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold text-zinc-200 mb-3">
              Policies &amp; Disclosures
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenLegal('affiliate')}
                  className="text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Affiliate Disclosure
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            © {new Date().getFullYear()} Marketing2Advertising (M2A) ·{' '}
            marketing2advertising.com
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onOpenLegal('terms')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Terms &amp; Conditions
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onOpenLegal('affiliate')}
              className="hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Affiliate Disclosure
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
