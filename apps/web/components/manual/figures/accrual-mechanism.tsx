/**
 * The mechanism by which the record accrues, drawn as three linked stages
 * ascending along a diagonal rather than a flowchart of rounded boxes and
 * arrows: a work item (a task card with its box ticked) at bottom left, the
 * entry that closes it (a single ruled line, deliberately drawn flatter
 * and smaller than the other two stages to read as "one line") at centre,
 * and the permanent record it joins (a stack of ruled sheets, standing for
 * two years of entries) at top right. The ascending diagonal both uses the
 * full 0 0 100 100 square the way ExplodedProject does and gives the
 * mechanism a direction: work rises into the record. Each junction carries
 * an open chevron rather than a filled arrowhead, since the wrapping <g>
 * in AnnotatedFigure forces fill:none on every descendant. Stroke only, no
 * fills. Inherits stroke-ink at 1.5px from that wrapping <g>; only the
 * dashed guide axis and the stack's inner rules set their own 1px
 * stroke-rule explicitly.
 */
export function AccrualMechanism() {
  return (
    <>
      {/* guide axis, work rising into the record */}
      <line
        x1="10"
        y1="88"
        x2="90"
        y2="10"
        className="stroke-rule [stroke-dasharray:2_2] [stroke-width:1]"
      />

      {/* stage 1: the work item, a task card with its box ticked */}
      <rect x="8" y="66" width="22" height="22" />
      <rect x="13" y="71" width="6" height="6" />
      <path d="M14.5 74 L16.5 76.5 L19 71.5" />
      <line x1="22" y1="74" x2="27" y2="74" className="stroke-rule [stroke-width:1]" />
      <line x1="13" y1="83" x2="27" y2="83" className="stroke-rule [stroke-width:1]" />

      {/* junction 1: the task closes into the entry that closed it */}
      <line x1="30" y1="76" x2="44" y2="51" />
      <path d="M40.5 48.5 L44 51 L40 56" />

      {/* stage 2: the entry, one line, flatter than the other two stages */}
      <rect x="44" y="46" width="22" height="9" />
      <line x1="48" y1="50.5" x2="62" y2="50.5" className="stroke-rule [stroke-width:1]" />

      {/* junction 2: the entry is attached to the permanent record */}
      <line x1="66" y1="50" x2="78" y2="36" />
      <path d="M74 33.5 L78 36 L75 41" />

      {/* stage 3: the permanent record, a stack of ruled sheets */}
      <rect x="80" y="6" width="14" height="50" />
      <rect x="77" y="10" width="14" height="50" />
      <rect x="74" y="14" width="14" height="50" />
      <line x1="77" y1="20" x2="85" y2="20" className="stroke-rule [stroke-width:1]" />
      <line x1="77" y1="26" x2="85" y2="26" className="stroke-rule [stroke-width:1]" />
      <line x1="77" y1="32" x2="85" y2="32" className="stroke-rule [stroke-width:1]" />
      <line x1="77" y1="38" x2="85" y2="38" className="stroke-rule [stroke-width:1]" />
      <line x1="77" y1="44" x2="85" y2="44" className="stroke-rule [stroke-width:1]" />
      <line x1="77" y1="50" x2="85" y2="50" className="stroke-rule [stroke-width:1]" />
      <line x1="77" y1="56" x2="82" y2="56" className="stroke-rule [stroke-width:1]" />
    </>
  );
}
