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

export type TakerRecord = {
  id?: string;
  name: string;
  active: boolean;
  email_subject?: string | null;
  communication_method?: string | null;
  phone_number?: string | null;
  quality?: string | null;
  audio1?: string | null;
  audio2?: string | null;
  status?: string | null;
  settings?: string | null;
  protocol?: string | null;
  host?: string | null;
  port?: string | null;
  stream_key?: string | null;
  username?: string | null;
  password?: string | null;
  backup_host?: string | null;
  backup_port?: string | null;
  backup_stream_key?: string | null;
  backup_username?: string | null;
  backup_password?: string | null;
};

export function useUpsertTaker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: TakerRecord) => {
      const { id, ...rest } = row;
      const { error } = id
        ? await supabase.from("takers").update(rest).eq("id", id)
        : await supabase.from("takers").insert(rest);
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
    mutationFn: async (row: { id?: string; label: string; actual_channel_id: string; taker_id: string | null; taker_name?: string | null; active: boolean }) => {
      const payload: any = { label: row.label, actual_channel_id: row.actual_channel_id, taker_id: row.taker_id, taker_name: row.taker_name ?? null, active: row.active };
      const { error } = row.id
        ? await supabase.from("taker_channel_maps").update(payload).eq("id", row.id)
        : await supabase.from("taker_channel_maps").insert(payload);
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
    mutationFn: async (rows: { label: string; actual_channel_id: string; taker_id: string | null; taker_name?: string | null; active: boolean }[]) => {
      const { error } = await supabase.from("taker_channel_maps").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["taker_channel_maps"] }),
  });
}

// ── Categories ───────────────────────────────────────────────────────────────
export function useCategories(activeOnly = false) {
  return useQuery({
    queryKey: ["categories", activeOnly],
    queryFn: async () => {
      let q = supabase.from("categories").select("*").order("name");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as { id: string; name: string; type: string; active: boolean; created_at: string }[];
    },
  });
}

export function useUpsertCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id?: string; name: string; type: string; active: boolean }) => {
      const { error } = row.id
        ? await supabase.from("categories").update({ name: row.name, type: row.type, active: row.active }).eq("id", row.id)
        : await supabase.from("categories").insert({ name: row.name, type: row.type, active: row.active });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

// ── TonyBet Channel Maps ─────────────────────────────────────────────────────
export function useTonybetChannelMaps(activeOnly = false) {
  return useQuery({
    queryKey: ["tonybet_channel_maps", activeOnly],
    queryFn: async () => {
      let q = supabase.from("tonybet_channel_maps").select("*").order("label");
      if (activeOnly) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertTonybetChannelMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { id?: string; taker_name?: string | null; label: string; actual_channel_id: string; active: boolean }) => {
      const payload: any = { taker_name: row.taker_name ?? null, label: row.label, actual_channel_id: row.actual_channel_id, active: row.active };
      const { error } = row.id
        ? await supabase.from("tonybet_channel_maps").update(payload).eq("id", row.id)
        : await supabase.from("tonybet_channel_maps").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tonybet_channel_maps"] }),
  });
}

export function useDeleteTonybetChannelMap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tonybet_channel_maps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tonybet_channel_maps"] }),
  });
}

export function useBulkInsertTonybetChannelMaps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { taker_name?: string | null; label: string; actual_channel_id: string; active: boolean }[]) => {
      const { error } = await supabase.from("tonybet_channel_maps").insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tonybet_channel_maps"] }),
  });
}
