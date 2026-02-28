import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Booking = {
  id: string;
  date: string;
  date_to: string | null;
  gmt_time: string;
  cet_time: string | null;
  league_id: string | null;
  event_name: string;
  incoming_channel_id: string | null;
  work_order_id: string;
  created_at: string;
  updated_at: string;
};

export function useBookings(filters?: { dateFrom?: string; dateTo?: string; leagueId?: string }) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("*")
        .order("date", { ascending: true })
        .order("gmt_time", { ascending: true });
      if (filters?.dateFrom) q = q.gte("date", filters.dateFrom);
      if (filters?.dateTo) q = q.lte("date", filters.dateTo);
      if (filters?.leagueId) q = q.eq("league_id", filters.leagueId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Booking[];
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Booking>) => {
      const { data, error } = await supabase.from("bookings").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Booking> & { id: string }) => {
      const { data, error } = await supabase.from("bookings").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
