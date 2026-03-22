import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Look up token → taker_channel_map info
export function useClientToken(token: string) {
  return useQuery({
    queryKey: ["client_token", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_access_tokens")
        .select("*, taker_channel_maps(id, label, taker_id, actual_channel_id)")
        .eq("token", token)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

// Get league tags for a taker_channel_map
export function useLeagueTagsForTCM(takerChannelMapId: string | undefined) {
  return useQuery({
    queryKey: ["league_taker_tags_for_tcm", takerChannelMapId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_taker_tags")
        .select("*, leagues(id, name)")
        .eq("taker_channel_map_id", takerChannelMapId!);
      if (error) throw error;
      return data;
    },
    enabled: !!takerChannelMapId,
  });
}

// Get available bookings for given league IDs (today + future)
export function useAvailableBookings(leagueIds: string[]) {
  return useQuery({
    queryKey: ["available_bookings", leagueIds],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("bookings")
        .select("*, leagues(name)")
        .in("league_id", leagueIds)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("gmt_time", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: leagueIds.length > 0,
  });
}

// Get existing booking_taker_assignments for bookings
export function useExistingAssignments(bookingIds: string[]) {
  return useQuery({
    queryKey: ["client_existing_assignments", bookingIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_taker_assignments")
        .select("*")
        .in("booking_id", bookingIds);
      if (error) throw error;
      return data;
    },
    enabled: bookingIds.length > 0,
  });
}

// Book a game — auto-assign next available slot
export function useClientBookGame() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      takerId,
      takerChannelMapId,
      actualChannelId,
    }: {
      bookingId: string;
      takerId: string | null;
      takerChannelMapId: string;
      actualChannelId: string;
    }) => {
      // Find existing assignments to determine next slot
      const { data: existing } = await supabase
        .from("booking_taker_assignments")
        .select("slot_number")
        .eq("booking_id", bookingId)
        .order("slot_number", { ascending: false })
        .limit(1);

      const nextSlot = existing && existing.length > 0 ? existing[0].slot_number + 1 : 1;

      const { error } = await supabase.from("booking_taker_assignments").insert({
        booking_id: bookingId,
        slot_number: nextSlot,
        taker_id: takerId,
        taker_channel_map_id: takerChannelMapId,
        actual_channel_id: actualChannelId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_existing_assignments"] });
      qc.invalidateQueries({ queryKey: ["booking_taker_assignments"] });
    },
  });
}

// ── Admin hooks for league_taker_tags and client_access_tokens ──

export function useLeagueTakerTags() {
  return useQuery({
    queryKey: ["league_taker_tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("league_taker_tags")
        .select("*, leagues(name), taker_channel_maps(label)");
      if (error) throw error;
      return data;
    },
  });
}

export function useInsertLeagueTakerTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { league_id: string; taker_channel_map_id: string }) => {
      const { error } = await supabase.from("league_taker_tags").insert(row);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["league_taker_tags"] }),
  });
}

export function useDeleteLeagueTakerTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("league_taker_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["league_taker_tags"] }),
  });
}

export function useClientAccessTokens() {
  return useQuery({
    queryKey: ["client_access_tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_access_tokens")
        .select("*, taker_channel_maps(label, taker_id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useGenerateAccessToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (takerChannelMapId: string) => {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map((b) => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 10);

      const { data, error } = await supabase
        .from("client_access_tokens")
        .insert({ taker_channel_map_id: takerChannelMapId, token })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_access_tokens"] }),
  });
}

export function useDeleteAccessToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_access_tokens").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client_access_tokens"] }),
  });
}
