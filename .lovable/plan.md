

## Plan: Category-Scoped Pools (Completed)

### What was done
- Added `category_id` column to `leagues` and `incoming_channels` tables
- Removed Settings tab entirely from Admin page (no more global Incoming Channels, Leagues, TonyBet tables)
- Admin now has two tabs: Categories and Client Access
- Each category's expandable row now has sub-tabs: **Takers**, **Leagues**, **Sources**
- Leagues and Sources (Incoming Channels) are now category-scoped, managed within each category
- MCR categories show simplified taker layout; ADV/Custom show full technical layout
- Hogmore categories have no expandable pools
