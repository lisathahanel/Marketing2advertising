import React, {Suspense, lazy} from 'react';
import {BrowserRouter, Link, Route, Routes} from 'react-router-dom';
import {Footer} from './components/Footer.tsx';
import {Header} from './components/Header.tsx';
import {PWABanners} from './components/PWABanners.tsx';
import {SearchOverlay} from './components/SearchOverlay.tsx';
import {CatalogueProvider} from './context/CatalogueContext.tsx';
import {BASE_PATH} from './lib/constants.ts';
import {HomePage} from './pages/HomePage.tsx';
import {MovieDetailPage} from './pages/MovieDetailPage.tsx';

const LabelArchivePage = lazy(() =>
  import('./pages/LabelArchivePage.tsx').then((m) => ({
    default: m.LabelArchivePage,
  })),
);
const OfflineLibraryPage = lazy(() =>
  import('./pages/OfflineLibraryPage.tsx').then((m) => ({
    default: m.OfflineLibraryPage,
  })),
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage.tsx').then((m) => ({default: m.SearchPage})),
);
const StaticPage = lazy(() =>
  import('./pages/StaticPage.tsx').then((m) => ({default: m.StaticPage})),
);

const RouteFallback: React.FC = () => (
  <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="h-8 w-56 animate-pulse rounded bg-[#0E111E]" />
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({length: 4}).map((_, idx) => (
        <div
          key={idx}
          className="aspect-[2/3] animate-pulse rounded-xl bg-[#0E111E]"
        />
      ))}
    </div>
  </div>
);

const NotFoundPage: React.FC = () => (
  <div className="mx-auto max-w-2xl px-4 py-24 text-center">
    <h1 className="font-display text-3xl font-extrabold text-white">
      Page not found
    </h1>
    <p className="mt-2 text-sm text-[#A4A9B8]">
      The page you requested does not exist in this catalogue.
    </p>
    <Link
      to="/"
      className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-[#0063E5] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0483EE]"
    >
      Go to Home
    </Link>
  </div>
);

export default function App() {
  return (
    <BrowserRouter basename={BASE_PATH}>
      <CatalogueProvider>
        <div className="flex min-h-screen flex-col bg-transparent text-[#F9F9F9]">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/:year/:month/:slug" element={<MovieDetailPage />} />
                <Route
                  path="/:year/:month/:slug/part/:partNumber"
                  element={<MovieDetailPage />}
                />
                <Route path="/search/label/:label" element={<LabelArchivePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/offline" element={<OfflineLibraryPage />} />
                <Route path="/p/:slug" element={<StaticPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
          <SearchOverlay />
          <PWABanners />
        </div>
      </CatalogueProvider>
    </BrowserRouter>
  );
}
