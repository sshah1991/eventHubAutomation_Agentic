# EventHub Test Automation — Agentic Framework

> **AI-assisted, industry-standard Playwright + TypeScript test automation for the [EventHub](https://eventhub.rahulshettyacademy.com) platform, built using a multi-agent Claude Code workflow.**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Application Under Test](#2-application-under-test)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [AI Agent System](#5-ai-agent-system)
6. [Test Architecture & Strategy](#6-test-architecture--strategy)
7. [Current Coverage & Progress](#7-current-coverage--progress)
8. [Getting Started](#8-getting-started)
9. [Running Tests](#9-running-tests)
10. [Reports](#10-reports)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Coding Standards](#12-coding-standards)
13. [What's Pending](#13-whats-pending)

---

## 1. Project Overview

This project automates the testing of **EventHub** — a full-stack event ticket booking platform — using a novel **agentic AI workflow** powered by Claude Code.

Rather than writing tests manually from scratch, the project uses a **pipeline of specialised AI agents** that collaborate to go from business requirements all the way to validated, running test code:

```
Domain Knowledge  →  Scenario Design  →  Strategy  →  Code Generation  →  Execution & Fix
      ↓                    ↓                ↓                ↓                    ↓
  eventhub-domain    create-scenarios   test-strategy    generate-tests    generate-tests
```

Each agent in the pipeline has a clearly defined responsibility and draws from a shared knowledge base. The result is a test suite that is both **comprehensive** (covering happy paths, business rules, security, edge cases, and UI state) and **maintainable** (zero hardcoding, Page Object Model, data-driven fixtures).

---

## 2. Application Under Test

**EventHub** is a React + Node.js event booking platform built for QA practice. Key features include:

| Feature | Description |
|---|---|
| **Authentication** | Register / Login with JWT tokens; protected routes |
| **Event Browsing** | Browse, search, and filter 10+ static seeded events |
| **Booking Management** | Book tickets, view bookings, cancel, clear all, refund eligibility check |
| **Admin Event Management** | Create, edit, and delete user-owned events via Admin UI |
| **Sandbox Limits** | Per-user limits: max 6 events, max 9 bookings, with FIFO auto-pruning |
| **Cross-User Security** | Strict sandbox isolation — users can only access their own data (403 otherwise) |

**URLs:**
- Frontend: `https://eventhub.rahulshettyacademy.com`
- API: `https://api.eventhub.rahulshettyacademy.com`

---

## 3. Tech Stack

| Tool | Purpose | Version |
|---|---|---|
| [Playwright](https://playwright.dev) | Browser automation & API testing | `^1.60.0` |
| TypeScript | Type-safe test & page object code | `^6.0.3` |
| Allure | Rich test reporting with history | `^3.9.0` |
| GitHub Actions | CI pipeline (smoke on every push/PR) | — |
| Claude Code | AI agent orchestration | — |
| Node.js | Runtime | `20.x` |

---

## 4. Project Structure

```
eventHubAutomation_Agentic/
│
├── tests/                          # Playwright spec files (one per feature)
│   ├── Authentication/
│   │   └── auth.spec.ts            ✅ Complete
│   ├── AdminEventManagement/
│   │   └── adminEvent.spec.ts      ✅ Complete
│   ├── BookingManagement/
│   │   └── booking.spec.ts         ✅ Complete
│   ├── EventBrowsing/              ⏳ Pending
│   ├── SandboxLimits/              ⏳ Pending
│   └── SecurityAndIsolation/       ⏳ Pending
│
├── pages/                          # Page Object Model classes
│   ├── Authentication/
│   │   ├── LoginPage.ts
│   │   └── RegisterPage.ts
│   ├── AdminEventManagement/
│   │   └── AdminEventPage.ts
│   └── BookingManagement/
│       └── BookingPage.ts
│
├── fixtures/                       # Test data (JSON — zero hardcoding in specs)
│   ├── Authentication/
│   │   └── auth.data.json
│   ├── AdminEventManagement/
│   │   └── adminEvent.data.json
│   └── BookingManagement/
│       └── booking.data.json
│
├── utils/
│   └── logger.ts                   # Structured logger (INFO/WARN/ERROR/DEBUG)
│
├── docs/                           # AI-generated scenario & strategy documents
│   ├── authScenarios.md            # 51 scenarios for Authentication
│   ├── adminScenarios.md           # 43 scenarios for Admin Event Management
│   ├── bookingScenarios.md         # 51 scenarios for Booking Management
│   ├── eventsScenarios.md          # 45 scenarios for Event Browsing
│   ├── sandboxScenarios.md         # 31 scenarios for Sandbox Limits
│   ├── crossUserSecurityScenarios.md  # 31 scenarios for Security & Isolation
│   └── test-strategy.md            # Test pyramid assignments for all 252 scenarios
│
├── .claude/
│   └── skills/                     # AI agent definitions (see Section 5)
│       ├── domain-Knowladge-agent/
│       ├── create-scenarios-agent/
│       ├── test-strategy-agent/
│       ├── generate-test-scripts-agent/
│       └── playwright-best-practices-agent/
│
├── .github/
│   └── workflows/
│       └── smoke-tests.yml         # CI: runs @smoke on every push & PR
│
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. AI Agent System

This project uses **five custom AI agents** built as Claude Code skills. Each agent has a single well-defined role. They operate as a pipeline — the output of one becomes the input of the next.

---

### Agent 1: `domain-Knowladge-agent`
**Invoked as:** `/domain-Knowladge-agent`

**Role:** The project's living encyclopedia. Before any other agent does any work, it reads this agent to understand the application domain.

**Capabilities:**
- Describes all **business rules** (sandbox limits, FIFO pruning, booking reference format, refund eligibility logic, per-user seat calculation, price formula)
- Documents every **API endpoint** with method, path, request body, response shape, and all HTTP error codes (including real-world gotchas like `400` vs `401` for invalid credentials)
- Describes every **user flow** from registration to multi-step booking to cross-user security scenarios
- Provides **test data** — seeded static events, test credentials, booking reference format regex

**Knowledge files:**
- `BusinessRules.md` — 9 core domain rules (FIFO, sandbox, seat calculation, refund logic, etc.)
- `API_Documentation.md` — full endpoint reference table with error codes
- `UserFlows.md` — 6 step-by-step user journeys + seeded test data

> All other agents read this agent first before making any decisions.

---

### Agent 2: `create-scenarios-agent`
**Invoked as:** `/create-scenarios [feature-name]`

**Role:** A senior functional test designer who produces comprehensive test scenario documents.

**Capabilities:**
- Applies **6 thinking lenses** to every feature: Happy Path, Business Rules, Security, Negative/Error, Edge Cases, UI State
- Produces structured scenario documents in `docs/<feature>Scenarios.md`
- Assigns **priority** (P0–P3) and **test type** (SMOKE / SANITY / REGRESSION) to every scenario
- Traces every scenario back to a specific business rule or API contract
- Follows strict TC numbering: `TC-001–099` Happy Path, `TC-100–199` Business Rules, `TC-200–299` Security, `TC-300–399` Negative, `TC-400–499` Edge Cases, `TC-500–599` UI State

**Output:** 252 scenarios across 6 features, all documented in `docs/`

---

### Agent 3: `test-strategy-agent`
**Invoked as:** `/test-strategy [feature-name]`

**Role:** A test architect who decides the optimal test pyramid layer for every scenario.

**Capabilities:**
- Assigns each scenario to **Unit / API-Integration / E2E** using 6 decision rules
- Actively flags **anti-patterns** (e.g., testing API error codes at E2E, testing pure logic at E2E)
- Ensures **defense-in-depth**: critical business rules are covered at multiple layers
- Produces a distribution table showing layer counts, estimated time, and focus
- Documents rationale for every contested assignment

**Output strategy for 252 scenarios → 146 recommended tests:**

```
Layer            Count    Avg Time     Total Time
──────────────────────────────────────────────────
Unit               6      ~5ms         < 1s
API/Integration   78      ~300ms       ~25s
E2E (Playwright)  62      ~8s          ~8 min
──────────────────────────────────────────────────
Total            146                   ~8.5 min
```

---

### Agent 4: `generate-test-scripts-agent`
**Invoked as:** `/generate-tests [feature or flow]`

**Role:** A senior test automation engineer who writes AND validates Playwright tests in a real browser.

**Capabilities:**
- Reads domain knowledge, test strategy, existing spec files, and existing POMs before writing any code
- Creates all three artifacts per feature: `fixtures/<Feature>/data.json`, `pages/<Feature>/<Page>.ts`, `tests/<Feature>/<feature>.spec.ts`
- Enforces **zero hardcoding** — all URLs, credentials, payloads, and inputs come from JSON fixtures
- Runs tests after writing them and enters a **debug loop**: read error → cross-reference with page snapshot → fix → re-run
- Uses Playwright's `request` fixture for API-layer tests (no browser overhead)
- Tags every test with `@smoke`, `@sanity`, or `@regression`
- Adds structured logs at every meaningful step for traceability

**The "Write → Run → Debug → Fix" loop ensures tests are not considered done until they pass in a real browser.**

---

### Agent 5: `playwright-best-practices-agent`
**Invoked as:** (referenced internally by other agents; not user-invocable)

**Role:** The project's coding standards guide. Every test-writing agent reads this before touching a file.

**Capabilities:**
- Defines **locator priority order**: `data-testid` > ARIA roles > labels/placeholders > element IDs > CSS (last resort). XPath is banned.
- Enforces **POM rules**: all locators `readonly`, all methods `Promise<void>`, no assertions in page objects, `goto()` always takes `baseUrl` as parameter
- Defines **wait strategy**: use `expect().toBeVisible()` auto-waiting, never `waitForTimeout()`
- Defines **tagging strategy**: one spec file per feature, differentiated by `@smoke` / `@sanity` / `@regression` tags
- Documents all **anti-patterns to avoid**: `.js` files, hardcoded credentials, `test.only()` left in code, assertions inside POMs, separate spec files per tag
- Defines the **git branching workflow**: always use feature branches, never commit directly to `main`

---

## 6. Test Architecture & Strategy

### Page Object Model

Every page or multi-page flow has a dedicated TypeScript class in `pages/<Feature>/`. Locators are defined once as `readonly` properties; test files compose actions using the POM methods.

```typescript
// Example: booking form interaction
const bookingPage = new BookingPage(page);
await bookingPage.gotoEventDetail(baseUrl, eventId);
await bookingPage.fillAndConfirmBooking({ customerName, customerEmail, customerPhone });
await expect(bookingPage.getBookingRefLocator()).toBeVisible();
```

### API-First Cleanup

Every test that creates data via the UI or API uses a `try/finally` block to clean up via the API, even if assertions fail. This prevents test pollution across runs.

```typescript
const bookingId = await createBookingViaApi(request, token, payload);
try {
  // ... test steps ...
} finally {
  await deleteBookingViaApi(request, token, bookingId);
}
```

### Mixed UI + API Tests

A common pattern in this project is using the **API for test setup** (fast, reliable) and the **UI only for the behaviour being validated**. This keeps tests fast and focused.

```
API  →  Create test data            (fast setup, no UI flakiness)
UI   →  Perform and assert action   (the actual test)
API  →  Cleanup                     (fast teardown)
```

### Structured Logging

Every test step logs to console with `[TIMESTAMP] [LEVEL] [Context] message`. This makes CI failures readable at a glance without needing to open a report.

```
[2026-05-31T14:09:25.257Z] [INFO ] [BookingPage] Navigating to /events/3
[2026-05-31T14:09:27.552Z] [INFO ] [BookingManagement] TC-B002: Booking confirmed. Reference: "D-N7QS84"
```

---

## 7. Current Coverage & Progress

### Implementation Status

| Module | Scenarios Designed | Tests Implemented | Status |
|---|---|---|---|
| Authentication | 51 | 30 (smoke + sanity + 18 regression) | ✅ Complete |
| Admin Event Management | 43 | 11 (3 smoke + 8 sanity) | ✅ Complete |
| Booking Management | 51 | 15 (5 smoke + 10 sanity) | ✅ Complete |
| Event Browsing | 45 | 0 | ⏳ Pending |
| Sandbox Limits | 31 | 0 | ⏳ Pending |
| Security & Isolation | 31 | 0 | ⏳ Pending |

**Total implemented: ~56 tests across 3 modules | Total designed: 252 scenarios across 6 modules**

---

### Smoke Tests (run on every CI push)

| ID | Module | Description | Type |
|---|---|---|---|
| TC-001 | Auth | New user registration succeeds | UI |
| TC-002 | Auth | Login with valid credentials | UI |
| TC-501 | Auth | Failed login shows error message | UI |
| TC-E001 | Admin | Create event via Admin UI | UI |
| TC-E002 | Admin | POST /api/events returns 201 | API |
| TC-E003 | Admin | Delete event via Admin UI | UI |
| TC-B001 | Booking | POST /api/bookings returns 201 | API |
| TC-B002 | Booking | Book event via UI — confirmation card shown | UI |
| TC-B003 | Booking | GET /api/bookings returns paginated list | API |
| TC-B004 | Booking | Cancel booking via UI | UI |
| TC-B005 | Booking | View booking detail page | UI |

---

### Sanity Tests

| ID | Module | Description | Type |
|---|---|---|---|
| TC-004 | Auth | Page reload retains JWT session | UI |
| TC-005 | Auth | Logout redirects to `/login` | UI |
| TC-E101–E108 | Admin | CRUD API contracts, static event 403 protection | API |
| TC-E103 | Admin | Edit event via UI — updates reflected in list | UI |
| TC-B101–B104 | Booking | GET/DELETE single booking and all bookings | API |
| TC-B105 | Booking | Clear all bookings via UI | UI |
| TC-B106 | Booking | Single-ticket → refund eligible message | UI |
| TC-B107 | Booking | Multi-ticket → non-refundable message | UI |
| TC-B108–B110 | Booking | Booking ref format, price calc, 401 no-auth | API |

---

### Key Business Rules Validated

| Rule | Where Tested |
|---|---|
| Booking reference format: `[EventFirstLetter]-[6 alphanumeric]` | API (TC-B108) |
| `totalPrice = eventPrice × quantity` | API (TC-B109) |
| Static events cannot be edited or deleted (→ 403) | API (TC-E106, TC-E107) |
| Cancel booking frees seats immediately | API (TC-B103) |
| POST /api/bookings without auth → 401 | API (TC-B110) |
| Clear all bookings triggers native confirm dialog | UI (TC-B105) |
| Refund eligibility is client-side (4-second spinner) | UI (TC-B106, TC-B107) |

---

## 8. Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/sshah1991/eventHubAutomation_Agentic.git
cd eventHubAutomation_Agentic

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Configuration

All test configuration is in `playwright.config.ts`. No environment variables are required — URLs and credentials are stored in `fixtures/<Feature>/<feature>.data.json`.

> **Note:** For production setups, move credentials out of fixtures into environment variables or a secrets manager.

---

## 9. Running Tests

### Run all tests
```bash
npm test
```

### Run by test type
```bash
npm run test:smoke        # Critical path — run first in CI
npm run test:sanity       # Core functionality verification
npm run test:regression   # Full coverage suite
```

### Run a specific module
```bash
npx playwright test tests/BookingManagement/
npx playwright test tests/Authentication/
npx playwright test tests/AdminEventManagement/
```

### Run a specific test by ID
```bash
npx playwright test --grep "TC-B001"
```

### Run in headed mode (visible browser)
```bash
npm run test:headed
```

### Run with Playwright UI mode (interactive)
```bash
npx playwright test --ui
```

---

## 10. Reports

### HTML Report (built-in)
```bash
npm run report
# Opens test-results/index.html in browser
```

### Allure Report (rich, with history)
```bash
# Generate and open
npm run report:allure

# Serve live from results
npm run report:allure:serve
```

### Run tests and open Allure automatically
```bash
npm run test:allure
```

Allure reports include:
- Test execution timeline
- Step-by-step breakdown with logs
- Screenshots on failure
- Video recordings on failure
- Trace files for debugging

---

## 11. CI/CD Pipeline

GitHub Actions runs smoke tests automatically on **every push and every pull request** to any branch.

**Workflow:** `.github/workflows/smoke-tests.yml`

```
Trigger: push or PR to any branch
Runner:  ubuntu-latest
Steps:   checkout → setup Node 20 → npm ci → install Chromium → npm run test:smoke
Artifacts: Playwright HTML report (retained 7 days)
Timeout: 30 minutes
```

If smoke tests pass, the branch is considered safe to merge. The full sanity and regression suites should be run locally or in a scheduled nightly pipeline before releasing.

---

## 12. Coding Standards

This project enforces the following standards (documented in the `playwright-best-practices-agent`):

### File Types
- All files **must** be TypeScript (`.ts`). No `.js` files.

### Folder Contract
```
tests/<Feature>/    → spec files ONLY (.spec.ts)
pages/<Feature>/    → POM classes only
fixtures/<Feature>/ → JSON test data only
```

### Locator Priority
1. `data-testid` attributes (most stable)
2. ARIA roles (`getByRole`)
3. Labels / Placeholders (`getByLabel`, `getByPlaceholder`)
4. Element IDs (`locator('#id')`)
5. CSS (last resort — avoid)
6. **Never:** XPath, complex CSS chains, index-based selectors

### Tagging
All tests for a feature live in **one spec file**, differentiated by tag:
```typescript
test('TC-B001: ...', { tag: '@smoke' }, async ({ ... }) => { ... });
test('TC-B101: ...', { tag: '@sanity' }, async ({ ... }) => { ... });
```

### Wait Strategy
```typescript
// ✅ Correct — Playwright auto-waits
await expect(element).toBeVisible();

// ❌ Wrong — arbitrary sleep
await page.waitForTimeout(2000);
```

### Data Management
Zero hardcoding. All URLs, credentials, payloads, and test inputs live in `fixtures/<Feature>/<feature>.data.json`.

---

## 13. What's Pending

### Test Implementation (Pending Modules)

The scenario design and test strategy are **fully complete** for all 6 features (252 scenarios, 146 target tests). Only the code needs to be written for the remaining 3 modules.

#### Event Browsing — 0 / ~40 tests
Covers: authenticated event list, search by keyword, category filter, city filter, combined filters, pagination, event detail page, sold-out events, empty states.

Key tests to build:
- Smoke: events list renders, search works, filter works, "Book Now" navigates correctly
- Sanity: pagination, card fields completeness, filter reset
- Regression: sandbox isolation (User A's dynamic events not visible to User B), XSS in search, empty states

POM needed: `EventsPage.ts`, `EventDetailPage.ts`

---

#### Sandbox Limits — 0 / ~27 tests
Covers: FIFO event pruning at the 7th event, FIFO booking pruning at the 10th booking, sandbox warning banners, per-user limit isolation.

Key tests to build:
- Smoke/Sanity: create 6 events → no pruning, create 9 bookings → no pruning
- Regression: 7th event triggers FIFO — oldest deleted, not alphabetically first; cascade: FIFO-pruned event's bookings also gone; banner visible at 5+ events / 7+ bookings; per-user limits are independent (User A's FIFO does not affect User B)

POM needed: Reuses `AdminEventPage.ts`, `BookingPage.ts`; new `SandboxPage.ts` for banner assertions

---

#### Security & Cross-User Isolation — 0 / ~16 tests
Covers: IDOR protection (user A's bookings/events are 403 for user B), complete cross-user attack flow (Flow 6), "Access Denied" UI display, cache isolation on logout/re-login.

Key tests to build:
- Smoke: N/A (regression-only)
- Sanity: User A and User B each only see their own dynamic events; both see static events
- Regression: Complete Flow 6 E2E (User A books → User B tries the same URL → "Access Denied"); /bookings/<UserA_id> as User B → "Access Denied" text in UI; admin events scoped to authenticated user; localStorage cleared on logout, no stale data

POM needed: No new POMs — reuses existing pages; test file `tests/SecurityAndIsolation/security.spec.ts`

---

### Infrastructure Improvements

| Item | Priority | Notes |
|---|---|---|
| Unit tests for client-side logic | Medium | Refund eligibility function, price calculation, booking ref regex — pure functions, no browser needed |
| Secondary test user credentials in fixtures | High | Required for all Security & Isolation tests |
| Nightly full regression CI job | Medium | Current CI only runs smoke; sanity + regression need a scheduled trigger |
| Credential management via environment variables | High | Move credentials out of JSON fixtures for production security |
| Playwright `fullyParallel: true` investigation | Low | Currently sequential; tests share one user account which limits parallelism |

---

## Acknowledgements

- Application under test: [EventHub by Rahul Shetty Academy](https://rahulshettyacademy.com)
- Test automation framework: [Playwright](https://playwright.dev)
- AI agent system: [Claude Code by Anthropic](https://claude.ai/code)
