'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

const FALLBACK_IMAGE = '/images/hero-cake.svg';

export default function CakeImage({ src, alt, onError, ...props }: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps['src'] | null>(null);
  const imageSrc = failedSource === src ? FALLBACK_IMAGE : src;

  return (
    <Image
      {...props}
      alt={alt}
      src={imageSrc}
      onError={(event) => {
        onError?.(event);
        setFailedSource(src);
      }}
    />
  );
}
