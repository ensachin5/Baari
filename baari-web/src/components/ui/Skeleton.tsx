import React from "react";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "", style }) => {
  return (
    <div
      style={style}
      className={`bg-slate-200 animate-pulse rounded-[8px] ${className}`}
    />
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3 py-2 w-full">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-[14px] border border-border p-4 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
          <Skeleton className="w-3/4 h-5" />
          <div className="flex items-center space-x-2 pt-1">
            <Skeleton className="w-7 h-7 rounded-full" />
            <Skeleton className="w-24 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
};
