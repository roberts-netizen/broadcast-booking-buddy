import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HogmoreStream = {
  id: string;
  booking_id: string;
  role: "source" | "taker";
  slot_number: number;
  name: string | null;
  status: string;
  protocol: string | null;
  host: string | null;
  stream_key: string | null;
  audio1: string | null;
  audio2: string | null;
  settings: string | null;
  contact: string | null;
  created_at: string;
};

export function useHogmoreStreams(bookingIds: string[]) {
  return useQuery({
    queryKey: ["hogmore_streams", bookingIds],
    queryFn: async () => {
      if (!bookingIds.length) return [] as HogmoreStream[];
      const { data, error } = await supabase
        .from("hogmore_streams")
        .select("*")
        .in("booking_id", bookingIds)
        .order("slot_number", { ascending: true });
      if (error) throw error;
      return data as HogmoreStream[];
    },
    enabled: bookingIds.length > 0,
  });
}
