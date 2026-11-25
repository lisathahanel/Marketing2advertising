import React from 'react';
import {Link} from 'react-router-dom';
import {Play} from 'lucide-react';
import {FOOTER_COPYRIGHT, FOOTER_TAGLINE} from '../lib/constants.ts';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-20 border-t border-white/[0.08] bg-[#040714]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-[#F9F9F9]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#0483EE] to-[#0063E5] text-white">
                <Play className="ml-0.5 h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </span>
              <span>M2a Movies (Firimu)</span>
            </Link>
            <p className="mt-2 max-w-xl text-sm text-[#A4A9B8]">
              {FOOTER_TAGLINE}
            </p>
          </div>

          <nav
            aria-label="Footer links"
            className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[#A4A9B8]"
          >
            <Link
              to="/p/terms-and-conditions"
              className="whitespace-nowrap transition-colors hover:text-white"
            >
              Terms
            </Link>
            <Link
              to="/p/contact-us"
              className="whitespace-nowrap transition-colors hover:text-white"
            >
              Contact us
            </Link>
            <Link
              to="/p/privacy-policy"
              className="whitespace-nowrap transition-colors hover:text-white"
            >
              Privacy Policy
            </Link>
            <Link
              to="/p/about"
              className="whitespace-nowrap transition-colors hover:text-white"
            >
              About
            </Link>
          </nav>
        </div>

        <div className="mt-8 border-t border-white/[0.06] pt-6 text-xs text-[#6E768A]">
          {FOOTER_COPYRIGHT}
        </div>
      </div>
    </footer>
  );
};
