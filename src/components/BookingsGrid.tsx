import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
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
import { Plus } from "lucide-react";
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking, Booking } from "@/hooks/useBookings";
import { useLeagues, useIncomingChannels, useTakerChannelMaps } from "@/hooks/useLookups";
import { useBookingTakerAssignments, BookingTakerAssignment } from "@/hooks/useBookingTakerAssignments";
import { TakersCell } from "@/components/TakersCell";
import BookingFilters from "./BookingFilters";
import { DateToCell } from "./DateToCell";
import { ReportCell } from "./ReportCell";
import { useBookingReports, useUpsertBookingReport, useDeleteBookingReport, BookingReport } from "@/hooks/useBookingReports";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── Helpers ──────────────────────────────────────────────────────────────────
function addOneHour(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return `${String((h + 1) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
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
      onClick={() => props.onDelete(props.data.id)}
      className="opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-all p-0.5"
      title="Delete booking"
    >
      🗑
    </button>
  );
}

// ── Main Grid ────────────────────────────────────────────────────────────────
export default function BookingsGrid({ category }: { category?: string }) {
  const gridRef = useRef<AgGridReact>(null);
  const [gridApi, setGridApi] = useState<GridApi | null>(null);
  const [view, setView] = useState<"today" | "full">("today");
  const [filters, setFilters] = useState<{
    dateFrom?: string;
    dateTo?: string;
    leagueId?: string;
  }>({});

  // Derive effective filters based on view
  const effectiveFilters = useMemo(() => {
    const base = { ...filters, tournamentType: category };
    if (view === "today") {
      const today = new Date().toISOString().split("T")[0];
      return { ...base, dateFrom: today, dateTo: today };
    }
    return base;
  }, [view, filters, category]);

  const { data: bookings = [], isLoading } = useBookings(effectiveFilters);
  const { data: leagues = [] } = useLeagues(true);
  const { data: channels = [] } = useIncomingChannels(true);
  const { data: takerChannelMaps = [] } = useTakerChannelMaps(true);

  const bookingIds = useMemo(() => bookings.map((b) => b.id), [bookings]);
  const { data: allAssignments = [] } = useBookingTakerAssignments(bookingIds);

  const assignmentMap = useMemo(() => {
    const map: Record<string, BookingTakerAssignment[]> = {};
    for (const a of allAssignments) {
      if (!map[a.booking_id]) map[a.booking_id] = [];
      map[a.booking_id].push(a);
    }
    return map;
  }, [allAssignments]);

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
    uniqueDates.forEach((d, i) => (map[d] = i % 2));
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
        _takersProps: {
          bookingId: b.id,
          bookingLabel: b.event_name || b.date,
          assignments: assignmentMap[b.id] ?? [],
          takerChannelMaps: typedTakerMaps,
        },
      })),
    [bookings, leagueMap, channelMap, assignmentMap, typedTakerMaps, dateGroupMap]
  );

  // ── Column defs ──
  const columnDefs = useMemo<ColDef[]>(
    () => [
      {
        headerName: "Date",
        field: "date",
        width: 120,
        editable: true,
        cellDataType: "dateString",
      },
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
              onChange={(val) => {
                updateBooking.mutate({ id: params.data.id, date_to: val });
              }}
            />
          );
        },
        cellStyle: { padding: 0, display: "flex", alignItems: "center" },
      },
      {
        headerName: "GMT",
        field: "gmt_time",
        width: 90,
        editable: true,
      },
      {
        headerName: "CET",
        field: "cet_time",
        width: 90,
        editable: true,
      },
      {
        headerName: "League",
        field: "league_name",
        width: 130,
        editable: true,
        cellEditorPopup: false,
        cellEditorParams: {
          useFormatter: true,
        },
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
        editable: true,
        cellEditor: "agSelectCellEditor",
        cellEditorParams: {
          values: ["", ...channels.map((c) => c.name)],
        },
      },
      {
        headerName: "Work Order",
        field: "work_order_id",
        width: 110,
        editable: true,
      },
      {
        headerName: "Conf.",
        width: 65,
        editable: false,
        cellRenderer: ConfirmationRenderer,
        sortable: false,
        filter: false,
      },
      {
        headerName: "Takers",
        width: 360,
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
    ],
    [leagues, channels, deleteBooking]
  );

  // ── Handle cell value changes → save to DB ──
  const onCellValueChanged = useCallback(
    (event: CellValueChangedEvent) => {
      const data = event.data;
      if (!data?.id) return;

      const field = event.colDef.field;
      if (!field) return;

      const updates: Partial<Booking> = {};

      if (field === "league_name") {
        const name = event.newValue as string;
        updates.league_id = name ? (leagueNameToId[name.toLowerCase()] ?? null) : null;
      } else if (field === "channel_name") {
        const name = event.newValue as string;
        updates.incoming_channel_id = name ? (channelNameToId[name.toLowerCase()] ?? null) : null;
      } else if (field === "gmt_time") {
        updates.gmt_time = event.newValue;
        // Auto-compute CET if not manually overridden
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
    [updateBooking, leagueNameToId, channelNameToId]
  );

  // ── Add new row ──
  const handleAddRow = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    createBooking.mutate({
      date: today,
      gmt_time: "00:00",
      cet_time: "01:00",
      event_name: "",
      work_order_id: "",
    });
  }, [createBooking]);

  // ── Paste handler for multi-row paste ──
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      if (!text) return;

      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length <= 1) return; // Single cell paste handled by AG Grid

      e.preventDefault();

      // Parse tab-separated rows: Date | GMT | CET | League | Event | Channel | WO
      const cols = ["date", "gmt_time", "cet_time", "league_name", "event_name", "channel_name", "work_order_id"];

      for (const line of lines) {
        const cells = line.split("\t");
        const row: Partial<Booking> = {
          date: new Date().toISOString().split("T")[0],
          gmt_time: "00:00",
          cet_time: "01:00",
          event_name: "",
          work_order_id: "",
        };

        cols.forEach((col, i) => {
          const val = cells[i]?.trim() ?? "";
          if (!val) return;
          if (col === "league_name") {
            row.league_id = leagueNameToId[val.toLowerCase()] ?? null;
          } else if (col === "channel_name") {
            row.incoming_channel_id = channelNameToId[val.toLowerCase()] ?? null;
          } else if (col === "gmt_time") {
            row.gmt_time = val;
            if (!cells[2]?.trim()) row.cet_time = addOneHour(val);
          } else if (col === "cet_time") {
            row.cet_time = val;
          } else {
            (row as any)[col] = val;
          }
        });

        createBooking.mutate(row);
      }
    },
    [createBooking, leagueNameToId, channelNameToId]
  );

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

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
            onClick={() => setView("full")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              view === "full"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Full Events
          </button>
        </div>
        <BookingFilters leagues={leagues} filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 overflow-hidden" onPaste={handlePaste}>
        <AgGridReact
          ref={gridRef}
          theme={gridTheme}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onGridReady={onGridReady}
          onCellValueChanged={onCellValueChanged}
          getRowId={(params) => params.data.id}
          getRowStyle={(params) => {
            const group = params.data?._dateGroup ?? 0;
            return {
              backgroundColor: group === 0
                ? 'hsl(var(--date-group-even))'
                : 'hsl(var(--date-group-odd))',
            };
          }}
          animateRows={false}
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
        <span className="text-[10px] text-muted-foreground">
          Tip: Paste multiple rows from Excel (Date, GMT, CET, League, Event, Channel, WO)
        </span>
      </div>
    </div>
  );
}
