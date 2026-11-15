import type React from 'react';

export type ToolRoute = 'all' | 'extractor' | 'validator' | 'formatter' | 'domains' | 'sender';

export interface RouteConfig {
  id: ToolRoute;
  path: string;
  label: string;
  title: string;
}

export const ROUTES: RouteConfig[] = [
  {
    id: 'all',
    path: '/m2a-emailextractor',
    label: 'All Tools',
    title: 'Email Extractor, Validator & Bulk Email Sender — Free Online Email Tools',
  },
  {
    id: 'extractor',
    path: '/m2a-emailextractor/extractor',
    label: 'Email Extractor',
    title: 'Email Extractor — Free Online Email Tools',
  },
  {
    id: 'validator',
    path: '/m2a-emailextractor/validator',
    label: 'Address Validator',
    title: 'Email Address Validator — Free Online Email Tools',
  },
  {
    id: 'formatter',
    path: '/m2a-emailextractor/formatter',
    label: 'Email Formatter',
    title: 'Email Formatter — Free Online Email Tools',
  },
  {
    id: 'domains',
    path: '/m2a-emailextractor/domains',
    label: 'Domain Extractor',
    title: 'Domain Extractor — Free Online Email Tools',
  },
  {
    id: 'sender',
    path: '/m2a-emailextractor/sender',
    label: 'Bulk Email Sender',
    title: 'Free Bulk Email Sender (Own SMTP / API) — Free Online Email Tools',
  },
];

const HASH_TO_PATH: Record<string, string> = {
  '#extractor': '/extractor': '/m2a-emailextractor/extractor',
  '#validator': '/m2a-emailextractor/validator',
  '#formatter': '/m2a-emailextractor/formatter',
  '#domain-extractor': '/m2a-emailextractor/domains',
  '#domains': '/m2a-emailextractor/domains',
  '#sender': '/m2a-emailextractor/sender',
  '#more-tools': '/m2a-emailextractor/sender',
  '#utilities': '/m2a-emailextractor/sender',
};

const LEGACY_PATH_ALIASES: Record<string, string> = {
  '/m2a-emailextractor/utilities': '/m2a-emailextractor/sender',
  '/m2a-emailextractor/campaign': '/m2a-emailextractor/sender',
};

export function resolveRouteFromLocation(): RouteConfig {
  const { pathname, hash } = window.location;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (LEGACY_PATH_ALIASES[normalizedPath]) {
    const targetPath = LEGACY_PATH_ALIASES[normalizedPath];
    window.history.replaceState({}, '', targetPath);
    return ROUTES.find((r) => r.path === targetPath) ?? ROUTES[0];
  }

  if (normalizedPath === '/m2a-emailextractor' && hash && HASH_TO_PATH[hash]) {
    const targetPath = HASH_TO_PATH[hash];
    window.history.replaceState({}, '', targetPath);
    return ROUTES.find((r) => r.path === targetPath) ?? ROUTES[0];
  }

  return ROUTES.find((r) => r.path === normalizedPath) ?? ROUTES[0];
}

export function isModifiedClick(e: React.MouseEvent<HTMLAnchorElement>): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}
