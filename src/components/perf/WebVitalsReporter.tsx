'use client';

import { useReportWebVitals } from 'next/web-vitals';

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== 'production') {
      if (metric.name === 'LCP' || metric.name === 'CLS' || metric.name === 'INP') {
        console.debug(`[WebVitals] ${metric.name}: ${Math.round(metric.value * 100) / 100}`);
      }
      return;
    }

    // In production, beacon Web Vitals safely when analytics endpoint is configured
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const url = process.env.NEXT_PUBLIC_VITALS_ENDPOINT;
      if (url) {
        navigator.sendBeacon(url, JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
        }));
      }
    }
  });

  return null;
}
