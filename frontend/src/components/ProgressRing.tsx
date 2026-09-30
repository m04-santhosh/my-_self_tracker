import React from 'react';

interface ProgressRingProps {
  percent: number | null;
  size?: number;
  strokeWidth?: number;
  subtitle?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  percent,
  size = 110,
  strokeWidth = 9,
  subtitle = 'Progress',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const val = percent !== null ? Math.min(100, Math.max(0, percent)) : 0;
  const strokeDashoffset = circumference - (val / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Colored progress bar */}
        {percent !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold tracking-tight text-white">
          {percent !== null ? `${percent}%` : '--'}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          {subtitle}
        </span>
      </div>
    </div>
  );
};
