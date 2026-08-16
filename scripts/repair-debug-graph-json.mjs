import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/mechanics/debug-graph/data/debug-graph.v1.json'
const lines = readFileSync(path, 'utf8').split(/\r?\n/)
// Keep through complete computeEffectiveShockMultiplierFromSettings closing `},`
const keep = lines.slice(0, 13773)
const tail = [
	'    "symbol.computeAcpShockwaveMultiplierFromSettings": {',
	'      "id": "symbol.computeAcpShockwaveMultiplierFromSettings",',
	'      "type": "runtime.symbol",',
	'      "label": "computeAcpShockwaveMultiplierFromSettings",',
	'      "path": "packages/sdk/src/mechanics/ilm-calculator.ts",',
	'      "symbolKind": "other",',
	'      "status": "observed",',
	'      "mechanicNodeIds": []',
	'    }',
	'  },',
	'  "edges": []',
	'}',
	''
]
writeFileSync(path, [...keep, ...tail].join('\n'))
const g = JSON.parse(readFileSync(path, 'utf8'))
console.log('ok nodes', Object.keys(g.nodes).length)
