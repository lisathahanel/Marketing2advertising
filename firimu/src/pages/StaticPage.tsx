import React, {useEffect, useMemo, useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {SeoHead} from '../components/SeoHead.tsx';
import type {StaticPageBlock, StaticPageItem} from '../lib/bloggerParser.ts';
import {FOOTER_TAGLINE, SITE_NAME} from '../lib/constants.ts';
import {loadStaticPages} from '../services/bloggerFeed.ts';

interface FallbackPageSpec {
  title: string;
  description: string;
  blocks: StaticPageBlock[];
}

const FALLBACK_PAGES: Record<string, FallbackPageSpec> = {
  about: {
    title: 'About M2a Movies (Firimu)',
    description: FOOTER_TAGLINE,
    blocks: [
      {
        type: 'paragraph',
        text: 'M2a Movies (Firimu) is a fast, mobile-friendly streaming web application built for discovering and watching Luganda translated movies and multi-episode series across all top Ugandan VJs.',
      },
      {
        type: 'heading',
        text: 'What You Can Watch',
      },
      {
        type: 'list',
        items: [
          'Action, Adventure, Sci-Fi, Comedy, Crime, Horror, and Animation & Fantasy feature films.',
          'Full Luganda translated series with sequential episode navigation.',
          'All leading VJs including Vj Junior, Vj Emmy, Vj Mark, Vj KeVo, Vj Jingo, Vj Muba, and Vj Ulio.',
          'Instant full-catalogue search and installable Progressive Web App support.',
        ],
      },
    ],
  },
  'contact-us': {
    title: 'Contact Us',
    description: `Get in touch with the ${SITE_NAME} team for support, feedback, or content inquiries.`,
    blocks: [
      {
        type: 'paragraph',
        text: 'We welcome feedback, broken stream reports, and general inquiries regarding M2a Movies (Firimu).',
      },
      {
        type: 'heading',
        text: 'Reaching Support',
      },
      {
        type: 'paragraph',
        text: 'For general inquiries, takedown notices, or technical assistance, reach our editorial team at info@marketing2advertising.com.',
      },
    ],
  },
  'terms-and-conditions': {
    title: 'Terms and Conditions',
    description: `Terms and conditions for using ${SITE_NAME}.`,
    blocks: [
      {
        type: 'paragraph',
        text: 'By accessing and using M2a Movies (Firimu), you agree to comply with these Terms and Conditions and all applicable laws.',
      },
      {
        type: 'heading',
        text: 'Service Usage',
      },
      {
        type: 'paragraph',
        text: 'Content indexed on this application is provided for personal streaming and discovery. Automated scraping, redistribution, or unauthorized commercial framing of streams is prohibited.',
      },
      {
        type: 'heading',
        text: 'Third-Party Media & Advertising',
      },
      {
        type: 'paragraph',
        text: 'Video streams and advertisements may be served by third-party media hosts and ad networks. We reserve the right to update or remove listings at any time without prior notice.',
      },
    ],
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    description: `Privacy policy explaining local storage, analytics, and advertising on ${SITE_NAME}.`,
    blocks: [
      {
        type: 'paragraph',
        text: 'Your privacy matters. M2a Movies (Firimu) does not require account registration and stores your Watch History and offline catalogue cache strictly in your own browser storage.',
      },
      {
        type: 'heading',
        text: 'Local Storage & Offline Cache',
      },
      {
        type: 'paragraph',
        text: 'When you watch a movie or series, your last watched part or episode is saved locally on your device so you can resume playback later. You can clear this history at any time from the Home page.',
      },
      {
        type: 'heading',
        text: 'Advertising & Cookies',
      },
      {
        type: 'paragraph',
        text: 'This application displays advertisements through Google AdSense. Third-party vendors, including Google, may use cookies to serve ads based on prior visits to this or other websites.',
      },
    ],
  },
};

function normalizeSlugKey(raw: string): string {
  const clean = raw.toLowerCase().replace(/\.html$/i, '').trim();
  if (clean.includes('about')) return 'about';
  if (clean.includes('contact')) return 'contact-us';
  if (clean.includes('term')) return 'terms-and-conditions';
  if (clean.includes('privacy')) return 'privacy-policy';
  return clean;
}

export const StaticPage: React.FC = () => {
  const {slug = 'about'} = useParams<{slug: string}>();
  const normalizedKey = normalizeSlugKey(slug);
  const [pages, setPages] = useState<StaticPageItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({top: 0, behavior: 'smooth'});
    let cancelled = false;
    setLoading(true);
    loadStaticPages()
      .then((list) => {
        if (!cancelled) setPages(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const matchedBloggerPage = useMemo(() => {
    const clean = slug.toLowerCase().replace(/\.html$/i, '');
    return (
      pages.find((p) => p.slug === clean) ??
      pages.find((p) => normalizeSlugKey(p.slug) === normalizedKey) ??
      pages.find((p) => normalizeSlugKey(p.title) === normalizedKey) ??
      null
    );
  }, [pages, slug, normalizedKey]);

  const fallback = FALLBACK_PAGES[normalizedKey] ?? FALLBACK_PAGES.about;
  const pageTitle = matchedBloggerPage?.title || fallback.title;
  const blocks =
    matchedBloggerPage && matchedBloggerPage.blocks.length > 0
      ? matchedBloggerPage.blocks
      : fallback.blocks;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <SeoHead
        title={`${pageTitle} — ${SITE_NAME}`}
        description={fallback.description}
        canonicalPath={`/p/${normalizedKey}`}
        ogType="article"
      />

      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-xs text-[#A4A9B8]">
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#F9F9F9]">{pageTitle}</span>
      </nav>

      <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#F9F9F9] sm:text-4xl">
        {pageTitle}
      </h1>

      <div className="mt-8 space-y-5 border-t border-white/[0.08] pt-8 text-[15px] leading-relaxed text-[#CACACA]">
        {loading && !matchedBloggerPage ? (
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-[#0E111E]" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-[#0E111E]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#0E111E]" />
          </div>
        ) : (
          blocks.map((block, idx) => {
            if (block.type === 'heading') {
              return (
                <h2
                  key={idx}
                  className="pt-3 font-display text-xl font-bold text-white"
                >
                  {block.text}
                </h2>
              );
            }
            if (block.type === 'list' && block.items) {
              return (
                <ul key={idx} className="list-disc space-y-2 pl-5 text-[#CACACA]">
                  {block.items.map((item, liIdx) => (
                    <li key={liIdx}>{item}</li>
                  ))}
                </ul>
              );
            }
            return <p key={idx}>{block.text}</p>;
          })
        )}
      </div>
    </article>
  );
};
