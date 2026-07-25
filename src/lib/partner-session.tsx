"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Partner } from "@/lib/types";

const STORAGE_KEY = "ym-partner";

type PartnerSessionValue = {
  loading: boolean;
  partner: Partner | null;
  login: (partner: Partner) => void;
  logout: () => void;
};

const PartnerSessionContext = createContext<PartnerSessionValue | null>(null);

function readStoredPartner(): Partner | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partner;
    if (!parsed?.id || !parsed?.username || !parsed?.display_name) return null;
    return {
      id: parsed.id,
      username: parsed.username,
      display_name: parsed.display_name,
    };
  } catch {
    return null;
  }
}

export function PartnerSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    setPartner(readStoredPartner());
    setLoading(false);
  }, []);

  const login = useCallback((next: Partner) => {
    const safe: Partner = {
      id: next.id,
      username: next.username,
      display_name: next.display_name,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    setPartner(safe);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPartner(null);
  }, []);

  const value = useMemo(
    () => ({ loading, partner, login, logout }),
    [loading, partner, login, logout]
  );

  return (
    <PartnerSessionContext.Provider value={value}>
      {children}
    </PartnerSessionContext.Provider>
  );
}

export function usePartnerSession() {
  const ctx = useContext(PartnerSessionContext);
  if (!ctx) {
    throw new Error("usePartnerSession must be used within PartnerSessionProvider");
  }
  return ctx;
}
