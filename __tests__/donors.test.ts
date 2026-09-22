import { publicName } from '../shared/donors';

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
