import { describe, expect, it } from 'vitest';

import {
  attachmentKind,
  extensionOf,
  formatBytes,
  isAllowedAttachment,
} from '@/lib/attachments/kinds';

describe('extensionOf', () => {
  it('takes the last dot, so compound extensions survive', () => {
    // KiCad writes board.kicad_pcb. Splitting on the first dot would make
    // "rev2.board.kicad_pcb" a file of type "board.kicad_pcb".
    expect(extensionOf('rev2.board.kicad_pcb')).toBe('kicad_pcb');
  });

  it('lowercases, because operating systems do not agree on case', () => {
    expect(extensionOf('SCHEMATIC.PDF')).toBe('pdf');
  });

  it('returns null when there is no extension to speak of', () => {
    expect(extensionOf('README')).toBeNull();
    expect(extensionOf('.gitignore')).toBeNull();
    expect(extensionOf('trailing.')).toBeNull();
  });
});

describe('isAllowedAttachment', () => {
  it('accepts design sources, not only exports of them', () => {
    // The point of widening: the project holds the real artefact rather than a
    // picture of it that has already lost the parametrics.
    for (const name of ['case.step', 'movement.stl', 'dial.dxf', 'board.kicad_pcb']) {
      expect(isAllowedAttachment(name), name).toBe(true);
    }
  });

  it('accepts the images and documents phase 1 already allowed', () => {
    for (const name of ['tide.png', 'harmonics.pdf', 'notes.txt']) {
      expect(isAllowedAttachment(name), name).toBe(true);
    }
  });

  it('refuses anything not named', () => {
    // An allowlist, not a denylist: a format nobody thought about is refused
    // rather than accepted by omission.
    for (const name of ['run.exe', 'macro.js', 'thing.html', 'README']) {
      expect(isAllowedAttachment(name), name).toBe(false);
    }
  });
});

describe('attachmentKind', () => {
  it('previews images and PDFs', () => {
    expect(attachmentKind('tide.png')).toBe('image');
    expect(attachmentKind('harmonics.pdf')).toBe('pdf');
  });

  it('never previews SVG', () => {
    // The one image format that can carry script. Rendered from this app's own
    // origin it would hand an attacker the session, so it is stored and
    // downloaded like any other design source.
    expect(attachmentKind('schematic.svg')).toBe('file');
  });

  it('treats a design source as a file, not an image', () => {
    expect(attachmentKind('case.step')).toBe('file');
    expect(attachmentKind('board.kicad_pcb')).toBe('file');
  });
});

describe('formatBytes', () => {
  it('reads as a person would say it', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 kB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('storagePathFor', () => {
  it('leads with the owner id, because storage RLS checks exactly that', async () => {
    const { storagePathFor } = await import('@/lib/db/attachments');
    const path = storagePathFor({ ownerId: 'owner-1', projectId: 'proj-1', filename: 'case.step' });
    expect(path.startsWith('owner-1/proj-1/')).toBe(true);
  });

  it('makes two files of the same name distinct', async () => {
    // Two photographs of a lathe are both IMG_1024.jpg, and the second must not
    // replace the first.
    const { storagePathFor } = await import('@/lib/db/attachments');
    const a = storagePathFor({ ownerId: 'o', projectId: 'p', filename: 'IMG_1024.jpg' });
    const b = storagePathFor({ ownerId: 'o', projectId: 'p', filename: 'IMG_1024.jpg' });
    expect(a).not.toBe(b);
  });

  it('strips characters that would change the path shape', async () => {
    const { storagePathFor, filenameFrom } = await import('@/lib/db/attachments');
    const path = storagePathFor({ ownerId: 'o', projectId: 'p', filename: '../../etc/passwd' });
    expect(path.split('/')).toHaveLength(3);
    expect(filenameFrom(path)).toBe('.._.._etc_passwd');
  });
});
