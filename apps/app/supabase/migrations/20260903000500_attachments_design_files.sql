-- Let the bucket hold design sources, not only pictures of them.
--
-- Phase 1 allowed png, jpeg, webp, gif, pdf and text/plain at 25 MB. That is
-- enough for a schematic exported to PDF and nothing else: the project ends up
-- holding a rendering of the artefact rather than the artefact.
--
-- Two changes.
--
-- `application/octet-stream` is added because it has to be. Most CAD and EDA
-- formats have no registered mime type, so a browser sends octet-stream for a
-- STEP file exactly as it would for anything else it does not recognise. A
-- mime allowlist can therefore either reject every design source or accept
-- every binary; it cannot tell them apart. So the *extension* is the rule
-- instead, checked in `lib/attachments/kinds.ts` before a row is ever written,
-- and this list stops being the thing that decides.
--
-- That is a smaller concession than it reads as. The bucket is private, storage
-- RLS scopes every object to the owner's own path prefix, nothing here is
-- executed, and nothing is served inline unless the extension is on the preview
-- list — which SVG deliberately is not, being the one image format that can
-- carry script.
--
-- The limit goes to 50 MB. A STEP assembly of a clock movement is routinely
-- tens of megabytes, and 25 MB would reject the files this change exists for.
update storage.buckets
set
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/zip',
    'model/step',
    'model/stl',
    'model/3mf',
    'application/octet-stream'
  ]
where id = 'attachments';
