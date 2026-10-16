const icons = {
  logo: (
    <path d="M8 4.5 16 8v8l-8 3.5L0 16V8l8-3.5Z" transform="translate(4 2)" fill="none" />
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="4" rx="1.5" />
      <rect x="13" y="10" width="7" height="10" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  tasks: (
    <>
      <path d="M8 7h10" />
      <path d="M8 12h10" />
      <path d="M8 17h10" />
      <path d="M5 7.2 4 8.2 3 7.2" />
      <path d="M5 12.2 4 13.2 3 12.2" />
      <circle cx="4" cy="17" r="1" />
    </>
  ),
  subjects: (
    <>
      <path d="M5 6.5h14v12H5z" />
      <path d="M8 6.5V5h8v1.5" />
      <path d="M8 10h8M8 13h6" />
    </>
  ),
  focus: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v4l2.5 1.5" />
    </>
  ),
  statistics: (
    <>
      <path d="M5 18V10" />
      <path d="M10 18V6" />
      <path d="M15 18v-7" />
      <path d="M20 18V8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.1 7.1l1.4 1.4M15.5 15.5l1.4 1.4M7.1 16.9l1.4-1.4M15.5 8.5l1.4-1.4" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  close: <path d="M7 7l10 10M17 7 7 17" />,
  search: (
    <>
      <circle cx="11" cy="11" r="5.5" />
      <path d="m15.5 15.5 4 4" />
    </>
  ),
  play: <path d="M9 7.5v9l8-4.5z" />,
  pause: (
    <>
      <path d="M8 7h3v10H8z" />
      <path d="M13 7h3v10h-3z" />
    </>
  ),
  skip: (
    <>
      <path d="M7 8l6 4-6 4z" />
      <path d="M16 8v8" />
    </>
  ),
  reset: <path d="M7 12a5 5 0 1 0 1.3-3.4M7 6.5V8.8h2.3" />,
};

export function Icon({ name, size = 18, label }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {icons[name]}
    </svg>
  );
}
