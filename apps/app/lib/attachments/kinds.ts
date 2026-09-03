/**
 * What may be attached, and how it should be shown.
 *
 * The check is on the **extension**, not the mime type. Most CAD and EDA
 * formats have no registered mime type, so a browser sends
 * `application/octet-stream` for a STEP file exactly as it would for anything
 * else it does not recognise — a mime allowlist would either reject every
 * design source or accept every binary, and neither is the rule we want.
 *
 * The bucket therefore accepts the binary and this decides what is allowed. It
 * is a statement of intent rather than a security boundary: the bucket is
 * private, scoped to the owner's own path prefix by storage RLS, and nothing
 * stored is executed or served inline unless it is on the preview list.
 */
export type AttachmentKind = 'image' | 'pdf' | 'text' | 'file';

/** Previewable in a browser without risk. SVG is deliberately absent. */
const IMAGE = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const;

/**
 * Design sources, kept as themselves rather than as a picture of themselves.
 *
 * None of these previews. They are stored so the project holds the real
 * artefact — the thing you would open in the tool that made it — instead of an
 * export that has already lost the parametrics.
 */
const DESIGN = [
  'svg',
  'step',
  'stp',
  'stl',
  'iges',
  'igs',
  'dxf',
  'dwg',
  '3mf',
  'f3d',
  'scad',
  'kicad_pcb',
  'kicad_sch',
  'kicad_pro',
  'sch',
  'brd',
  'gbr',
  'zip',
] as const;

const DOCUMENT = ['pdf'] as const;
const TEXT = ['txt', 'md', 'csv'] as const;

export const ALLOWED_EXTENSIONS: readonly string[] = [...IMAGE, ...DESIGN, ...DOCUMENT, ...TEXT];

/**
 * The extension, lowercased, or null.
 *
 * KiCad uses compound extensions (`board.kicad_pcb`), so the last dot is the
 * separator rather than the first — `rev2.board.kicad_pcb` is a KiCad board,
 * not a file of type "board.kicad_pcb".
 */
export function extensionOf(filename: string): string | null {
  const base = filename.split('/').pop() ?? filename;
  const dot = base.lastIndexOf('.');
  if (dot <= 0 || dot === base.length - 1) return null;
  return base.slice(dot + 1).toLowerCase();
}

export function isAllowedAttachment(filename: string): boolean {
  const extension = extensionOf(filename);
  return extension !== null && ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * How to show it.
 *
 * SVG resolves to `file`, not `image`. It is the one image format that can
 * carry script, and rendering one from the app's own origin would hand an
 * attacker the session — so it is stored and downloaded like any other design
 * source, never rendered inline.
 */
export function attachmentKind(filename: string): AttachmentKind {
  const extension = extensionOf(filename);
  if (extension === null) return 'file';
  if ((IMAGE as readonly string[]).includes(extension)) return 'image';
  if ((DOCUMENT as readonly string[]).includes(extension)) return 'pdf';
  if ((TEXT as readonly string[]).includes(extension)) return 'text';
  return 'file';
}

/** Bytes, for a person. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
