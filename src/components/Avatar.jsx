function Avatar({ name, className = 'h-8 w-8 text-sm' }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0].toUpperCase())
    .join('');

  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-md bg-bone text-ink ring-1 ring-hairline ${className}`}>
      {initials || '?'}
    </span>
  );
}

export default Avatar;
