

## PM View for ADV Categories

### What it is
A condensed, one-row-per-event view for Project Managers working with advanced categories (ONE-OFF, ATP). Instead of the full spreadsheet-style expanded view, the PM sees a flat table similar to the MCR BookingsGrid — each event is a single row with only the fields a PM needs.

### PM fields per row
- **Event** (editable inline)
- **Date** (editable)
- **Time CET** (editable)
- **Source** (editable)
- **Notes** (editable)
- **Takers** — for each taker assignment: taker name + email subject + communication notes, displayed in fixed-width divided cells (like MCR taker cells)

### How it works
1. Add a view toggle in `AdvancedCategoryView.tsx` — two modes: "Full View" (current spreadsheet) and "PM View" (condensed table)
2. Create a new component `src/components/PMBookingView.tsx` — a simple HTML table rendering one row per booking with the PM-relevant columns
3. Each taker assignment column shows: taker name (bold), email subject (small text), notes (small text) — stacked vertically in a fixed-width cell with border dividers, matching MCR taker cell styling
4. All fields are inline-editable (inputs on click/focus), using the same local-state-buffer pattern for performance

### Technical details

**New file: `src/components/PMBookingView.tsx`**
- Receives `bookings: Booking[]` and renders a flat `<table>`
- Fetches `taker_assignments` for all visible bookings using `useTakerAssignments`
- Uses `useTakers` for name resolution
- Columns: Event | Date | Time CET | Source | Notes | Taker 1 | Taker 2 | Taker 3
- Each taker cell: name, email subject, comm notes — vertically stacked, 150px fixed width, border-separated
- Inline editing with blur-to-save pattern

**Modified file: `src/components/AdvancedCategoryView.tsx`**
- Add a toggle button (e.g., "PM View" / "Full View") in the top bar next to "Add Event"
- When PM View is active, render `<PMBookingView>` instead of mapping individual `<AdvancedBookingView>` components
- State stored in component: `const [viewMode, setViewMode] = useState<"full" | "pm">("full")`

### Styling
- Matches MCR grid density: small fonts (11-12px), compact row height (~40px), minimal padding
- Taker cells have fixed width with visible vertical borders between each taker
- Header row with muted background

