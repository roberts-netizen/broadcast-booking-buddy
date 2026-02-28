import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingReport = {
  id: string;
  booking_id: string;
  impact_level: "high" | "low";
  description: string;
  created_at: string;
  updated_at: string;
};

export function useBookingReports(bookingIds: string[]) {
  return useQuery({
    queryKey: ["booking_reports", bookingIds],
    queryFn: async () => {
      if (!bookingIds.length) return [];
      const { data, error } = await supabase
        .from("booking_reports")
        .select("*")
        .in("booking_id", bookingIds);
      if (error) throw error;
      return data as BookingReport[];
    },
    enabled: bookingIds.length > 0,
  });
}

export function useUpsertBookingReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: { booking_id: string; impact_level: string; description: string }) => {
      const { data, error } = await supabase
        .from("booking_reports")
        .upsert(report, { onConflict: "booking_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_reports"] }),
  });
}

export function useDeleteBookingReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("booking_reports")
        .delete()
        .eq("booking_id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_reports"] }),
  });
}
