import { useEffect, useState } from 'react';

function ProgressBar({ completed, total, className = '' }) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${completed} of ${total} habits completed today`}
      className={`h-2 overflow-hidden rounded-md border border-ink bg-bone ${className}`}
    >
      <div
        className="h-full bg-highlighter transition-[width] duration-700 ease-out"
        style={{ width: `${animatedPercentage}%` }}
      />
    </div>
  );
}

export default ProgressBar;
