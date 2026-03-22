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
  venue: string | null;
  source: string | null;
  project_lead: string | null;
  audio_setup: string | null;
  event_notes: string | null;
  source_status: string;
  tournament_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useBookings(filters?: { dateFrom?: string; dateTo?: string; leagueId?: string; tournamentType?: string }) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: async () => {
      // If filtering by tournament type, we need to get tournament IDs first
      let tournamentIds: string[] | null = null;
      if (filters?.tournamentType) {
        const { data: tournaments, error: tErr } = await supabase
          .from("tournaments")
          .select("id")
          .eq("type", filters.tournamentType);
        if (tErr) throw tErr;
        tournamentIds = tournaments?.map((t) => t.id) ?? [];
      }

      let q = supabase
        .from("bookings")
        .select("*")
        .order("date", { ascending: true })
        .order("gmt_time", { ascending: true })
        .order("id", { ascending: true });
      if (filters?.dateFrom) q = q.gte("date", filters.dateFrom);
      if (filters?.dateTo) q = q.lte("date", filters.dateTo);
      if (filters?.leagueId) q = q.eq("league_id", filters.leagueId);

      if (filters?.tournamentType && tournamentIds !== null) {
        if (filters.tournamentType === "MCR") {
          // MCR: bookings with MCR tournament OR no tournament
          q = q.or(`tournament_id.is.null,tournament_id.in.(${tournamentIds.join(",")})`);
        } else {
          if (tournamentIds.length === 0) return [] as Booking[];
          q = q.in("tournament_id", tournamentIds);
        }
      }

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
