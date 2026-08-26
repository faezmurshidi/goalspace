'use client';

import { useEffect, useState } from 'react';

/** Below this the sidebar becomes a sheet rather than a rail. */
const MOBILE_BREAKPOINT = 768;

/**
 * Starts false and corrects after mount.
 *
 * The server cannot know the viewport, so any initial guess is wrong half the
 * time. Starting desktop and correcting means the sheet never flashes over
 * desktop content, which is the more jarring of the two mistakes.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const sync = () => setIsMobile(query.matches);

    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isMobile;
}
