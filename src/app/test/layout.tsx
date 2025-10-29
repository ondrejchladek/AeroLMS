'use client';

import { useEffect } from 'react';

export default function TestLayout({
  children
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Override the overflow-hidden from root layout
    document.body.style.overflow = 'auto';
    document.body.style.overscrollBehavior = 'auto';

    return () => {
      // Restore original styles when leaving the page
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
    };
  }, []);

  return <>{children}</>;
}
