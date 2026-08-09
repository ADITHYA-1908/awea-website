# AWeA Full-Stack Website

A responsive industrial advisory website closely inspired by the supplied layout, with added About, Engagement Requirements, Diagnostic Review and Contact sections.

## Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express
- Database: MongoDB Atlas with Mongoose

## Setup
1. Create a MongoDB Atlas cluster and database user.
2. Add the server's IP address to Atlas Network Access.
3. Copy `.env.example` to `.env` and set `MONGODB_URI`.
4. Install packages:
   ```bash
   npm install
   ```
5. Run:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:3000`

## Production deployment
- Deploy the Node.js application near the selected MongoDB Atlas region.
- Set `NODE_ENV=production`, `MONGODB_URI`, and `MONGODB_DB_NAME` as encrypted host secrets. Never commit `.env`.
- Use a dedicated Atlas database user with read/write access only to the `awea_advisory` database.
- Restrict Atlas Network Access to the application server's outbound IP addresses.
- Ensure the public site is served over HTTPS; the application sends production security headers and rate-limits form submissions.

## API endpoints
- `GET /api/health`
- `POST /api/contact`
- `POST /api/diagnostic`

## Customize
- Update branding text/logo as needed.
