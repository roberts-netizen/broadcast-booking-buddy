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
  test_status: string;
  role: string;
  created_at: string;
  updated_at: string;
  // Joined from taker_channel_maps
  taker_channel_map_label?: string | null;
  // Joined from takers (via taker_channel_maps)
  taker_name?: string | null;
  taker_protocol?: string | null;
  taker_host?: string | null;
  taker_port?: string | null;
  taker_stream_key?: string | null;
  taker_username?: string | null;
  taker_password?: string | null;
  taker_audio?: string | null;
  taker_quality?: string | null;
  taker_email_subject?: string | null;
  taker_communication_method?: string | null;
  taker_phone_number?: string | null;
};

export function useBookingTakerAssignments(bookingIds: string[]) {
  return useQuery({
    queryKey: ["booking_taker_assignments", bookingIds],
    queryFn: async () => {
      if (!bookingIds.length) return [] as BookingTakerAssignment[];
      const { data, error } = await supabase
        .from("booking_taker_assignments")
        .select("*, taker_channel_maps(label, takers(name, protocol, host, port, stream_key, username, password, audio, quality, email_subject, communication_method, phone_number))")
        .in("booking_id", bookingIds);
      if (error) throw error;
      return (data as any[]).map((row) => {
        const tcm = row.taker_channel_maps;
        const taker = tcm?.takers;
        // Prefer inline fields (used by HOGMORE one-time takers), fall back to joined data
        return {
          ...row,
          taker_channel_map_label: tcm?.label ?? row.taker_name ?? null,
          taker_name: row.taker_name ?? taker?.name ?? null,
          taker_protocol: row.taker_protocol ?? taker?.protocol ?? null,
          taker_host: row.taker_host ?? taker?.host ?? null,
          taker_port: row.taker_port ?? taker?.port ?? null,
          taker_stream_key: row.taker_stream_key ?? taker?.stream_key ?? null,
          taker_username: row.taker_username ?? taker?.username ?? null,
          taker_password: row.taker_password ?? taker?.password ?? null,
          taker_audio: row.taker_audio ?? taker?.audio1 ?? null,
          taker_quality: row.taker_quality ?? taker?.quality ?? null,
          taker_email_subject: row.taker_email_subject ?? taker?.email_subject ?? null,
          taker_communication_method: row.taker_communication_method ?? taker?.communication_method ?? null,
          taker_phone_number: row.taker_phone_number ?? taker?.phone_number ?? null,
        };
      }) as BookingTakerAssignment[];
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

export function useUpdateAssignmentTestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, test_status }: { id: string; test_status: string }) => {
      const { error } = await supabase
        .from("booking_taker_assignments")
        .update({ test_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["booking_taker_assignments"] }),
  });
}
