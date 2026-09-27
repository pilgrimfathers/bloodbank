import { donationSummary, mergedProfileFields, publicName } from '../shared/donors';

describe('publicName', () => {
  it('shows first name and last initial', () => {
    expect(publicName('Anjali Mohan')).toBe('Anjali M.');
    expect(publicName('  Mohammed  Ashraf  k ')).toBe('Mohammed K.');
  });

  it('keeps a single name as is', () => {
    expect(publicName('Rahul')).toBe('Rahul');
  });

  it('falls back when the name is missing', () => {
    expect(publicName('')).toBe('Donor');
    expect(publicName(undefined)).toBe('Donor');
  });
});

describe('mergedProfileFields', () => {
  it('keeps the account details and fills only the gaps', () => {
    expect(mergedProfileFields(
      { area: 'Kakkanad', address: 'Old address', district: 'Ernakulam', medicalConditions: 'None' },
      { area: 'Edappally', address: '', district: 'Ernakulam' },
    )).toEqual({ address: 'Old address', medicalConditions: 'None', verified: false });
  });

  it('carries over volunteer notes and verification', () => {
    expect(mergedProfileFields(
      { notes: 'Prefers evening calls', verified: true },
      { notes: 'Donated at MCH' },
    )).toEqual({ notes: 'Donated at MCH\n\nPrefers evening calls', verified: true });
  });
});

describe('donationSummary', () => {
  it('counts donations and finds the latest', () => {
    const dates = [new Date('2025-01-10'), new Date('2026-03-02'), new Date('2025-09-15')];
    expect(donationSummary(dates)).toEqual({ lastDonation: new Date('2026-03-02'), donationCount: 3 });
  });

  it('handles no donations', () => {
    expect(donationSummary([])).toEqual({ lastDonation: null, donationCount: 0 });
  });
});
