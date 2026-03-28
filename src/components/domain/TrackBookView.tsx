'use client';

import { useEffect } from 'react';

export function TrackBookView({ bookId }: { bookId: string }) {
  useEffect(() => {
    fetch('/api/track/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId }),
    }).catch(() => {});
  }, [bookId]);

  return null;
}
