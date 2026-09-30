// Parodia de IP Messenger, el chat de la oficina: su logo en píxeles (24x24) para el tablón
// del pueblo y el icono de las ventanas "IPaxMsg". Sin DOM al importar, también sirve en Node.
export const APP_NAME = 'IPaxMsg';

export const LOGO_PALETTE = { R: '#FF0000', Y: '#FFFF00', B: '#0000FE', G: '#808080', K: '#000000' };
export const LOGO = [
  'RRRRRRRRRRRRRRRRRRRRRRRR',
  'RYYYYYRBBBBBBBBBBBBBBBBR',
  'RYYYYYYRBBBBBBBBBBBBBBBR',
  'RYYYYYYYBBBBBBBBBBBRRBBR',
  'RYYYYYYYBBBBYRRBBBYRRRBR',
  'RYYYYYYYBBBBYRRRBBYRRRBR',
  'RYYYYYYRBBBBYRRRBYRRRRBR',
  'RYYYYYRBBBBBYRRRBYRRRBBR',
  'RRYYRRBBBBBBBYRRRRRRRBBR',
  'RBBBBBBBBBBBBYRRRRRRBBBR',
  'RBBBBBBBBBBBBYRRRRRBBBBR',
  'RBBBBBBBBBYYYRRRRRBBBBBR',
  'RBBBBBBBYYRRRRRRRBBBBBBR',
  'RBBBBBBYRRRRRRRRRBBBBBBR',
  'RBBBBBYRRRRRBYRRRRBBBBBR',
  'RBBBBYRRRRRBBBYRRRBBBBBR',
  'RBBBBYRRRRBBBBBYRRRBBBBR',
  'RGGGYRRRRGGGGGGYRRRRGGGR',
  'RGGGYRRRRGGGGGGGYRRRGGGR',
  'RGGGGRRRRGGGGGGGGRRRRGGR',
  'RGGGGGKKKKGGGGGGGGKKKKGR',
  'RGGGGGGKKKKKKGGGGGGKKKKR',
  'RGGGGGGGKKKKKKKKKKKKKKKR',
  'RRRRRRRRRRRRRRRRRRRRRRRR',
];

// Icono en un data URL (solo navegador), para <img> y el favicon de las ventanas
let iconUrl = null;
export function logoDataUrl() {
  if (iconUrl) return iconUrl;
  const cv = document.createElement('canvas');
  cv.width = cv.height = LOGO.length;
  const ctx = cv.getContext('2d');
  LOGO.forEach((row, y) => [...row].forEach((ch, x) => { ctx.fillStyle = LOGO_PALETTE[ch]; ctx.fillRect(x, y, 1, 1); }));
  iconUrl = cv.toDataURL();
  return iconUrl;
}
