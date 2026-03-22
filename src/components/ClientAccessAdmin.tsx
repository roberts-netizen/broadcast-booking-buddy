import React, { useState, useMemo } from "react";
import { Plus, Trash2, Link2, Copy, X } from "lucide-react";
import {
  useClientAccessTokens,
  useGenerateAccessToken,
  useDeleteAccessToken,
  useLeagueTakerTags,
  useInsertLeagueTakerTag,
  useDeleteLeagueTakerTag,
} from "@/hooks/useClientPortal";
import { useTakerChannelMaps, useLeagues } from "@/hooks/useLookups";
import { toast } from "@/hooks/use-toast";

export default function ClientAccessAdmin() {
  const { data: tcms = [] } = useTakerChannelMaps(true);
  const { data: leagues = [] } = useLeagues(true);
  const { data: tokens = [] } = useClientAccessTokens();
  const { data: tags = [] } = useLeagueTakerTags();
  const generateToken = useGenerateAccessToken();
  const deleteToken = useDeleteAccessToken();
  const insertTag = useInsertLeagueTakerTag();
  const deleteTag = useDeleteLeagueTakerTag();

  const [selectedTcm, setSelectedTcm] = useState<string | null>(null);
  const [addingLeague, setAddingLeague] = useState<string>("");

  // Group tokens by tcm
  const tokensByTcm = useMemo(() => {
    const map: Record<string, any[]> = {};
    (tokens as any[]).forEach((t) => {
      const key = t.taker_channel_map_id;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tokens]);

  // Group tags by tcm
  const tagsByTcm = useMemo(() => {
    const map: Record<string, any[]> = {};
    (tags as any[]).forEach((t) => {
      const key = t.taker_channel_map_id;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tags]);

  const baseUrl = window.location.origin;

  const copyLink = (tokenStr: string) => {
    navigator.clipboard.writeText(`${baseUrl}/client/${tokenStr}`);
    toast({ title: "Link copied!" });
  };

  const handleAddLeague = (tcmId: string) => {
    if (!addingLeague) return;
    insertTag.mutate({ league_id: addingLeague, taker_channel_map_id: tcmId });
    setAddingLeague("");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-semibold">Client Access — Taker Channel Links</h2>
      <p className="text-xs text-muted-foreground">
        Generate shareable links for taker channels. Tag leagues to control which games are visible.
      </p>

      <div className="space-y-3">
        {(tcms as any[]).map((tcm) => {
          const tcmTokens = tokensByTcm[tcm.id] || [];
          const tcmTags = tagsByTcm[tcm.id] || [];
          const isOpen = selectedTcm === tcm.id;
          const existingLeagueIds = new Set(tcmTags.map((t: any) => t.league_id));
          const availableLeagues = (leagues as any[]).filter((l) => !existingLeagueIds.has(l.id));

          return (
            <div key={tcm.id} className="border border-border rounded-lg bg-card overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-muted/30"
                onClick={() => setSelectedTcm(isOpen ? null : tcm.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{tcm.label}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({tcm.actual_channel_id})
                  </span>
                  {tcmTags.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      · {tcmTags.length} league{tcmTags.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {tcmTokens.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyLink(tcmTokens[0].token);
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"
                    >
                      <Copy className="h-3 w-3" /> Copy Link
                    </button>
                  )}
                  {tcmTokens.length === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        generateToken.mutate(tcm.id);
                      }}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80"
                    >
                      <Link2 className="h-3 w-3" /> Generate Link
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Access Links */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                      Access Links
                    </h4>
                    {tcmTokens.length === 0 ? (
                      <button
                        onClick={() => generateToken.mutate(tcm.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                      >
                        <Plus className="h-3 w-3" /> Generate Link
                      </button>
                    ) : (
                      tcmTokens.map((tk: any) => (
                        <div
                          key={tk.id}
                          className="flex items-center gap-2 text-xs font-mono bg-muted/50 rounded px-2 py-1.5 mb-1"
                        >
                          <span className="truncate flex-1">
                            {baseUrl}/client/{tk.token}
                          </span>
                          <button
                            onClick={() => copyLink(tk.token)}
                            className="text-primary hover:text-primary/80"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteToken.mutate(tk.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* League Tags */}
                  <div>
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">
                      Available Leagues
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tcmTags.map((tag: any) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {tag.leagues?.name}
                          <button
                            onClick={() => deleteTag.mutate(tag.id)}
                            className="hover:text-destructive"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                      {tcmTags.length === 0 && (
                        <span className="text-[11px] text-muted-foreground">No leagues tagged</span>
                      )}
                    </div>
                    {availableLeagues.length > 0 && (
                      <div className="flex items-center gap-2">
                        <select
                          className="grid-cell-input border border-border rounded text-xs flex-1"
                          value={addingLeague}
                          onChange={(e) => setAddingLeague(e.target.value)}
                        >
                          <option value="">Add league…</option>
                          {availableLeagues.map((l: any) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleAddLeague(tcm.id)}
                          disabled={!addingLeague}
                          className="text-xs text-primary hover:text-primary/80 disabled:opacity-40"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {(tcms as any[]).length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No active taker channel maps. Create them in the admin settings first.
          </p>
        )}
      </div>
    </div>
  );
}
