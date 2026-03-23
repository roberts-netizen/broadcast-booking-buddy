import React, { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, ExternalLink, X } from "lucide-react";
import { useBookings, Booking } from "@/hooks/useBookings";
import { useLeagues, useCategories, useTakers, useIncomingChannels } from "@/hooks/useLookups";
import { useTakerAssignments, TakerAssignment, TestStatus, useUpdateTakerAssignment } from "@/hooks/useTakerAssignments";
import { useBookingTakerAssignments, BookingTakerAssignment } from "@/hooks/useBookingTakerAssignments";
import { useProjectTakerEndpoints, ProjectTakerEndpoint, useUpsertEndpoint } from "@/hooks/useProjectTakerEndpoints";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PROTOCOLS = ["RTMP", "SRT", "TCP", "Bifrost", "SRT Pull", "RTMP 2", "SRT 2", "TCP 2", "Bifrost 2", "SRT Pull 2"];
const COMM_METHODS = ["WhatsApp", "Email", "Both", "Other"];
const TEST_STATUSES: { value: TestStatus; label: string; dot: string; color: string }[] = [
  { value: "not_tested", label: "Not Tested", dot: "🔴", color: "text-destructive bg-destructive/10" },
  { value: "waiting_for_details", label: "Waiting for details", dot: "🟡", color: "text-yellow-600 bg-yellow-500/10" },
  { value: "tested", label: "Tested", dot: "🟢", color: "text-green-600 bg-green-500/10" },
];

const fieldClass = "w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring";
const selectField = "w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none cursor-pointer";

type Section = "today" | "upcoming" | "past";

