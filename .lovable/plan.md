

## Plan: Consolidate Taker Management into Categories

### Goal
Remove the standalone "MCR Taker" and "ADV Taker" tables from the Settings tab. Move all taker pool management into the Categories tab, so each category (MCR, ADV, Custom) manages its own Source/Taker pool via expandable rows. Hogmore stays read-only with no pool management.

### Database Changes

**Add two new columns to `categories` table:**
- `has_source_pool` (boolean, default false) — whether this category manages its own source registry
- `has_taker_pool` (boolean, default true) — whether this category manages its own taker registry

**Migrate existing MCR taker_channel_maps into the `takers` table** scoped to the MCR category:
- For each record in `taker_channel_maps`, insert into `takers` with `category_id` = MCR category ID, mapping `taker_name` → `name`, `label` → `stream_key`, `actual_channel_id` → `host`

### Category Creation Form Changes (`CategoriesAdmin.tsx`)

Add to the create/edit form:
- **Category Type**: MCR / ADV / Hogmore / Custom (existing)
- **View Type**: Standard / Advanced (existing)  
- **Source Pool**: toggle (default off) — "Does this category have its own source registry?"
- **Taker Pool**: toggle (default on) — "Does this category have its own taker registry?"

### Taker Pool in Categories Tab

When expanding a category row:
- **If MCR category type**: show simplified taker pool table with columns: **Taker | CHID | Port/Key | Status** (same structure as old MCR Taker table, but data stored in `takers` table with `category_id`)
- **If ADV/Custom**: show full taker pool table with columns: **Name | Email Subject | Communication | Audio 1 | Audio 2 | Protocol | Host/IP | StreamKey | Port | Password/StreamID | Quality | Status** (same as the current ADV Taker table)
- **If Hogmore**: no expand, no pool management
- Only show expand arrow if `has_taker_pool = true` or `has_source_pool = true`

### AdminPage.tsx Changes

1. **Remove** `TakerChannelMapTable` component (MCR Taker) — lines 160-272
2. **Remove** `TakersTable` component (ADV Taker) — lines 388-657
3. **Remove** related imports (`useTakers`, `useTakerChannelMaps`, etc.) that are only used by those tables
4. Keep `TonybetChannelMapTable` in Settings tab
5. Settings tab grid now shows: Incoming Channels, Leagues, TonyBet only

### CategoriesAdmin.tsx Changes

1. Update `CategoryTakerPool` to render different column layouts based on `category_type`:
   - MCR: simple 4-column table (Taker, CHID, Port/Key, Status) — fields map to `name`, `stream_key`, `host`, `active`
   - ADV/Custom: full inline columns matching the old ADV Taker table layout
2. Add bulk paste support to category taker pools
3. Update `canExpand()` to check `has_taker_pool || has_source_pool` instead of hardcoded type check
4. Add source/taker pool toggles to the category create/edit form

### Files Modified
- `src/pages/AdminPage.tsx` — remove MCR Taker + ADV Taker tables, clean up imports
- `src/components/CategoriesAdmin.tsx` — enhanced taker pool with MCR vs ADV layouts, pool toggles, bulk paste
- `src/hooks/useLookups.ts` — no changes needed (existing hooks sufficient)
- Migration: add `has_source_pool`, `has_taker_pool` columns to `categories`

