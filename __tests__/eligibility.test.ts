import { addMonths, getEligibility, nextEligibleDate } from '../app/utils/eligibility';
import { normalizePhone, parseDateInput } from '../app/utils/format';

describe('addMonths', () => {
  it('adds calendar months', () => {
    expect(addMonths(new Date(2026, 0, 15), 6)).toEqual(new Date(2026, 6, 15));
  });

  it('clamps to the end of shorter months', () => {
    expect(addMonths(new Date(2026, 7, 31), 6)).toEqual(new Date(2027, 1, 28));
    expect(addMonths(new Date(2027, 7, 31), 6)).toEqual(new Date(2028, 1, 29));
  });

  it('crosses year boundaries', () => {
    expect(addMonths(new Date(2026, 9, 10), 6)).toEqual(new Date(2027, 3, 10));
  });
});

describe('getEligibility', () => {
  const now = new Date(2026, 8, 21, 15, 30);

  it('treats donors with no history as eligible', () => {
    expect(getEligibility(null, now)).toEqual({ eligible: true, eligibleFrom: null, daysRemaining: 0 });
  });

  it('is not eligible inside the 6 month cool-off', () => {
    const result = getEligibility(new Date(2026, 5, 1), now);
    expect(result.eligible).toBe(false);
    expect(result.eligibleFrom).toEqual(new Date(2026, 11, 1));
    expect(result.daysRemaining).toBe(71);
  });

  it('becomes eligible on the exact day the cool-off ends', () => {
    const result = getEligibility(new Date(2026, 2, 21, 9, 0), now);
    expect(result.eligible).toBe(true);
    expect(result.daysRemaining).toBe(0);
  });

  it('is not eligible the day before', () => {
    const result = getEligibility(new Date(2026, 2, 22), now);
    expect(result.eligible).toBe(false);
    expect(result.daysRemaining).toBe(1);
  });

  it('ignores time of day on the donation date', () => {
    expect(nextEligibleDate(new Date(2026, 2, 21, 23, 59))).toEqual(new Date(2026, 8, 21));
  });
});

describe('parseDateInput', () => {
  it('parses DD-MM-YYYY with common separators', () => {
    expect(parseDateInput('05-03-2026')).toEqual(new Date(2026, 2, 5));
    expect(parseDateInput('5/3/2026')).toEqual(new Date(2026, 2, 5));
    expect(parseDateInput('05.03.2026')).toEqual(new Date(2026, 2, 5));
  });

  it('rejects impossible dates', () => {
    expect(parseDateInput('31-02-2026')).toBeNull();
    expect(parseDateInput('2026-03-05')).toBeNull();
    expect(parseDateInput('')).toBeNull();
  });
});

describe('normalizePhone', () => {
  it('accepts Indian mobile numbers with or without prefix', () => {
    expect(normalizePhone('9876543210')).toBe('9876543210');
    expect(normalizePhone('+91 98765 43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
  });

  it('rejects invalid numbers', () => {
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('5876543210')).toBeNull();
  });
});
