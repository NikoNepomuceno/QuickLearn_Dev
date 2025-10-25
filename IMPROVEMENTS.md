## Gaps and risks (fix first)

- **Security**

  - CSRF protection absent while using cookies; `sameSite: 'none'` in production increases risk.
  - Public access to `GET /api/quiz/:uuid` with no sharing permissions; effectively world-readable.
  - Brute-force defense uses a process‑local Map; not distributed and easy to bypass across instances.
  - Sessions table is queried but never written; "new device" email may trigger too often.
  - Sliding sessions are inconsistent: `authGuard` refreshes cookies, `authenticateToken` does not.
  - Manual CORS; no origin allowlist enforcement.

- **Privacy/UX**

  - Sharing is implicit by UUID; no `visibility` or opt‑in token for unlisted links.
  - Frontend still reads LocalStorage token (dev helper) that can undermine cookie‑only policy.

- **DX/Ops**
  - No structured logging, error tracing, or central error handler returning reference IDs.
  - Rate limiter middleware exists but is not wired where it matters (auth, uploads).
  - Knex present but migrations are SQL files; no migration runner in CI/CD.

## Targeted improvements (ordered by ROI)

### Security hardening

- Add CSRF protection (double‑submit cookie or `csurf`) for state‑changing routes; prefer `sameSite: lax` in prod when feasible.
- Use `cors` with explicit allowlist and `credentials: true`; reject unknown origins.
- Apply rate limiting (IP + identifier) on `POST /register`, `/login`, `/verify-email`, `/resend-otp`, `/quiz/from-file`, `/quiz/advanced`; back with Redis in prod.
- Fix device/session detection: either insert session rows on login (user_id, user_agent, ip, fingerprint) or remove the feature.
- Unify sliding sessions: refresh JWT inside `authenticateToken` when expiring soon.
- Add request schema validation via Zod/Joi for bodies and query params.
- Consider basic content scanning for uploads (Cloudinary add‑on or queue‑based AV).

### Sharing and privacy

- Add per‑quiz `visibility` (`private` | `unlisted` | `public`) and optional `share_token`.
- Gate `GET /api/quiz/:uuid`:
  - Allow owner; allow `public`; allow `unlisted` only with `?t=<share_token>`.
- UI: add “Make public/unlisted/private” toggle; copy link with token when unlisted.

### Authentication and account management

- Optional 2FA (TOTP) with backup codes.
- Sessions/device management UI: list, revoke, sign‑out others.
- Email change flow with confirmation.
- Introduce roles (basic RBAC) to enable future team/teacher features.

### AI and quiz generation UX

- Model presets and options (balanced/concise/detailed) with per‑topic weighting.
- Offload long generations to a background queue (BullMQ/Redis) and show progress via polling or websockets.
- Stronger fallbacks and retry UX; cache last prompt/result per file to avoid repeated costs.

### Performance and database

- Index review: composite `quizzes (user_id, created_at)` and `quiz_attempts (quiz_id, taken_at)` for pagination patterns.
- Enforce consistent pagination caps; instrument pool timeouts and slow query logging.

### Observability and reliability

- Add request logging (morgan) and structured logs (pino/winston) with request IDs.
- Central error handler returning `{ errorId, message }`; integrate Sentry for error and performance tracing.
- Extend `/health` to check DB connectivity and Cloudinary.

### Frontend UX and quality of life

- Remove LocalStorage token usage in production; keep only in dev behind `import.meta.env.DEV` guards.
- Global error/empty states; banner if AI unavailable (use `/api/quiz/system/ai-status`).
- Real PDF/JSON export (jsPDF for PDF); CSV export for attempts.
- Accessibility: labels, focus states, ARIA roles for modals; keyboard navigation.
- i18n scaffolding with `vue-i18n`.

### Product features and customization

- User profile (avatar, display name, theme, default quiz preferences).
- Quiz organization (folders/tags), search, sort, filters.
- Attempts analytics (per‑question correctness, topic heatmap, time per question, trends).
- Collaboration (shared folders/teams) backed by RBAC.
- PWA: installable app, offline queueing for attempts; cache recent quizzes.

### DevEx and deployment

- Docker Compose (API, MySQL, Redis, frontend) and `.env.example` for both apps.
- CI: lint, unit/e2e tests, build, run DB migrations; artifact uploads.
- Standardize config names (`FRONTEND_URL` vs `FRONTEND_ORIGIN`).

## Illustrative code edits

### Apply rate limiter to login

```js
// QuickLearn-Backend/src/routes/authRoutes.js
const { loginLimiter } = require("../middleware/rateLimiter");

router.post("/login", loginLimiter, async (req, res) => {
  // ... existing logic
});
```

### Unify sliding session refresh in authenticateToken

```js
// QuickLearn-Backend/src/middleware/auth.js
function authenticateToken(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer "))
      token = authHeader.substring(7);
    if (!token && req.cookies && req.cookies.access_token)
      token = req.cookies.access_token;
    if (!token) return res.status(401).json({ error: "Access token required" });

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: payload.sub,
      uuid: payload.uuid,
      username: payload.username,
    };

    // Refresh if expiring within 10 minutes
    const expMs = payload.exp ? payload.exp * 1000 : 0;
    if (expMs && expMs - Date.now() < 10 * 60 * 1000) {
      const refreshed = jwt.sign(
        { sub: payload.sub, uuid: payload.uuid, username: payload.username },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: "30m" }
      );
      res.cookie("access_token", refreshed, getCookieOptions());
    }
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
```

### CSRF and CORS (sketch)

```js
// QuickLearn-Backend/src/server.js
const cors = require("cors");
const csrf = require("csurf");

const allowedOrigins = (process.env.CORS_ALLOWLIST || allowedOrigin).split(",");
app.use(
  cors({
    origin: (o, cb) => cb(null, !o || allowedOrigins.includes(o)),
    credentials: true,
  })
);

// CSRF for state-changing routes (attach after cookieParser)
const csrfProtection = csrf({
  cookie: {
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  },
});
app.use(["/api/auth", "/api/quiz"], (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS")
    return next();
  return csrfProtection(req, res, next);
});
```

## DB change sketch (sharing controls)

```sql
-- Add to quizzes
ALTER TABLE `quizzes`
  ADD COLUMN `visibility` ENUM('private','unlisted','public') NOT NULL DEFAULT 'private' AFTER `metadata`,
  ADD COLUMN `share_token` VARCHAR(64) NULL DEFAULT NULL AFTER `visibility`;

CREATE INDEX `idx_quizzes_visibility` ON `quizzes` (`visibility`);
CREATE INDEX `idx_quizzes_share_token` ON `quizzes` (`share_token`);
```

Backend logic: when `visibility = 'unlisted'`, require `?t=<share_token>` to read; generate `share_token` on first enable and rotate on demand.

## Quick wins (do these first)

- Wire rate limiter on auth and upload routes (with Redis in prod).
- Add CSRF middleware and strict CORS allowlist.
- Fix session detection (write sessions) or remove “new device” email.
- Unify sliding session refresh in `authenticateToken`.
- Introduce `visibility` + `share_token` and gate quiz reads accordingly; update share UI.
- Remove LocalStorage token usage in production builds.
- Add request logging and a central error handler with Sentry integration.