export default function McrPage({ onNavigateToBooking }: { onNavigateToBooking?: (bookingId: string, category: string) => void }) {
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(["today", "upcoming"]));
  const [selectedTaker, setSelectedTaker] = useState<TakerAssignment | null>(null);
  const [selectedBta, setSelectedBta] = useState<BookingTakerAssignment | null>(null);

  const { data: categories = [] } = useCategories(true);
  const { data: leagues = [] } = useLeagues(true);
  const { data: incomingChannels = [] } = useIncomingChannels(true);

  // Fetch MCR bookings
  const { data: mcrBookings = [], isLoading: mcrLoading } = useBookings({ tournamentType: "MCR" });

  // Fetch ADV category bookings
  const advCategories = useMemo(() => categories.filter((c) => c.type === "advanced"), [categories]);
  const advCatNames = useMemo(() => advCategories.map((c) => c.name), [advCategories]);

  // Fetch each ADV category's bookings
  const { data: advBookings0 = [] } = useBookings(advCatNames[0] ? { tournamentType: advCatNames[0] } : undefined);
  const { data: advBookings1 = [] } = useBookings(advCatNames[1] ? { tournamentType: advCatNames[1] } : undefined);
  const { data: advBookings2 = [] } = useBookings(advCatNames[2] ? { tournamentType: advCatNames[2] } : undefined);

  // Build category label map for ADV bookings
  const advWithCategory = useMemo(() => {
    const tagged: (Booking & { _category?: string })[] = [];
    if (advCatNames[0]) for (const b of advBookings0) tagged.push({ ...b, _category: advCatNames[0] });
    if (advCatNames[1]) for (const b of advBookings1) tagged.push({ ...b, _category: advCatNames[1] });
    if (advCatNames[2]) for (const b of advBookings2) tagged.push({ ...b, _category: advCatNames[2] });
    return tagged;
  }, [advBookings0, advBookings1, advBookings2, advCatNames]);

  // Merge all bookings, tag MCR ones
  const allBookings = useMemo(() => {
    const mcr = mcrBookings.map((b) => ({ ...b, _category: "MCR" as string }));
    return [...mcr, ...advWithCategory].sort((a, b) => {
      // Sort by date then gmt_time
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.gmt_time || "").localeCompare(b.gmt_time || "");
    });
  }, [mcrBookings, advWithCategory]);

  // Taker assignments for all bookings
  const allIds = useMemo(() => allBookings.map((b) => b.id), [allBookings]);
  const { data: takerAssignments = [] } = useTakerAssignments(allIds);
  const { data: btaAssignments = [] } = useBookingTakerAssignments(allIds);

  // Fetch project_taker_endpoints for ADV taker details
  const takerAssignmentIds = useMemo(() => takerAssignments.map((a) => a.id), [takerAssignments]);
  const { data: endpoints = [] } = useProjectTakerEndpoints(takerAssignmentIds);

  const endpointsByAssignment = useMemo(() => {
    const map: Record<string, ProjectTakerEndpoint[]> = {};
    for (const e of endpoints) {
      if (!map[e.taker_assignment_id]) map[e.taker_assignment_id] = [];
      map[e.taker_assignment_id].push(e);
    }
    return map;
  }, [endpoints]);

  const takersByBooking = useMemo(() => {
    const map: Record<string, TakerAssignment[]> = {};
    for (const a of takerAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [takerAssignments]);

  const btaByBooking = useMemo(() => {
    const map: Record<string, BookingTakerAssignment[]> = {};
    for (const a of btaAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [btaAssignments]);

  const { data: takers = [] } = useTakers(true);

  const takerNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of takers) m[t.id] = t.name;
    return m;
  }, [takers]);

  const leagueMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const l of leagues) m[l.id] = l.name;
    return m;
  }, [leagues]);

  const incomingChannelMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of incomingChannels) m[c.id] = c.name;
    return m;
  }, [incomingChannels]);

  const today = new Date().toISOString().slice(0, 10);

  // Group bookings respecting date_to for multi-day events
  const grouped = useMemo(() => {
    const todayList: typeof allBookings = [];
    const upcoming: typeof allBookings = [];
    const past: typeof allBookings = [];

    for (const b of allBookings) {
      const endDate = (b as any).date_to || b.date;
      if (b.date <= today && endDate >= today) todayList.push(b);
      else if (b.date > today) upcoming.push(b);
      else past.push(b);
    }
    return { today: todayList, upcoming, past };
  }, [allBookings, today]);

  const toggleSection = (s: Section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const getStatusBadge = (bookingId: string) => {
    const ta = takersByBooking[bookingId] ?? [];
    const bta = btaByBooking[bookingId] ?? [];
    const totalTakers = ta.length + bta.length;
    if (totalTakers === 0) return <Badge variant="outline" className="text-[9px] px-1 py-0">—</Badge>;
    const tested = ta.filter((a) => a.test_status === "tested").length;
    if (ta.length === 0) return <Badge variant="outline" className="text-[9px] px-1 py-0">{bta.length} assigned</Badge>;
    if (tested === ta.length) return <Badge className="text-[9px] px-1 py-0 bg-[hsl(var(--primary)/0.15)] text-[hsl(142,71%,45%)] border-[hsl(142,71%,45%,0.3)]">✓ All tested</Badge>;
    if (tested > 0) return <Badge className="text-[9px] px-1 py-0 bg-[hsl(var(--accent))] text-[hsl(45,93%,47%)] border-[hsl(45,93%,47%,0.3)]">{tested}/{ta.length}</Badge>;
    return <Badge variant="destructive" className="text-[9px] px-1 py-0">Not tested</Badge>;
  };

  const renderTakerDetails = (bookingId: string, isAdv: boolean) => {
    const ta = takersByBooking[bookingId] ?? [];
    const bta = btaByBooking[bookingId] ?? [];

    if (ta.length === 0 && bta.length === 0) {
      return <span className="text-muted-foreground">—</span>;
    }

    // ADV events: show taker name + details
    if (isAdv && ta.length > 0) {
      return (
        <div className="flex gap-0">
          {ta.map((a) => {
            const name = a.taker_name || (a as any).taker_custom_name || "";
            const statusColor = a.test_status === "tested"
              ? "bg-[hsl(142,71%,45%)]"
              : a.test_status === "waiting_for_details"
              ? "bg-[hsl(45,93%,47%)]"
              : "bg-[hsl(0,72%,51%)]";
            const qualAudio = [a.quality, (a as any).audio].filter(Boolean).join(" / ");
            const eps = endpointsByAssignment[a.id] ?? [];
            const proto = eps.length > 0
              ? eps.map(e => e.protocol).filter(Boolean).join(", ")
              : a.protocol || "";

            return (
              <div
                key={a.id}
                className="flex flex-col text-[10px] leading-tight cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 transition-colors border-r border-border last:border-r-0 w-[130px] shrink-0"
                onClick={(e) => { e.stopPropagation(); setSelectedTaker(a); }}
                title="Click to view full details"
              >
                <div className="flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                  <span className="font-medium text-primary underline decoration-dotted truncate" title={name}>{name}</span>
                </div>
                {(qualAudio || proto) && (
                  <span className="text-muted-foreground truncate" title={`${qualAudio} ${proto}`}>
                    {qualAudio}{qualAudio && proto ? " " : ""}{proto && `[${proto}]`}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // BTA events (HOGMORE/MCR with booking_taker_assignments)
    if (bta.length > 0) {
      return (
        <div className="flex gap-0">
          {bta.map((a) => {
            const takerName = a.taker_name || "";
            const label = a.taker_channel_map_label || "";
            const chId = a.actual_channel_id || "";
            if (!takerName && !label && !chId) return null;

            if (isAdv) {
              // ADV events: show status dot + clickable label
              const statusColor = a.test_status === "tested"
                ? "bg-[hsl(142,71%,45%)]"
                : "bg-[hsl(0,72%,51%)]";
              return (
                <div
                  key={a.id}
                  className="flex flex-col text-[10px] leading-tight cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 transition-colors border-r border-border last:border-r-0 w-[130px] shrink-0"
                  onClick={(e) => { e.stopPropagation(); setSelectedBta(a); }}
                  title="Click to view details"
                >
                  <div className="flex items-center gap-1">
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                    {(takerName || label) && <span className="font-medium text-primary underline decoration-dotted truncate" title={takerName || label}>{takerName || label}</span>}
                    {a.booked_by_client && <span className="text-[8px] px-1 py-0 rounded bg-blue-500/15 text-blue-500 border border-blue-500/30 shrink-0">Client</span>}
                  </div>
                  {chId && <span className="text-muted-foreground font-mono truncate pl-3" title={chId}>{chId}</span>}
                  {a.taker_audio && <span className="text-muted-foreground truncate pl-3">Audio - {a.taker_audio}</span>}
                </div>
              );
            }

            // MCR events: show Taker Name | CHID | Port/Key (no status dot)
            return (
              <div
                key={a.id}
                className="flex flex-col text-[10px] leading-tight cursor-pointer hover:bg-muted/50 px-1.5 py-0.5 transition-colors border-r border-border last:border-r-0 w-[130px] shrink-0"
                onClick={(e) => { e.stopPropagation(); setSelectedBta(a); }}
                title="Click to view details"
              >
                {takerName && <span className="font-medium text-foreground truncate" title={takerName}>{takerName}</span>}
                {label && <span className="text-muted-foreground truncate" title={`CHID: ${label}`}>{label}</span>}
                {chId && <span className="text-muted-foreground font-mono truncate" title={`Port/Key: ${chId}`}>{chId}</span>}
              </div>
            );
          })}
        </div>
      );
    }

    // Fallback: taker_assignments for MCR
    return (
      <div className="flex gap-0">
        {ta.map((a) => {
          const name = a.taker_name || (a as any).taker_custom_name || "";
          if (!name) return null;
          const statusColor = a.test_status === "tested"
            ? "bg-[hsl(142,71%,45%)]"
            : a.test_status === "waiting_for_details"
            ? "bg-[hsl(45,93%,47%)]"
            : "bg-[hsl(0,72%,51%)]";
          const chId = a.stream_key_or_channel_id || "";
          return (
            <div key={a.id} className="flex flex-col text-[10px] leading-tight px-1.5 py-0.5 border-r border-border last:border-r-0 w-[130px] shrink-0">
              <div className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusColor}`} />
                <span className="font-medium text-foreground truncate" title={name}>{name}</span>
              </div>
              {chId && <span className="text-muted-foreground font-mono truncate" title={chId}>{chId}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSection = (title: string, key: Section, items: typeof allBookings, color: string) => {
    const isExpanded = expandedSections.has(key);
    return (
      <div key={key} className="border-b border-border last:border-b-0">
        <button
          onClick={() => toggleSection(key)}
          className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold hover:bg-muted/50 transition-colors ${color}`}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          {title}
          <span className="ml-1 text-muted-foreground font-normal">({items.length})</span>
        </button>
        {isExpanded && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-muted/30 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-1.5 py-1 text-left font-semibold w-[40px] border border-border">Type</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[90px] border border-border">Date</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[42px] border border-border">GMT</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[42px] border border-border">CET</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[130px] border border-border">Event</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[90px] border border-border">League / Brick</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[160px] border border-border">Incoming CH</th>
                  <th className="px-1.5 py-1 text-left font-semibold border border-border">Takers</th>
                  <th className="px-1.5 py-1 text-left font-semibold w-[100px] border border-border">Betting</th>
                  <th className="px-0.5 py-1 text-left font-semibold w-[24px] border border-border"></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={10} className="px-3 py-4 text-center text-xs text-muted-foreground border border-border">No events</td></tr>
                ) : (
                  items.map((b: any) => {
                    const cat = b._category || "MCR";
                    const isAdv = cat !== "MCR";
                    return (
                      <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-1.5 py-1 border border-border">
                          {isAdv ? (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">{cat}</Badge>
                          ) : (
                            <span className="text-[9px] text-muted-foreground">MCR</span>
                          )}
                        </td>
                        <td className="px-1.5 py-1 text-[11px] whitespace-nowrap border border-border">
                          {b.date}
                          {(b as any).date_to && (b as any).date_to !== b.date && (
                            <span className="text-muted-foreground ml-0.5">→{(b as any).date_to.slice(5)}</span>
                          )}
                        </td>
                        <td className="px-1.5 py-1 text-[11px] whitespace-nowrap border border-border">{b.gmt_time?.slice(0, 5)}</td>
                        <td className="px-1.5 py-1 text-[11px] whitespace-nowrap border border-border">{b.cet_time?.slice(0, 5) ?? ""}</td>
                        <td className="px-1.5 py-1 text-[11px] font-medium truncate max-w-[130px] border border-border" title={b.event_name}>{b.event_name}</td>
                        <td className="px-1.5 py-1 text-[11px] text-muted-foreground border border-border">{isAdv ? (b.venue || b.source || "") : (b.league_id ? leagueMap[b.league_id] ?? "" : "")}</td>
                        <td className="px-1.5 py-1 text-[11px] text-muted-foreground border border-border max-w-[160px]" title={b.incoming_channel_id ? incomingChannelMap[b.incoming_channel_id] ?? "" : (b.source || "")}>
                          {b.incoming_channel_id ? (
                            incomingChannelMap[b.incoming_channel_id] ?? ""
                          ) : isAdv && b.source ? (
                            <div className="flex items-center gap-1">
                              <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${b.source_status === "tested" ? "bg-[hsl(142,71%,45%)]" : "bg-[hsl(0,72%,51%)]"}`} />
                              <span className="truncate">{b.source}</span>
                            </div>
                          ) : ""}
                        </td>
                        <td className="px-1 py-0.5 border border-border">{renderTakerDetails(b.id, isAdv)}</td>
                        <td className="px-1.5 py-1 border border-border text-[11px]">
                          {(() => {
                            if (!b.betting_settings) return "—";
                            try {
                              const parsed = JSON.parse(b.betting_settings);
                              const name = parsed?.name;
                              if (!name) return "—";
                              return (
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                  {name}
                                </span>
                              );
                            } catch { return "—"; }
                          })()}
                        </td>
                        <td className="px-0.5 py-1 border border-border w-[24px]">
                          {onNavigateToBooking && (
                            <button
                              onClick={() => onNavigateToBooking(b.id, cat)}
                              className="p-0.5 text-muted-foreground hover:text-primary transition-colors"
                              title="Open in Events view"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const isLoading = mcrLoading;

  const updateAssignment = useUpdateTakerAssignment();
  const upsertEndpoint = useUpsertEndpoint();

  const handleUpdateField = useCallback(
    (id: string, patch: Partial<TakerAssignment>) => {
      const { taker_name, ...rest } = patch as any;
      updateAssignment.mutate({ id, ...rest });
    },
    [updateAssignment]
  );

  const handleUpdateEndpoint = useCallback(
    (assignmentId: string, type: "primary" | "backup", patch: Partial<ProjectTakerEndpoint>) => {
      const currentEps = endpointsByAssignment[assignmentId] ?? [];
      const existing = currentEps.find((e) => e.endpoint_type === type) ?? {};
      const updated = { ...existing, ...patch };
      upsertEndpoint.mutate({
        taker_assignment_id: assignmentId,
        endpoint_type: type,
        protocol: updated.protocol ?? null,
        host: updated.host ?? null,
        port: updated.port ?? null,
        stream_key: updated.stream_key ?? null,
        username: updated.username ?? null,
        password: updated.password ?? null,
      });
    },
    [endpointsByAssignment, upsertEndpoint]
  );

  const renderTakerDetailDialog = () => {
    if (!selectedTaker) return null;
    const a = selectedTaker;
    const name = a.taker_name || (a as any).taker_custom_name || "Taker";
    const status = TEST_STATUSES.find((s) => s.value === a.test_status) ?? TEST_STATUSES[0];
    const eps = endpointsByAssignment[a.id] ?? [];
    const primaryEp = eps.find((e) => e.endpoint_type === "primary") ?? ({} as Partial<ProjectTakerEndpoint>);
    const backupEp = eps.find((e) => e.endpoint_type === "backup") ?? ({} as Partial<ProjectTakerEndpoint>);

    const SectionLabel = ({ children }: { children: React.ReactNode }) => (
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border pb-0.5 mb-1 mt-3 first:mt-0">
        {children}
      </div>
    );

    const FieldRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
      <div className="grid grid-cols-[120px_1fr] gap-2 items-center py-0.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {children}
      </div>
    );

    return (
      <Dialog open={!!selectedTaker} onOpenChange={() => setSelectedTaker(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <span>{status.dot}</span>
              <span>{name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-0">
            {/* Taker */}
            <SectionLabel>Taker</SectionLabel>
            <FieldRow label="Taker">
              <select className={selectField} value={a.taker_id ?? ""} onChange={(e) => handleUpdateField(a.id, { taker_id: e.target.value || null })}>
                <option value="">—</option>
                {takers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Custom Name">
              <input className={fieldClass} value={(a as any).taker_custom_name ?? ""} onChange={(e) => handleUpdateField(a.id, { taker_custom_name: e.target.value || null } as any)} />
            </FieldRow>

            {/* Communication */}
            <SectionLabel>Communication</SectionLabel>
            <FieldRow label="Method">
              <select className={selectField} value={a.communication_method ?? ""} onChange={(e) => handleUpdateField(a.id, { communication_method: e.target.value || null })}>
                <option value="">—</option>
                {COMM_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Email Subject">
              <input className={fieldClass} value={a.email_subject ?? ""} onChange={(e) => handleUpdateField(a.id, { email_subject: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Phone">
              <input className={fieldClass} value={(a as any).phone_number ?? ""} onChange={(e) => handleUpdateField(a.id, { phone_number: e.target.value || null } as any)} />
            </FieldRow>
            <FieldRow label="WhatsApp">
              <input className={fieldClass} value={a.whatsapp_details ?? ""} onChange={(e) => handleUpdateField(a.id, { whatsapp_details: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Notes">
              <input className={fieldClass} value={a.communication_notes ?? ""} onChange={(e) => handleUpdateField(a.id, { communication_notes: e.target.value || null })} />
            </FieldRow>

            {/* Technical - Assignment level */}
            <SectionLabel>Technical Details</SectionLabel>
            <FieldRow label="Req. Quality">
              <input className={fieldClass} value={a.quality ?? ""} onChange={(e) => handleUpdateField(a.id, { quality: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Req. Audio">
              <input className={fieldClass} value={a.audio ?? ""} onChange={(e) => handleUpdateField(a.id, { audio: e.target.value || null })} />
            </FieldRow>

            {/* Primary Endpoint */}
            <SectionLabel>Primary Endpoint</SectionLabel>
            <FieldRow label="Protocol">
              <select className={selectField} value={(primaryEp as any).protocol ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { protocol: e.target.value || null })}>
                <option value="">—</option>
                {PROTOCOLS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Host / IP">
              <input className={fieldClass} value={(primaryEp as any).host ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { host: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="StreamKey/Port">
              <input className={fieldClass} value={(primaryEp as any).stream_key ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { stream_key: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="User / StreamID">
              <input className={fieldClass} value={(primaryEp as any).username ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { username: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Password">
              <input type="password" className={fieldClass} value={(primaryEp as any).password ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "primary", { password: e.target.value || null })} />
            </FieldRow>

            {/* Backup Endpoint */}
            <SectionLabel>Backup Endpoint</SectionLabel>
            <FieldRow label="Host / IP">
              <input className={fieldClass} value={(backupEp as any).host ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { host: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="StreamKey/Port">
              <input className={fieldClass} value={(backupEp as any).stream_key ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { stream_key: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="User / StreamID">
              <input className={fieldClass} value={(backupEp as any).username ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { username: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Password">
              <input type="password" className={fieldClass} value={(backupEp as any).password ?? ""} onChange={(e) => handleUpdateEndpoint(a.id, "backup", { password: e.target.value || null })} />
            </FieldRow>

            {/* Testing */}
            <SectionLabel>Testing</SectionLabel>
            <FieldRow label="Status">
              <select
                className={`${selectField} font-semibold ${status.color} rounded`}
                value={a.test_status}
                onChange={(e) => handleUpdateField(a.id, { test_status: e.target.value as TestStatus })}
              >
                {TEST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.dot} {s.label}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Tested By">
              <input className={fieldClass} value={a.tested_by ?? ""} onChange={(e) => handleUpdateField(a.id, { tested_by: e.target.value || null })} />
            </FieldRow>
            <FieldRow label="Test Date">
              <input type="datetime-local" className={fieldClass} value={a.test_datetime ? a.test_datetime.slice(0, 16) : ""} onChange={(e) => handleUpdateField(a.id, { test_datetime: e.target.value ? new Date(e.target.value).toISOString() : null })} />
            </FieldRow>
            <FieldRow label="Test Notes">
              <input className={fieldClass} value={a.test_notes ?? ""} onChange={(e) => handleUpdateField(a.id, { test_notes: e.target.value || null })} />
            </FieldRow>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card shrink-0">
        <span className="text-xs font-semibold">MCR Overview</span>
        <span className="ml-auto text-[10px] text-muted-foreground">{allBookings.length} events total</span>
      </div>
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {renderSection("Today", "today", grouped.today, "text-primary")}
            {renderSection("Upcoming", "upcoming", grouped.upcoming, "text-foreground")}
          </>
        )}
      </div>
      {renderTakerDetailDialog()}
      {selectedBta && (
        <Dialog open={!!selectedBta} onOpenChange={() => setSelectedBta(null)}>
          <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm">
                <span>{selectedBta.test_status === "tested" ? "🟢" : "🔴"}</span>
                <span>{selectedBta.taker_name || selectedBta.taker_channel_map_label || "Taker"}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1 text-[11px]">
              {[
                ["Name", selectedBta.taker_name || selectedBta.taker_channel_map_label],
                ["Protocol", selectedBta.taker_protocol],
                ["Host", selectedBta.taker_host],
                ["Stream Key", selectedBta.taker_stream_key],
                ["Audio", selectedBta.taker_audio],
                ["Email/Contact", selectedBta.taker_email_subject],
                ["Channel ID", selectedBta.actual_channel_id],
                ["Test Status", (selectedBta.test_status || "not_tested").replace(/_/g, " ")],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[120px_1fr] gap-2 py-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
                  <span>{value || "—"}</span>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
