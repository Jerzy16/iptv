# One DxD IPTV proxy

Requires Node.js 18 or newer.

```powershell
Copy-Item .env.example .env
npm install
npm start
```

Health check: `http://localhost:3000/health`

The client playlist endpoint is:

`http://localhost:3000/api/playlist?username=USER&password=PASSWORD`

For production, publish this service behind HTTPS and set `ALLOWED_ORIGIN` to the exact app origin instead of `*`. Do not commit `.env` or credentials.
