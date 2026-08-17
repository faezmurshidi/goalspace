import { Archivo, Azeret_Mono } from 'next/font/google';

// Deliberately identical to apps/web/lib/fonts.ts. The workspace and the
// marketing site are one system, and a user who signs up should not feel the
// typeface change under them.
//
// Archivo carries the width axis, which DESIGN.md's Width Axis Rule uses to
// separate stamped display type from plain technical prose. Azeret Mono is
// annotation only: dates, durations, statuses, counts, ratios.
export const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

export const azeret = Azeret_Mono({
  subsets: ['latin'],
  weight: ['500'],
  display: 'swap',
  variable: '--font-azeret',
});
