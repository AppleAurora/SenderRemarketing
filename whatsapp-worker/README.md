# SenderRemarketing WhatsApp session worker (experimental)

Standalone persistent worker for **linking one personal WhatsApp account** via QR or pairing code. This uses unofficial WhatsApp Web automation, is not endorsed by Meta, may break or cause account restrictions, and **does not send messages**.

## Deploy requirements
- Docker hosting with a **persistent encrypted disk** mounted at `/data`; avoid ephemeral serverless hosting.
- At least ~1GB RAM for Chromium, preferably 2GB.
- HTTPS public URL, or HTTPS reverse proxy.
- `WHATSAPP_SESSION_SERVICE_TOKEN`: random 32+ character secret, same value on Netlify.
- `SESSION_DATA_DIR=/data/whatsapp`
- `MAX_SESSIONS=1` for the first test.
- `PORT=3001` unless host injects its own PORT.
- Set `WHATSAPP_SESSION_SERVICE_URL=https://your-worker-host` and `WHATSAPP_SESSION_SERVICE_TOKEN` in **Netlify server environment**, then redeploy.

Build context: `whatsapp-worker/`, Dockerfile: `whatsapp-worker/Dockerfile`.

In SenderRemarketing go to WhatsApp → Administrar líneas personales → Conectar QR / Código, then click Consultar estado. If the first request says pending, wait and check again.

**Security:** worker API uses one server-to-server bearer token; never expose it to browsers. Do not share the persistent volume between tenants without additional isolation. This initial worker is intentionally limited to one session. Back up and encrypt the session volume. Restrict worker network access to trusted origins/IPs when your host supports it. The API does not independently verify organization ownership; it trusts the authenticated Netlify backend. Do not use it as a publicly accessible multi-tenant service without additional authorization.

**Current limitations:** sessions in memory are not auto-restored after worker restart; LocalAuth persists credentials on disk but a link request is needed to start the session again. Switching from QR to pairing on an already-started session requires restarting the worker. Codes and QR can expire. No outbound message automation is included.
