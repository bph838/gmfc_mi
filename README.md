# gmfc_mi

Management information for Gordano Model Flying Club members. Runs locally in a browser.

## Running

Requires Node.js 18+ (no packages to install).

```
npm start
```

Then open http://127.0.0.1:3000.

| Command           | What it does                                                        |
| ----------------- | ------------------------------------------------------------------- |
| `npm start`       | Start the app at http://127.0.0.1:3000                              |
| `npm run open`    | Start the app and open it in your browser                           |
| `npm run dev`     | Start the app and restart it automatically when `server.js` changes |
| `npm run members` | List the CSVs in `.members` and show which one will be loaded       |
| `npm run check`   | Syntax-check the Node scripts                                       |

To use a different port: `$env:PORT=8080; npm start` (PowerShell).

The app loads the most recently modified `.csv` file in `.members/`. To update, drop a new
export into that folder and press **Reload data**. Member files are git-ignored and the server
only listens on localhost.

## Structure

- `server.js` – tiny local server: serves `public/` and `GET /api/members/latest`
- `public/js/csv.js` – CSV parser
- `public/js/data.js` – loads the dataset, shared helpers (e.g. `countBy`)
- `public/js/views.js` – the report views; add a new view object to the `views` array to add a tab
- `public/js/app.js` – navigation and rendering
