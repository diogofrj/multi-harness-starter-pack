# Security

13 secure-coding rules for AI-assisted development. Treat every rule as mandatory; `make audit` checks them statically, and rules marked **Red Flag** block `make verify`.

## 1. Secrets and credentials (Red Flag)

- NEVER hardcode secrets, tokens, API keys, passwords or connection strings in code or config
- NEVER read or expose `.env` files in responses
- Load secrets from environment variables or a secret manager; prefer workload/managed identities when the platform offers them
- Keep `.env*` in `.gitignore`; a secret that reached a commit must be rotated, not just deleted
- If you see a secret in code, flag it immediately — don't just fix silently

## 2. Injection (SQL, XSS, command)

- Use parameterized queries (prepared statements), even with an ORM; never build SQL by concatenation
- Never build shell commands from strings with user input; pass argument lists
- Validate, sanitize and encode user content before rendering it

## 3. Resource-level authorization (IDOR / BOLA)

- Always check auth before processing any request
- Verify the authenticated user may access the specific resource (`/orders/{id}`), not just that they are logged in
- UUIDs/GUIDs are not access control
- Never expose internal IDs or stack traces in API responses

## 4. Dependencies and AI hallucinations

- Confirm a suggested package exists in the official registry before installing it (slopsquatting / typosquatting)
- Check reputation, maintenance and known vulnerabilities; run a vulnerability scanner before release
- Pin versions; justify every new dependency

## 5. Backend validation (Red Flag)

- Validate ALL external input (API requests, URL params, form data) on the server, with schema validation (zod, pydantic, joi) at the boundary
- Frontend validation is UX only; critical business rules run on the server
- Treat every client input as untrusted

## 6. AI-assisted security review

- Run an AI pre-review focused on the OWASP Top 10 (`/security-check`, `code-reviewer` agent)
- AI review complements human review; it never replaces it

## 7. Errors and logs (Red Flag)

- Show generic error messages to end users; keep details in internal logs
- Never log passwords, tokens, secrets or personal data
- Never swallow errors silently

## 8. API protection: rate limiting and CORS (Red Flag)

- Rate-limit critical endpoints: login, sign-up, password reset, token issuance and AI calls
- Restrict CORS to the authorized origins; no `*` on authenticated APIs

## 9. Security tooling during development

- Keep static analysis and secret scanning running while coding (e.g. Semgrep, CodeQL, Gitleaks, TruffleHog) via IDE extensions and pre-commit hooks
- The repo hooks (`block-secrets.sh`, `pre-commit-secrets.sh`) are a floor, not the whole control

## 10. Security from the start

- Capture security requirements in the spec (`/spec`) and threat-model new attack surface (`docs/security/threats/`) before building
- Put security validation in the wave plan, not at the end

## 11. Least privilege

- Grant integrations, service accounts and database users only the access they need
- No admin/root/service-role credentials in the frontend or in app runtime when a scoped role works
- Review privileges when scope changes

## 12. Authentication and sessions

- Use an established identity provider (OAuth 2.0 / OIDC) instead of hand-rolled auth
- Store session tokens in `Secure`, `HttpOnly`, `SameSite` cookies, not `localStorage`
- Short-lived tokens with refresh; MFA for critical systems
- Hash passwords with bcrypt/argon2 (cost ≥ 12)

## 13. Don't blindly trust AI-generated code

- Treat AI-generated code as unvalidated code: same review and tests as handwritten code
- Verify compliance (`make verify`) before publishing
