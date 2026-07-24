"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatMoney, fundBalance } from "@/lib/fund";
import { supabase } from "@/lib/supabase";
import type { FundTransaction, FundTransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";

type FundPanelProps = {
  tripId: string;
  transactions: FundTransaction[];
  onChanged: () => Promise<void>;
};

export function FundPanel({ tripId, transactions, onChanged }: FundPanelProps) {
  const [type, setType] = useState<FundTransactionType>("receive");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<FundTransaction | null>(null);

  const balance = useMemo(() => fundBalance(transactions), [transactions]);

  const sorted = useMemo(
    () =>
      [...transactions].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? "")
      ),
    [transactions]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please add a reason");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("fund_transactions").insert({
      trip_id: tripId,
      type,
      amount: value,
      reason: reason.trim(),
    });
    setSaving(false);

    if (error) {
      toast.error("Failed to save transaction");
      return;
    }

    setAmount("");
    setReason("");
    toast.success(type === "receive" ? "Received" : "Paid");
    await onChanged();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from("fund_transactions")
      .delete()
      .eq("id", toDelete.id);

    if (error) {
      toast.error("Failed to delete transaction");
      setToDelete(null);
      return;
    }

    toast.success("Transaction deleted");
    setToDelete(null);
    await onChanged();
  }

  return (
    <>
      <Card className="rounded-3xl border-white/70 bg-white/60 shadow-[0_12px_40px_-24px_rgba(80,110,130,0.4)] backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardDescription className="text-[11px] tracking-[0.18em] uppercase">
            Shared fund
          </CardDescription>
          <CardTitle className="font-display text-3xl text-[var(--ink)]">
            {formatMoney(balance)}
          </CardTitle>
          <p className="text-sm text-[var(--ink-soft)]">
            Starting budget set when the trip was created
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === "receive" ? "default" : "outline"}
                className={cn(
                  "h-11 flex-1 rounded-full",
                  type === "receive" &&
                    "bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
                )}
                onClick={() => setType("receive")}
              >
                <ArrowDownLeft className="size-4" />
                Receive
              </Button>
              <Button
                type="button"
                variant={type === "pay" ? "default" : "outline"}
                className={cn(
                  "h-11 flex-1 rounded-full",
                  type === "pay" &&
                    "bg-rose-500 text-white hover:bg-rose-600"
                )}
                onClick={() => setType("pay")}
              >
                <ArrowUpRight className="size-4" />
                Pay
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fund-amount">Amount</Label>
              <Input
                id="fund-amount"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="rounded-xl bg-white/80"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fund-reason">Reason</Label>
              <Input
                id="fund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Groceries / Hotel"
                className="rounded-xl bg-white/80"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
              disabled={saving}
            >
              {saving ? "Saving..." : "Add transaction"}
            </Button>
          </form>

          <Separator />

          <div>
            <p className="mb-2 text-[11px] font-medium tracking-[0.16em] text-[var(--ink-muted)] uppercase">
              History
            </p>
            {sorted.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 px-4 py-6 text-center text-sm text-[var(--ink-muted)]">
                No transactions yet
              </p>
            ) : (
              <ScrollArea className="h-56 pr-3">
                <ul className="space-y-2">
                  {sorted.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex flex-col gap-2 rounded-2xl border border-white/70 bg-white/70 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--ink)]">
                          {tx.reason || "No reason"}
                        </p>
                        <p className="text-xs text-[var(--ink-muted)]">
                          {tx.created_at
                            ? new Date(tx.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-1 sm:justify-end">
                        <span
                          className={cn(
                            "font-display text-base",
                            tx.type === "receive"
                              ? "text-[var(--accent-deep)]"
                              : "text-rose-500"
                          )}
                        >
                          {tx.type === "receive" ? "+" : "−"}
                          {formatMoney(Number(tx.amount))}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="size-9 text-rose-400 hover:bg-rose-50 hover:text-rose-600 sm:size-7"
                          onClick={() => setToDelete(tx)}
                          aria-label="Delete transaction"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl border-white/70 bg-[#fffcfa]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">
              Delete this transaction?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `${toDelete.type === "receive" ? "Receive" : "Pay"} ${formatMoney(Number(toDelete.amount))} — ${toDelete.reason || "No reason"}`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
              onClick={() => void handleDelete()}
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
