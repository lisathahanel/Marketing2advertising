interface FooterProps {
  onNavigate?: (path: string) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const handleInternalNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigate) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
              <span>Powered by m2a</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span>
                Developed by{' '}
                <a
                  href="https://marketing2advertising.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-700 hover:underline underline-offset-4"
                >
                  marketing2advertising.com
                </a>
              </span>
            </div>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Privacy reminder: All email extraction happens directly inside your browser. No
              pasted text or extracted lists are transmitted to or saved on our servers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5 text-xs font-medium text-slate-600">
            <a
              href="/m2a-emailextractor/extractor"
              onClick={(e) => handleInternalNav(e, '/m2a-emailextractor/extractor')}
              className="hover:text-slate-900 transition-colors"
            >
              Email Extractor
            </a>
            <a
              href="/m2a-emailextractor/validator"
              onClick={(e) => handleInternalNav(e, '/m2a-emailextractor/validator')}
              className="hover:text-slate-900 transition-colors"
            >
              Email Validator
            </a>
            <a
              href="/m2a-emailextractor/formatter"
              onClick={(e) => handleInternalNav(e, '/m2a-emailextractor/formatter')}
              className="hover:text-slate-900 transition-colors"
            >
              Email Formatter
            </a>
            <a
              href="/m2a-emailextractor/domains"
              onClick={(e) => handleInternalNav(e, '/m2a-emailextractor/domains')}
              className="hover:text-slate-900 transition-colors"
            >
              Domain Extractor
            </a>
            <a
              href="/m2a-emailextractor/sender"
              onClick={(e) => handleInternalNav(e, '/m2a-emailextractor/sender')}
              className="hover:text-slate-900 transition-colors"
            >
              Bulk Email Sender
            </a>
          </div>
        </div>
      </div>

      <div className="mobile-hub">
        <div
          id="emb99d-footer"
          style={{
            background: '#111',
            textAlign: 'center',
            padding: '10px 0',
            fontFamily: 'Raleway, Arial, sans-serif',
          }}
        >
          <a
            href="/"
            rel="noopener noreferrer"
            style={{ color: '#04ff00', margin: '0 6px', textDecoration: 'none' }}
          >
            Home
          </a>
          <span style={{ color: '#fff' }}>|</span>
          <a
            href="https://marketing2advertising.com/p/contact-us.html"
            rel="noopener noreferrer"
            style={{ color: '#04ff00', margin: '0 6px', textDecoration: 'none' }}
          >
            Contact
          </a>
          <span style={{ color: '#fff' }}>|</span>
          <a
            href="https://marketing2advertising.com/p/privacy-policy.html"
            rel="noopener noreferrer"
            style={{ color: '#04ff00', margin: '0 6px', textDecoration: 'none' }}
            target="_blank"
          >
            Privacy
          </a>
          <span style={{ color: '#fff' }}>|</span>
          <a
            href="https://marketing2advertising.com/p/affiliate-marketing-and-adsense.html"
            rel="noopener noreferrer"
            style={{ color: '#04ff00', margin: '0 6px', textDecoration: 'none' }}
            target="_blank"
          >
            Disclosure
          </a>
          <span style={{ color: '#fff' }}>|</span>
          <a
            href="https://marketing2advertising.com/p/terms-and-conditions.html"
            rel="noopener noreferrer"
            style={{ color: '#04ff00', margin: '0 6px', textDecoration: 'none' }}
            target="_blank"
          >
            Terms
          </a>
          <p style={{ color: '#aaa', fontSize: '14px', margin: '10px 0 0' }}>
            &#169; Marketing2Advertising. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
