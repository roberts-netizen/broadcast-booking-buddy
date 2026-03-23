import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingSource = {
  id: string;
  booking_id: string | null;
  name: string | null;
  protocol: string | null;
  host: string | null;
  stream_key: string | null;
  audio1: string | null;
  audio2: string | null;
  settings: string | null;
  contact: string | null;
  status: string | null;
  created_at: string | null;
};

export function useBookingSource(bookingId: string | null) {
  return useQuery({
    queryKey: ["booking_sources", bookingId],
    queryFn: async () => {
      if (!bookingId) return null;
      const { data, error } = await supabase
        .from("booking_sources")
        .select("*")
        .eq("booking_id", bookingId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BookingSource | null;
    },
    enabled: !!bookingId,
  });
}

export function useUpsertBookingSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<BookingSource> & { booking_id: string }) => {
      // Check if one exists
      const { data: existing } = await supabase
        .from("booking_sources")
        .select("id")
        .eq("booking_id", payload.booking_id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("booking_sources")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("booking_sources")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["booking_sources", vars.booking_id] });
    },
  });
}
