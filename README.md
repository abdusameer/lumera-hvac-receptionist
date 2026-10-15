# HVAC Call Desk · Lumera Creative

A standalone showcase for a working automation prototype by Lumera Creative: a voice receptionist for HVAC teams that checks calendar availability, books appointments and organizes qualified leads.

The page follows one demonstration call through the workflow. It is not a commissioned client system, and the call, people, phone numbers and appointments on the page are fictional. The page does not connect to the workflow, a calendar or any backend.

## Local preview

Plain HTML, CSS and JavaScript. No build step, no dependencies.

```bash
python3 -m http.server 8743
```

Then open http://localhost:8743/.

## Structure

- `index.html` – the complete page. Every chapter is readable without JavaScript.
- `404.html` – not-found page for static hosts that use it (GitHub Pages, Cloudflare Pages).
- `assets/css/site.css` – tokens, layout, responsive and reduced-motion rules.
- `assets/js/boot.js` – adds `js` and `motion` classes before first paint.
- `assets/js/app.js` – waveform, chapter mirroring, transcript sequence, slot selection, route tabs, form validation.
- `assets/fonts/` – Geist and Geist Mono (SIL Open Font License 1.1, from the `geist` npm package 1.3.1).
- `assets/img/owl.svg`, `favicon.svg` – Lumera Creative mark, copied from the portfolio repository.

## Contact form

There is no form backend. Submitting validates the fields and opens the visitor's email app with a message addressed to contact@lumeracreative.agency. Nothing is sent from the page. If a real submission endpoint is added later, add spam protection and update the privacy notice.

## Privacy and tracking

No analytics, cookies, third-party scripts or external requests. A Content-Security-Policy meta tag restricts every resource to this origin.

## Deployment

Not deployed. Any static host works. Suggested: its own GitHub Pages repository, linked from the Lumera portfolio once reviewed.

© 2026 Lumera Creative LLC. All rights reserved.
