export function Disclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-amber-500/90">
        No profit guarantees. High leverage + small ($10) accounts can wipe out quickly.
      </p>
    );
  }
  return (
    <div className="panel border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100/90">
      <p className="font-semibold text-amber-400">Risk disclaimer</p>
      <p className="mt-1 text-amber-100/70">
        Ultra Bot is an experimental automation tool. Past demo videos and TikTok-style
        results are not indicative of future performance. A $10 high-leverage account can
        open 0.01 lot baskets, but stop-out is easy. You can lose all deposited funds.
        You connect with your own MT5 credentials — we do not collect them for you.
        Trade only with money you can afford to lose. Not financial advice.{" "}
        <strong className="text-amber-200">No profit guarantees.</strong>
      </p>
    </div>
  );
}
