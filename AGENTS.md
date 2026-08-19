# Instaflow UI Design System

## Product direction

- Build a calm, premium RTL dashboard for Instagram automation teams.
- Prefer clear hierarchy, generous whitespace, restrained gradients, and visible system status.
- Preserve dark and light modes plus the user-selected accent color.

## Stack and structure

- Use React + TypeScript components in `src/components/`.
- Use Bootstrap 5 grid and utilities for layout, then project classes in `src/index.css` for visual treatment.
- Keep feature components in their existing files and extract reusable UI into `src/components/` when a pattern appears more than once.
- Use Lucide icons already present in the project; do not add another icon package for ordinary UI.

## Tokens and styling

- IMPORTANT: Never hardcode a new brand color in JSX. Use the existing CSS tokens such as `--color-purple-*`, `--color-slate-*`, `--color-emerald-*`, or the app tokens in `src/index.css`.
- Route all theme changes through `src/lib/theme.ts`; Bootstrap must remain synchronized with `data-bs-theme`.
- Keep the UI RTL. Use logical layout thinking and test the right sidebar on desktop, tablet, and mobile.
- Use rounded surfaces, subtle borders, and elevation sparingly. Avoid heavy gradients behind dense content.
- Prefer CSS classes over large inline style objects. Inline style is acceptable for chart geometry or a dynamic token value.

## Navigation and responsive behavior

- The primary navigation is a right-side sidebar on desktop and an off-canvas menu on smaller screens.
- Active navigation items must have a clear state, `aria-current="page"`, and must close the mobile menu after navigation.
- Keep account connection status and webhook health visible without opening a settings page.
- All icon-only buttons require an accessible `aria-label`.

## Data visualization

- Use Recharts for dashboard charts and make every chart responsive through `ResponsiveContainer`.
- Charts must consume API data, handle empty states, and use CSS tokens for colors.
- Include a short label or legend and do not rely on color alone to communicate status.

## Quality bar

- Keep exported component props typed.
- Run `npm run lint`, `npm run build`, and `git diff --check` after UI changes.
- Check the live app in a browser at desktop and mobile widths before publishing.
- Never place credentials, access tokens, or secrets in source, markup, or client-side configuration.
