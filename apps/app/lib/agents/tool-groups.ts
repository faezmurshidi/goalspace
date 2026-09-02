import { REGISTRY, REGISTRY_NAMES, type ToolDefinition } from '@/lib/agents/tools/registry';

export type ToolGroupKey = 'reads' | 'records' | 'proposes' | 'external';

export interface ToolGroup {
  key: ToolGroupKey;
  labelKey: string;
  /** Rendered under the group heading. Only the writing group needs one. */
  noteKey?: string;
  tools: ToolDefinition[];
}

/**
 * Tools grouped by what they permit, not alphabetically.
 *
 * The grouping is derived from `writes` and `external` on the registry entry
 * itself, so a tool added later files itself. Matched on the exact value rather
 * than on truthiness: `writes` is a union, and a truthiness test would file a
 * recording tool under the heading that promises the owner an approval step. A hand-kept list here would let
 * a new tool default into the read group by omission — which is the one
 * mistake this grouping exists to make impossible to overlook.
 *
 * The order is fixed and deliberate: what an agent can see, then what it can
 * ask for, then what leaves the building. It reads as escalating consequence.
 */
export function toolGroups(): ToolGroup[] {
  const all = REGISTRY_NAMES.map((name) => REGISTRY[name]);

  return [
    {
      key: 'reads',
      labelKey: 'app.agents.tools.reads',
      tools: all.filter((t) => t.writes === false && !t.external),
    },
    {
      // Between reads and proposes on purpose. The order is escalating
      // consequence, and writing down what the owner already said is a smaller
      // act than asking to change something.
      key: 'records',
      labelKey: 'app.agents.tools.records',
      noteKey: 'app.agents.tools.recordsNote',
      tools: all.filter((t) => t.writes === 'records' && !t.external),
    },
    {
      key: 'proposes',
      labelKey: 'app.agents.tools.proposes',
      noteKey: 'app.agents.tools.proposesNote',
      tools: all.filter((t) => t.writes === 'proposes' && !t.external),
    },
    {
      // Empty today. Kept rather than hidden: the boundary should be visible
      // on the page before anything crosses it, so granting the first external
      // tool is an obvious act rather than a new section appearing.
      key: 'external',
      labelKey: 'app.agents.tools.external',
      tools: all.filter((t) => t.external),
    },
  ];
}
