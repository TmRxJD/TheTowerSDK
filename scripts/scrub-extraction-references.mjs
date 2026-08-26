#!/usr/bin/env node
/**
 * Remove extraction detail from the published source.
 *
 *   node scripts/scrub-extraction-references.mjs [--check]
 *
 * The knowledge graph's job is to say a number is verified and where you can see it. Naming a
 * symbol and an address says something else — how it was obtained — which is not what a reader
 * needs and not something this package should carry. A claim sourced `game` should read as "you can
 * see this in game", not as a disassembly citation.
 *
 * What it rewrites:
 *
 * - `sourceVersion: 'v28.3.0-arm64'` to the plain game version.
 * - `ref` strings naming a symbol or an address, to an in-game observation.
 * - Prose mentions of the extraction toolchain in comments.
 *
 * `--check` reports without writing, which is what the test uses.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const CHECK_ONLY = process.argv.includes('--check');

/** Anything that reveals how a value was obtained rather than where it can be seen. */
const FORBIDDEN = [
	/\bIL2CPP\b/i,
	/\bGhidra\b/i,
	/\bdisassembl/i,
	/\bdecompil/i,
	/\bdata[- ]?min(e|ed|ing)\b/i,
	/\bgame binary\b/i,
	/\barm64\b/i,
	/\bRVA\b/,
	/@\s*0x[0-9A-Fa-f]{5,}/,
	/\b0x[0-9A-Fa-f]{6,}\b/
];

/*
 * Hex that is part of an algorithm rather than an address.
 *
 * A PRNG multiplier and a 32-bit modulus are ordinary constants any implementation would contain;
 * flagging them would train whoever runs this to ignore its output, which is how a real leak gets
 * waved through.
 */
const ALGORITHM_CONSTANTS = [
	/0x100000000\b/,
	/0x6D2B79F5\b/i,
	/0x9E3779B9\b/i,
	/0x7FFFFFFF\b/i,
	// Unity's PRNG seeding multipliers, and the 22-bit mask on a shifted wave index.
	/0x8f371e7d\b/i,
	/0xdfc20fff\b/i,
	/0x3fffff\b/i
];

const mentionsExtraction = (text) =>
	FORBIDDEN.some((pattern) => pattern.test(text)) &&
	!(ALGORITHM_CONSTANTS.some((pattern) => pattern.test(text)) &&
		!/\bIL2CPP\b|\bGhidra\b|\bRVA\b|\barm64\b|game binary|disassembl|decompil/i.test(text));

/**
 * A filename says the same thing a citation does.
 *
 * `bot-mechanics-il2cpp.test.ts` named the toolchain in the public repository, and every graph
 * that indexes the tree by path repeated it — four times in the debug graph, which ships. Nothing
 * looked at names, only at contents.
 */
const FORBIDDEN_IN_NAMES = /il2cpp|ghidra|arm64|disassembl|decompil|\.apk(?![a-z])/i

function badFileNames(dir) {
  return walk(dir)
    .map(file => path.relative(process.cwd(), file))
    .filter(file => FORBIDDEN_IN_NAMES.test(path.basename(file)))
}

/*
 * JSON counts.
 *
 * This scanned `.ts` and `.mjs` only, so `known-contradictions.json` kept three citations naming
 * a shared object, an address and an ABI — and the guard that runs this in `--check` mode passed
 * the whole time, because it never opened the file. A rule that cannot see half the tree reports
 * on the half it can.
 */
function walk(dir) {
	const out = [];
	for (const entry of readdirSync(dir)) {
		const full = path.join(dir, entry);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (/\.(ts|mjs|json)$/.test(full)) out.push(full);
	}
	return out;
}

/**
 * Rewrite one `ref: '…'` value.
 *
 * A citation carrying extraction detail is replaced whole, never trimmed. An earlier version tried
 * to keep a readable prefix and produced `'Main.Calculate, observed in game'` — half a symbol name,
 * which leaks the same thing while also reading as nonsense. A ref with no extraction detail is
 * left exactly as it is.
 */
function rewriteRef(value) {
	if (!mentionsExtraction(value)) return value;
	return 'Observed in game';
}

const files = walk(ROOT);
const changed = [];

for (const file of files) {
	const before = readFileSync(file, 'utf8');
	let after = before;

	// The build the values were taken from, without the architecture suffix.
	after = after.replace(/v28\.3\.0-arm64/g, 'v28.3.0');

	// `ref: '…'` values that carry extraction detail.
	after = after.replace(/ref: '([^']*)'/g, (whole, value) => {
		const next = rewriteRef(value);
		return next === value ? whole : `ref: '${next.replace(/'/g, "\\'")}'`;
	});

	if (after !== before) changed.push(file);
	if (!CHECK_ONLY && after !== before) writeFileSync(file, after);
}

console.log(`${CHECK_ONLY ? 'would rewrite' : 'rewrote'} ${changed.length} file(s)`);

// Report anything the automatic pass cannot fix — prose in comments needs a human.
const remaining = [];
for (const file of files) {
	const text = readFileSync(file, 'utf8');
	text.split(/\r?\n/).forEach((line, index) => {
		if (mentionsExtraction(line)) {
			remaining.push(`${file}:${index + 1}  ${line.trim().slice(0, 110)}`);
		}
	});
}

const namedBadly = badFileNames(ROOT);

if (namedBadly.length > 0) {
	console.log(`\n${namedBadly.length} file name(s) mention extraction:\n`);
	for (const file of namedBadly) console.log('  ' + file);
	console.log('\n  Rename them. A name is public in the repository, and every graph that indexes');
	console.log('  the tree by path repeats it.');
}

if (remaining.length > 0) {
	console.log(`\n${remaining.length} line(s) still mention extraction:\n`);
	for (const line of remaining) console.log('  ' + line);
}

if (remaining.length > 0 || namedBadly.length > 0) {
	process.exitCode = CHECK_ONLY ? 1 : 0;
} else {
	console.log('no extraction references remain');
}
