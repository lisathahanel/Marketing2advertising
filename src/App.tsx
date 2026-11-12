/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Splash } from './components/Splash';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { Drawer } from './components/Drawer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AdConsentModal } from './components/AdConsentModal';
import { AdMobInterstitial } from './components/AdMobInterstitial';
import { HomeScreen } from './components/screens/HomeScreen';
import { TVScreen } from './components/screens/TVScreen';
import { MoviesSeriesScreen } from './components/screens/MoviesSeriesScreen';
import { BlogsScreen } from './components/screens/BlogsScreen';
import { AppsScreen } from './components/screens/AppsScreen';
import { GamesScreen } from './components/screens/GamesScreen';
import { JobsScreen } from './components/screens/JobsScreen';
import { PageScreen } from './components/screens/PageScreen';
import { ToastContainer } from './components/Toast';
import { AdBlockGuard } from './components/AdBlockGuard';
import { AppTool, BlogPost, Channel, GameItem, MovieItem, TabType } from './types';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [apps, setApps] = useState<AppTool[]>([]);
  const [games, setGames] = useState<GameItem[]>([]);

  // Navigation states
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MovieItem | null>(null);
  const [staticPage, setStaticPage] = useState<{ path: string; title: string } | null>(null);

  // Dialog & drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInterstitialOpen, setIsInterstitialOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    // Fetch channels
    fetch(`${import.meta.env.BASE_URL}data/channels.json`)
      .then((res) => res.json())
      .then((data) => setChannels(data))
      .catch((err) => console.warn('Channels load error:', err));

    // Fetch apps
    fetch(`${import.meta.env.BASE_URL}data/apps.json`)
      .then((res) => res.json())
      .then((data) => setApps(data))
      .catch((err) => console.warn('Apps load error:', err));

    // Fetch games
    fetch(`${import.meta.env.BASE_URL}data/games.json`)
      .then((res) => res.json())
      .then((data) => setGames(data))
      .catch((err) => console.warn('Games load error:', err));
  }, []);

  const handleSelectTab = (tab: TabType) => {
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
    setStaticPage({ path, title });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const triggerInterstitialAd = () => {
    setIsInterstitialOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Toast Notification Container */}
      <ToastContainer />
      <AdBlockGuard />

      {/* Splash Screen */}
      {showSplash && <Splash onFinish={() => setShowSplash(false)} />}

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
      />

      {/* Drawer Navigation */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectTab={handleSelectTab}
        onOpenPage={handleOpenPage}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 w-full pt-4">
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
