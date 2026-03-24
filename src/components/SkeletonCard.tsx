import React from 'react';

export const SkeletonCard: React.FC = () => {
  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3">
      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-shimmer bg-[length:200%_100%]" />
      <div className="w-24 h-4 rounded bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-shimmer bg-[length:200%_100%]" />
      <div className="w-32 h-3 rounded bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-shimmer bg-[length:200%_100%]" />
      <div className="w-20 h-6 rounded-full bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-shimmer bg-[length:200%_100%] mt-1" />
      <div className="w-16 h-3 rounded bg-gradient-to-r from-white/10 via-white/5 to-white/10 animate-shimmer bg-[length:200%_100%]" />
    </div>
  );
};
