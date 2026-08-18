# Primis forms API

This Cloudflare Worker keeps the public site static while providing two protected endpoints:

- `POST /api/contact` validates an enquiry and sends it to `info@primis3d.com` without storing the message.
- `POST /api/waitlist` creates a pending entry and emails a seven-day confirmation link. Only confirmed addresses remain on the launch list.

The D1 database must be created with the EU jurisdiction. Do not create it with the default location and try to change it later; Cloudflare only accepts the jurisdiction at database creation.

## One-time setup

1. Create a Cloudflare account and install dependencies with `npm install` in this directory.
2. Authenticate with `npx wrangler login`.
3. Create the EU-only database:

   ```text
   npx wrangler d1 create primis-forms --jurisdiction=eu
   ```

4. Copy `wrangler.toml.example` to `wrangler.toml` and insert the returned database ID.
5. Add secrets; never commit their values:

   ```text
   npx wrangler secret put SMTP_PASSWORD
   npx wrangler secret put TOKEN_SECRET
   npx wrangler secret put TURNSTILE_SECRET
   ```

   `TOKEN_SECRET` should be at least 32 random bytes. The production configuration requires `TURNSTILE_SECRET`; it may be omitted only when `TURNSTILE_REQUIRED` is not enabled during local development.

6. Apply the database migration and deploy:

   ```text
   npm run db:remote
   npm run deploy
   ```

7. Set `VITE_FORM_API_URL` in the IONOS build environment to the deployed Worker origin, for example `https://primis-forms.example.workers.dev`, then redeploy the site.

8. Set `VITE_TURNSTILE_SITE_KEY` in the IONOS build environment when Turnstile is enabled.

## IONOS mail delivery

The Worker sends transactional mail directly through the existing IONOS Mail Basic account over implicit TLS on port 465. In IONOS Webmail, enable two-factor authentication and create a revocable app password named `Primis Forms`. Store that app password as the Worker secret `SMTP_PASSWORD`. Never use the normal mailbox password.

The app password may be revoked independently in IONOS Webmail. The Worker never reads the mailbox; it only submits the contact notification and the waitlist confirmation message through SMTP.

## Retention

Pending entries are deleted after seven days by the daily scheduled job. Confirmed entries are automatically deleted 24 months after confirmation unless they have already been removed following withdrawal or the one-time launch notification. After that notice is sent, delete all remaining confirmed records. Contact messages are not stored in D1.
