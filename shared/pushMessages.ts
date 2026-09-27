// Push notification text the server sends, in the recipient's app language
// (users.language). Admin broadcasts are sent exactly as typed.

export type PushLanguage = 'en' | 'ml';

type RequestInfo = {
  bloodType: string;
  units: number;
  hospital: string;
  district?: string | null;
  patientName?: string;
};

const DISTRICTS_ML: Record<string, string> = {
  Thiruvananthapuram: 'തിരുവനന്തപുരം',
  Kollam: 'കൊല്ലം',
  Pathanamthitta: 'പത്തനംതിട്ട',
  Alappuzha: 'ആലപ്പുഴ',
  Kottayam: 'കോട്ടയം',
  Idukki: 'ഇടുക്കി',
  Ernakulam: 'എറണാകുളം',
  Thrissur: 'തൃശ്ശൂർ',
  Palakkad: 'പാലക്കാട്',
  Malappuram: 'മലപ്പുറം',
  Kozhikode: 'കോഴിക്കോട്',
  Wayanad: 'വയനാട്',
  Kannur: 'കണ്ണൂർ',
  Kasaragod: 'കാസർഗോഡ്',
};

export function pushLanguage(value: unknown): PushLanguage {
  return value === 'ml' ? 'ml' : 'en';
}

function units(count: number, language: PushLanguage) {
  if (language === 'ml') return `${count} യൂണിറ്റ്`;
  return `${count} ${count === 1 ? 'unit' : 'units'}`;
}

// To admins, when someone posts a request.
export function requestCreatedMessage(request: RequestInfo, language: PushLanguage) {
  if (language === 'ml') {
    const place = request.district ? `${DISTRICTS_ML[request.district] ?? request.district} ജില്ലയിൽ ` : '';
    return {
      title: `${place}പുതിയ ${request.bloodType} അഭ്യർത്ഥന`,
      body: `${request.hospital}, ${units(request.units, language)}, രോഗി: ${request.patientName}. പരിശോധിച്ച് ദാതാക്കളെ അറിയിക്കുക.`,
    };
  }
  return {
    title: `New ${request.bloodType} request${request.district ? ` in ${request.district}` : ''}`,
    body: `${units(request.units, language)} at ${request.hospital} for ${request.patientName}. Review it and alert donors.`,
  };
}

// To matching donors, when a volunteer alerts them.
export function requestDonorsMessage(request: RequestInfo, language: PushLanguage) {
  if (language === 'ml') {
    const place = request.district ? `${DISTRICTS_ML[request.district] ?? request.district} ജില്ലയിൽ ` : '';
    return {
      title: `${place}${request.bloodType} രക്തം ആവശ്യമുണ്ട്`,
      body: `${request.hospital}, ${units(request.units, language)}. അഭ്യർത്ഥന കാണാനും കുടുംബത്തെ വിളിക്കാനും ടാപ്പ് ചെയ്യുക.`,
    };
  }
  return {
    title: `${request.bloodType} blood needed${request.district ? ` in ${request.district}` : ''}`,
    body: `${units(request.units, language)} at ${request.hospital}. Tap to see the request and call the family.`,
  };
}

// To one public donor, when a requester asks them directly.
export function donorAskMessage(
  request: RequestInfo,
  donorBloodType: string,
  askedBy: string,
  language: PushLanguage,
) {
  if (language === 'ml') {
    return {
      title: `${donorBloodType} രക്തം നൽകാമോ?`,
      body: `${askedBy || 'ഒരാൾ'} നിങ്ങളോട് നേരിട്ട് ചോദിച്ചു: ${request.hospital}, ${request.bloodType} ${units(request.units, language)}. അഭ്യർത്ഥന കാണാനും കുടുംബത്തെ വിളിക്കാനും ടാപ്പ് ചെയ്യുക.`,
    };
  }
  return {
    title: `Can you donate ${donorBloodType}?`,
    body: `${askedBy || 'Someone'} asked you directly: ${units(request.units, language)} of ${request.bloodType} at ${request.hospital}. Tap to see the request and call the family.`,
  };
}
