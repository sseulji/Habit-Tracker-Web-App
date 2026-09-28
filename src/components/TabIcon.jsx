const paths = {
  today: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 12.2l2.8 2.8L16.2 9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  statistics: <path d="M5 20V13M10 20V8M15 20v-5M20 20V4M3 20.5h18" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  signOut: (
    <>
      <path d="M14 4.5h3.5a2 2 0 012 2v11a2 2 0 01-2 2H14" />
      <path d="M10 8l-4 4 4 4M6 12h9" />
    </>
  ),
};

function TabIcon({ name, className = 'h-6 w-6' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export default TabIcon;
