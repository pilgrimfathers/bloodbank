import type { BloodRequest } from './types';

// Prefilled WhatsApp messages, so the person tapping the button doesn't have
// to explain the request from scratch. Works with the app's and the web's t().
type MessageKey = 'whatsapp.toDonor' | 'whatsapp.toDonorAbout' | 'whatsapp.toRequester' | 'request.unitsFor' | 'request.oneUnitFor';
type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;
type RequestSummary = Pick<BloodRequest, 'bloodType' | 'units' | 'patientName' | 'hospital'>;

// phone is the 10-digit Indian number.
export function whatsappUrl(phone: string, text?: string): string {
  return `https://wa.me/91${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

function need(t: Translate, request: RequestSummary): string {
  return request.units === 1
    ? t('request.oneUnitFor', { patient: request.patientName })
    : t('request.unitsFor', { units: request.units, patient: request.patientName });
}

// To a donor, about a specific request when there is one.
export function donorMessage(t: Translate, donor: { name: string; bloodType: string }, request?: RequestSummary | null): string {
  if (!request) return t('whatsapp.toDonor', { name: donor.name, bloodType: donor.bloodType });
  return t('whatsapp.toDonorAbout', {
    name: donor.name, bloodType: request.bloodType, need: need(t, request), hospital: request.hospital,
  });
}

// To the family or contact on a request.
export function requesterMessage(t: Translate, request: RequestSummary): string {
  return t('whatsapp.toRequester', { bloodType: request.bloodType, need: need(t, request), hospital: request.hospital });
}
