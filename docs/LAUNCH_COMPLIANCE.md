# Primis launch compliance runbook

Last reviewed: 18 August 2026

This operational checklist complements the deployed Privacy Policy and
Impressum. It is not legal advice and must be reviewed whenever the product,
hosting, forms, tracking, or email use changes.

## Completed technical controls

- HTTPS with HSTS; HTTP and `www` redirect to the canonical HTTPS origin.
- Content Security Policy, clickjacking protection, MIME sniffing protection,
  Referrer Policy, and a restrictive Permissions Policy.
- No analytics, ad pixels, tracking cookies, third-party embeds, or remote
  fonts in the current client.
- Waitlist and contact forms honestly prepare local email drafts instead of
  claiming an unperformed server-side submission.
- Privacy information and legal-provider links are available at every data
  collection point.
- One-time launch-notification purpose, consent, withdrawal, recipients, and
  retention are documented in the Privacy Policy.
- Dependencies are version-pinned and audited; external GitHub Actions are
  commit-SHA pinned.
- GitHub Actions is limited to GitHub-owned actions and the four exact IONOS
  action revisions used by the deployment workflows.
- Deployment jobs receive only the named IONOS credentials they require; no
  workflow step dynamically indexes or serialises the repository secret set.
- Secret scanning, push protection, Dependabot alerts and security updates,
  and weekly extended CodeQL analysis are enabled. CodeQL found one workflow
  secret-exposure issue during hardening; it was fixed by replacing dynamic
  secret lookup with the one named deployment credential. The current analysis
  has no open alerts.
- The `main` branch rejects force-pushes and deletion.
- A security contact is published at `/.well-known/security.txt`.

## Waitlist operating procedure

1. Configure an IONOS mailbox rule for subject
   `Atlas one-time launch notification` and keep the requests in a dedicated
   folder accessible only to authorised Primis personnel.
2. Do not copy addresses into another marketing list or use them for recurring
   product updates.
3. Honour withdrawal requests sent to `info@primis3d.com` promptly.
4. Send the launch notice individually or through a GDPR-reviewed processor.
   Never expose recipients to one another through `To` or `Cc`.
5. Delete the list after the single launch notice. If Atlas has not launched,
   delete requests after the 24-month period stated in the Privacy Policy
   unless the person renews the request.

## Account and legal evidence still requiring a human record

- Confirm that the IONOS data-processing agreement (AVV under Art. 28 GDPR) is
  active in the company account and retain a copy privately.
- Repeat the official EU VIES validation for `DE464025288` and retain the
  validation receipt. Its German checksum passed locally on 18 August 2026,
  but the VIES request could not complete because the German member-state
  service returned `MS_UNAVAILABLE`.
- Complete the evidence fields in `docs/ASSET_PROVENANCE.md`; store licences,
  releases, and source/generation records in a private company-controlled
  folder rather than this public repository.
- Complete and retain DPMA, EUIPO, and WIPO similarity searches for `Primis`,
  `Atlas`, and the Primis symbol in the relevant software, AI, robotics, and 3D
  service classes. Escalate close matches to qualified trademark counsel.
- Retain internal evidence for measurable product claims and keep prototype or
  research-direction language wherever a capability is not generally
  available or consistently reproducible.

## Email authentication rollout

The domain currently publishes IONOS SPF and both IONOS DKIM selectors. DMARC
is still monitoring-only (`p=none`). In IONOS DNS, move in controlled stages:

1. `v=DMARC1; p=quarantine; pct=25; rua=mailto:info@primis3d.com`
2. Review reports and confirm every legitimate sender passes aligned SPF or
   DKIM, then raise `pct` to `100`.
3. After a stable monitoring period, use
   `v=DMARC1; p=reject; rua=mailto:info@primis3d.com`.

Do not advance a stage if legitimate messages fail alignment. Recheck the
record after each DNS change.

## Change triggers

Before adding automatic forms, uploads, user accounts, customer scenes,
analytics, advertising, recurring email, or a new hosting/subprocessor:

- perform a data-flow and security review;
- update the Privacy Policy before collection starts;
- execute the required processor agreement;
- define access, retention, deletion, abuse prevention, and incident handling;
- add consent controls only where consent is the appropriate legal basis.
