import React, {useEffect, useState} from 'react';
import {Film} from 'lucide-react';

interface PosterImageProps {
  src?: string;
  alt: string;
  title?: string;
  className?: string;
  eager?: boolean;
}

export const PosterImage: React.FC<PosterImageProps> = ({
  src,
  alt,
  title,
  className = '',
  eager = false,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#192038] via-[#0E111E] to-[#040714] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Film className="mb-2 h-8 w-8 text-[#0483EE]/75" aria-hidden="true" />
        <span className="line-clamp-3 font-display text-xs font-semibold text-[#CACACA]">
          {title || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
