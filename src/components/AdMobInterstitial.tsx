import React from 'react';

interface AdMobInterstitialProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

// Google AdSense display ads are rendered in their normal page placements.
// Do not imitate an AdMob interstitial or place a standard AdSense unit in
// a forced full-screen overlay. AdSense Auto ads can manage eligible formats.
export const AdMobInterstitial: React.FC<AdMobInterstitialProps> = () => null;
