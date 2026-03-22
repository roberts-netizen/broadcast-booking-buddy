import React, { useState, useMemo, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { AgGridReact } from "ag-grid-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type CellValueChangedEvent,
  type CellEditingStartedEvent,
  type GridReadyEvent,
  type GridApi,
  type ICellRendererParams,
  themeQuartz,
} from "ag-grid-community";
import { Plus, ClipboardPaste } from "lucide-react";
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, Booking } from "@/hooks/useBookings";
import { useLeagues, useIncomingChannels, useTakerChannelMaps } from "@/hooks/useLookups";
import { useBookingTakerAssignments, BookingTakerAssignment } from "@/hooks/useBookingTakerAssignments";
import { TakersCell } from "@/components/TakersCell";
import BookingFilters from "./BookingFilters";
import BulkPasteDialog, { type BulkColumn } from "@/components/BulkPasteDialog";
import { DateToCell } from "./DateToCell";
import { ReportCell } from "./ReportCell";
import { useBookingReports, useUpsertBookingReport, useDeleteBookingReport, BookingReport } from "@/hooks/useBookingReports";
import { SearchableCellEditor } from "@/components/SearchableCellEditor";
import { SearchableSelect } from "@/components/SearchableSelect";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Helpers ──────────────────────────────────────────────────────────────────
const BULK_IMPORT_COLUMNS = ["date", "gmt_time", "cet_time", "league_name", "event_name", "channel_name", "work_order_id"] as const;

function addOneHour(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

function normalizeDate(value: string): string {
  const v = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const dmy = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return v;
}

function extractRowsFromRawText(raw: string): string[][] {
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("\t"));

  if (rows.some((r) => r.length > 1)) return rows;

  const compactRows: string[][] = [];
  const compactPattern = /(\d{2}\/\d{2}\/\d{4})\s*(\d{2}:\d{2})\s*([\s\S]*?)\s*(\d{2}:\d{2})\s*([\s\S]*?)\s*([A-Za-z]{2,}-\d+)(?=\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}|$)/g;

  for (const match of raw.matchAll(compactPattern)) {
    compactRows.push([
      match[1]?.trim() ?? "",
      match[2]?.trim() ?? "",
      match[4]?.trim() ?? "",
      match[3]?.trim() ?? "",
      match[5]?.trim() ?? "",
      "",
      match[6]?.trim() ?? "",
    ]);
  }

  return compactRows.length > 0 ? compactRows : rows;
}

// ── Custom theme ─────────────────────────────────────────────────────────────
const gridTheme = themeQuartz.withParams({
  fontSize: 12,
  headerFontSize: 11,
  rowHeight: 44,
  headerHeight: 34,
  cellHorizontalPadding: 8,
  spacing: 2,
  borderRadius: 0,
  wrapperBorderRadius: 0,
});

// ── Takers cell renderer ─────────────────────────────────────────────────────
function TakersCellRenderer(props: ICellRendererParams) {
  const { bookingId, bookingLabel, assignments, takerChannelMaps } = props.data?._takersProps ?? {};
  if (!bookingId) return null;
  return (
    <TakersCell
      bookingId={bookingId}
      bookingLabel={bookingLabel}
      assignments={assignments}
      takerChannelMaps={takerChannelMaps}
    />
  );
}

// ── Confirmation cell renderer ───────────────────────────────────────────────
function ConfirmationRenderer(props: ICellRendererParams) {
  const wo = props.data?.work_order_id ?? "";
  if (!wo.trim()) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[hsl(var(--confirmation-yes))] font-semibold text-xs">
      ✓ yes
    </span>
  );
}

// ── Delete cell renderer ─────────────────────────────────────────────────────
function DeleteRenderer(props: ICellRendererParams & { onDelete: (id: string) => void }) {
  if (!props.data?.id) return null;
  return (
    <button
      onClick={() => {
        if (window.confirm("Delete this event?")) {
          props.onDelete(props.data.id);
        }
      }}
      className="opacity-30 hover:opacity-100 hover:text-destructive text-muted-foreground transition-all p-0.5"
      title="Delete booking"
    >
      🗑
    </button>
  );
}

