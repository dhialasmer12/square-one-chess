

let engine: any | null = null;
let initFailed = false;
let initPromise: Promise<boolean> | null = null;

let commandChain: Promise<void> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = commandChain.then(fn);
  commandChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function stockfishDepth(envKey: string, fallback: number): number {
  const raw = process.env[envKey];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? Math.min(40, Math.max(1, n)) : fallback;
}

export function getPredictDepth(): number {
  return stockfishDepth('STOCKFISH_PREDICT_DEPTH', 12);
}

export function getAnalysisDepth(): number {
  return stockfishDepth('STOCKFISH_ANALYZE_DEPTH', 12);
}

export function getLeafDepth(): number {
  return stockfishDepth('STOCKFISH_LEAF_DEPTH', 8);
}

export async function initStockfishIfNeeded(): Promise<boolean> {
  if (process.env.STOCKFISH_ENABLED === '0' || process.env.STOCKFISH_ENABLED === 'false') {
    return false;
  }
  if (engine) {
    return true;
  }
  if (initFailed) {
    return false;
  }
  if (!initPromise) {
    initPromise = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const initEngine = require('stockfish') as (
          flavor?: string | null
        ) => Promise<any>;
        const flavor = process.env.STOCKFISH_WASM_FLAVOR ?? 'lite-single';
        const eng = await initEngine(flavor);
        await uciHandshake(eng);
        engine = eng;
        return true;
      } catch (e) {
        initFailed = true;
        console.warn('[stockfish] WASM engine failed to start:', e);
        return false;
      }
    })();
  }
  return initPromise;
}

function splitLines(msg: string): string[] {
  return String(msg)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

async function sendAndWaitForLine(
  eng: any,
  cmd: string,
  predicate: (line: string) => boolean,
  timeoutMs: number
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const acc: string[] = [];
    const prev = eng.listener;
    const timer = setTimeout(() => {
      eng.listener = prev;
      reject(new Error(`Stockfish timeout waiting for response to: ${cmd}`));
    }, timeoutMs);
    eng.listener = (msg: string) => {
      prev?.(msg);
      for (const line of splitLines(msg)) {
        acc.push(line);
        if (predicate(line)) {
          clearTimeout(timer);
          eng.listener = prev;
          resolve(acc);
          return;
        }
      }
    };
    eng.sendCommand(cmd);
  });
}

async function uciHandshake(eng: any): Promise<void> {
  await sendAndWaitForLine(eng, 'uci', (l) => l === 'uciok', 30_000);
  await sendAndWaitForLine(eng, 'isready', (l) => l === 'readyok', 30_000);
}

async function sendGoSequence(eng: any, commands: string[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const acc: string[] = [];
    const prev = eng.listener;
    const timer = setTimeout(() => {
      eng.listener = prev;
      reject(new Error('Stockfish search timeout'));
    }, 120_000);
    eng.listener = (msg: string) => {
      prev?.(msg);
      for (const line of splitLines(msg)) {
        acc.push(line);
        if (line.startsWith('bestmove')) {
          clearTimeout(timer);
          eng.listener = prev;
          resolve(acc);
          return;
        }
      }
    };
    for (const c of commands) {
      eng.sendCommand(c);
    }
  });
}

export async function runUciSearch(
  fen: string,
  depth: number,
  multiPv: number
): Promise<string[] | null> {
  const ok = await initStockfishIfNeeded();
  if (!ok || !engine) {
    return null;
  }
  const mp = Math.min(10, Math.max(1, Math.floor(multiPv)));
  const d = Math.min(40, Math.max(1, Math.floor(depth)));
  return runExclusive(() =>
    sendGoSequence(engine, [
      'ucinewgame',
      `setoption name MultiPV value ${mp}`,
      `position fen ${fen}`,
      `go depth ${d}`,
    ])
  );
}

export function parseBestmoveUci(lines: string[]): string | null {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (!line.startsWith('bestmove')) {
      continue;
    }
    const parts = line.split(/\s+/);
    if (parts.length >= 2 && parts[1] !== '(none)') {
      return parts[1]!;
    }
    return null;
  }
  return null;
}

export interface ParsedMultiPvLine {
  multipv: number;
  depth: number;
  cp: number | null;
  mate: number | null;
  uciFirst: string;
}

/** Keep deepest info row per MultiPV index. */
export function parseMultiPvResults(lines: string[]): ParsedMultiPvLine[] {
  const byIndex = new Map<
    number,
    { depth: number; cp: number | null; mate: number | null; uciFirst: string }
  >();

  for (const line of lines) {
    if (!line.startsWith('info ') || line.includes(' string ')) {
      continue;
    }
    const multipvM = line.match(/\bmultipv (\d+)/);
    if (!multipvM) {
      continue;
    }
    const idx = parseInt(multipvM[1]!, 10);
    const depthM = line.match(/\bdepth (\d+)/);
    if (!depthM) {
      continue;
    }
    const depth = parseInt(depthM[1]!, 10);
    let cp: number | null = null;
    let mate: number | null = null;
    const cpM = line.match(/\bscore cp (-?\d+)/);
    const mateM = line.match(/\bscore mate (-?\d+)/);
    if (mateM) {
      mate = parseInt(mateM[1]!, 10);
    } else if (cpM) {
      cp = parseInt(cpM[1]!, 10);
    }
    const pvM = line.match(/\bpv (.+)/);
    if (!pvM) {
      continue;
    }
    const first = pvM[1]!.trim().split(/\s+/)[0] ?? '';
    if (!first || first.length < 4) {
      continue;
    }
    const prev = byIndex.get(idx);
    if (!prev || depth >= prev.depth) {
      byIndex.set(idx, { depth, cp, mate, uciFirst: first });
    }
  }

  const out: ParsedMultiPvLine[] = [];
  for (const [multipv, v] of [...byIndex.entries()].sort((a, b) => a[0] - b[0])) {
    out.push({ multipv, depth: v.depth, cp: v.cp, mate: v.mate, uciFirst: v.uciFirst });
  }
  return out;
}

/** White's perspective centipawns; mate encoded as large magnitude. */
export function parseFinalScoreWhitePov(lines: string[]): number {
  let bestDepth = -1;
  let cp = 0;
  let mate: number | null = null;

  for (const line of lines) {
    if (!line.startsWith('info ')) {
      continue;
    }
    const depthM = line.match(/\bdepth (\d+)/);
    if (!depthM) {
      continue;
    }
    const d = parseInt(depthM[1]!, 10);
    const mateM = line.match(/\bscore mate (-?\d+)/);
    const cpM = line.match(/\bscore cp (-?\d+)/);
    if (mateM) {
      if (d >= bestDepth) {
        bestDepth = d;
        mate = parseInt(mateM[1]!, 10);
      }
    } else if (cpM && d >= bestDepth) {
      bestDepth = d;
      cp = parseInt(cpM[1]!, 10);
      mate = null;
    }
  }

  if (mate != null) {
    const m = mate;
    return m > 0 ? 10_000 - m * 100 : -10_000 - Math.abs(m) * 100;
  }
  return cp;
}

/** Comparable strength score for normalizing suggestion quality (higher = better for side to move in MultiPV ordering). */
export function parsedPvScore(p: ParsedMultiPvLine): number {
  if (p.mate != null) {
    const m = p.mate;
    return m > 0 ? 10_000 - m * 100 : -10_000 - Math.abs(m) * 100;
  }
  return p.cp ?? 0;
}
