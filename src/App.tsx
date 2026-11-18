/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useCallback, useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Drawer } from './components/Drawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AdConsentModal } from './components/AdConsentModal';
import { AdMobInterstitial } from './components/AdMobInterstitial';
import { HomeScreen } from './components/screens/HomeScreen';
import { ToastContainer } from './components/Toast';
import { AdBlockGuard } from './components/AdBlockGuard';
import { NotificationsPanel } from './components/NotificationsPanel';
import { AppTool, BlogPost, Channel, GameItem, MovieItem, TabType } from './types';
import { isM2AEmbedded, openM2APageInNewTab, openM2ASectionInNewTab } from './utils/embeddedNavigation';

// Keep the first screen lean; load feature bundles only when visitors open them.
const TVScreen = lazy(() => import('./components/screens/TVScreen').then((module) => ({ default: module.TVScreen })));
const MoviesSeriesScreen = lazy(() => import('./components/screens/MoviesSeriesScreen').then((module) => ({ default: module.MoviesSeriesScreen })));
const BlogsScreen = lazy(() => import('./components/screens/BlogsScreen').then((module) => ({ default: module.BlogsScreen })));
const AppsScreen = lazy(() => import('./components/screens/AppsScreen').then((module) => ({ default: module.AppsScreen })));
const GamesScreen = lazy(() => import('./components/screens/GamesScreen').then((module) => ({ default: module.GamesScreen })));
const JobsScreen = lazy(() => import('./components/screens/JobsScreen').then((module) => ({ default: module.JobsScreen })));
const PageScreen = lazy(() => import('./components/screens/PageScreen').then((module) => ({ default: module.PageScreen })));

const VALID_TABS: TabType[] = ['home', 'tv', 'games', 'firimu', 'catalogue', 'blogs', 'emailtools', 'apps', 'jobs'];

