/**
 * The product's resume view, drawn as a manual would draw a screen: a
 * ruled panel divided into three regions rather than a screenshot in a
 * browser frame (DESIGN.md bans the floating-screenshot hero). Top to
 * bottom: where you left off, what is open, what you decided. Each region
 * is a rectangle with hairline internal rules standing in for rows of
 * text. Stroke only, no fills, drawn in a 0 0 100 100 viewBox. Inherits
 * stroke-ink at 1.5px from the wrapping <g> in AnnotatedFigure; only the
 * dashed divider and the row-rule ticks set their own 1px stroke-rule
 * explicitly.
 */
export function ResumeView() {
  return (
    <>
      {/* outer panel, the whole resume screen */}
      <rect x="6" y="6" width="88" height="88" />

      {/* region 1: where you left off, a single highlighted row */}
      <rect x="10" y="12" width="80" height="14" />
      <line x1="16" y1="19" x2="70" y2="19" className="stroke-rule [stroke-width:1]" />

      {/* divider between "left off" and "open" */}
      <line
        x1="6"
        y1="32"
        x2="94"
        y2="32"
        className="stroke-rule [stroke-dasharray:2_2] [stroke-width:1]"
      />

      {/* region 2: what's open, a short list of ruled rows */}
      <rect x="10" y="38" width="80" height="30" />
      <line x1="16" y1="46" x2="80" y2="46" className="stroke-rule [stroke-width:1]" />
      <line x1="16" y1="53" x2="80" y2="53" className="stroke-rule [stroke-width:1]" />
      <line x1="16" y1="60" x2="66" y2="60" className="stroke-rule [stroke-width:1]" />

      {/* divider between "open" and "decided" */}
      <line
        x1="6"
        y1="74"
        x2="94"
        y2="74"
        className="stroke-rule [stroke-dasharray:2_2] [stroke-width:1]"
      />

      {/* region 3: what you decided, a shorter ruled row */}
      <rect x="10" y="78" width="80" height="12" />
      <line x1="16" y1="84" x2="60" y2="84" className="stroke-rule [stroke-width:1]" />
    </>
  );
}
