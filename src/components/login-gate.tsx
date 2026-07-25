"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePartnerSession } from "@/lib/partner-session";
import { supabase } from "@/lib/supabase";
import type { Partner } from "@/lib/types";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { loading, partner, login } = usePartnerSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--pastel-mint)]" />
      </div>
    );
  }

  if (partner) {
    return <>{children}</>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    const p = password;
    if (!u || !p) {
      toast.error("Enter username and password");
      return;
    }

    setBusy(true);
    const { data, error } = await supabase
      .from("partners")
      .select("id, username, display_name")
      .eq("username", u)
      .eq("password", p)
      .maybeSingle();
    setBusy(false);

    if (error) {
      toast.error("Login failed");
      return;
    }
    if (!data) {
      toast.error("Wrong username or password");
      return;
    }

    login(data as Partner);
    toast.success(`Welcome, ${(data as Partner).display_name}`);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--pastel-sky)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom_right,_var(--pastel-blush)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_left,_var(--pastel-mint)_0%,_transparent_45%)]" />
      <div className="paper-grain pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative w-full max-w-sm animate-fade-up rounded-3xl border border-white/70 bg-white/70 p-8 shadow-[0_20px_60px_-24px_rgba(90,120,140,0.35)] backdrop-blur-md">
        <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
          <Heart className="size-5 fill-current" />
        </div>
        <h1 className="font-display text-3xl text-[var(--ink)]">You & Me</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">
          Sign in with your username to open our trips
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[var(--accent)] text-white hover:bg-[var(--accent-deep)]"
          >
            {busy ? "Checking…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
