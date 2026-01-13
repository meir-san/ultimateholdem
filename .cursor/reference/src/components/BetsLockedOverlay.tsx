interface BetsLockedOverlayProps {
  show: boolean;
}

export function BetsLockedOverlay({ show }: BetsLockedOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
      <div className="text-center">
        <div className="text-4xl font-black text-amber-400 mb-2 animate-pulse">
          🔒 TRADING LOCKED
        </div>
        <div className="text-lg text-slate-300">
          Next phase starting...
        </div>
      </div>
    </div>
  );
}
