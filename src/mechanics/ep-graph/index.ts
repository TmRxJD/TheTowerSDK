import raw from './data/ep-graph.v1.json'
import { EpGraphSchema, type EpGraph } from './schema'
import { applyEpGraphMutations } from './mutate'
import { validateEpGraph } from './validate'
import { renderEpGraphMermaidSlices } from './render-mermaid'
import { buildEpGraphIndex, formatEpGraphStatusReport } from './build-index'
import { renderEpRelationsNarrative } from './narrative'

export * from './schema'
export * from './mutate'
export * from './validate'
export * from './render-mermaid'
export * from './build-index'
export * from './narrative'

/** Canonical EP dependency graph (parsed + validated). */
export function loadEpGraph(): EpGraph {
  const parsed = EpGraphSchema.parse(raw)
  const { errors } = validateEpGraph(parsed)
  if (errors.length) {
    throw new Error(`ep-graph invalid: ${errors.join('; ')}`)
  }
  return parsed
}

export function filterEpGraph(
  graph: EpGraph,
  opts: {
    family?: string
    type?: string
    status?: string
    edgeKind?: string
  } = {},
): EpGraph {
  const nodes: EpGraph['nodes'] = {}
  for (const [id, node] of Object.entries(graph.nodes)) {
    if (opts.family && node.family !== opts.family) continue
    if (opts.type && node.type !== opts.type) continue
    if (opts.status && node.status !== opts.status) continue
    nodes[id] = node
  }
  const ids = new Set(Object.keys(nodes))
  const edges = graph.edges.filter(e => {
    if (opts.edgeKind && e.kind !== opts.edgeKind) return false
    return ids.has(e.from) && ids.has(e.to)
  })
  return { ...graph, nodes, edges }
}

export {
  applyEpGraphMutations,
  validateEpGraph,
  renderEpGraphMermaidSlices,
  buildEpGraphIndex,
  formatEpGraphStatusReport,
  renderEpRelationsNarrative,
}
