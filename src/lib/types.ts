export type Activity = {
  id: string;
  day_number: number;
  time: string | null;
  location: string | null;
  activity: string | null;
  note: string | null;
  image_url: string | null;
  order_index: number;
  created_at?: string;
};

export type ActivityInput = {
  day_number: number;
  time: string;
  location: string;
  activity: string;
  note: string;
  image_url: string | null;
  order_index: number;
};
