

## Client Booking Portal — MVP Plan

### Overview
Create a public client-facing page where takers can view available games (based on league tags) and auto-assign themselves via a unique shareable link. No login required.

### Data Model Changes

**New table: `league_taker_tags`**
- `id` (uuid, PK)
- `league_id` (uuid, references leagues)
- `taker_channel_map_id` (uuid, references taker_channel_maps)
- `created_at` (timestamptz)

This links leagues to taker channel maps — "these games are available for this taker/channel."

**New table: `client_access_tokens`**
- `id` (uuid, PK)
- `taker_channel_map_id` (uuid, references taker_channel_maps)
- `token` (text, unique) — short random string for URL
- `active` (boolean, default true)
- `created_at` (timestamptz)

Each token generates a URL like `/client/<token>`.

### Admin UI — League Taker Tagging
In the Admin section, add a "Client Access" tab with:
1. A table of taker channel maps, each with a "Generate Link" button to create/view the access token URL
2. Per-taker-channel-map: a multi-select to tag which leagues are available to them

### Client Page (`/client/:token`)
A standalone page (no nav bar) that:
1. Looks up the token → resolves to a `taker_channel_map_id`
2. Fetches all leagues tagged for this taker via `league_taker_tags`
3. Fetches today + upcoming MCR bookings for those leagues
4. Displays a clean table: Date, Time, League, Event Name, with a "Book" button per row
5. "Book" auto-creates a `booking_taker_assignment` row (next available slot) for that booking + taker
6. Already-booked games show a "Booked" badge instead

### Technical Details

**Files to create:**
- `src/pages/ClientPortal.tsx` — the public client view
- `src/hooks/useClientPortal.ts` — data fetching for the portal (token lookup, available games, booking action)

**Files to modify:**
- `src/App.tsx` — add route `/client/:token`
- `src/pages/AdminPage.tsx` — add "Client Access" management tab
- `src/hooks/useLookups.ts` — add hooks for `league_taker_tags` and `client_access_tokens`

**Database migrations:**
- Create `league_taker_tags` table with public RLS policies
- Create `client_access_tokens` table with public RLS policies

**No authentication required** — public RLS policies match the existing pattern in this project.

