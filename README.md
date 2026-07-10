# Home Maintenance Tracker

**Live app:** https://jarrodbrown001-collab.github.io/home-maintenance-tracker/

A home maintenance logbook, structured the way a vehicle service record is: recurring
maintenance items, one-off repairs, upgrades, and renovations, all tracked by house
system (roof, HVAC, plumbing, electrical, exterior, windows & doors, appliances,
interior & safety, yard & grounds).

Static site (`index.html` / `style.css` / `script.js`) — open `index.html` directly,
or serve the folder with any static host. Data is stored in the browser via
`localStorage`, seeded with sample entries on first load.

## Features

- Multiple properties: switch between homes with the tabs at the top; each has its
  own name, address, entries, and custom systems. "+ Property" adds another.
- Dashboard: overdue count, items due within 30 days, year-to-date spend, total entries logged
- Spend-by-system chart for the current year
- Per-system cards showing the next scheduled maintenance item and its status —
  click any card to open a dedicated page for that system (filtered log, its own stats)
- Add systems manually beyond the built-in nine, via the "+ Add a system" tile
- Full log with search, filter (system/type), and sort
- Add / edit / delete entries; recurring maintenance auto-computes its next due date
  from the interval you set
- Delete is undoable via a toast (6 seconds), instead of a confirmation dialog
- Attach a photo or receipt to any entry; stored inline as a compressed JPEG
- Export the whole log (all properties) as a JSON backup file, and import one back in
- A status line under the header shows when you last exported, and the name/date of
  the last file you imported — a nudge if you've never backed up
- Print a clean, dashboard-free copy of the current log (`Print log` button)

## Backups

All data lives in the browser's `localStorage`, scoped to this one browser/device —
there's no server and no sync. Use **Export backup** regularly, and after adding
photos, since local storage has a size limit (typically 5–10 MB per site). **Import
backup** replaces everything currently stored with the contents of a previously
exported file (all properties, not just the active one).
