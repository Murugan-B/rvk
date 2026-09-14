# RVK Billing System

Local-first billing and stock management app for Ubuntu.

## What runs locally
- React frontend in the browser
- Express backend on port `5000`
- One root command to start both in development
- One backend command to serve the built frontend in production

## Setup
1. Install dependencies from the project root:
   `npm install`
2. Create a `.env` file if you use Supabase or Cloudinary:
   `SUPABASE_URL=...`
   `SUPABASE_ANON_KEY=...`
   `CLOUDINARY_CLOUD_NAME=...`
   `CLOUDINARY_API_KEY=...`
   `CLOUDINARY_API_SECRET=...`

## Run locally on Ubuntu
Development with frontend and backend together:
`npm run dev`

Backend-only local start:
1. `npm run build`
2. `npm run start`

Create a Debian installer for Ubuntu:
`npm run deb`

The package is written to `release/` as `rvk-setup_*.deb` and `RVK-Setup.deb`.

Install the package on Ubuntu:
`sudo dpkg -i release/RVK-Setup.deb`

After install, open RVK Billing System from the app menu.
It auto-starts the local backend and opens the app in your browser.

## Notes
- The frontend still uses Supabase for data storage.
- The backend handles file upload and API endpoints.
- Vite proxies `/api` to the backend during development.
