const DEFAULT_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
  <rect width="160" height="160" rx="20" fill="#dbeafe"/>
  <ellipse cx="80" cy="92" rx="38" ry="30" fill="#93c5fd"/>
  <circle cx="80" cy="56" r="24" fill="#e5eefc"/>
  <path d="M58 58c2-17 18-30 38-30s36 13 38 30c-8-7-18-11-38-11s-30 4-38 11Z" fill="#334155" opacity="0.9"/>
  <path d="M52 112c8-12 21-18 28-18h0c7 0 20 6 28 18" stroke="#bfdbfe" stroke-width="10" stroke-linecap="round"/>
  <circle cx="71" cy="61" r="4" fill="#0f172a"/>
  <circle cx="89" cy="61" r="4" fill="#0f172a"/>
  <path d="M72 74c5 4 11 4 16 0" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
</svg>`;

export const DEFAULT_AVATAR_TEMPLATE = `data:image/svg+xml,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`;