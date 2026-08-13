import React, { useLayoutEffect, useRef, useState } from 'react';
import { ImageOff } from 'lucide-react';

interface AppImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback?: React.ReactNode;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  fallbackClassName?: string;
  priority?: boolean;
  showLoader?: boolean;
}

const defaultFallback = (
  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600">
    <ImageOff className="w-8 h-8" />
  </div>
);

export const AppImage: React.FC<AppImageProps> = ({
  src,
  alt,
  fallback = defaultFallback,
  containerClassName = 'relative w-full h-full',
  containerStyle,
  fallbackClassName = 'w-full h-full',
  className = 'w-full h-full object-cover',
  priority = false,
  showLoader = true,
  onLoad,
  onError,
  fetchPriority,
  loading,
  decoding,
  ...imgProps
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageSrc = typeof src === 'string' ? src.trim() : '';
  const priorityAttribute = {
    fetchpriority: priority ? 'high' : fetchPriority ?? 'auto',
  } as React.ImgHTMLAttributes<HTMLImageElement>;

  useLayoutEffect(() => {
    const image = imageRef.current;

    setFailed(false);
    setLoaded(Boolean(image?.complete && image.naturalWidth > 0));
  }, [imageSrc]);

  if (!imageSrc || failed) {
    return <div className={containerClassName} style={containerStyle}><div className={fallbackClassName}>{fallback}</div></div>;
  }

  return (
    <div className={containerClassName} style={containerStyle}>
      {showLoader && !loaded && (
        <div className="absolute inset-0 overflow-hidden bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-pulse">
          <div className="absolute inset-y-0 -right-1/2 w-1/2 bg-gradient-to-l from-transparent via-white/50 to-transparent dark:via-white/10" />
        </div>
      )}
      <img
        ref={imageRef}
        {...imgProps}
        {...priorityAttribute}
        src={imageSrc}
        alt={alt}
        loading={priority ? 'eager' : loading ?? 'lazy'}
        decoding={decoding ?? 'async'}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setFailed(true);
          onError?.(event);
        }}
      />
    </div>
  );
};
