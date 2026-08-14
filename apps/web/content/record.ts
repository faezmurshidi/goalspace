/**
 * Specimen record used to illustrate the product on the landing page.
 * This is an example, not a claimed customer project, testimonial, or case
 * study. Nothing on the page should imply a named real user.
 */

/**
 * The record is a dated specimen, not a live feed: every elapsed-time figure
 * on the landing page (the hero's "away" duration, blocker durations, and
 * so on) is computed relative to this fixed date, never to `new Date()`.
 * Computing from the real current date would make the page's strongest
 * element drift with the visitor's clock (reading "away 15 months" a year
 * from now) and would make statically generated output depend on build
 * time. Bump this deliberately, alongside the record's own dates, when the
 * specimen is refreshed; every plate that shows a duration should read it
 * from here.
 */
export const AS_OF = '2026-08-13';

export type EntryKind = 'note' | 'decision' | 'source' | 'session';

export interface RecordEntry {
  /** ISO date, YYYY-MM-DD. */
  at: string;
  kind: EntryKind;
  text: string;
}

export interface RecordBlocker {
  /** ISO date the item became blocked. */
  since: string;
  title: string;
  /** What is being waited on, in the author's own words. */
  waitingOn: string;
}

export interface ProjectRecord {
  title: string;
  kind: 'build' | 'learn' | 'research';
  startedAt: string;
  lastTouchedAt: string;
  entries: RecordEntry[];
  blockers: RecordBlocker[];
  decisions: RecordEntry[];
}

export const record: ProjectRecord = {
  title: 'X2 mill, CNC conversion',
  kind: 'build',
  startedAt: '2025-04-12',
  lastTouchedAt: '2026-07-21',

  entries: [
    {
      at: '2025-04-12',
      kind: 'note',
      text: 'Bought the mill secondhand. Column flex is worse than the forums admit.',
    },
    {
      at: '2025-05-03',
      kind: 'decision',
      text: 'Steppers, not servos. Closed loop cost three times as much for rigidity this table does not have.',
    },
    {
      at: '2025-05-19',
      kind: 'source',
      text: 'Belt drive conversion thread. The 2:1 reduction is what makes the Z axis hold.',
    },
    {
      at: '2025-06-08',
      kind: 'session',
      text: 'Stripped the head. Spindle runout measured 0.04mm, which is inside what I can live with.',
    },
    {
      at: '2025-07-14',
      kind: 'note',
      text: 'Ballscrews ordered. Eight week lead time, so nothing moves until September.',
    },
    {
      at: '2025-09-03',
      kind: 'decision',
      text: 'LinuxCNC over Mach3. Mach3 wants a parallel port and the mini PC does not have one.',
    },
    {
      at: '2025-10-02',
      kind: 'session',
      text: 'Cut and drilled the motor mount plates. Two of four holes needed opening out.',
    },
    {
      at: '2025-11-20',
      kind: 'decision',
      text: 'Dropped the printed motor mounts. PLA crept under belt tension and Z lost 0.2mm across a week.',
    },
    {
      at: '2025-12-15',
      kind: 'note',
      text: 'Z backlash reads 0.11mm before preload. Expected half that.',
    },
    {
      at: '2026-01-18',
      kind: 'session',
      text: 'First powered move under LinuxCNC. All three axes jog, nothing is squared yet.',
    },
    {
      at: '2026-02-09',
      kind: 'note',
      text: 'Losing steps on rapids above 1200mm per minute. Suspect current limit, not the drive.',
    },
    {
      at: '2026-03-14',
      kind: 'note',
      text: 'Spindle encoder ordered. Rigid tapping does not happen without it.',
    },
    {
      at: '2026-04-05',
      kind: 'source',
      text: 'Closed loop spindle thread. The index pulse is the part that matters, not the count.',
    },
    {
      at: '2026-06-02',
      kind: 'note',
      text: 'Ballscrew end bearings back ordered with no date given.',
    },
    {
      at: '2026-07-21',
      kind: 'session',
      text: 'Squared the column. Tramming holds within 0.02mm across 150mm.',
    },
  ],

  blockers: [
    {
      since: '2026-03-14',
      title: 'Spindle encoder',
      waitingOn: 'Supplier has not shipped. No tracking, two emails unanswered.',
    },
    {
      since: '2026-06-02',
      title: 'Ballscrew end bearings',
      waitingOn: 'Back ordered, no date given.',
    },
  ],

  decisions: [
    {
      at: '2025-05-03',
      kind: 'decision',
      text: 'Steppers, not servos. Closed loop cost three times as much for rigidity this table does not have.',
    },
    {
      at: '2025-09-03',
      kind: 'decision',
      text: 'LinuxCNC over Mach3. Mach3 wants a parallel port and the mini PC does not have one.',
    },
    {
      at: '2025-11-20',
      kind: 'decision',
      text: 'Dropped the printed motor mounts. PLA crept under belt tension and Z lost 0.2mm across a week.',
    },
  ],
};
