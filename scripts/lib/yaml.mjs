/**
 * scripts/lib/yaml.mjs — strict YAML subset shared by the blueprint and workflow validators.
 * Owner: tools-engineer (P0-002).
 *
 * Supports exactly what STRATA's machine-readable docs use:
 *   - block maps, block sequences, sequences of maps
 *   - inline maps `{k: v}` and inline arrays `[a, b]`, nested
 *   - quoted strings, integers, decimals, booleans, null
 *   - trailing `# comments` outside quotes
 * Anything else throws with the line number. Guessing is forbidden (I5).
 *
 * NOTE: `scripts/scope-math.mjs` carries its own older subset parser. Unifying them is a
 * producer handoff, not a P0-002 side effect; both are tested against PyYAML.
 */

/** Remove a trailing `# comment`, never inside quotes. `GDD-CORE#concept` keeps its `#`. */
export function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '\\' && q === '"') { i++; continue; }
      if (c === q) q = null;
      continue;
    }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function scalar(raw) {
  const v = raw.trim();
  if (v === '') return null;
  if (v === '[]') return [];
  if (v === '{}') return {};
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^[-+]?\d+$/.test(v)) return Number(v);
  if (/^[-+]?(\d+\.\d*|\d*\.\d+)$/.test(v)) return Number(v);
  if (v.length > 1 && v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1).replace(/\\"/g, '"');
  if (v.length > 1 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

class Flow {
  constructor(s, no) { this.s = s; this.i = 0; this.no = no; }
  fail(msg) { throw new Error(`flow parse at line ${this.no}: ${msg} in ${JSON.stringify(this.s)}`); }
  ws() { while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++; }
  value() {
    this.ws();
    const c = this.s[this.i];
    if (c === '[') return this.array();
    if (c === '{') return this.object();
    if (c === '"' || c === "'") return this.quoted(c);
    return scalar(this.bare());
  }
  quoted(q) {
    let out = '';
    this.i++;
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if (c === '\\' && q === '"') { out += this.s[this.i++] ?? ''; continue; }
      if (c === q) return out;
      out += c;
    }
    this.fail('unterminated string');
  }
  bare() {
    const start = this.i;
    while (this.i < this.s.length && !',]}'.includes(this.s[this.i])) this.i++;
    return this.s.slice(start, this.i).trim();
  }
  key() {
    this.ws();
    if (this.s[this.i] === '"' || this.s[this.i] === "'") return String(this.quoted(this.s[this.i]));
    const start = this.i;
    while (this.i < this.s.length && this.s[this.i] !== ':') this.i++;
    return this.s.slice(start, this.i).trim();
  }
  object() {
    const obj = {};
    this.i++;
    for (;;) {
      this.ws();
      if (this.s[this.i] === '}') { this.i++; return obj; }
      const k = this.key();
      this.ws();
      if (this.s[this.i] !== ':') this.fail(`expected ":" after key ${k}`);
      this.i++;
      obj[k] = this.value();
      this.ws();
      if (this.s[this.i] === ',') { this.i++; continue; }
      if (this.s[this.i] === '}') { this.i++; return obj; }
      this.fail('expected "," or "}"');
    }
  }
  array() {
    const arr = [];
    this.i++;
    for (;;) {
      this.ws();
      if (this.s[this.i] === ']') { this.i++; return arr; }
      arr.push(this.value());
      this.ws();
      if (this.s[this.i] === ',') { this.i++; continue; }
      if (this.s[this.i] === ']') { this.i++; return arr; }
      this.fail('expected "," or "]"');
    }
  }
}

const KEY = /^([A-Za-z0-9_./$-]+(?::[A-Za-z0-9_./$-]+)*):\s*(.*)$/;

export function parseYaml(text) {
  const lines = [];
  text.split('\n').forEach((raw, i) => {
    if (/^\s*#/.test(raw)) return;
    const clean = stripComment(raw).replace(/\s+$/, '');
    if (clean.trim() === '') return;
    lines.push({ indent: clean.match(/^ */)[0].length, text: clean.trim(), no: i + 1 });
  });

  let at = 0;
  const fail = (msg, no) => { throw new Error(`${msg} at line ${no}`); };

  function block(indent) {
    return lines[at].text.startsWith('- ') ? seq(indent) : map(indent);
  }

  function map(indent) {
    const obj = {};
    while (at < lines.length && lines[at].indent === indent && !lines[at].text.startsWith('- ')) {
      const { text, no } = lines[at];
      const m = KEY.exec(text);
      if (!m) fail(`unsupported mapping line ${JSON.stringify(text)}`, no);
      const key = m[1];
      const rest = m[2].trim();
      at++;
      if (rest !== '') obj[key] = value(rest, no);
      else if (at < lines.length && lines[at].indent > indent) obj[key] = block(lines[at].indent);
      else obj[key] = null;
    }
    return obj;
  }

  function value(raw, no) {
    return /^[[{]/.test(raw) ? new Flow(raw, no).value() : scalar(raw);
  }

  function seq(indent) {
    const arr = [];
    while (at < lines.length && lines[at].indent === indent && lines[at].text.startsWith('- ')) {
      const no = lines[at].no;
      const rest = lines[at].text.slice(2).trim();
      at++;
      if (/^[[{]/.test(rest)) { arr.push(new Flow(rest, no).value()); continue; }
      const m = KEY.exec(rest);
      if (!m) { arr.push(scalar(rest)); continue; }
      const item = {};
      const k = m[1];
      const v = m[2].trim();
      if (v !== '') item[k] = value(v, no);
      else if (at < lines.length && lines[at].indent > indent) item[k] = block(lines[at].indent);
      else item[k] = null;
      if (at < lines.length && lines[at].indent > indent) {
        const more = map(lines[at].indent);
        Object.assign(item, more);
      }
      arr.push(item);
    }
    return arr;
  }

  if (!lines.length) return {};
  const root = block(lines[0].indent);
  if (at !== lines.length) fail(`unexpected content ${JSON.stringify(lines[at].text)}`, lines[at].no);
  return root;
}