// ── Main Grid ────────────────────────────────────────────────────────────────
export default function BookingsGrid({ category, onBookingClick, highlightBookingId, onHighlightHandled }: { category?: string; onBookingClick?: (booking: Booking) => void; highlightBookingId?: string | null; onHighlightHandled?: () => void }) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [view, setView] = useState<"today" | "upcoming" | "past">("today");
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    leagueId?: string;
  }>({});
  const [bulkOpen, setBulkOpen] = useState(false);

  // ── Undo stack ──
  type UndoEntry = { id: string; field: string; oldValue: any };
  const undoStackRef = useRef<UndoEntry[]>([]);

  // Derive effective filters based on view
  const effectiveFilters = useMemo(() => {
    const base = { ...filters, tournamentType: category };
    if (view === "today") {
      const today = new Date().toISOString().split("T")[0];
      return { ...base, dateFrom: today, dateTo: today };
    }
    if (view === "upcoming") {
      const today = new Date().toISOString().split("T")[0];
      return { ...base, dateFrom: today };
    }
    if (view === "past") {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      return { ...base, dateTo: yesterday };
    }
    return base;
  }, [view, filters, category]);

  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading } = useBookings(effectiveFilters);
  const { data: leagues = [] } = useLeagues(true);
  const { data: channels = [] } = useIncomingChannels(true);
  const { data: takerChannelMaps = [] } = useTakerChannelMaps(true);

  // ── Highlight booking from MCR shortcut ──
  useEffect(() => {
    if (!highlightBookingId || !gridApi) return;
    setView("upcoming");
  }, [highlightBookingId, gridApi]);

  useEffect(() => {
    if (!highlightBookingId || !gridApi || view !== "upcoming") return;
    setTimeout(() => {
      const rowNode = gridApi.getRowNode(highlightBookingId);
      if (rowNode) {
        gridApi.ensureNodeVisible(rowNode, "middle");
        gridApi.flashCells({ rowNodes: [rowNode] });
      }
      onHighlightHandled?.();
    }, 500);
  }, [highlightBookingId, gridApi, view, bookings, onHighlightHandled]);

  const bookingIds = useMemo(() => bookings.map((b) => b.id), [bookings]);
  const { data: allAssignments = [] } = useBookingTakerAssignments(bookingIds);
  const { data: allReports = [] } = useBookingReports(bookingIds);
  const upsertReport = useUpsertBookingReport();
  const deleteReport = useDeleteBookingReport();

  const assignmentMap = useMemo(() => {
    const map: Record<string, BookingTakerAssignment[]> = {};
    for (const a of allAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [allAssignments]);

  const reportMap = useMemo(() => {
    const map: Record<string, BookingReport> = {};
    for (const r of allReports) map[r.booking_id] = r;
    return map;
  }, [allReports]);

  // Get or create the default tournament ID for non-MCR categories
  const { data: categoryTournaments = [], refetch: refetchTournaments } = useQuery({
    queryKey: ["tournaments-for-category", category],
    queryFn: async () => {
      if (!category || category === "MCR") return [];
      const { data, error } = await supabase
        .from("tournaments")
        .select("id")
        .eq("type", category)
        .limit(1);
      if (error) throw error;
      // Auto-create a default tournament if none exists
      if (!data || data.length === 0) {
        const { data: newT, error: createErr } = await supabase
          .from("tournaments")
          .insert({ name: `${category} Default`, type: category })
          .select("id")
          .single();
        if (createErr) throw createErr;
        return [newT];
      }
      return data;
    },
    enabled: !!category && category !== "MCR",
  });
  const defaultTournamentId = categoryTournaments?.[0]?.id ?? null;

  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  const typedTakerMaps = useMemo(
    () => (takerChannelMaps as any[]).map((t) => ({
      id: t.id as string,
      label: t.label as string,
      actual_channel_id: t.actual_channel_id as string,
      taker_id: (t.taker_id ?? null) as string | null,
    })),
    [takerChannelMaps]
  );

  // Lookup maps for display
  const leagueMap = useMemo(() => Object.fromEntries(leagues.map((l) => [l.id, l.name])), [leagues]);
  const channelMap = useMemo(() => Object.fromEntries(channels.map((c) => [c.id, c.name])), [channels]);
  // Reverse maps for paste (name → id)
  const leagueNameToId = useMemo(() => Object.fromEntries(leagues.map((l) => [l.name.toLowerCase(), l.id])), [leagues]);
  const channelNameToId = useMemo(() => Object.fromEntries(channels.map((c) => [c.name.toLowerCase(), c.id])), [channels]);

  // ── Compute date group index for alternating colors ──
  const dateGroupMap = useMemo(() => {
    const uniqueDates = [...new Set(bookings.map((b) => b.date))].sort();
    const map: Record<string, number> = {};
    uniqueDates.forEach((d, i) => (map[d] = i % 4));
    return map;
  }, [bookings]);

  // ── Row data with taker props injected ──
  const rowData = useMemo(
    () =>
      bookings.map((b) => ({
        ...b,
        gmt_time: formatTime(b.gmt_time),
        cet_time: formatTime(b.cet_time) || addOneHour(formatTime(b.gmt_time)),
        league_name: b.league_id ? leagueMap[b.league_id] ?? "" : "",
        channel_name: b.incoming_channel_id ? channelMap[b.incoming_channel_id] ?? "" : "",
        _dateGroup: dateGroupMap[b.date] ?? 0,
        _report: reportMap[b.id] ?? null,
        _takersProps: {
          bookingId: b.id,
          bookingLabel: b.event_name || b.date,
          assignments: assignmentMap[b.id] ?? [],
          takerChannelMaps: typedTakerMaps,
        },
      })),
    [bookings, leagueMap, channelMap, assignmentMap, typedTakerMaps, dateGroupMap, reportMap]
  );

  const saveLeagueValue = useCallback(
    async (bookingId: string, rawName: string) => {
      const name = rawName.trim();

      if (!name) {
        updateBooking.mutate({ id: bookingId, league_id: null });
        return;
      }

      const existingId = leagueNameToId[name.toLowerCase()];
      if (existingId) {
        updateBooking.mutate({ id: bookingId, league_id: existingId });
        return;
      }

      const { data: newLeague, error } = await supabase
        .from("leagues")
        .insert({ name, active: true })
        .select("id")
        .single();

      if (!error && newLeague) {
        queryClient.invalidateQueries({ queryKey: ["leagues"] });
        updateBooking.mutate({ id: bookingId, league_id: newLeague.id });
      }
    },
    [leagueNameToId, queryClient, updateBooking]
  );

  const saveChannelValue = useCallback(
    async (bookingId: string, rawName: string) => {
      const name = rawName.trim();

      if (!name) {
        updateBooking.mutate({ id: bookingId, incoming_channel_id: null });
        return;
      }

      const existingId = channelNameToId[name.toLowerCase()];
      if (existingId) {
        updateBooking.mutate({ id: bookingId, incoming_channel_id: existingId });
        return;
      }

      const { data: newChannel, error } = await supabase
        .from("incoming_channels")
        .insert({ name, active: true })
        .select("id")
        .single();

      if (!error && newChannel) {
        queryClient.invalidateQueries({ queryKey: ["incoming_channels"] });
        updateBooking.mutate({ id: bookingId, incoming_channel_id: newChannel.id });
      }
    },
    [channelNameToId, queryClient, updateBooking]
  );

  // ── Column defs ──
  const columnDefs = useMemo<ColDef[]>(
    () => {
      const isMCR = category === "MCR" || !category;
      const cols: ColDef[] = [
        {
          headerName: "Date",
          field: "date",
          width: 95,
          suppressSizeToFit: true,
          editable: true,
          cellDataType: "dateString",
        },
        ...(!isMCR
          ? [
              {
                headerName: "Date To",
                field: "date_to",
                width: 140,
                editable: false,
                sortable: false,
                cellRenderer: (params: ICellRendererParams) => {
                  if (!params.data?.id) return null;
                  return (
                    <DateToCell
                      value={params.data.date_to ?? null}
                      onChange={(val: string | null) => {
                        updateBooking.mutate({ id: params.data.id, date_to: val });
                      }}
                    />
                  );
                },
                cellStyle: { padding: 0, display: "flex", alignItems: "center" },
              } as ColDef,
            ]
          : []),
        {
          headerName: "GMT",
          field: "gmt_time",
          width: 65,
          suppressSizeToFit: true,
          editable: true,
        },
        {
          headerName: "CET",
          field: "cet_time",
          width: 65,
          suppressSizeToFit: true,
          editable: true,
        },
        {
          headerName: "League",
          field: "league_name",
          width: 110,
          suppressSizeToFit: true,
          resizable: false,
          editable: false,
          cellRenderer: (params: ICellRendererParams) => {
            if (!params.data?.id) return null;
            const bookingId = params.data.id as string;
            const rowNode = params.node;
            const currentValue = (params.value as string) ?? "";
            return (
              <SearchableSelect
                options={leagues.map((l) => ({ value: l.name, label: l.name }))}
                value={currentValue}
                onChange={(next) => {
                  rowNode?.setDataValue("league_name", next);
                  void saveLeagueValue(bookingId, next);
                }}
                freeText
                compact
                placeholder="—"
                className="w-full"
              />
            );
          },
          cellStyle: { padding: 0, display: "flex", alignItems: "center" },
        },
        {
          headerName: "Event Name",
          field: "event_name",
          flex: 1,
          minWidth: 180,
          editable: true,
        },
        {
          headerName: "Incoming Ch.",
          field: "channel_name",
          width: 130,
          suppressSizeToFit: true,
          resizable: false,
          editable: false,
          cellRenderer: (params: ICellRendererParams) => {
            if (!params.data?.id) return null;
            const bookingId = params.data.id as string;
            const rowNode = params.node;
            const currentValue = (params.value as string) ?? "";
            return (
              <SearchableSelect
                options={channels.map((c) => ({ value: c.name, label: c.name }))}
                value={currentValue}
                onChange={(next) => {
                  rowNode?.setDataValue("channel_name", next);
                  void saveChannelValue(bookingId, next);
                }}
                freeText
                compact
                placeholder="—"
                className="w-full"
              />
            );
          },
          cellStyle: { padding: 0, display: "flex", alignItems: "center" },
        },
        {
          headerName: "Work Order",
          field: "work_order_id",
          width: 110,
          suppressSizeToFit: true,
          resizable: false,
          editable: true,
        },
        {
          headerName: "Conf.",
          width: 65,
          suppressSizeToFit: true,
          resizable: false,
          editable: false,
          cellRenderer: ConfirmationRenderer,
          sortable: false,
          filter: false,
        },
        {
          headerName: "Report",
          width: 65,
          editable: false,
          sortable: false,
          filter: false,
          cellRenderer: (params: ICellRendererParams) => {
            if (!params.data?.id) return null;
            const report = params.data._report;
            return (
              <ReportCell
                impactLevel={report?.impact_level ?? null}
                description={report?.description ?? ""}
                onSave={(impact, desc) =>
                  upsertReport.mutate({
                    booking_id: params.data.id,
                    impact_level: impact,
                    description: desc,
                  })
                }
                onClear={() => deleteReport.mutate(params.data.id)}
              />
            );
          },
          cellStyle: { padding: 0, display: "flex", alignItems: "center" },
        },
        {
          headerName: "Takers",
          width: 520,
          editable: false,
          cellRenderer: TakersCellRenderer,
          sortable: false,
          filter: false,
          autoHeight: false,
          cellStyle: { padding: 0, display: "flex", alignItems: "center" },
        },
        {
          headerName: "",
          width: 40,
          editable: false,
          sortable: false,
          filter: false,
          cellRenderer: DeleteRenderer,
          cellRendererParams: {
            onDelete: (id: string) => deleteBooking.mutate(id),
          },
        },
      ];
      return cols;
    },
    [leagues, channels, deleteBooking, category, updateBooking, upsertReport, deleteReport, saveLeagueValue, saveChannelValue]
  );

  // ── Handle cell value changes → save to DB ──
  const onCellValueChanged = useCallback(
    async (event: CellValueChangedEvent) => {
      const data = event.data;
      if (!data?.id) return;

      const field = event.colDef.field;
      if (!field) return;

      if (field === "league_name" || field === "channel_name") return;

      // Push to undo stack
      undoStackRef.current.push({ id: data.id, field, oldValue: event.oldValue });

      const updates: Partial<Booking> = {};

      if (field === "gmt_time") {
        updates.gmt_time = event.newValue;
        if (event.newValue) {
          updates.cet_time = addOneHour(event.newValue);
        }
      } else if (field === "cet_time") {
        updates.cet_time = event.newValue;
      } else if (field === "date_to") {
        updates.date_to = event.newValue || null;
      } else {
        (updates as any)[field] = event.newValue;
      }

      updateBooking.mutate({ id: data.id, ...updates });
    },
    [updateBooking]
  );

  // ── Undo handler (Ctrl+Z) ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        const entry = undoStackRef.current.pop();
        if (!entry || !gridApi) return;
        e.preventDefault();

        // Update the grid cell visually
        const rowNode = gridApi.getRowNode(entry.id);
        if (rowNode) {
          rowNode.setDataValue(entry.field, entry.oldValue);
          // setDataValue triggers onCellValueChanged which saves to DB
          // but we need to remove the undo entry it just pushed (to avoid infinite loop)
          undoStackRef.current.pop();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gridApi]);

  // ── Add new row ──
  const handleAddRow = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    const payload: Partial<Booking> & { tournament_id?: string | null } = {
      date: today,
      gmt_time: "00:00",
      cet_time: "01:00",
      event_name: "",
      work_order_id: "",
    };
    if (category && category !== "MCR" && defaultTournamentId) {
      (payload as any).tournament_id = defaultTournamentId;
    }
    createBooking.mutate(payload);
  }, [createBooking, category, defaultTournamentId]);

  // ── Paste handler for multi-row paste via AG Grid + inline editor fallback ──
  const importRowsFromClipboard = useCallback(
    async (rawRows: string[][]) => {
      const rows = rawRows.filter((r) => r.some((c) => c.trim()));
      if (!rows.length) return false;

      // Build a cache of new leagues/channels to avoid duplicate inserts
      const newLeagueCache: Record<string, string> = {};
      const newChannelCache: Record<string, string> = {};

      for (const cells of rows) {
        const row: Partial<Booking> = {
          date: new Date().toISOString().split("T")[0],
          gmt_time: "00:00",
          cet_time: "01:00",
          event_name: "",
          work_order_id: "",
        };

        for (let i = 0; i < BULK_IMPORT_COLUMNS.length; i++) {
          const col = BULK_IMPORT_COLUMNS[i];
          const val = cells[i]?.trim() ?? "";
          if (!val) continue;

          if (col === "date") {
            row.date = normalizeDate(val);
          } else if (col === "league_name") {
            const key = val.toLowerCase();
            let id = leagueNameToId[key] ?? newLeagueCache[key];
            if (!id) {
              const { data } = await supabase.from("leagues").insert({ name: val, active: true }).select("id").single();
              if (data) { id = data.id; newLeagueCache[key] = id; }
            }
            row.league_id = id ?? null;
          } else if (col === "channel_name") {
            const key = val.toLowerCase();
            let id = channelNameToId[key] ?? newChannelCache[key];
            if (!id) {
              const { data } = await supabase.from("incoming_channels").insert({ name: val, active: true }).select("id").single();
              if (data) { id = data.id; newChannelCache[key] = id; }
            }
            row.incoming_channel_id = id ?? null;
          } else if (col === "gmt_time") {
            row.gmt_time = val.slice(0, 5);
            if (!cells[2]?.trim()) row.cet_time = addOneHour(val.slice(0, 5));
          } else if (col === "cet_time") {
            row.cet_time = val.slice(0, 5);
          } else {
            (row as any)[col] = val;
          }
        }

        if (category && category !== "MCR" && defaultTournamentId) {
          (row as any).tournament_id = defaultTournamentId;
        }
        createBooking.mutate(row);
      }

      queryClient.invalidateQueries({ queryKey: ["leagues"] });
      queryClient.invalidateQueries({ queryKey: ["incoming_channels"] });
      return true;
    },
    [createBooking, leagueNameToId, channelNameToId, category, defaultTournamentId, queryClient]
  );

  const processDataFromClipboard = useCallback(
    (params: { data: string[][] }): string[][] | null => {
      const raw = params.data.map((r) => r.join("\t")).join("\n");
      const rows = extractRowsFromRawText(raw);
      if (rows.filter((r) => r.some((c) => c.trim())).length <= 1) return params.data;

      importRowsFromClipboard(rows);
      return null;
    },
    [importRowsFromClipboard]
  );

  useEffect(() => {
    const handleEditorPaste = (e: ClipboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      const inGrid = !!active.closest(".ag-root-wrapper");
      if (!inGrid) return;

      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (!text) return;

      const rows = extractRowsFromRawText(text).filter((r) => r.some((c) => c.trim()));
      if (rows.length <= 1) return;

      e.preventDefault();
      e.stopPropagation();
      importRowsFromClipboard(rows);
    };

    document.addEventListener("paste", handleEditorPaste, true);
    return () => document.removeEventListener("paste", handleEditorPaste, true);
  }, [importRowsFromClipboard]);

  // ── Excel-like copy with HTML formatting ──
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return;

      const gridEl = document.querySelector(".ag-root-wrapper");
      if (!gridEl) return;

      const range = sel.getRangeAt(0);
      if (!gridEl.contains(range.commonAncestorContainer)) return;

      const rows: { cells: { text: string; bg: string }[] }[] = [];
      const agRows = gridEl.querySelectorAll(".ag-row");

      agRows.forEach((rowEl) => {
        const cells: { text: string; bg: string }[] = [];
        const cellEls = rowEl.querySelectorAll(".ag-cell");
        let rowHasSelection = false;

        cellEls.forEach((cellEl) => {
          if (sel.containsNode(cellEl, true)) {
            rowHasSelection = true;
            const text = (cellEl as HTMLElement).innerText?.trim() ?? "";
            const bg = getComputedStyle(rowEl).backgroundColor ?? "";
            cells.push({ text, bg });
          }
        });

        if (rowHasSelection && cells.length > 0) {
          rows.push({ cells });
        }
      });

      if (rows.length === 0) return;

      e.preventDefault();

      const plainText = rows.map((r) => r.cells.map((c) => c.text).join("\t")).join("\n");

      const htmlRows = rows
        .map((r) => {
          const tds = r.cells
            .map(
              (c) =>
                `<td style="border:1px solid #ddd;padding:4px 8px;font-family:Arial,sans-serif;font-size:12px;${
                  c.bg ? `background-color:${c.bg};` : ""
                }">${c.text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</td>`
            )
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      const html = `<table style="border-collapse:collapse;border:1px solid #ccc;">${htmlRows}</table>`;

      e.clipboardData?.setData("text/plain", plainText);
      e.clipboardData?.setData("text/html", html);
    };

    document.addEventListener("copy", handleCopy, true);
    return () => document.removeEventListener("copy", handleCopy, true);
  }, []);

  // ── Column resize persistence ──
  const COLUMN_WIDTH_KEY = `col-widths-${category ?? "default"}`;

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
    // Restore saved column widths
    try {
      const saved = localStorage.getItem(COLUMN_WIDTH_KEY);
      if (saved) {
        const widths: Record<string, number> = JSON.parse(saved);
        const colState = params.api.getColumnState().map((col) => {
          if (widths[col.colId] != null) {
            return { ...col, width: widths[col.colId], flex: null };
          }
          return col;
        });
        params.api.applyColumnState({ state: colState });
      }
    } catch {}
  }, [COLUMN_WIDTH_KEY]);

  const onColumnResized = useCallback((e: any) => {
    if (!e.finished || !e.api) return;
    const widths: Record<string, number> = {};
    e.api.getColumnState().forEach((col: any) => {
      if (col.width) widths[col.colId] = col.width;
    });
    localStorage.setItem(COLUMN_WIDTH_KEY, JSON.stringify(widths));
  }, [COLUMN_WIDTH_KEY]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      suppressMovable: true,
      singleClickEdit: true,
    }),
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* View toggle + filters */}
      <div className="flex items-center gap-0 border-b border-border bg-card shrink-0">
        <div className="flex items-center h-full">
          <button
            onClick={() => setView("today")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              view === "today"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Today's Events
          </button>
          <button
            onClick={() => setView("upcoming")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              view === "upcoming"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Upcoming Events
          </button>
          <button
            onClick={() => setView("past")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              view === "past"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Past Events
          </button>
        </div>
        <BookingFilters leagues={leagues} filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 overflow-hidden">
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          processDataFromClipboard={processDataFromClipboard}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onColumnResized={onColumnResized}
          onCellValueChanged={onCellValueChanged}
          onRowDoubleClicked={onBookingClick ? (e: any) => {
            if (e.data?.id) {
              const { _takersProps, _dateGroup, _report, league_name, channel_name, ...booking } = e.data;
              onBookingClick(booking);
            }
          } : undefined}
          getRowId={(params) => params.data.id}
          getRowStyle={(params) => {
            const group = params.data?._dateGroup ?? 0;
            return {
              backgroundColor: `hsl(var(--date-group-${group}))`,
            };
          }}
          animateRows={false}
          enableCellTextSelection={true}
          ensureDomOrder={true}
          suppressRowHoverHighlight={false}
          enterNavigatesVertically={true}
          enterNavigatesVerticallyAfterEdit={true}
          tabToNextCell={(params) => params.nextCellPosition}
          loading={isLoading}
          noRowsOverlayComponent={() => (
            <div className="text-muted-foreground text-sm py-10">
              No bookings found. Add one below or paste from a spreadsheet.
            </div>
          )}
        />
      </div>

      <div className="border-t border-border p-2 shrink-0 flex items-center gap-4">
        <button
          onClick={handleAddRow}
          disabled={createBooking.isPending}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add booking
        </button>
        <button
          onClick={() => setBulkOpen(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ClipboardPaste className="h-3.5 w-3.5" />
          Bulk Import
        </button>
      </div>

      <BulkPasteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Bookings"
        columns={[
          { key: "date", label: "Date", required: true },
          { key: "gmt_time", label: "GMT" },
          { key: "cet_time", label: "CET" },
          { key: "league_name", label: "League" },
          { key: "event_name", label: "Event", required: true },
          { key: "channel_name", label: "Incoming Channel" },
          { key: "work_order_id", label: "WO" },
        ]}
        onImport={async (rows) => {
          const mapped = rows.map((r) => r as unknown as string[]);
          const rawRows = rows.map((r) => [
            r.date ?? "",
            r.gmt_time ?? "",
            r.cet_time ?? "",
            r.league_name ?? "",
            r.event_name ?? "",
            r.channel_name ?? "",
            r.work_order_id ?? "",
          ]);
          importRowsFromClipboard(rawRows);
        }}
      />
    </div>
  );
}
