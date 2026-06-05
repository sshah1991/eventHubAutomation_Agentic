<div align="center">

# EventHub Test Automation — Agentic Framework

**AI-powered, end-to-end Playwright test suite for the [EventHub](https://eventhub.rahulshettyacademy.com) platform, built using a multi-agent Claude Code workflow.**

[![Smoke Tests](https://github.com/sshah1991/eventHubAutomation_Agentic/actions/workflows/smoke-tests.yml/badge.svg)](https://github.com/sshah1991/eventHubAutomation_Agentic/actions/workflows/smoke-tests.yml)
![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-1.60+-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-176%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/Modules-6%20%2F%206%20complete-brightgreen)
![License](https://img.shields.io/badge/License-ISC-blue)

</div>

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Application Under Test](#2-application-under-test)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [AI Agent System](#5-ai-agent-system)
6. [Test Architecture & Strategy](#6-test-architecture--strategy)
7. [Test Coverage](#7-test-coverage)
8. [Getting Started](#8-getting-started)
9. [Running Tests](#9-running-tests)
10. [Reports](#10-reports)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Coding Standards](#12-coding-standards)

---

## 1. Project Overview

This project automates testing of **EventHub** — a full-stack event ticket booking platform — using a novel **agentic AI workflow** powered by Claude Code.

Instead of writing tests manually, the project uses a **pipeline of specialised AI agents** that collaborate to go from business requirements all the way to validated, running test code:

```
 Domain Knowledge  ──►  Scenario Design  ──►  Test Strategy  ──►  Code Generation  ──►  Execution & Fix
       │                      │                     │                   │                      │
 eventhub-domain        create-scenarios       test-strategy      generate-tests         debug loop
  (business rules,       (252 scenarios        (pyramid layer      (POM + fixtures      (run → read error
   API contracts,         across 6 features,    assignment,         + spec file,        → fix → re-run
   user flows)            P0–P3 priority)        anti-patterns)      zero hardcode)      until green)
```

The result is a suite that is **comprehensive** (happy paths, business rules, security, edge cases, UI state) and **maintainable** (Page Object Model, data-driven fixtures, zero hardcoding).

---

## 2. Application Under Test

**EventHub** is a React + Node.js event booking platform. It covers a realistic range of real-world QA challenges:

| Feature | Description |
|---|---|
| **Authentication** | Register / Login with JWT tokens; protected route redirects |
| **Event Browsing** | Browse, search, and filter 10+ seeded events; pagination; sold-out states |
| **Booking Management** | Book tickets, view bookings, cancel, clear all, refund eligibility check |
| **Admin Event Management** | Create, edit, and delete user-owned events; static-event protection |
| **Sandbox Limits** | Per-user limits: max 6 events, max 9 bookings, with FIFO auto-pruning |
| **Security & Isolation** | Strict sandbox isolation — users can only access their own data (403 otherwise) |

| Layer | URL |
|---|---|
| Frontend | `https://eventhub.rahulshettyacademy.com` |
| API | `https://api.eventhub.rahulshettyacademy.com` |

---

## 3. Tech Stack

| Tool | Purpose | Version |
|---|---|---|
| [Playwright](https://playwright.dev) | Browser automation & API testing | `^1.60.0` |
| TypeScript | Type-safe test and page object code | `^5.x` |
| Allure | Rich test reports with step-level history | `^3.9.0` |
| GitHub Actions | CI pipeline — smoke on every push / PR | — |
| Claude Code | AI agent orchestration | — |
| Node.js | Runtime | `20.x` |

---

## 4. Project Structure

```
eventHubAutomation_Agentic/
│
├── tests/                               # Playwright spec files — one file per feature
│   ├── Authentication/
│   │   └── auth.spec.ts                 ✅  49 tests  (smoke + sanity + regression)
│   ├── AdminEventManagement/
│   │   └── adminEvent.spec.ts           ✅  41 tests  (smoke + sanity + regression)
│   ├── BookingManagement/
│   │   └── booking.spec.ts              ✅  38 tests  (smoke + sanity + regression)
│   ├── EventBrowsing/
│   │   └── eventBrowsing.spec.ts        ✅  23 tests  (smoke + sanity + regression)
│   ├── SandboxLimits/
│   │   └── sandbox.spec.ts              ✅  13 tests  (smoke + sanity + regression)
│   └── SecurityAndIsolation/
│       └── crossUserSecurity.spec.ts    ✅  12 tests  (sanity + regression)
│
├── pages/                               # Page Object Model classes
│   ├── Authentication/
│   │   ├── LoginPage.ts
│   │   └── RegisterPage.ts
│   ├── AdminEventManagement/
│   │   └── AdminEventPage.ts
│   ├── BookingManagement/
│   │   └── BookingPage.ts
│   ├── EventBrowsing/
│   │   ├── EventsPage.ts
│   │   └── EventDetailPage.ts
│   ├── SandboxLimits/
│   │   └── SandboxPage.ts
│   └── SecurityAndIsolation/
│       └── CrossUserSecurityPage.ts
│
├── fixtures/                            # Test data — JSON, zero hardcoding in specs
│   ├── Authentication/auth.data.json
│   ├── AdminEventManagement/adminEvent.data.json
│   ├── BookingManagement/booking.data.json
│   ├── EventBrowsing/eventBrowsing.data.json
│   ├── SandboxLimits/sandbox.data.json
│   └── SecurityAndIsolation/crossUserSecurity.data.json
│
├── utils/
│   └── logger.ts                        # Structured logger (INFO / WARN / ERROR / DEBUG)
│
├── docs/                                # AI-generated scenario & strategy documents
│   ├── authScenarios.md                 # 51 scenarios
│   ├── adminScenarios.md                # 43 scenarios
│   ├── bookingScenarios.md              # 51 scenarios
│   ├── eventsScenarios.md               # 45 scenarios
│   ├── sandboxScenarios.md              # 31 scenarios
│   ├── crossUserSecurityScenarios.md    # 31 scenarios
│   └── test-strategy.md                 # Pyramid assignments for all 252 scenarios
│
├── .claude/
│   └── skills/                          # Custom AI agent definitions (see Section 5)
│
├── .github/
│   └── workflows/
│       └── smoke-tests.yml              # CI — runs @smoke on every push and PR
│
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. AI Agent System

The project uses **five custom AI agents** built as Claude Code skills. Each has a single well-defined responsibility. They operate as a pipeline — the output of one feeds the next.

---

### Agent 1 — `eventhub-domain`

> **Role:** The project's living encyclopedia. Every other agent reads this first.

- Documents all **business rules**: FIFO pruning, sandbox limits, seat calculation, price formula, refund eligibility, booking reference format
- Provides a full **API reference**: every endpoint, method, request body, response shape, and all HTTP error codes (including real-world gotchas like `400` vs `401` for invalid credentials)
- Describes every **user flow**: registration to multi-step booking to cross-user security scenarios
- Supplies **test data**: seeded static events, test credentials, booking reference regex

---

### Agent 2 — `create-scenarios`

> **Role:** Senior functional test designer who produces comprehensive scenario documents.

- Applies **6 thinking lenses** to every feature: Happy Path, Business Rules, Security, Negative / Error, Edge Cases, UI State
- Assigns **priority** (P0–P3) and **test type** (SMOKE / SANITY / REGRESSION) to every scenario
- Follows strict TC numbering: `TC-001–099` Happy Path · `TC-100–199` Business Rules · `TC-200–299` Security · `TC-300–399` Negative · `TC-400–499` Edge Cases · `TC-500–599` UI State
- **Output:** 252 scenarios across 6 features, documented in `docs/`

---

### Agent 3 — `test-strategy`

> **Role:** Test architect who decides the optimal pyramid layer for every scenario.

- Assigns each scenario to **Unit / API-Integration / E2E** using 6 decision rules
- Flags **anti-patterns** (e.g., testing API error codes at E2E; testing pure logic in the browser)
- Ensures **defense-in-depth**: critical business rules covered at multiple layers

```
Layer              Count    Avg Time    Total Time
─────────────────────────────────────────────────
Unit                   6      ~5ms          < 1s
API / Integration     78    ~300ms          ~25s
E2E (Playwright)      62      ~8s         ~8 min
─────────────────────────────────────────────────
Recommended total    146                ~8.5 min
```

---

### Agent 4 — `generate-tests`

> **Role:** Senior automation engineer who writes AND validates tests in a real browser.

- Reads domain knowledge, test strategy, existing specs, and existing POMs before writing a line
- Creates all three artifacts per feature: `fixtures/<Feature>/data.json` · `pages/<Feature>/<Page>.ts` · `tests/<Feature>/<feature>.spec.ts`
- Enforces **zero hardcoding** — all URLs, credentials, and payloads come from JSON fixtures
- **Write → Run → Debug → Fix** loop: tests are not considered done until they pass in a real browser
- Uses Playwright's `request` fixture for API-layer tests (no browser overhead)
- Tags every test with `@smoke`, `@sanity`, or `@regression`

---

### Agent 5 — `playwright-best-practices`

> **Role:** Coding standards guide. Every test-writing agent reads this before touching a file.

- Defines **locator priority**: `data-testid` > ARIA roles > labels > element IDs > CSS (last resort). XPath is banned.
- Enforces **POM rules**: all locators `readonly`, all methods `async`, no assertions inside page objects
- Defines **wait strategy**: `expect().toBeVisible()` auto-waiting — never `waitForTimeout()`
- Defines the **git branching workflow**: feature branches only, never commit directly to `main`

---

## 6. Test Architecture & Strategy

### Page Object Model

Every page or flow has a dedicated TypeScript class in `pages/<Feature>/`. Locators are defined once as `readonly` properties; tests compose actions through POM methods.

```typescript
const bookingPage = new BookingPage(page);
await bookingPage.gotoEventDetail(baseUrl, eventId);
await bookingPage.fillAndConfirmBooking({ customerName, customerEmail, customerPhone });
await expect(bookingPage.getBookingRefLocator()).toBeVisible();
```

### API-First Setup & Teardown

Every test that creates data uses a `try/finally` block to clean up via the API, even when assertions fail. This prevents cross-test pollution.

```typescript
const bookingId = await createBookingViaApi(request, token, payload);
try {
  // ... UI steps and assertions ...
} finally {
  await deleteBookingViaApi(request, token, bookingId);
}
```

### Hybrid UI + API Pattern

API for setup and teardown; UI only for the behaviour being validated. Keeps tests fast and focused.

```
API  ──►  Create test data         (fast, reliable setup)
 UI  ──►  Perform and assert       (the real test target)
API  ──►  Delete test data         (fast, reliable teardown)
```

### Structured Logging

Every step logs to console with timestamp and level. CI failures are readable at a glance without opening a report.

```
[2026-05-31T14:09:25.257Z] [INFO ] [BookingPage] Navigating to /events/3
[2026-05-31T14:09:27.552Z] [INFO ] [BookingManagement] TC-B002: Booking confirmed. Ref: "D-N7QS84"
```

---

## 7. Test Coverage

### Module Status — All 6 Complete

| Module | Scenarios Designed | Tests Implemented | Status |
|---|:---:|:---:|:---:|
| Authentication | 51 | 49 | ✅ Complete |
| Admin Event Management | 43 | 41 | ✅ Complete |
| Booking Management | 51 | 38 | ✅ Complete |
| Event Browsing | 45 | 23 | ✅ Complete |
| Sandbox Limits | 31 | 13 | ✅ Complete |
| Security & Isolation | 31 | 12 | ✅ Complete |
| **Total** | **252** | **176** | **✅ 100%** |

---

### Smoke Tests — Run on Every CI Push

| ID | Module | Test Description | Type |
|---|---|---|:---:|
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

### Key Business Rules Validated

| Business Rule | Test Case | Layer |
|---|---|:---:|
| Booking reference format: `[Letter]-[6 alphanumeric]` | TC-B108 | API |
| `totalPrice = eventPrice × quantity` | TC-B109 | API |
| Static events cannot be edited or deleted → 403 | TC-E106, TC-E107 | API |
| Cancel booking frees seats immediately | TC-B103 | API |
| 7th event triggers FIFO — oldest deleted, not alphabetical | Sandbox suite | API |
| FIFO-pruned event's bookings cascade-deleted | Sandbox suite | API |
| User A's bookings/events return 403 for User B | Security suite | API |
| POST /api/bookings without auth → 401 | TC-B110 | API |
| Clear all bookings triggers native confirm dialog | TC-B105 | UI |
| Refund eligibility check is client-side (4-second spinner) | TC-B106, TC-B107 | UI |

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

All configuration lives in `playwright.config.ts`. No environment variables are required — URLs and credentials are stored in `fixtures/<Feature>/<feature>.data.json`.

> **Security note:** For production setups, move credentials out of fixtures and into environment variables or a secrets manager.

---

## 9. Running Tests

```bash
# Run all tests
npm test

# Run by tag
npm run test:smoke          # Critical path — always run first
npm run test:sanity         # Core functionality verification
npm run test:regression     # Full coverage suite

# Run a single module
npx playwright test tests/BookingManagement/
npx playwright test tests/Authentication/
npx playwright test tests/AdminEventManagement/
npx playwright test tests/EventBrowsing/
npx playwright test tests/SandboxLimits/
npx playwright test tests/SecurityAndIsolation/

# Run a specific test by ID
npx playwright test --grep "TC-B001"

# Run with visible browser (local development)
npm run test:headed

# Launch interactive UI mode
npx playwright test --ui
```

---

## 10. Reports

### Playwright HTML Report

```bash
npm run report
# Opens test-results/index.html in your default browser
```

### Allure Report (rich, with history)

```bash
# Generate and open
npm run report:allure

# Serve live from result files
npm run report:allure:serve

# Run tests and open Allure automatically
npm run test:allure
```

Allure reports include:
- Test execution timeline and duration breakdown
- Step-by-step log output per test
- Screenshots on failure
- Video recordings on failure
- Playwright trace files for root-cause debugging

---

## 11. CI/CD Pipeline

GitHub Actions runs smoke tests automatically on **every push and every pull request** to any branch.

```
Trigger  ──►  push or PR to any branch
Runner   ──►  ubuntu-latest
Steps    ──►  checkout  →  setup Node 20  →  npm ci  →  install Chromium  →  npm run test:smoke
Artifact ──►  Playwright HTML report (retained 7 days)
Timeout  ──►  30 minutes
```

**Workflow file:** `.github/workflows/smoke-tests.yml`

The smoke suite acts as the merge gate. The full sanity and regression suites are intended to run locally before raising a PR, or on a nightly scheduled trigger.

---

## 12. Coding Standards

All standards are enforced by the `playwright-best-practices` agent and applied consistently across all six modules.

### File Conventions

- All files **must** be TypeScript (`.ts`). No `.js` files.
- One spec file per feature. Tags differentiate test types within the file.

```
tests/<Feature>/    → spec files only (.spec.ts)
pages/<Feature>/    → POM classes only
fixtures/<Feature>/ → JSON test data only
```

### Locator Priority

| Priority | Strategy | Example |
|:---:|---|---|
| 1 | `data-testid` (most stable) | `page.getByTestId('submit-btn')` |
| 2 | ARIA role | `page.getByRole('button', { name: 'Login' })` |
| 3 | Label / Placeholder | `page.getByLabel('Email')` |
| 4 | Element ID | `page.locator('#event-title')` |
| 5 | CSS (last resort) | `page.locator('.booking-card')` |
| ✗ | XPath — **banned** | never |

### Tagging

```typescript
test('TC-B001: create booking via API', { tag: '@smoke' },    async ({ request }) => { ... });
test('TC-B101: verify booking reference format', { tag: '@sanity' },    async ({ request }) => { ... });
test('TC-B301: booking with zero seats returns 400', { tag: '@regression' }, async ({ request }) => { ... });
```

### Wait Strategy

```typescript
// Correct — Playwright auto-waits
await expect(element).toBeVisible();
await expect(element).toHaveText('Booking Confirmed');

// Wrong — arbitrary sleep, never use
await page.waitForTimeout(2000);
```

### Data Management

Zero hardcoding. Every URL, credential, payload, event ID, and expected string lives in `fixtures/<Feature>/<feature>.data.json` and is imported at the top of the spec file.

---

## Acknowledgements

- Application under test: [EventHub by Rahul Shetty Academy](https://rahulshettyacademy.com)
- Test automation framework: [Playwright](https://playwright.dev)
- AI agent orchestration: [Claude Code by Anthropic](https://claude.ai/code)
