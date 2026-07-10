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

- Dashboard: overdue count, items due within 30 days, year-to-date spend, total entries logged
- Spend-by-system chart for the current year
- Per-system cards showing the next scheduled maintenance item and its status
- Full log with search, filter (system/type), and sort
- Add / edit / delete entries; recurring maintenance auto-computes its next due date
  from the interval you set
