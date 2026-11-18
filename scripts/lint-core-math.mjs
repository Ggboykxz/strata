#!/usr/bin/env node
/**
 * scripts/lint-core-math.mjs — the deterministic-core ban (P0-003, master §6).
 * Owner: tools-engineer.
 *
 * `packages/core` is the isomorphic simulation. It may not read the wall clock, draw randomness,
 * call a transcendental (results differ between engines), touch the DOM/Node, or depend on any
 * package. This is enforced now, while the package is empty: a rule added after the first
 * `Math.random()` is a rule nobody follows.
 *
 * Uses the TypeScript parser rather than regex: comments and strings must not trip it, and a
 * property access must be recognised as one.
 *
 * Exit: 0 clean · 1 violations · 2 the tree cannot be read.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const CORE_SRC = 'packages/core/src';

const TRANSCENDENTALS = new Set([
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'exp', 'expm1', 'log', 'log2', 'log10', 'log1p',
  'pow', 'cbrt', 'hypot',
]);

const GLOBALS = new Set([
  'window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'Worker', 'requestAnimationFrame',
  'process', 'require', 'Buffer', 'setImmediate',
]);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

if (!existsSync(CORE_SRC)) {
  console.error(`FAIL  ${CORE_SRC} does not exist: cannot prove the core is deterministic.`);
  process.exit(2);
}

const files = walk(CORE_SRC).sort();
const violations = [];
const add = (file, node, message) => {
  const { line, character } = ts.getLineAndCharacterOfPosition(
    node.getSourceFile(), node.getStart(),
  );
  violations.push(`${relative(ROOT, file)}:${line + 1}:${character + 1}  ${message}`);
};

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const spec = node.moduleSpecifier;
      if (spec && ts.isStringLiteral(spec) && !spec.text.startsWith('.')) {
        add(file, spec, `non-relative import "${spec.text}" — core has zero dependencies`);
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'import') {
      add(file, node.expression, 'dynamic import — core has zero dependencies');
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const obj = node.expression.expression;
      const name = node.expression.name.text;
      if (ts.isIdentifier(obj)) {
        if (obj.text === 'Math' && name === 'random') add(file, node, 'Math.random — core must use a seeded PRNG');
        if (obj.text === 'Math' && TRANSCENDENTALS.has(name)) {
          add(file, node, `Math.${name} — transcendental, not identical across engines`);
        }
        if (obj.text === 'Date' && name === 'now') add(file, node, 'Date.now — core must not read the wall clock');
        if (obj.text === 'performance' && name === 'now') add(file, node, 'performance.now — core must not read the wall clock');
        if (obj.text === 'process' && name === 'hrtime') add(file, node, 'process.hrtime — core must not read the wall clock');
        if (obj.text === 'crypto' && (name === 'randomUUID' || name === 'getRandomValues')) {
          add(file, node, `crypto.${name} — core must use a seeded PRNG`);
        }
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Date') {
      add(file, node, 'new Date() — core must not read the wall clock');
    }
    if (ts.isIdentifier(node) && GLOBALS.has(node.text)) {
      const parent = node.parent;
      const isPropertyName = ts.isPropertyAccessExpression(parent) && parent.name === node;
      const isKey = ts.isPropertyAssignment(parent) && parent.name === node;
      const isImportName = (ts.isImportSpecifier(parent) && parent.name === node);
      if (!isPropertyName && !isKey && !isImportName) {
        add(file, node, `"${node.text}" — DOM/Node global banned in core`);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
}

console.log(`core-math ban — ${files.length} file(s) under ${CORE_SRC}`);
if (violations.length) {
  for (const v of violations) console.log(`FAIL  ${v}`);
  console.log(`\nRESULT: FAIL — ${violations.length} banned construct(s).`);
  process.exit(1);
}
console.log('RESULT: PASS — 0 wall-clock reads, 0 unseeded randomness, 0 transcendentals, 0 foreign imports.');
