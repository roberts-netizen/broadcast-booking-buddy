import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TestStatus = "not_tested" | "scheduled" | "tested" | "failed";

export type TakerAssignment = {
  id: string;
  booking_id: string;
  taker_id: string | null;
  // Technical
  protocol: string | null;
  host: string | null;
  port: string | null;
  stream_key_or_channel_id: string | null;
  username: string | null;
  password: string | null;
  quality: string | null;
  audio: string | null;
  // Communication
  communication_method: string | null;
  whatsapp_details: string | null;
  email_subject: string | null;
  communication_notes: string | null;
  // Testing
  test_datetime: string | null;
  test_status: TestStatus;
  test_notes: string | null;
  tested_by: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  taker_name?: string | null;
};

export function useTakerAssignments(bookingIds: string[]) {
  return useQuery({
    queryKey: ["taker_assignments", bookingIds],
    queryFn: async () => {
      if (!bookingIds.length) return [] as TakerAssignment[];
      const { data, error } = await supabase
        .from("taker_assignments")
        .select("*, takers(name)")
        .in("booking_id", bookingIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((row) => ({
        ...row,
        taker_name: row.takers?.name ?? null,
      })) as TakerAssignment[];
    },
    enabled: bookingIds.length > 0,
  });
}

export function useCreateTakerAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<TakerAssignment> & { booking_id: string }) => {
      const { taker_name, ...rest } = payload as any;
      const { data, error } = await supabase
        .from("taker_assignments")
        .insert(rest)
        .select("*, takers(name)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_assignments"] }),
  });
}

export function useUpdateTakerAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TakerAssignment> & { id: string }) => {
      const { taker_name, ...rest } = payload as any;
      const { data, error } = await supabase
        .from("taker_assignments")
        .update(rest)
        .eq("id", id)
        .select("*, takers(name)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_assignments"] }),
  });
}

export function useDeleteTakerAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("taker_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_assignments"] }),
  });
}
