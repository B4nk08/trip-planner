export type Trip = {
  id: string;
  name: string;
  created_at?: string;
};

export type Activity = {
  id: string;
  trip_id: string;
  day_date: string;
  time: string | null;
  location: string | null;
  activity: string | null;
  note: string | null;
  distance_km: number | null;
  image_url: string | null;
  order_index: number;
  created_at?: string;
};

export type ActivityInput = {
  trip_id: string;
  day_date: string;
  time: string;
  location: string;
  activity: string;
  note: string;
  distance_km: number | null;
  image_url: string | null;
  order_index: number;
};

export type FundTransactionType = "receive" | "pay";

export type FundTransaction = {
  id: string;
  trip_id: string;
  type: FundTransactionType;
  amount: number;
  reason: string | null;
  created_at?: string;
};

export type FundTransactionInput = {
  trip_id: string;
  type: FundTransactionType;
  amount: number;
  reason: string;
};
