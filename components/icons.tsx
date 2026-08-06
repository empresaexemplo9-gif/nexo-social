import React from 'react';

// Conjunto de ícones em SVG (traço, herdam currentColor).
// Substituem os emojis: ficam nítidos em qualquer tamanho, respeitam a cor do
// tema e não mudam de desenho conforme o sistema operacional.

export type IconName =
  | 'calendar'
  | 'calendarCheck'
  | 'clock'
  | 'mapPin'
  | 'compass'
  | 'music'
  | 'shirt'
  | 'masks'
  | 'activity'
  | 'cpu'
  | 'sunrise'
  | 'ticket'
  | 'play'
  | 'headphones'
  | 'video'
  | 'sparkles'
  | 'bookmark'
  | 'bookmarkFilled'
  | 'check'
  | 'plus'
  | 'close'
  | 'menu'
  | 'chevronRight'
  | 'arrowRight'
  | 'external'
  | 'leaf'
  | 'bulb'
  | 'user'
  | 'search'
  | 'refresh'
  | 'download'
  | 'alert'
  | 'plug'
  | 'book'
  | 'film'
  | 'gamepad'
  | 'palette'
  | 'plane'
  | 'utensils'
  | 'heart';

interface Props extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const PATHS: Record<IconName, React.ReactNode> = {
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  calendarCheck: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  mapPin: (
    <>
      <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  music: (
    <>
      <path d="M9 18V6l11-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="17.5" cy="16" r="2.5" />
    </>
  ),
  shirt: (
    <>
      <path d="M8 3 4 5.5 5.5 10 8 9v11h8V9l2.5 1L20 5.5 16 3l-2 2h-4L8 3Z" />
    </>
  ),
  masks: (
    <>
      <path d="M4 5h7v6a3.5 3.5 0 0 1-7 0V5Z" />
      <path d="M13 8h7v6a3.5 3.5 0 0 1-7 0V8Z" />
      <path d="M6.5 8.5v.01M8.5 8.5v.01M15.5 11.5v.01M17.5 11.5v.01" />
    </>
  ),
  activity: <path d="M3 12h4l3-7 4 14 3-7h4" />,
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2.5" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  sunrise: (
    <>
      <path d="M12 3v4M5.5 9.5 8 12M18.5 9.5 16 12M2 18h20M6 18a6 6 0 0 1 12 0" />
    </>
  ),
  ticket: (
    <>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" />
      <path d="M13 6v2M13 11v2M13 16v2" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5-11-6.5Z" />,
  headphones: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.5" y="13" width="4.5" height="7" rx="2" />
      <rect x="17" y="13" width="4.5" height="7" rx="2" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="m16 10.5 5-3v9l-5-3v-3Z" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.6 8l4.4 1.6-4.4 1.6L12 15.6 10.4 11.2 6 9.6 10.4 8 12 3.5Z" />
      <path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7 18.5 15.5Z" />
    </>
  ),
  bookmark: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />,
  bookmarkFilled: <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />,
  check: <path d="m5 13 4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  arrowRight: <path d="M4 12h15m0 0-6-6m6 6-6 6" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-8 5-14 16-15 0 11-5 16-13 16H4Z" />
      <path d="M9 15c2-3 4.5-5 8-6.5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.5 18h5M10 21h4" />
      <path d="M12 3a6 6 0 0 1 3.5 10.9c-.5.4-.8 1-.8 1.6H9.3c0-.6-.3-1.2-.8-1.6A6 6 0 0 1 12 3Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-.6 4" />
      <path d="M20 5v6h-6" />
    </>
  ),
  download: <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" />,
  alert: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4M12 17v.01" />
    </>
  ),
  plug: (
    <>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8Z" />
      <path d="M12 17v4" />
    </>
  ),
  book: (
    <>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v16H7.5A2.5 2.5 0 0 0 5 20.5V4.5Z" />
      <path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v4H7.5A2.5 2.5 0 0 1 5 20.5Z" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 12h4M9 10v4M15.5 11.5v.01M17.5 13.5v.01" />
      <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 3.6l.7 4a3.2 3.2 0 0 1-5.7 2.5L15 16H9l-.9 1.1a3.2 3.2 0 0 1-5.7-2.5l.7-4A4.5 4.5 0 0 1 7.5 7Z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 2-1.8 0-1.6-1.6-1.7-1.6-3 0-1 .8-1.7 1.9-1.7H16a5 5 0 0 0 5-5c0-3.6-4-6.5-9-6.5Z" />
      <path d="M7.5 11v.01M10 7.5v.01M14.5 7.5v.01" />
    </>
  ),
  plane: <path d="M10.5 20.5 12 15l7.5-2.2a2 2 0 0 0 0-3.8L4 4l2.5 6.5L4 17l6.5-3.5" />,
  utensils: (
    <>
      <path d="M6 3v8a2.5 2.5 0 0 0 5 0V3M8.5 11v10" />
      <path d="M17 3c-1.7 1-2.5 3-2.5 5.5S15.3 13 17 14v7" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1C19 15.6 12 20 12 20Z" />,
};

const FILLED: IconName[] = ['play', 'bookmarkFilled', 'sparkles'];

export function Icon({ name, size = 20, className = '', ...rest }: Props) {
  const filled = FILLED.includes(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export default Icon;
