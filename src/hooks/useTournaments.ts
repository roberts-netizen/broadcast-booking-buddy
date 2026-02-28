import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tournament = {
  id: string;
  name: string;
  type: string;
  date_from: string | null;
  date_to: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const TOURNAMENT_TYPES = ["MCR", "ATP/WTA", "ONE-OFF"] as const;

export function useTournaments(activeOnly = true) {
  return useQuery({
    queryKey: ["tournaments", { activeOnly }],
    queryFn: async () => {
      let q = supabase.from("tournaments").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as Tournament[];
    },
  });
}

export function useUpsertTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Tournament> & { name: string; type: string }) => {
      const { data, error } = payload.id
        ? await supabase.from("tournaments").update(payload).eq("id", payload.id).select().single()
        : await supabase.from("tournaments").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tournaments"] }),
  });
}

export function useDeleteTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tournaments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tournaments"] }),
  });
}
