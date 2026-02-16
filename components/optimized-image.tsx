'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getOptimizedImageUrl } from '@/lib/tmdb';

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  size?: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
}

export function OptimizedImage({
  src,
  alt,
  width = 500,
  height = 750,
  className,
  priority = false,
  size = 'w500'
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  
  const imageUrl = error ? '/placeholder.svg' : getOptimizedImageUrl(src, size);

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      quality={85}
      onError={() => setError(true)}
      placeholder="blur"
      blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    />
  );
}
