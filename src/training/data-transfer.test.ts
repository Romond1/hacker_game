import { describe, expect, it } from 'vitest';
import { dataTransfer } from './data-transfer';

describe('Data Transfer Training', () => {
  it('generates deterministic varied copy destinations', () => {
    const run = Array.from({ length: 5 }, (_, round) => dataTransfer.generateTask(42, round));
    expect(run).toEqual(Array.from({ length: 5 }, (_, round) => dataTransfer.generateTask(42, round)));
    expect(new Set(run.map(task => task.code)).size).toBeGreaterThan(1);
    expect(new Set(run.map(task => task.destination)).size).toBeGreaterThan(1);
    expect(run.every(task => /^[A-Z0-9]+-[A-Z0-9]+$/.test(task.code))).toBe(true);
  });

  it('accepts only the exact pasted task code', () => {
    const task = dataTransfer.generateTask(42, 0);
    expect(dataTransfer.validateTask(task, task.code)).toEqual({ valid: true, evidence: { pastedText: task.code }, mistakes: 0 });
    expect(dataTransfer.validateTask(task, 'WRONG-CODE')).toEqual({ valid: false, evidence: { pastedText: 'WRONG-CODE' }, mistakes: 1 });
  });
});
