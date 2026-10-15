# Voice Receptionist Automation · Lumera Creative

A standalone showcase for Lumera Creative's voice receptionist service, a prototype in development. Visitors choose a business type (salon, HVAC, plumbing or restaurant) and scroll through an example call. Each chapter reveals the exchange, highlights the details it produced and adds them to the business summary. Scrolling back restores earlier chapters; nothing runs on a timer.

Everything on the page is an interactive demo with fictional sample data. The page connects to nothing, and it creates no calendar events, sends no messages and places no orders.

## What is real, simulated or planned

| | Status |
|---|---|
| HVAC workflow (voice agent → webhook → request abstraction → tool routing → availability, booking, qualification; Google Calendar and email) | In development at Lumera. Described from the project brief; not inspected or connected from this repository |
| Every conversation, opening, capacity check, menu and summary on this page | Simulated (static text revealed by scroll, no audio, no microphone) |
| Salon, plumbing and restaurant configurations | Proposed, not built |
| Reservation, ordering, payment, POS and live staff-transfer integrations | Not implemented |

## Local preview

Plain HTML, CSS and JavaScript. No build step, no dependencies.

```bash
python3 -m http.server 8743
```

Then open http://localhost:8743/.

## Structure

- `index.html`: the complete page. Each scenario is five real chapter sections in HTML, so it reads without JavaScript.
- `assets/js/app.js`: business selector, scroll-position story engine (one passive scroll listener), layout fit check, choice binding, form validation.
- `assets/js/boot.js`: adds `js` and `motion` classes before first paint.
- `assets/css/site.css`: tokens, the sticky three-column story layout, the stacked layout for phones and short or zoomed windows, and the reduced-motion rules.
- `assets/img/receiver-*.webp`: original silver receiver, generated for this project with GPT Image 2.5 via Higgsfield (transparent background, no text).
- `assets/fonts/`: Geist and Geist Mono (SIL Open Font License 1.1, from the `geist` npm package 1.3.1).

### How the story works

- The sticky layout is used only when the window is at least 1024 × 660 and every scenario's finished summary and the receiver rail fit on screen. Otherwise the chapters flow normally, with a small sticky chapter strip when the window is at least 560 px tall.
- The current chapter is the last one whose top has passed a reading line (45 % of the window in the sticky layout, 50 % stacked).
- Summary rows carry `data-step`; rows at or before the current chapter are filled, and the row for the current chapter is highlighted.

### Adding a scenario

Copy one `<article class="scn">` block, give it a unique `data-scn` and `data-biz`, five `<li class="ch">` chapters with unique ids, and `data-step="1"`–`"5"` on each summary row and the result. Wrap the words in the conversation that produce a field in `<mark>`. Choices update every `[data-bind="<radio name>"]` in the same article.

## Contact form

There is no form backend. Submitting validates the fields and opens the visitor's email app with a message addressed to contact@lumeracreative.agency. Nothing is sent from the page.

## Privacy and tracking

No analytics, cookies, third-party scripts or external requests. A Content-Security-Policy meta tag restricts every resource to this origin.

© 2026 Lumera Creative LLC. All rights reserved.
