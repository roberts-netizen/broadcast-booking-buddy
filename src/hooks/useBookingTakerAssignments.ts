import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BookingTakerAssignment = {
  id: string;
  booking_id: string;
  slot_number: number;
  taker_id: string | null;
  taker_channel_map_id: string | null;
  actual_channel_id: string;
  booked_by_client: boolean;
  created_at: string;
  updated_at: string;
  // Joined from taker_channel_maps
  taker_channel_map_label?: string | null;
};

export function useBookingTakerAssignments(bookingIds: string[]) {
  return useQuery({
    queryKey: ["booking_taker_assignments", bookingIds],
    queryFn: async () => {
      if (!bookingIds.length) return [] as BookingTakerAssignment[];
      const { data, error } = await supabase
        .from("booking_taker_assignments")
        .select("*, taker_channel_maps(label)")
        .in("booking_id", bookingIds);
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        taker_channel_map_label: row.taker_channel_maps?.label ?? null,
      })) as BookingTakerAssignment[];
    },
    enabled: bookingIds.length > 0,
  });
}

type UpsertPayload = {
  bookingId: string;
  slotNumber: number;
  takerId: string | null;
  takerChannelMapId: string | null;
  actualChannelId: string;
};

export function useUpsertBookingTakerAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, slotNumber, takerId, takerChannelMapId, actualChannelId }: UpsertPayload) => {
      const { error } = await supabase
        .from("booking_taker_assignments")
        .upsert(
          {
            booking_id: bookingId,
            slot_number: slotNumber,
            taker_id: takerId,
            taker_channel_map_id: takerChannelMapId,
            actual_channel_id: actualChannelId,
          },
          { onConflict: "booking_id,slot_number" }
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_taker_assignments"] }),
  });
}

export function useClearBookingTakerAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, slotNumber }: { bookingId: string; slotNumber: number }) => {
      const { error } = await supabase
        .from("booking_taker_assignments")
        .delete()
        .eq("booking_id", bookingId)
        .eq("slot_number", slotNumber);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_taker_assignments"] }),
  });
}
