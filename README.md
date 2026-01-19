 # Server
 
 JavaScript (CommonJS) Node.js server.
 
 ## Quick start
 
 - Install: `npm install`
 - Run: `npm run start`
 - Dev (auto-reload): `npm run dev`
 - Test: `npm test`
 - Lint: `npm run lint`
 
 ## Setup
 
 ### Requirements
 
 - Node.js (recommended: LTS)
 - npm
 
 ### Environment variables
 
 - `PORT` (optional): server port (default: `3000`)
 
 ## Endpoints (sample)
 
 - `GET /` -> `Hello World`
 - `GET /health` -> `{ "ok": true }`
 
 ## Structure
 
 - `index.js`: Application entrypoint.
 - `src/`: Application code (routes, controllers, middleware, etc.).
