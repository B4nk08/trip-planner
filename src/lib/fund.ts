import type { FundTransaction } from "@/lib/types";

export function fundBalance(transactions: FundTransaction[]): number {
  return transactions.reduce((sum, tx) => {
    const amount = Number(tx.amount) || 0;
    return tx.type === "receive" ? sum + amount : sum - amount;
  }, 0);
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
