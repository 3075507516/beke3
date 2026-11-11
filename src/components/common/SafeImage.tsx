import React, { useState, useRef, useEffect } from 'react';
import { resolveFileUrl } from '../../utils/storage';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackSrc?: string;
  alt?: string;
  className?: string;
}

// Built-in high-quality SVG gradient avatars and card backgrounds so even without internet they render beautifully
const DEFAULT_FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' width='100%25' height='100%25'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23fb7185'/%3E%3Cstop offset='100%25' stop-color='%23e11d48'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='230' r='50' fill='%23ffffff' opacity='0.25'/%3E%3Cpath d='M380 230 L420 230 M400 210 L400 250' stroke='%23ffffff' stroke-width='4' stroke-linecap='round'/%3E%3Ctext x='50%25' y='320' font-family='sans-serif' font-size='22' fill='%23ffffff' text-anchor='middle' font-weight='600'%3Efox3 Showcase%3C/text%3E%3C/svg%3E";

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt = 'fox3 Image',
  className = '',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState<string>(src || fallbackSrc);
  const [hasError, setHasError] = useState<boolean>(!src);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setCurrentSrc(fallbackSrc);
      setIsLoaded(true);
    }
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  useEffect(() => {
    let isCancelled = false;

    if (src) {
      setHasError(false);
      // If src is an IndexedDB file key (idb_file_*), resolve it to a readable blob URL
      if (src.startsWith('idb_file_')) {
        resolveFileUrl(src)
          .then((resolved) => {
            if (!isCancelled) {
              if (resolved && resolved !== src) {
                setCurrentSrc(resolved);
              } else {
                setCurrentSrc(fallbackSrc);
                setHasError(true);
              }
              setIsLoaded(true);
            }
          })
          .catch(() => {
            if (!isCancelled) {
              setCurrentSrc(fallbackSrc);
              setHasError(true);
              setIsLoaded(true);
            }
          });
      } else {
        setCurrentSrc(src);
        if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
          setIsLoaded(true);
        }
      }
    } else {
      setCurrentSrc(fallbackSrc);
      setHasError(true);
      setIsLoaded(true);
    }

    return () => {
      isCancelled = true;
    };
  }, [src, fallbackSrc]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-200/60 dark:bg-slate-800/60 animate-pulse flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        {...props}
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={props.loading || 'lazy'}
        decoding="async"
        onError={handleError}
        onLoad={handleLoad}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
