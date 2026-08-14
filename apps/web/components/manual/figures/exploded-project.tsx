/**
 * The specimen record's machine, exploded: a benchtop mill mid CNC
 * conversion. Column and head separating along the Z axis, the stepper
 * motor offset along its own mounting axis, and the ballscrew pulled clear
 * with its bearing blocks and thread ticks. Stroke only, no fills, drawn in
 * a 0 0 100 100 viewBox. Inherits stroke-ink at 1.5px from the wrapping
 * <g> in AnnotatedFigure; only the dashed axis and dimension marks set
 * their own 1px stroke-rule explicitly.
 */
export function ExplodedProject() {
  return (
    <>
      {/* main assembly axis, column through head to motor */}
      <line
        x1="16"
        y1="88"
        x2="86"
        y2="14"
        className="stroke-rule [stroke-dasharray:2_2] [stroke-width:1]"
      />

      {/* column (the upright, squared this session) */}
      <rect x="14" y="48" width="16" height="36" />

      {/* head / spindle housing, offset up the column's axis */}
      <rect x="38" y="28" width="20" height="16" />

      {/* motor's own mounting axis, offset from the head face */}
      <line
        x1="58"
        y1="30"
        x2="70"
        y2="21"
        className="stroke-rule [stroke-dasharray:2_2] [stroke-width:1]"
      />

      {/* stepper motor: NEMA face plus body */}
      <rect x="69" y="11" width="8" height="8" />
      <circle cx="76" cy="18" r="7" />

      {/* ballscrew, drawn clear of the column with its end bearing blocks */}
      <rect x="17" y="89" width="4" height="6" />
      <line x1="21" y1="92" x2="59" y2="92" />
      <rect x="59" y="89" width="4" height="6" />

      {/* thread ticks along the ballscrew */}
      <line x1="25" y1="90" x2="25" y2="94" className="stroke-rule [stroke-width:1]" />
      <line x1="31" y1="90" x2="31" y2="94" className="stroke-rule [stroke-width:1]" />
      <line x1="37" y1="90" x2="37" y2="94" className="stroke-rule [stroke-width:1]" />
      <line x1="43" y1="90" x2="43" y2="94" className="stroke-rule [stroke-width:1]" />
      <line x1="49" y1="90" x2="49" y2="94" className="stroke-rule [stroke-width:1]" />
      <line x1="55" y1="90" x2="55" y2="94" className="stroke-rule [stroke-width:1]" />

      {/* dimension tick, ballscrew length */}
      <line x1="21" y1="97" x2="59" y2="97" className="stroke-rule [stroke-width:1]" />
      <line x1="21" y1="95" x2="21" y2="99" className="stroke-rule [stroke-width:1]" />
      <line x1="59" y1="95" x2="59" y2="99" className="stroke-rule [stroke-width:1]" />
    </>
  );
}
