"use client";

interface Props {
  amount: number;
  ready: boolean;
  formatCurrency: (amount: number) => string;
  className?: string;
  prefix?: string; // ex: "+" ou "-"
}

export default function CurrencyValue({ amount, ready, formatCurrency, className = "", prefix = "" }: Props) {
  if (!ready) {
    return (
      <span className={`inline-block h-[1em] w-16 bg-gray-700/50 rounded animate-pulse align-middle ${className}`} />
    );
  }

  return (
    <span className={className} title={formatCurrency(amount)}>
      {prefix}{formatCurrency(amount)}
    </span>
  );
}
