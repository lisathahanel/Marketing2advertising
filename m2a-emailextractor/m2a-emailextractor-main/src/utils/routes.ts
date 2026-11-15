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
    path: '/',
    label: 'All Tools',
    title: 'Email Extractor, Validator & Bulk Email Sender — Free Online Email Tools',
  },
  {
    id: 'extractor',
    path: '/extractor',
    label: 'Email Extractor',
    title: 'Email Extractor — Free Online Email Tools',
  },
  {
    id: 'validator',
    path: '/validator',
    label: 'Address Validator',
    title: 'Email Address Validator — Free Online Email Tools',
  },
  {
    id: 'formatter',
    path: '/formatter',
    label: 'Email Formatter',
    title: 'Email Formatter — Free Online Email Tools',
  },
  {
    id: 'domains',
    path: '/domains',
    label: 'Domain Extractor',
    title: 'Domain Extractor — Free Online Email Tools',
  },
  {
    id: 'sender',
    path: '/sender',
    label: 'Bulk Email Sender',
    title: 'Free Bulk Email Sender (Own SMTP / API) — Free Online Email Tools',
  },
];

const HASH_TO_PATH: Record<string, string> = {
  '#extractor': '/extractor',
  '#validator': '/validator',
  '#formatter': '/formatter',
  '#domain-extractor': '/domains',
  '#domains': '/domains',
  '#sender': '/sender',
  '#more-tools': '/sender',
  '#utilities': '/sender',
};

const LEGACY_PATH_ALIASES: Record<string, string> = {
  '/utilities': '/sender',
  '/campaign': '/sender',
};

export function resolveRouteFromLocation(): RouteConfig {
  const { pathname, hash } = window.location;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (LEGACY_PATH_ALIASES[normalizedPath]) {
    const targetPath = LEGACY_PATH_ALIASES[normalizedPath];
    window.history.replaceState({}, '', targetPath);
    return ROUTES.find((r) => r.path === targetPath) ?? ROUTES[0];
  }

  if (normalizedPath === '/' && hash && HASH_TO_PATH[hash]) {
    const targetPath = HASH_TO_PATH[hash];
    window.history.replaceState({}, '', targetPath);
    return ROUTES.find((r) => r.path === targetPath) ?? ROUTES[0];
  }

  return ROUTES.find((r) => r.path === normalizedPath) ?? ROUTES[0];
}

export function isModifiedClick(e: React.MouseEvent<HTMLAnchorElement>): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}
