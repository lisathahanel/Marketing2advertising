import React, {useEffect} from 'react';
import {
  CANONICAL_BASE_URL,
  SITE_NAME,
} from '../lib/constants.ts';

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  ogType?: 'website' | 'video.movie' | 'video.tv_show' | 'article';
  jsonLd?: Record<string, unknown>;
}

function setMetaTag(
  selector: string,
  attrName: 'name' | 'property',
  attrValue: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  canonicalPath,
  image,
  ogType = 'website',
  jsonLd,
}) => {
  useEffect(() => {
    const cleanPath = canonicalPath.startsWith('/')
      ? canonicalPath
      : `/${canonicalPath}`;
    const canonicalUrl = `${CANONICAL_BASE_URL}${cleanPath === '/' ? '/' : cleanPath}`;
    const resolvedImage = image || `${CANONICAL_BASE_URL}/pwa-512x512.png`;

    document.title = title;
    setMetaTag('meta[name="description"]', 'name', 'description', description);
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag(
      'meta[property="og:description"]',
      'property',
      'og:description',
      description,
    );
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', resolvedImage);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);

    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag(
      'meta[name="twitter:description"]',
      'name',
      'twitter:description',
      description,
    );
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', resolvedImage);

    let canonicalEl = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    const scriptId = 'firimu-json-ld';
    let ldScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = scriptId;
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }

    const defaultJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${CANONICAL_BASE_URL}/`,
      description,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${CANONICAL_BASE_URL}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    };

    ldScript.textContent = JSON.stringify(jsonLd ?? defaultJsonLd);
  }, [title, description, canonicalPath, image, ogType, jsonLd]);

  return null;
};
