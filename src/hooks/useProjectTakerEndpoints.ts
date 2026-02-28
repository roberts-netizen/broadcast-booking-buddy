import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProjectTakerEndpoint = {
  id: string;
  taker_assignment_id: string;
  endpoint_type: "primary" | "backup";
  protocol: string | null;
  host: string | null;
  port: string | null;
  stream_key: string | null;
  username: string | null;
  password: string | null;
  created_at: string;
  updated_at: string;
};

export function useProjectTakerEndpoints(assignmentIds: string[]) {
  return useQuery({
    queryKey: ["project_taker_endpoints", assignmentIds],
    queryFn: async () => {
      if (!assignmentIds.length) return [] as ProjectTakerEndpoint[];
      const { data, error } = await supabase
        .from("project_taker_endpoints")
        .select("*")
        .in("taker_assignment_id", assignmentIds);
      if (error) throw error;
      return data as ProjectTakerEndpoint[];
    },
    enabled: assignmentIds.length > 0,
  });
}

export function useUpsertEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: Partial<ProjectTakerEndpoint> & {
        taker_assignment_id: string;
        endpoint_type: "primary" | "backup";
      }
    ) => {
      const { id, created_at, updated_at, ...rest } = payload as any;
      const { error } = await supabase
        .from("project_taker_endpoints")
        .upsert(rest, { onConflict: "taker_assignment_id,endpoint_type" });
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["project_taker_endpoints"] }),
  });
}

export function useDeleteEndpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_taker_endpoints")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["project_taker_endpoints"] }),
  });
}
