# Voice Receptionist Automation · Lumera Creative

A standalone showcase for Lumera Creative's voice receptionist service, a prototype in development. Visitors choose a business type (salon, HVAC, plumbing or restaurant) and step through a scripted example call that ends in an organized appointment, service request, reservation or pickup order.

Everything on the page is an interactive demo with fictional sample data. The page connects to nothing, and it creates no calendar events, sends no messages and places no orders.

## What is real, simulated or planned

| | Status |
|---|---|
| HVAC workflow (voice agent → webhook → request abstraction → tool routing → availability, booking, qualification; Google Calendar and email) | In development at Lumera. Described from the project brief; not inspected or connected from this repository |
| Every conversation, opening, capacity check, menu and summary on this page | Simulated (scripted text, no audio, no microphone) |
| Salon, plumbing and restaurant configurations | Proposed, not built |
| Reservation, ordering, payment, POS and live staff-transfer integrations | Not implemented |

## Local preview

Plain HTML, CSS and JavaScript. No build step, no dependencies.

```bash
python3 -m http.server 8743
```

Then open http://localhost:8743/.

## Structure

- `index.html`: the complete page. Each scenario is written in full as HTML, so it reads without JavaScript.
- `assets/js/app.js`: business selector, scenario engine (play, pause, restart, next step), choice binding, form validation.
- `assets/js/boot.js`: adds `js` and `motion` classes before first paint.
- `assets/css/site.css`: tokens, the three-column, two-column and stacked stage layouts, and the reduced-motion rules.
- `assets/img/receiver-*.webp`: original silver receiver, generated for this project with GPT Image 2.5 via Higgsfield (transparent background, no text).
- `assets/fonts/`: Geist and Geist Mono (SIL Open Font License 1.1, from the `geist` npm package 1.3.1).

### Adding a scenario

Copy one `<article class="scn">` block, give it a unique `data-scn`, a `data-biz`, five `.flow` items and `data-step="1"`–`"5"` on each message, record row, choice group and result. Choices update every `[data-bind="<radio name>"]` in the same article.

## Contact form

There is no form backend. Submitting validates the fields and opens the visitor's email app with a message addressed to contact@lumeracreative.agency. Nothing is sent from the page.

## Privacy and tracking

No analytics, cookies, third-party scripts or external requests. A Content-Security-Policy meta tag restricts every resource to this origin.

© 2026 Lumera Creative LLC. All rights reserved.
