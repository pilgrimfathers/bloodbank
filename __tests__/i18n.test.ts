import { common } from '../src/i18n/strings/common';
import { donors } from '../src/i18n/strings/donors';
import { main } from '../src/i18n/strings/main';
import { profile } from '../src/i18n/strings/profile';
import { requests } from '../src/i18n/strings/requests';
import { tour } from '../src/i18n/strings/tour';
import { donorAskMessage, requestDonorsMessage } from '../shared/pushMessages';

const bundles = { common, donors, main, profile, requests, tour };
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe.each(Object.entries(bundles))('%s strings', (_, bundle) => {
  const en = bundle.en as Record<string, string>;
  const ml = bundle.ml as Record<string, string>;

  it('has a Malayalam translation for every key', () => {
    for (const key of Object.keys(en)) {
      expect(ml[key]?.trim()).toBeTruthy();
    }
  });

  it('keeps the same placeholders in both languages', () => {
    for (const key of Object.keys(en)) {
      expect([key, placeholders(ml[key])]).toEqual([key, placeholders(en[key])]);
    }
  });
});

it('never reuses a key across files', () => {
  const seen = new Map<string, string>();
  for (const [file, bundle] of Object.entries(bundles)) {
    for (const key of Object.keys(bundle.en)) {
      expect([key, seen.get(key)]).toEqual([key, undefined]);
      seen.set(key, file);
    }
  }
});

describe('push messages', () => {
  const request = { bloodType: 'O+', units: 2, hospital: 'MCH', district: 'Kozhikode' };

  it('words donor alerts in the donor language', () => {
    expect(requestDonorsMessage(request, 'en').title).toBe('O+ blood needed in Kozhikode');
    expect(requestDonorsMessage(request, 'ml').title).toBe('കോഴിക്കോട് ജില്ലയിൽ O+ രക്തം ആവശ്യമുണ്ട്');
  });

  it('falls back to "Someone" when the asker has no name', () => {
    expect(donorAskMessage(request, 'O+', '', 'en').body).toMatch(/^Someone asked you directly/);
  });
});
