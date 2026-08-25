# Online Video Interview — Setup Guide

A single-file web app (`index.html`) + Google Apps Script backend (`apps-script/Code.gs`) that runs an automated 10-question video interview with mandatory sequential Face ID-style scanning for all applicants. Host the frontend on GitHub Pages for free.

Config is already hardcoded:
- **Apps Script URL:** `https://script.google.com/macros/s/AKfycbxfcbyD94DBUkwMVbEfOioZERkUQowcMe4RyHpbscWFQsxnxRKFp1WvOhTia4KVm_PN/exec`
- **Drive Folder ID:** `1iyk_2f1rI_lHN37gobmgAFSsr2TAfkIs`

---

## 1. Google Sheet setup

Create one Google Sheet with **two tabs**:

### Tab 1: `Applicants`
- Put applicant names in cells **A2 to A8** (one name per row).

### Tab 2: `Questions`
- Row 1 (headers): `Question` | `Audio` | `Video Response` | `Log`
- Rows 2–11: 10 interview questions in **Column A** and a direct audio URL (e.g. a public `https://...mp3`) in **Column B**. Leave Column C empty — the script fills it with the uploaded video link. Column D is optional and logs the applicant + filename.

## 2. Google Apps Script

1. In the Sheet, open **Extensions → Apps Script**.
2. Delete the default code and paste the contents of `apps-script/Code.gs`.
3. The `FOLDER_ID` and both sheet names are already set at the top of the file. Adjust `APPLICANTS_SHEET` / `QUESTIONS_SHEET` only if you named your tabs differently.

### Deploy as a Web App
1. Click **Deploy → New deployment**.
2. Choose type **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and authorize the permissions when prompted.
5. Copy the **Web app URL**. It must match the `APPS_SCRIPT_URL` already hardcoded in `index.html` — if it differs, replace that one line.

## 3. Host on GitHub Pages

1. Create a new public GitHub repository.
2. Upload `index.html` (and optionally `apps-script/Code.gs` + `README.md`).
3. In the repo, go to **Settings → Pages**.
4. Under **Build and deployment**, set **Source: Deploy from a branch**, branch `main`, folder `/root`.
5. Save. Your site goes live at `https://<your-username>.github.io/<repo-name>/` in a minute or two.

---

### How the app flows
1. **Rules overlay** — animated glass card with the three Persian rules; user clicks «ادامه».
2. **Sequential Face Scan** — for each applicant from A2:A8, in order:
   - Shows their name with an iPhone-style rounded Face ID frame, glowing progress ring, animated 3D mesh overlay, and sweep line.
   - Persian voice guidance (`speechSynthesis`, `fa-IR`) addresses them by name and walks through 5 steps: up, down, left, right, eyes close to camera — each with the matching on-screen arrow and a 3-second hold.
   - After all 5 steps: success chime, «اسکن موفقانه انجام شد», then auto-advance to the next applicant.
   - The interview cannot start until every applicant has completed the scan.
3. **Interview** — for each of 10 questions: displays the text, plays the audio link twice, records a 30-second video with a blinking REC indicator and countdown, converts to Base64, and POSTs it to the Apps Script (which saves the `.webm` to Drive and writes the public URL into Column C).
4. **Completion** — shows the final Persian message with the applicant list, then clears `localStorage`, `sessionStorage`, cookies, cancels any speech, and releases the camera/mic tracks.

### Notes
- Browsers require HTTPS for camera access — GitHub Pages is HTTPS, so it works there. Opening the file locally from `file://` will block the camera.
- The POST uses `Content-Type: text/plain` to avoid a CORS preflight, the standard pattern for Apps Script web apps.
- Persian voice guidance uses the browser's built-in `speechSynthesis`; quality/availability of the `fa-IR` voice depends on the user's OS/browser (Chrome and Edge on desktop and most Android devices include a Persian voice).
- If you change the Apps Script code later, create a **new deployment** (or update the existing one) so the URL serves the latest version.
