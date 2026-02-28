import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Leagues ──────────────────────────────────────────────────────────────────
export function useLeagues(activeOnly = false) {
  return useQuery({
    queryKey: ["leagues", activeOnly],
    queryFn: async () => {
      let q = supabase.from("leagues").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id?: string; name: string; active: boolean }) => {
      const { error } = row.id
        ? await supabase.from("leagues").update({ name: row.name, active: row.active }).eq("id", row.id)
        : await supabase.from("leagues").insert({ name: row.name, active: row.active });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

export function useDeleteLeague() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leagues").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

export function useBulkInsertLeagues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { name: string; active: boolean }[]) => {
      const { error } = await supabase.from("leagues").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leagues"] }),
  });
}

// ── Incoming Channels ─────────────────────────────────────────────────────────
export function useIncomingChannels(activeOnly = false) {
  return useQuery({
    queryKey: ["incoming_channels", activeOnly],
    queryFn: async () => {
      let q = supabase.from("incoming_channels").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertIncomingChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id?: string; name: string; active: boolean }) => {
      const { error } = row.id
        ? await supabase.from("incoming_channels").update({ name: row.name, active: row.active }).eq("id", row.id)
        : await supabase.from("incoming_channels").insert({ name: row.name, active: row.active });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incoming_channels"] }),
  });
}

export function useDeleteIncomingChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("incoming_channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incoming_channels"] }),
  });
}

export function useBulkInsertIncomingChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { name: string; active: boolean }[]) => {
      const { error } = await supabase.from("incoming_channels").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incoming_channels"] }),
  });
}

// ── Takers ────────────────────────────────────────────────────────────────────
export function useTakers(activeOnly = false) {
  return useQuery({
    queryKey: ["takers", activeOnly],
    queryFn: async () => {
      let q = supabase.from("takers").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertTaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id?: string; name: string; active: boolean }) => {
      const { error } = row.id
        ? await supabase.from("takers").update({ name: row.name, active: row.active }).eq("id", row.id)
        : await supabase.from("takers").insert({ name: row.name, active: row.active });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["takers"] }),
  });
}

export function useDeleteTaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("takers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["takers"] }),
  });
}

export function useBulkInsertTakers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { name: string; active: boolean }[]) => {
      const { error } = await supabase.from("takers").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["takers"] }),
  });
}

// ── TakerChannelMap ───────────────────────────────────────────────────────────
export function useTakerChannelMaps(activeOnly = false) {
  return useQuery({
    queryKey: ["taker_channel_maps", activeOnly],
    queryFn: async () => {
      let q = supabase.from("taker_channel_maps").select("*, takers(name)").order("label");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertTakerChannelMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id?: string; label: string; actual_channel_id: string; taker_id: string | null; active: boolean }) => {
      const { error } = row.id
        ? await supabase.from("taker_channel_maps").update({ label: row.label, actual_channel_id: row.actual_channel_id, taker_id: row.taker_id, active: row.active }).eq("id", row.id)
        : await supabase.from("taker_channel_maps").insert({ label: row.label, actual_channel_id: row.actual_channel_id, taker_id: row.taker_id, active: row.active });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_channel_maps"] }),
  });
}

export function useDeleteTakerChannelMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("taker_channel_maps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_channel_maps"] }),
  });
}

export function useBulkInsertTakerChannelMaps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { label: string; actual_channel_id: string; taker_id: string | null; active: boolean }[]) => {
      const { error } = await supabase.from("taker_channel_maps").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_channel_maps"] }),
  });
}