function getInitialTab(): TabType {
  if (typeof window === 'undefined') return 'home';
  const requested = decodeURIComponent(window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || '');
  return VALID_TABS.includes(requested as TabType) ? requested as TabType : 'home';
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>(getInitialTab);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [apps, setApps] = useState<AppTool[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);
  const [appsLoaded, setAppsLoaded] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  // Navigation states
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [staticPage, setStaticPage] = useState<{ path: string; title: string } | null>(null);

  // Dialog & drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Gently introduce push notifications after visitors have had time to explore.
  // A dismissed invitation is snoozed for 7 days; browser permission is never
  // requested automatically, only after the visitor presses Enable Notifications.
  useEffect(() => {
    if (showSplash || isNotificationsOpen) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const snoozeKey = 'm2a_notification_invite_snoozed_at';
    const snoozeDuration = 7 * 24 * 60 * 60 * 1000;
    try {
      const lastShown = Number(window.localStorage.getItem(snoozeKey) || 0);
      if (lastShown && Date.now() - lastShown < snoozeDuration) return;
    } catch {
      // Continue without persistence if browser storage is unavailable.
    }

    const timer = window.setTimeout(() => {
      if (Notification.permission !== 'default' || isNotificationsOpen) return;
      try {
        window.localStorage.setItem(snoozeKey, String(Date.now()));
      } catch {
        // The invitation still works if storage is unavailable.
      }
      setIsNotificationsOpen(true);
    }, 20000);

    return () => window.clearTimeout(timer);
  }, [showSplash, isNotificationsOpen]);

  // Load only the data needed for the first screen. Other collections are
  // requested on first use and then kept in memory for subsequent visits.
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/channels.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<Channel[]>;
      })
      .then((data) => { if (!cancelled) setChannels(data); })
      .catch((error) => console.warn('Channels load error:', error));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (currentTab !== 'apps' || appsLoaded) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/apps.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<AppTool[]>;
      })
      .then((data) => {
        if (!cancelled) { setApps(data); setAppsLoaded(true); }
      })
      .catch((error) => console.warn('Apps load error:', error));
    return () => { cancelled = true; };
  }, [currentTab, appsLoaded]);

  useEffect(() => {
    if (currentTab !== 'games' || gamesLoaded) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/games.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<GameItem[]>;
      })
      .then((data) => {
        if (!cancelled) { setGames(data); setGamesLoaded(true); }
      })
      .catch((error) => console.warn('Games load error:', error));
    return () => { cancelled = true; };
  }, [currentTab, gamesLoaded]);

  const handleSelectTab = (tab: TabType) => {
    if (isM2AEmbedded()) {
      openM2ASectionInNewTab(tab);
      return;
    }
    setCurrentTab(tab);
    setStaticPage(null);
    setSelectedPost(null);
    setSelectedMovie(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    if (staticPage) {
      setStaticPage(null);
      return;
    }
    if (selectedPost) {
      setSelectedPost(null);
      return;
    }
    if (selectedMovie) {
      setSelectedMovie(null);
      return;
    }
    if (currentTab !== 'home') {
      setCurrentTab('home');
      return;
    }
  };

  const canGoBack = Boolean(staticPage || selectedPost || selectedMovie || currentTab !== 'home');

  const handleOpenPage = (path: string, title: string) => {
    if (isM2AEmbedded()) {
      openM2APageInNewTab(path, true);
      return;
    }
    setStaticPage({ path, title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerInterstitialAd = () => {
    setIsInterstitialOpen(true);
  };

  return (
    <div className="m2a-app min-h-screen bg-[#05070D] text-slate-100 flex flex-col font-sans selection:bg-[#7CFF00] selection:text-[#071000]">
      {/* Toast Notification Container */}
      <ToastContainer />
      <AdBlockGuard />
      <NotificationsPanel open={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Splash Screen */}
      {showSplash && <Splash onFinish={finishSplash} />}

      {/* Connectivity Status Indicator */}
      <OfflineIndicator />

      {/* GDPR / UMP Consent Dialog */}
      <AdConsentModal
        onOpenPrivacy={() => handleOpenPage('/p/privacy-policy.html', 'Privacy Policy')}
      />

      {/* AdMob Interstitial Modal */}
      <AdMobInterstitial
        isOpen={isInterstitialOpen}
        onClose={() => setIsInterstitialOpen(false)}
      />

      {/* Top Header Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onToggleSearch={() => handleSelectTab('firimu')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Drawer Navigation */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectTab={handleSelectTab}
        onOpenPage={handleOpenPage}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Viewport Container */}
      <main className="m2a-main flex-1 w-full pt-5 sm:pt-7">
        <Suspense fallback={<div role="status" aria-live="polite" className="flex min-h-[55vh] items-center justify-center px-4 text-sm font-semibold text-slate-400">Loading M2A section…</div>}>
        {/* If viewing a static page (Contact, About, Privacy, etc.) */}
        {staticPage ? (
          <PageScreen
            path={staticPage.path}
            defaultTitle={staticPage.title}
            onBack={() => setStaticPage(null)}
          />
        ) : (
          <>
            {currentTab === 'home' && (
              <HomeScreen
                onSelectTab={handleSelectTab}
                onSelectChannel={(ch) => {
                  setSelectedChannel(ch);
                  setCurrentTab('tv');
                }}
                onSelectPost={(p) => {
                  setSelectedPost(p);
                  setCurrentTab('blogs');
                }}
                onSelectMovie={(m) => {
                  setSelectedMovie(m);
                  setCurrentTab('firimu');
                }}
                channels={channels}
              />
            )}

            {currentTab === 'tv' && (
              <TVScreen
                channels={channels}
                selectedChannel={selectedChannel}
                onSelectChannel={setSelectedChannel}
              />
            )}

            {currentTab === 'firimu' && <MoviesSeriesScreen initialKind="movie" />}

            {currentTab === 'catalogue' && <MoviesSeriesScreen />}

            {currentTab === 'blogs' && (
              <BlogsScreen
                selectedPost={selectedPost}
                onSelectPost={setSelectedPost}
              />
            )}

            {currentTab === 'apps' && (
              <AppsScreen
                apps={apps}
                onTriggerAd={triggerInterstitialAd}
              />
            )}

            {currentTab === 'games' && (
              <GamesScreen
                games={games}
                onTriggerAd={triggerInterstitialAd}
              />
            )}

            {currentTab === 'jobs' && <JobsScreen />}
          </>
        )}
        </Suspense>
      </main>

      {/* Bottom Navigation & Floating Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        onBack={handleBack}
        canGoBack={canGoBack}
      />
    </div>
  );
}
