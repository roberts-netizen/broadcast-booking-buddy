

## Hide 2nd Endpoint Fields Behind Protocol Selection

### What changes
In the ADV view (`AdvancedBookingView.tsx`), the four "2nd" rows (2nd Host/IP, 2nd Key/port, 2nd User/StreamID, 2nd Pass) are currently always visible. They should only appear when the selected protocol ends with "2" (i.e., "RTMP 2", "SRT 2", "TCP 2", "Bifrost 2", "SRT Pull 2").

### How it works
1. In the `takerFields` array, wrap the four backup endpoint entries with a conditional check on the primary endpoint's protocol
2. For each taker assignment, check if `getEp(a.id, "primary").protocol` ends with `"2"`
3. If it does NOT end with "2", the render function returns `null` (hiding the row)
4. Filter out fields where ALL assignments render `null` to completely remove the row from the table

### Technical approach
- Modify the four backup field entries (lines ~421-456) so their `render` function checks the primary protocol before showing the input
- Add logic in the table rendering section to skip rows where no assignment has a "2" protocol selected
- This keeps the vertical space compact by default and only expands when a "2" protocol is chosen

### File to modify
- `src/components/AdvancedBookingView.tsx` — conditionally render backup endpoint rows based on primary protocol selection

