/**
 * PR-S5 local economy simulation (compressed). 1000 bots × 30 days as 720 hourly epochs — NOT a 30 Hz replay
 * (77.76M ticks × 1000 bots is not a unit test). Numbers are derived from fixed integers and labelled honestly.
 */
import { fnv1a32 } from '../../../packages/core/src/index';
import { detectProfitCycle, type Recipe } from './prs4_craft';

export const BOT_COUNT = 1000;
export const DAY_COUNT = 30;
export const EPOCHS_PER_DAY = 24;
export const TOTAL_EPOCHS = DAY_COUNT * EPOCHS_PER_DAY;
export const INITIAL_GRANT_MINOR = 1000n;
export const MICRO = 1_000_000n;

export interface EconomyReport {
  readonly bots: number;
  readonly days: number;
  readonly epochs: number;
  readonly initial_supply_minor: string;
  readonly minted_minor: string;
  readonly burned_minor: string;
  readonly final_supply_minor: string;
  readonly inflation_bps: string;
  readonly gini_micro: string;
  readonly conserved: boolean;
  readonly negative_balances: number;
  readonly replay_refusals: number;
  readonly exploit_cycles: number;
  readonly cycle_path: readonly string[];
  readonly checksum: string;
  readonly label: string;
}

function hashOf(bot: number, epoch: number): number {
  const text = `${bot}:${epoch}`;
  const codes: number[] = [];
  for (let index = 0; index < text.length; index++) codes.push(text.charCodeAt(index));
  return fnv1a32(codes);
}

/** Gini × 1e6 from integer weighted sums. Recorded, not asserted against the tunable band (GDD §5). */
export function giniMicro(values: readonly bigint[]): bigint {
  if (values.length === 0) return 0n;
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const count = BigInt(sorted.length);
  let weighted = 0n;
  let total = 0n;
  for (let index = 0; index < sorted.length; index++) {
    weighted += BigInt(index + 1) * sorted[index]!;
    total += sorted[index]!;
  }
  if (total === 0n) return 0n;
  return (2n * weighted * MICRO) / (count * total) - ((count + 1n) * MICRO) / count;
}

/** Idempotency: a repeated key is refused, never posted twice (GDD-ECONOMY §8.5). */
export function recordOnce(keys: Set<string>, key: string): boolean {
  if (keys.has(key)) return false;
  keys.add(key);
  return true;
}

const exploitRecipe: Recipe = {
  id: 'economy-replicate',
  inputs: [{ kind: 'script', units: 1n }, { kind: 'coal', units: 1n }],
  output: { kind: 'script', units: 3n },
  outputTier: 4,
  delayedCostTicks: 60,
  sink: 'sink:economy-replicate',
};

const benignRecipe: Recipe = {
  id: 'economy-smelt',
  inputs: [{ kind: 'ore', units: 2n }, { kind: 'coal', units: 1n }],
  output: { kind: 'ingot', units: 1n },
  outputTier: 2,
  delayedCostTicks: 30,
  sink: 'sink:economy-smelt',
};

export function runEconomy(bots = BOT_COUNT, days = DAY_COUNT): EconomyReport {
  if (!Number.isInteger(bots) || bots < 2 || !Number.isInteger(days) || days < 1) {
    throw new RangeError('bots must be >= 2 and days >= 1');
  }
  const epochs = days * EPOCHS_PER_DAY;
  const balances = new Map<number, bigint>();
  let minted = 0n;
  let burned = 0n;
  const initialSupply = INITIAL_GRANT_MINOR * BigInt(bots);
  minted += initialSupply;
  for (let bot = 1; bot <= bots; bot++) balances.set(bot, INITIAL_GRANT_MINOR);

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let bot = 1; bot <= bots; bot++) {
      const hash = hashOf(bot, epoch);
      const income = BigInt((hash % 900) + 100); // named faucet: 100..999 minor units
      const current = balances.get(bot) ?? 0n;
      balances.set(bot, current + income);
      minted += income;
      const spend = BigInt(((hash >>> 10) % 700) + 100); // named sink: 100..799
      if (balances.get(bot)! >= spend) {
        balances.set(bot, balances.get(bot)! - spend);
        burned += spend;
      }
      // A sink exceeding the balance is refused with a reason; no negative balance is ever written.
    }
  }

  const finalValues = [...balances.values()];
  const finalSupply = finalValues.reduce((total, value) => total + value, 0n);
  const negative = finalValues.filter((value) => value < 0n).length;
  const inflationBps = ((finalSupply - initialSupply) * 10_000n) / initialSupply;

  const replayKeys = new Set<string>();
  let replayRefusals = 0;
  for (let index = 0; index < 10; index++) {
    const key = `faucet:${index}:0`;
    if (!recordOnce(replayKeys, key)) replayRefusals++;
    if (!recordOnce(replayKeys, key)) replayRefusals++;
  }

  const cycle = detectProfitCycle([benignRecipe, exploitRecipe]);
  const canonical = [...balances.entries()].sort((a, b) => a[0] - b[0])
    .map(([bot, value]) => `${bot}:${value}`).join('|');

  return {
    bots,
    days,
    epochs,
    initial_supply_minor: initialSupply.toString(),
    minted_minor: minted.toString(),
    burned_minor: burned.toString(),
    final_supply_minor: finalSupply.toString(),
    inflation_bps: inflationBps.toString(),
    gini_micro: giniMicro(finalValues).toString(),
    conserved: minted - burned === finalSupply,
    negative_balances: negative,
    replay_refusals: replayRefusals,
    exploit_cycles: cycle ? 1 : 0,
    cycle_path: cycle?.path ?? [],
    checksum: fnv1a32([...canonical].map((char) => char.charCodeAt(0))).toString(16).padStart(8, '0'),
    label: 'local compressed economy simulation — 720 hourly epochs, NOT a 30 Hz replay',
  };
}
