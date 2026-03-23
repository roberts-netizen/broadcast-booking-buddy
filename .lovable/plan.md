

## Fix ADV Taker Table Columns

### Problem
The ADV Taker table currently only shows Name and Status as visible columns, with all other fields hidden in an expandable detail row. The user wants key fields visible as table columns.

### Changes

**File: `src/pages/AdminPage.tsx`**

1. **Update the ADV Taker table header** to show these columns:
   - Name | Email Subject | Communication | Audio 1 | Audio 2 | Protocol | Host/IP | StreamKey | Port | Password/StreamID | Quality | Status | Actions

2. **Update each row** to display these fields inline as cells (not hidden in expandable detail):
   - All fields shown as compact text cells in the table
   - Editing mode: each cell becomes an inline input
   - Expandable detail row kept for backup fields only (2nd Host, 2nd Port, 2nd StreamKey, 2nd User/StreamID, 2nd Password, Settings, Phone)

3. **Update `TAKER_EXTRA_FIELDS`** — split into two arrays:
   - `TAKER_INLINE_FIELDS`: email_subject, communication_method, audio1, audio2, protocol, host, stream_key, port, username, password, quality
   - `TAKER_DETAIL_FIELDS`: phone_number, settings, backup_host, backup_port, backup_stream_key, backup_username, backup_password (shown in expandable row only)

4. **Rename heading** from "Takers Advanced" to "ADV Taker"

5. **Table styling**: compact cells with `text-xs`, horizontal scroll on overflow, fixed min-widths per column for readability.

