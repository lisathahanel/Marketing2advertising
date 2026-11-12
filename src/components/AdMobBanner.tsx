import React from 'react';
import { AdSenseAd } from './AdSenseAd';

interface AdMobBannerProps {
  format?: 'banner' | 'medium' | 'native';
  className?: string;
}

// All legacy ad placements now render the M2A Google AdSense unit.
// The old AdMob-branded placeholder has been removed.
export const AdMobBanner: React.FC<AdMobBannerProps> = ({ className = '' }) => {
  return <AdSenseAd className={className} />;
};
