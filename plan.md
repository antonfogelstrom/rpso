# RPSO Frontend Rework

## Objectives
- **TypeScript** — full type safety across all code
- **Mobile-first** — bottom nav, large touch targets, full-height game views

---

## Phase 1: Tooling & Setup
1. Install `typescript`, `@types/react`, `@types/react-dom`
2. Add `tsconfig.json` (strict, ESNext, JSX react-jsx)
3. Rename `vite.config.js` → `vite.config.ts`
4. Rename all `src/` files `.jsx` → `.tsx`

## Phase 2: Foundation Layer
5. **`src/types/index.ts`** — all backend types: `Player`, `Match`, `Round`, `PlayerProfile`, `Envelope<T>`, `ServerMessage` discriminated union, `ClientMessage` types
6. **`src/lib/api.ts`** — typed `apiClient` with auth header injection, envelope unwrapping, per-endpoint functions
7. **`src/lib/ws.ts`** — `GameSocket` class: typed connect/disconnect/send, discriminated `onMessage`, auto-reconnect

## Phase 3: State & Hooks
8. **`src/context/AuthContext.tsx`** — `AuthProvider` + `useAuth()` hook, localStorage persistence
9. **`src/hooks/useWebSocket.ts`** — hook wrapping `GameSocket`, tied to auth token
10. **`src/hooks/useProfile.ts`** — fetches profile + match history with loading/error states

## Phase 4: UI Primitives
11. **`src/components/ui/`** — `Button`, `Input`, `Card`, `Badge` — typed, mobile-friendly (min 44px touch targets)

## Phase 5: Layout
12. **`src/components/layout/`** — `BottomNav` (3 tabs: Dashboard, Play, Leaderboard), `PageLayout` (full-height flex + bottom nav)

## Phase 6: Pages
13. **`src/pages/AuthPage.tsx`** — login/register tabs, form validation, error display
14. **`src/pages/DashboardPage.tsx`** — profile card (rating, W/L/D), recent matches list
15. **`src/pages/LeaderboardPage.tsx`** — ranked player list
16. **`src/pages/PlayPage.tsx`** — game screen: queue, move buttons (🪨📄✂️), round log, match result overlay

## Phase 7: App Shell
17. **`src/App.tsx`** — `AuthProvider` wrapper, state-based routing, auth guard
18. **`src/main.tsx`** — entry point (unchanged structure)
19. **`src/index.css`** — keep `@import "tailwindcss"`

## Phase 8: Polish
20. **`index.html`** — already has viewport meta, keep as-is
21. Verify `npm run build` succeeds with TypeScript

---

## Mobile-First Design Choices
- **Bottom tab bar** — fixed bottom nav (Dashboard, Play, Leaderboard), hidden during active game
- **Touch targets** — minimum 44×44px for all interactive elements
- **Move buttons** — large rounded squares with emoji, 3-column grid, 80px+ height
- **Match result** — full-screen overlay
- **Routing** — state-based (no router dependency), 4 pages
