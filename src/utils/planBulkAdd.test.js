import { describe, it, expect } from 'vitest';
import { planBulkAdd } from './planBulkAdd';

const existing = (...titles) => titles.map(t => ({ title: t }));

describe('planBulkAdd', () => {
  it('passes a clean list straight through', () => {
    const plan = planBulkAdd('Hades\nCeleste\nOuter Wilds', []);
    expect(plan.toLookup).toEqual(['Hades', 'Celeste', 'Outer Wilds']);
    expect(plan.skippedBlank).toBe(0);
    expect(plan.skippedDuplicateInList).toEqual([]);
    expect(plan.skippedDuplicateExisting).toEqual([]);
  });

  it('counts blank lines', () => {
    const plan = planBulkAdd('Hades\n\n\nCeleste\n   \n', []);
    expect(plan.toLookup).toEqual(['Hades', 'Celeste']);
    expect(plan.skippedBlank).toBe(2);
  });

  it('drops later duplicates within the list, keeping the first spelling', () => {
    const plan = planBulkAdd('Hades\nhades\nHADES\nCeleste', []);
    expect(plan.toLookup).toEqual(['Hades', 'Celeste']);
    expect(plan.skippedDuplicateInList).toEqual(['hades', 'HADES']);
  });

  it('drops names already in the vault (case-insensitively)', () => {
    const plan = planBulkAdd('Hades\nCeleste\nHollow Knight', existing('celeste', 'HOLLOW KNIGHT'));
    expect(plan.toLookup).toEqual(['Hades']);
    expect(plan.skippedDuplicateExisting).toEqual(['Celeste', 'Hollow Knight']);
  });

  it('reports all three skip reasons at once', () => {
    // Leading "   \n" trims to one blank entry; "Hades" repeats; "Celeste" is owned.
    const plan = planBulkAdd('   \nHades\nHades\nCeleste', existing('celeste'));
    expect(plan.toLookup).toEqual(['Hades']);
    expect(plan.skippedBlank).toBe(1);
    expect(plan.skippedDuplicateInList).toEqual(['Hades']);
    expect(plan.skippedDuplicateExisting).toEqual(['Celeste']);
  });

  it('accepts a comma-separated list too, and trims each name', () => {
    const plan = planBulkAdd('  Hades ,  Celeste ,Braid', []);
    expect(plan.toLookup).toEqual(['Hades', 'Celeste', 'Braid']);
  });

  it('handles an empty box', () => {
    const plan = planBulkAdd('', []);
    expect(plan.toLookup).toEqual([]);
    expect(plan.skippedBlank).toBe(1); // one empty entry from splitting ''
  });

  it('defaults existingGames to an empty list', () => {
    expect(planBulkAdd('Hades').toLookup).toEqual(['Hades']);
  });
});
