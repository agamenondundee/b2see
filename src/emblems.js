// Brand emblems for airlines / train & bus operators.
//
// Shows a real logo when it loads, with an instant brand-coloured monogram
// fallback (so it always looks intentional, even offline or if a logo 404s):
//   - Airlines: the free avs.io logo CDN, keyed by IATA code.
//   - Rail/bus operators: the Clearbit logo CDN, keyed by a known domain.
// Both load as plain <img> (no CORS needed); failures fall back to the monogram.

const airlineLogo = (iata) => (iata ? `https://pics.avs.io/120/120/${iata}.png` : '');

const OPERATOR_DOMAIN = {
  // Trains
  ScotRail: 'scotrail.co.uk',
  LNER: 'lner.co.uk',
  CrossCountry: 'crosscountrytrains.co.uk',
  'Avanti West Coast': 'avantiwestcoast.co.uk',
  'TransPennine Express': 'tpexpress.co.uk',
  Lumo: 'lumo.co.uk',
  'Caledonian Sleeper': 'sleeper.scot',
  // Buses / coaches
  'Scottish Citylink': 'citylink.co.uk',
  Megabus: 'megabus.com',
  FlixBus: 'flixbus.com',
  'National Express': 'nationalexpress.com',
  Ember: 'ember.to',
  'Borders Buses': 'bordersbuses.co.uk',
  Stagecoach: 'stagecoachbus.com',
};
const operatorLogo = (name) =>
  OPERATOR_DOMAIN[name] ? `https://logo.clearbit.com/${OPERATOR_DOMAIN[name]}` : '';

// Brand colours for the monogram background.
const BRAND_COLOR = {
  easyJet: '#ff6600', Ryanair: '#073590', Jet2: '#d10a11', 'British Airways': '#1d3f6e',
  KLM: '#00a1de', Lufthansa: '#05164d', 'Air France': '#002157', 'Aer Lingus': '#008272',
  Emirates: '#d71921', 'Qatar Airways': '#5c0632', 'United Airlines': '#005daa', JetBlue: '#003876',
  'Delta Air Lines': '#003366', Loganair: '#e3001b', 'Wizz Air': '#c6007e', 'TUI Airways': '#e30613',
  SAS: '#003d87', Swiss: '#d8232a', Icelandair: '#003e7e', Play: '#c0208a', Vueling: '#ffcc00',
  'TAP Air Portugal': '#c4002f', Eurowings: '#a4129b', Finnair: '#0b1560', Norwegian: '#d81939',
  'Air Canada': '#d22630', WestJet: '#0f1689',
  ScotRail: '#1f2a64', LNER: '#ce0e2d', CrossCountry: '#660f21', 'Avanti West Coast': '#004354',
  'TransPennine Express': '#1e1450', Lumo: '#2d2a6e', 'Caledonian Sleeper': '#1b2a4a',
  'Scottish Citylink': '#003da5', Megabus: '#143c8b', FlixBus: '#5b1f86', 'National Express': '#d6001c',
  Ember: '#0a8f6b', 'Borders Buses': '#0b6b3a', Stagecoach: '#003d7d',
};

function hashHue(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
export function brandColor(name) {
  return BRAND_COLOR[name] || `hsl(${hashHue(name || '?')} 45% 32%)`;
}

export function initials(name) {
  const words = (name || '').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Build an emblem element. kind 'flight' uses the IATA code for the logo;
// otherwise the operator name maps to a logo domain.
export function makeEmblem({ kind, code, name }) {
  const wrap = document.createElement('span');
  wrap.className = 'emblem';
  wrap.style.backgroundColor = brandColor(name);
  wrap.textContent = initials(name);
  wrap.title = name || '';

  const url = kind === 'flight' ? airlineLogo(code) : operatorLogo(name);
  if (url) {
    const img = new Image();
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.className = 'emblem-img';
    img.addEventListener('load', () => {
      wrap.textContent = '';
      wrap.classList.add('has-img');
      wrap.appendChild(img);
    });
    img.addEventListener('error', () => {}); // keep the monogram
    img.src = url;
  }
  return wrap;
}
