import { createClient } from "@supabase/supabase-js";
import type {
  Activity,
  FundTransaction,
  Partner,
  Trip,
  WishlistItem,
} from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

type Database = {
  public: {
    Tables: {
      partners: {
        Row: Partner;
        Insert: Omit<Partner, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
          password: string;
        };
        Update: Partial<Omit<Partner, "id">> & { id?: string };
        Relationships: [];
      };
      trips: {
        Row: Trip;
        Insert: Omit<Trip, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Trip, "id">> & { id?: string };
        Relationships: [];
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Activity, "id">> & { id?: string };
        Relationships: [];
      };
      fund_transactions: {
        Row: FundTransaction;
        Insert: Omit<FundTransaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
          reason?: string | null;
        };
        Update: Partial<Omit<FundTransaction, "id">> & { id?: string };
        Relationships: [];
      };
      wishlist_items: {
        Row: WishlistItem;
        Insert: Omit<WishlistItem, "id" | "created_at" | "liked_by"> & {
          id?: string;
          created_at?: string;
          place?: string | null;
          note?: string | null;
          author_id?: string | null;
          author_name?: string | null;
          liked_by?: string[];
        };
        Update: Partial<Omit<WishlistItem, "id">> & { id?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
