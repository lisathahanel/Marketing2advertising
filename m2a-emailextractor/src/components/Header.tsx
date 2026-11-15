import { MailCheck } from 'lucide-react';
import { isModifiedClick } from '../utils/routes';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onJumpToValidator: () => void;
}

const NAV_LINKS = [
  { path: '/m2a-emailextractor/extractor', label: 'Extractor' },
  { path: '/m2a-emailextractor/validator', label: 'Validator' },
  { path: '/m2a-emailextractor/formatter', label: 'Formatter' },
  { path: '/m2a-emailextractor/domains', label: 'Domains' },
  { path: '/m2a-emailextractor/sender', label: 'Bulk Sender' },
];

export function Header({ currentPath, onNavigate, onJumpToValidator }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-slate-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6">
        <a
          href="/m2a-emailextractor/"
          onClick={(e) => {
            if (!isModifiedClick(e)) {
              e.preventDefault();
              onNavigate('/m2a-emailextractor');
            }
          }}
          className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-400 rounded"
        >
          EmailVerify Suite
        </a>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          {NAV_LINKS.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <a
                key={link.path}
                href={link.path}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  if (!isModifiedClick(e)) {
                    e.preventDefault();
                    onNavigate(link.path);
                  }
                }}
                className={`transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 ${
                  isActive ? 'text-white underline' : 'hover:text-white'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onJumpToValidator}
            className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MailCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Validate Email
          </button>
        </div>
      </div>
    </header>
  );
}
