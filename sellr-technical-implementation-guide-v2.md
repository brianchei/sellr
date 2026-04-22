# Sellr — Technical Implementation Guide
### Phase 0: Foundation & Technical Setup
**Version 2.2 · April 2026 · Internal Use Only**

> *"The product is not defined by its AI features — it is defined by its close rate."*

---

## Table of Contents

- [Current repository baseline](#current-repository-baseline)
1. [Architecture Overview](#1-architecture-overview)
2. [Repository & Monorepo Setup](#2-repository--monorepo-setup)
3. [Shared Packages (`packages/`)](#3-shared-packages-packages)
4. [API Foundation (`apps/api/`)](#4-api-foundation-appsapi)
5. [Database: Supabase + PostGIS Setup](#5-database-supabase--postgis-setup)
6. [Redis + BullMQ Job Queue Setup](#6-redis--bullmq-job-queue-setup)
7. [Mobile App Foundation (`apps/mobile/`)](#7-mobile-app-foundation-appsmobile)
8. [Web App Foundation (`apps/web/`)](#8-web-app-foundation-appsweb)
9. [Infrastructure & Hosting Setup](#9-infrastructure--hosting-setup)
10. [CI/CD Pipeline](#10-cicd-pipeline)
11. [Search: Algolia Setup](#11-search-algolia-setup)
12. [Observability: Sentry, Logging, Analytics](#12-observability-sentry-logging-analytics)
13. [Secrets & Environment Management](#13-secrets--environment-management)
14. [Phase 0 Completion Checklist](#14-phase-0-completion-checklist)
15. [What Comes Next: Phase 1 Preview](#15-what-comes-next-phase-1-preview)

---

## Current repository baseline

This document now reflects the **checked-in Phase 0 baseline** for the monorepo. The table below calls out the current implementation for the most important platform decisions, plus a few informational rows where local setup can still vary.

| Area | Current repository baseline | Guide expectation |
|------|-----------------------------|-------------------|
| **Mobile** | **Expo SDK 55**; SDK 55-compatible `app.json`; `newArchEnabled` removed | Stay on Expo SDK 55-compatible package versions and config |
| **Web** | **Next.js 16**, **Tailwind 4** | Next.js 16, Tailwind 4 (App Router) |
| **ORM** | **Prisma 7** with `prisma.config.ts`, `prisma-client` generator + explicit output, generated client import path, and `@prisma/adapter-pg` at runtime | Keep Prisma 7 as the baseline for all new database work |
| **Local DB URL split** | Default local setup keeps both URLs on **54322** when the local pooler is **off** (see [§5](#5-database-supabase--postgis-setup)) | Use **54329** for `DATABASE_URL` and **54322** for `DIRECT_URL` only when the local pooler is **on** |
| **TypeScript (root)** | Root/tooling versions can still move independently from mobile's SDK-pinned TypeScript | Keep sample snippets on **5.9.x** when updating docs or examples |
| **CI step order** | CI may run **migrate** before other checks when the database schema is needed | Preferred local loop remains typecheck → lint → test, with migrate before schema-dependent checks |

> Prisma 7 and Expo SDK 55 are now part of the repo baseline. The remaining rows above are informational so local setup, CI ordering, and future tooling bumps do not get confused with incomplete platform migrations.

---

## 1. Architecture Overview

### Full Stack at a Glance

> **Phase 0 baseline:** The table below reflects the current implementation baseline in the checked-in monorepo. Prisma 7 and Expo SDK 55 are assumed throughout the guide.

| Layer | Technology | Why |
|---|---|---|
| Mobile | React Native (Expo SDK 55, managed workflow) | Single codebase for iOS + Android; EAS handles builds and OTA updates; Legacy Architecture support was removed in SDK 55 |
| Web | Next.js 16 (App Router) + Tailwind CSS 4 | SSR for SEO on listing pages; seller dashboard and B2B portal; React 19.2 support; Turbopack is the default compiler in dev and build |
| API | Node.js 22 LTS + Fastify v5 + Zod 4 | Fast, typed, schema-validated; manageable for a 2-person team; Node 22 brings native WebSocket client and Permission Model |
| Database | Supabase (PostgreSQL + PostGIS) | Managed Postgres with PostGIS pre-enabled; connection pooling via pgBouncer; set local `db.major_version` to match the hosted project |
| Cache / Queue | Redis (Upstash) + BullMQ | Job queue for AI pipeline, reminders, search sync; semantic caching for LLM cost reduction |
| Search | Algolia | Managed; typo tolerance; geosearch; community-scoped proxy |
| Object Storage | Cloudflare R2 (or AWS S3) | Zero egress cost (R2); presigned uploads; Cloudflare CDN for delivery |
| Realtime | Socket.IO (self-hosted on Fastify) | WebSocket rooms per conversation; MVP scale acceptable |
| AI (Vision) | OpenAI Responses API + GPT-5.4 / GPT-5.4-mini | Listing assistant, multimodal analysis, structured outputs |
| AI (Text) | Anthropic Claude Haiku 4.5 | Quick-reply classification; fast and cheap |
| Push Notifications | Expo Push (wraps FCM + APNs) | Free; works out-of-the-box with managed Expo workflow |
| Auth | Custom OTP via Twilio Verify + JWT | Phone-number-first, no passwords — Supabase Auth is not used |
| Hosting | Railway (API) + Supabase (Postgres) + Vercel (web) | Minimal ops; Supabase handles all database infrastructure |
| Monorepo | Turborepo | Shared packages; incremental builds; Remote Build Cache |
| Error Tracking | Sentry | Native Expo integration; session replay |
| Product Analytics | PostHog | Feature flags; A/B testing; funnels; self-hostable |

### Monorepo Topology

```
sellr/
├── apps/
│   ├── mobile/        ← Expo React Native (iOS + Android)
│   ├── web/           ← Next.js 16 App Router
│   └── api/           ← Fastify REST API (monolith)
├── packages/
│   ├── shared/        ← Domain types, Zod schemas, enums, formatters
│   ├── api-client/    ← React Query hooks + typed fetch functions
│   └── tsconfig/      ← Shared TypeScript config
├── turbo.json
├── package.json       ← Root workspace config
└── .env.example
```

### What Is Shared vs. Platform-Specific

| Package | Contents | Used By |
|---|---|---|
| `packages/shared` | TypeScript interfaces for all entities (User, Listing, Offer, Community, Meetup), Zod schemas, enums, constants, formatters | Both apps + API |
| `packages/api-client` | React Query hooks (`useListings`, `useOffer`, etc.), typed fetch functions, OTP auth state machine | Mobile + Web |
| `apps/mobile` | Camera, SecureStore, native navigation, push registration, maps | Mobile only |
| `apps/web` | Next.js pages/layouts, SSR, httpOnly cookie auth, Service Worker push | Web only |
| `apps/api` | BullMQ workers (AI pipeline, reminders, search sync), all business logic | API only |

> **React Native Web is explicitly NOT used for the Sellr web app.** The seller dashboard and B2B admin portal require a full-featured web framework. The code sharing value comes from `packages/shared` and `packages/api-client` — not UI components.

---

## 2. Repository & Monorepo Setup

### Step 1: Initialize the Turborepo Monorepo

```bash
# Create the monorepo from scratch (do not use a template — it adds unnecessary boilerplate)
mkdir sellr && cd sellr
git init
pnpm init

# Install Turborepo
pnpm add -D turbo

# Install root-level dev tools (ESLint 9 flat config approach)
pnpm add -D typescript eslint prettier @eslint/js typescript-eslint globals eslint-config-prettier eslint-plugin-prettier
```

> **Why ESLint 9?** ESLint 9 ships flat config by default. The legacy `.eslintrc` format no longer works without the compatibility layer. Using flat config (`eslint.config.mjs`) is cleaner, faster to load, and avoids the `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` split — the unified `typescript-eslint` package handles both.

### Step 2: Root `package.json`

```json
{
  "name": "sellr",
  "private": true,
  "packageManager": "pnpm@10",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:migrate": "pnpm --filter @sellr/api prisma migrate dev",
    "db:studio": "pnpm --filter @sellr/api prisma studio"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.9.0",
    "prettier": "^3.2.0",
    "eslint": "^9.0.0"
  }
}
```

> **Why pnpm 10?** pnpm 10 drops support for Node.js < 18, tightens workspace protocol resolution, and brings stricter dependency isolation. The `packageManager` field in `package.json` causes Corepack to auto-install the correct version — no manual install needed on CI.

### Step 3: `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

Turborepo 2.4 brings mature remote caching and improved parallel task scheduling. Enable Remote Build Cache by linking your Vercel account (`turbo link`) — this is particularly valuable on CI where cold builds can be 3-5x slower than cached ones.

### Step 4: ESLint 9 Flat Config (`eslint.config.mjs`)

Create this at the repo root. This replaces `.eslintrc.js`/`.eslintrc.json` entirely.

```js
// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default tseslint.config(
  // Base JS rules
  js.configs.recommended,

  // TypeScript rules (strict preset)
  ...tseslint.configs.strictTypeChecked,

  // Global ignores
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/*.js',        // Ignore compiled output
      'eslint.config.mjs',
    ],
  },

  // Main config for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Disable rules that conflict with Prettier
  prettier,
);
```

### Step 5: Shared TypeScript Config (`packages/tsconfig`)

```bash
mkdir -p packages/tsconfig
```

`packages/tsconfig/base.json`:
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",
    "isolatedModules": true
  }
}
```

`packages/tsconfig/package.json`:
```json
{
  "name": "@sellr/tsconfig",
  "version": "0.0.1",
  "private": true,
  "files": ["base.json", "nextjs.json", "react-native.json"]
}
```

**Verify it works:**
```bash
pnpm typecheck
# Should pass with 0 errors on the empty scaffold
```

---

## 3. Shared Packages (`packages/`)

### 3.1 `packages/shared` — Domain Types, Zod Schemas, Enums

This is the most important shared package. **All entity interfaces and validation schemas live here.** Both apps and the API import from this package, ensuring type consistency end-to-end.

```bash
mkdir -p packages/shared/src
```

`packages/shared/package.json`:
```json
{
  "name": "@sellr/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@sellr/tsconfig": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

> **Why Zod 4?** Zod 4 is a ground-up rewrite with 14x faster string parsing, 7x faster array parsing, 6.5x faster object parsing, and a 57% smaller core bundle. The unified `error` parameter replaces the old `message`/`invalid_type_error`/`required_error` split. The import path is still `import { z } from "zod"` with the new package. During migration from Zod 3, you can use `import { z } from "zod/v4"` to pin to the new API without breaking existing code.

`packages/shared/src/enums.ts`:
```typescript
export enum UserRole {
  Member = 'member',
  Admin = 'admin',
}

export enum CommunityType {
  Campus = 'campus',
  Coworking = 'coworking',
  Residential = 'residential',
}

export enum CommunityAccessMethod {
  InviteCode = 'invite_code',
  EmailDomain = 'email_domain',
}

export enum ListingStatus {
  Draft = 'draft',
  PendingReview = 'pending_review',
  Active = 'active',
  Sold = 'sold',
  Expired = 'expired',
}

export enum ListingCondition {
  LikeNew = 'like_new',
  Good = 'good',
  Fair = 'fair',
  ForParts = 'for_parts',
}

export enum OfferStatus {
  Pending = 'pending',
  Countered = 'countered',
  Accepted = 'accepted',
  Declined = 'declined',
  Expired = 'expired',
}

export enum MeetupStatus {
  Confirmed = 'confirmed',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Unresolved = 'unresolved',
}

export enum ConversationType {
  PreOffer = 'pre_offer',
  PostAcceptance = 'post_acceptance',
}

export enum ReportTargetType {
  Listing = 'listing',
  User = 'user',
  Message = 'message',
}

export enum ReportSeverity {
  Safety = 'safety',      // 2-hour SLA
  Quality = 'quality',    // 24-hour SLA
}

export enum UserFlagType {
  LateCancel = 'late_cancel',
  NoShow = 'no_show',
  ScamReport = 'scam_report',
}

export enum NotificationType {
  NewOffer = 'new_offer',
  OfferAccepted = 'offer_accepted',
  OfferCountered = 'offer_countered',
  OfferDeclined = 'offer_declined',
  MeetupReminder24h = 'meetup_reminder_24h',
  MeetupReminder2h = 'meetup_reminder_2h',
  NewMessage = 'new_message',
  ListingInquiry = 'listing_inquiry',
  RatingRequest = 'rating_request',
  NewMatch = 'new_match',
}
```

`packages/shared/src/types.ts`:
```typescript
import { 
  UserRole, CommunityType, CommunityAccessMethod, ListingStatus, 
  ListingCondition, OfferStatus, MeetupStatus, ConversationType,
  ReportTargetType, ReportSeverity, UserFlagType, NotificationType
} from './enums';

export interface User {
  id: string;
  phoneE164: string;
  displayName: string;
  avatarUrl: string | null;
  verifiedAt: string | null;
  deviceFingerprint: string | null;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  type: CommunityType;
  accessMethod: CommunityAccessMethod;
  emailDomain: string | null;
  rules: CommunityRule[];
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CommunityRule {
  id: string;
  ruleText: string;
  displayOrder: number;
  active: boolean;
}

export interface CommunityMember {
  userId: string;
  communityId: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'banned';
  joinedAt: string;
}

export interface AvailabilityWindow {
  dayOfWeek: number;       // 0 (Sun) - 6 (Sat)
  startHour: number;       // 0-23
  endHour: number;
  specificDate?: string;   // ISO date string for one-off windows
}

export interface Listing {
  id: string;
  communityId: string;
  sellerId: string;
  seller: UserReputation & Pick<User, 'displayName' | 'avatarUrl'>;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  condition: ListingCondition;
  conditionNote: string | null;
  price: number;
  negotiable: boolean;
  status: ListingStatus;
  locationRadiusM: number;
  locationNeighborhood: string;
  availabilityWindows: AvailabilityWindow[];
  photoUrls: string[];
  aiGenerated: boolean;
  distanceM?: number;     // Populated by search; not stored in DB
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  listingId: string;
  buyerId: string;
  sellerId: string;
  offeredPrice: number;
  requestedTime: string;   // ISO timestamp
  status: OfferStatus;
  counterCount: number;
  message: string | null;
  createdAt: string;
}

export interface Meetup {
  id: string;
  offerId: string;
  scheduledAt: string;
  locationSuggestion: SafeLocation;
  status: MeetupStatus;
  completedAt: string | null;
}

export interface SafeLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'police_station' | 'partner_lobby' | 'public_building';
}

export interface Rating {
  id: string;
  meetupId: string;
  raterId: string;
  rateeId: string;
  itemAccuracy: number;     // 1-5
  responsiveness: number;
  punctuality: number;
  note: string | null;
}

export interface UserReputation {
  userId: string;
  avgItemAccuracy: number;
  avgResponsiveness: number;
  avgPunctuality: number;
  transactionCount: number;
  noShowCount: number;
  lateCancelCount: number;
  responseRatePercent: number;
  avgResponseTimeMinutes: number;
  computedAt: string;
}

export interface Conversation {
  id: string;
  offerId: string | null;
  participantIds: string[];
  type: ConversationType;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  aiSuggested: boolean;
  safetyFlagged: boolean;
  createdAt: string;
}

export interface SavedSearch {
  id: string;
  userId: string;
  communityId: string;
  queryParams: SearchQueryParams;
  lastNotifiedAt: string | null;
}

export interface SearchQueryParams {
  q?: string;
  category?: string;
  subcategory?: string;
  condition?: ListingCondition[];
  minPrice?: number;
  maxPrice?: number;
  radiusM?: number;
  availableToday?: boolean;
  availableThisWeek?: boolean;
}

export interface Report {
  id: string;
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  severity: ReportSeverity;
  status: 'open' | 'in_review' | 'resolved' | 'dismissed';
  moderatorId: string | null;
  resolvedAt: string | null;
}

export interface InviteCode {
  id: string;
  communityId: string;
  code: string;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  createdBy: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  sentAt: string;
}
```

`packages/shared/src/schemas.ts` — Zod 4 validation schemas for all API inputs:
```typescript
import { z } from 'zod';
import { ListingCondition, CommunityType, CommunityAccessMethod } from './enums';

// Auth
export const SendOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Must be E.164 format'),
});

export const VerifyOTPSchema = z.object({
  phoneE164: z.string().regex(/^\+[1-9]\d{1,14}$/),
  code: z.string().length(6),
  deviceFingerprint: z.string().optional(),
});

export const JoinCommunitySchema = z.object({
  inviteCode: z.string().optional(),
  institutionalEmail: z.string().email().optional(),
}).refine(data => data.inviteCode || data.institutionalEmail, {
  // Zod 4: unified `error` field replaces `message`
  error: 'Either inviteCode or institutionalEmail is required',
});

// Listings
export const AvailabilityWindowSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  specificDate: z.string().datetime().optional(),
});

export const CreateListingSchema = z.object({
  communityId: z.string().uuid(),
  title: z.string().min(3).max(60),
  description: z.string().min(10).max(1000),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  condition: z.nativeEnum(ListingCondition),
  conditionNote: z.string().max(200).optional(),
  price: z.number().positive().multipleOf(0.01),
  negotiable: z.boolean().default(false),
  locationRadiusM: z.number().min(100).max(5000).default(1000),
  locationNeighborhood: z.string().max(100),
  availabilityWindows: z.array(AvailabilityWindowSchema).min(1).max(4),
  photoUrls: z.array(z.string().url()).min(1).max(8),
  aiGenerated: z.boolean().default(false),
});

// Offers
export const CreateOfferSchema = z.object({
  listingId: z.string().uuid(),
  offeredPrice: z.number().positive().multipleOf(0.01),
  requestedTime: z.string().datetime(),
  message: z.string().max(300).optional(),
});

export const RespondToOfferSchema = z.object({
  action: z.enum(['accept', 'decline', 'counter']),
  counterPrice: z.number().positive().optional(),
  counterTime: z.string().datetime().optional(),
}).refine(data => {
  if (data.action === 'counter') {
    return data.counterPrice !== undefined || data.counterTime !== undefined;
  }
  return true;
}, { error: 'Counter requires a new price or time' });

// Ratings
export const CreateRatingSchema = z.object({
  meetupId: z.string().uuid(),
  rateeId: z.string().uuid(),
  itemAccuracy: z.number().min(1).max(5).int(),
  responsiveness: z.number().min(1).max(5).int(),
  punctuality: z.number().min(1).max(5).int(),
  note: z.string().max(500).optional(),
});

// Search
export const SearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  condition: z.string().optional(),      // Comma-separated ListingCondition values
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  radiusM: z.coerce.number().min(100).max(50000).default(5000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  availableToday: z.coerce.boolean().optional(),
  page: z.coerce.number().min(1).default(1),
  hitsPerPage: z.coerce.number().min(1).max(50).default(20),
});
```

### 3.2 `packages/api-client` — React Query Hooks

This package provides typed, reusable data-fetching hooks shared between mobile and web.

```bash
mkdir -p packages/api-client/src
```

`packages/api-client/package.json`:
```json
{
  "name": "@sellr/api-client",
  "version": "0.0.1",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@sellr/shared": "workspace:*",
    "@tanstack/react-query": "^5.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@sellr/tsconfig": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

`packages/api-client/src/fetch.ts` — The base fetch client:
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL 
  ?? process.env.NEXT_PUBLIC_API_URL 
  ?? 'http://localhost:3001';

interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  error?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function apiFetch<T>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1${path}`, {
    ...options,
    headers,
    credentials: 'include',   // For web httpOnly cookie refresh
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(res.status, body.error ?? 'Request failed');
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}
```

### 3.3 AI Structured Output Schemas

The Vercel AI SDK and Instructor patterns require Zod schemas to constrain LLM outputs. Define these in `packages/shared` so the API workers and any future edge functions share the same contracts. This replaces brittle "output JSON" prompting with guaranteed-valid structured generation.

```typescript
// packages/shared/src/ai-schemas.ts

import { z } from 'zod';
import { ListingCondition } from './enums';

// AI Listing Assistant — OpenAI multimodal structured output
// Pin the exact model in config (for example gpt-5.4 for highest quality or
// gpt-5.4-mini for lower-latency, cost-sensitive production paths).
export const AIListingDraftSchema = z.object({
  title: z.string().min(3).max(60),
  description: z.string().min(10).max(1000),
  category: z.string(),
  subcategory: z.string().optional(),
  condition: z.nativeEnum(ListingCondition),
  conditionNote: z.string().max(200).optional(),
  suggestedPrice: z.number().positive(),
  priceConfidence: z.enum(['high', 'medium', 'low']),
  concerns: z.array(z.string()),   // Safety or quality concerns flagged by AI
});

export type AIListingDraft = z.infer<typeof AIListingDraftSchema>;

// AI Quick-Reply — Claude Haiku structured output
// Pin the latest generally available Haiku alias or snapshot at implementation time.
// Used by the quickReply job to classify and draft buyer messages
export const AIQuickReplySchema = z.object({
  intent: z.enum(['price_inquiry', 'availability_check', 'condition_question', 'meetup_request', 'other']),
  suggestedReplies: z.array(z.string().max(200)).min(1).max(3),
  urgency: z.enum(['high', 'normal', 'low']),
});

export type AIQuickReply = z.infer<typeof AIQuickReplySchema>;

// Image Forensics — structured risk assessment
export const ImageForensicsResultSchema = z.object({
  riskLevel: z.enum(['none', 'low', 'medium', 'high']),
  flags: z.array(z.enum([
    'watermark_detected',
    'stock_photo_likely',
    'metadata_mismatch',
    'off_platform_contact',
    'price_too_low',
    'counterfeit_indicator',
  ])),
  autoApprove: z.boolean(),    // true when riskLevel === 'none' or 'low'
  moderatorNote: z.string().optional(),
});

export type ImageForensicsResult = z.infer<typeof ImageForensicsResultSchema>;
```

> **Structured Generation Pattern:** Pass the Zod schema directly to the Vercel AI SDK's `generateObject()` or use it with Instructor (`instructor.chat.completions.create({ response_model: { schema: AIListingDraftSchema } })`). Never rely on prompt-only JSON instructions — structured generation guarantees the output matches your TypeScript types and eliminates parse errors in the worker pipeline.

> **2-Second Latency Budget:** Any AI-generated response surfaced to a user (quick-reply suggestions, listing assist preview) must either resolve within 2 seconds or show a loading state. Research consistently shows that latency above 2 seconds degrades perceived intelligence. The BullMQ queue architecture handles this: the user receives an optimistic UI immediately, and the AI response is pushed via Socket.IO when the job resolves. Do not block the HTTP response on AI calls.

> **Prompt Versioning:** Prompts for the AI listing assistant, quick-reply, and image forensics should be version-controlled as TypeScript constants (or loaded from a `prompts/` directory) — never hardcoded inline in worker files. This enables blue-green prompt deployment: new prompt versions can be shadowed against production traffic before cutover, and rolled back in seconds without a code deploy.

---

## 4. API Foundation (`apps/api/`)

### Step 1: Initialize Fastify App

```bash
mkdir -p apps/api/src/{modules,jobs,middleware,plugins,lib}
cd apps/api
pnpm init
pnpm add fastify @fastify/cors @fastify/helmet @fastify/rate-limit @fastify/jwt @fastify/cookie @fastify/multipart fastify-plugin
pnpm add zod @fastify/type-provider-zod
pnpm add @prisma/client @prisma/adapter-pg pg
pnpm add bullmq ioredis
pnpm add socket.io
pnpm add pino pino-pretty
pnpm add twilio
pnpm add openai @anthropic-ai/sdk
pnpm add -D prisma dotenv typescript tsx @types/node vitest @vitest/coverage-v8
```

> **Why Fastify v5?** Fastify v5 requires Node.js 20+ (we're on 22), delivers ~5-10% throughput improvement, adds Diagnostics Channel API support for better observability hooks, and makes full JSON Schema required for all route inputs — which aligns with our Zod-everywhere approach via `@fastify/type-provider-zod`. Note: `.listen()` now only accepts an options object (no positional `port, host` arguments).

`apps/api/package.json`:
```json
{
  "name": "@sellr/api",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "prisma generate && tsc",
    "start": "node dist/index.js",
    "typecheck": "prisma generate && tsc --noEmit",
    "test": "vitest run",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio",
    "db:seed": "prisma db seed"
  }
}
```

### Step 2: Entry Point `apps/api/src/index.ts`

> **Consistency note (v1 fix):** The original guide imported `TypeBoxTypeProvider` from `@fastify/type-provider-typebox` but installed `@fastify/type-provider-zod`. This inconsistency is corrected here — we use Zod everywhere. `ZodTypeProvider` is the right choice since all schemas in `packages/shared` are Zod schemas.

```typescript
import Fastify from 'fastify';
import { ZodTypeProvider, serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod';
import { Server } from 'socket.io';
import { createServer } from 'http';

import { corsPlugin } from './plugins/cors';
import { jwtPlugin } from './plugins/jwt';
import { rateLimitPlugin } from './plugins/rateLimit';
import { authRoutes } from './modules/auth/routes';
import { listingRoutes } from './modules/listings/routes';
import { offerRoutes } from './modules/offers/routes';
import { meetupRoutes } from './modules/meetups/routes';
import { messageRoutes } from './modules/messages/routes';
import { searchRoutes } from './modules/search/routes';
import { communityRoutes } from './modules/communities/routes';
import { reportRoutes } from './modules/reports/routes';
import { notificationRoutes } from './modules/notifications/routes';
import { initSocketIO } from './lib/socket';
import { initBullMQ } from './lib/queue';
import { logger } from './lib/logger';
import * as Sentry from '@sentry/node';

// Initialize Sentry before anything else so it can capture startup errors
import './lib/sentry';

const fastify = Fastify({
  logger,
  trustProxy: true,        // Required when behind Railway/Vercel proxy
})
  .withTypeProvider<ZodTypeProvider>()
  .setValidatorCompiler(validatorCompiler)
  .setSerializerCompiler(serializerCompiler);

// Global error handler — catches all unhandled errors, reports to Sentry
fastify.setErrorHandler((error, request, reply) => {
  // Report to Sentry (5xx errors only — 4xx are expected client errors)
  if (!error.statusCode || error.statusCode >= 500) {
    Sentry.captureException(error, {
      tags: { route: request.routeOptions?.url ?? 'unknown' },
      user: { id: request.user?.sub },
    });
  }

  fastify.log.error({ err: error, req: request.id }, 'Unhandled error');

  const statusCode = error.statusCode ?? 500;
  reply.status(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    code: error.code,
  });
});

// Create HTTP server for Socket.IO
const httpServer = createServer(fastify.server);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  },
});

async function start() {
  // Plugins (order matters)
  await fastify.register(corsPlugin);
  await fastify.register(jwtPlugin);
  await fastify.register(rateLimitPlugin);

  // Health check (unauthenticated)
  fastify.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // API routes
  await fastify.register(authRoutes,         { prefix: '/api/v1/auth' });
  await fastify.register(communityRoutes,    { prefix: '/api/v1/communities' });
  await fastify.register(listingRoutes,      { prefix: '/api/v1/listings' });
  await fastify.register(searchRoutes,       { prefix: '/api/v1/search' });
  await fastify.register(offerRoutes,        { prefix: '/api/v1/offers' });
  await fastify.register(meetupRoutes,       { prefix: '/api/v1/meetups' });
  await fastify.register(messageRoutes,      { prefix: '/api/v1/messages' });
  await fastify.register(reportRoutes,       { prefix: '/api/v1/reports' });
  await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' });

  // Initialize Socket.IO and BullMQ workers
  initSocketIO(io);
  await initBullMQ();

  const port = parseInt(process.env.PORT ?? '3001');
  // Fastify v5: .listen() only accepts an options object
  await fastify.listen({ port, host: '0.0.0.0' });
  fastify.log.info(`API running on port ${port}`);
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
```

### Step 3: Standard API Response Envelope

All API responses follow this structure. Define it once in `apps/api/src/lib/response.ts`:

```typescript
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export function ok<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, meta };
}

export function paginated<T>(
  data: T[], 
  page: number, 
  total: number, 
  perPage: number
): ApiResponse<T[]> {
  return {
    data,
    meta: { page, total, perPage, totalPages: Math.ceil(total / perPage) },
  };
}
```

### Step 4: Auth Middleware

`apps/api/src/middleware/auth.ts`:
```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma';

export interface JWTPayload {
  sub: string;           // user ID
  communityIds: string[];
  role: Record<string, string>;  // { communityId: role }
  iat: number;
  exp: number;
}

// Decorate Fastify request with user data
declare module 'fastify' {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

// Checks that the user is a member of the requested community
// Community ID can come from URL params, query string, or body
export async function requireCommunityMembership(
  request: FastifyRequest<{ Params?: { communityId?: string } }>,
  reply: FastifyReply
) {
  const communityId = request.params?.communityId 
    ?? (request.body as { communityId?: string })?.communityId;

  if (!communityId) return;   // Endpoint doesn't require community scope

  const isMember = request.user.communityIds.includes(communityId);
  if (!isMember) {
    reply.code(403).send({ error: 'Not a member of this community' });
  }
}
```

### Step 5: Rate Limiting Plugin

`apps/api/src/plugins/rateLimit.ts`:
```typescript
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { redis } from '../lib/redis';

export const rateLimitPlugin = fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => req.user?.sub ?? req.ip,
    errorResponseBuilder: () => ({
      error: 'Too many requests. Please slow down.',
    }),
  });

  // Stricter limit for OTP sends
  fastify.addHook('onRequest', async (req, reply) => {
    if (req.url.includes('/auth/otp/send')) {
      // 5 OTP requests per phone number per hour — enforced in route handler via Redis
    }
  });
});
```

**Verify it works:**
```bash
curl http://localhost:3001/health
# → {"status":"ok","ts":"2026-04-..."}
```

---

## 5. Database: Supabase + PostGIS Setup

Supabase provides a fully managed PostgreSQL instance with PostGIS pre-installed, a connection pooler (pgBouncer), automatic daily backups, a web dashboard, and Row Level Security. It replaces a self-managed Postgres container in both local development and production.

**Why Supabase over plain Postgres on Railway:**
- PostGIS is enabled by default — no manual extension setup or raw migrations needed for geospatial support
- pgBouncer connection pooling is included — critical for serverless and concurrent workloads
- The Supabase CLI spins up a local stack (Postgres + PostGIS + Studio UI) that is byte-for-byte compatible with the hosted project
- Backups, point-in-time recovery, and branching are managed for you
- Supabase Auth, Storage, and Realtime are available if needed in later phases — but are **not used at MVP** (custom OTP auth via Twilio, Cloudflare R2 for storage, Socket.IO for realtime)

> **What Supabase Auth is NOT used for:** Sellr uses a custom phone OTP flow via Twilio Verify + JWT. Do not route auth through Supabase Auth — it doesn't natively support the phone-verified, community-gated identity model Sellr requires.

### Step 1: Install the Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or install it in the repo and invoke it locally
pnpm add -D supabase

# Verify
pnpm exec supabase --version
```

> **CLI install note:** The current Supabase docs support `npx supabase ...` / `pnpm exec supabase ...`, local dev dependency installs, or Homebrew / Scoop / standalone binaries. Global `npm install -g supabase` is no longer supported.

### Step 2: Initialize Supabase in the Monorepo

Run this from the `apps/api/` directory — Supabase config lives alongside the API since that's where migrations and database logic live.

```bash
cd apps/api
pnpm exec supabase init
```

This creates `apps/api/supabase/` with:
```
apps/api/supabase/
├── config.toml          ← Local dev configuration
├── migrations/          ← SQL migration files (alongside Prisma migrations)
└── seed.sql             ← Optional: seed data for local dev
```

### Step 3: Local Development with `supabase start`

The Supabase CLI starts a full local stack using Docker. This **replaces** the `postgis/postgis` container from docker-compose — Redis is still managed separately.

`docker-compose.yml` at repo root (Redis only — Postgres is handled by Supabase CLI):
```yaml
version: '3.9'

services:
  redis:
    image: redis:7-alpine
    container_name: sellr_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

```bash
# Start Redis
docker compose up -d

# Start the full Supabase local stack (Postgres + PostGIS + Studio)
cd apps/api
pnpm exec supabase start
```

`supabase start` outputs all local connection details:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio: http://localhost:54323        ← Web UI for browsing tables
Inbucket: http://localhost:54324      ← Local email testing
```

Use the `DB URL` as your direct connection string in local development.

> **Postgres version note:** Do not hardcode PostgreSQL 16 in this guide or your local config. Current Supabase CLI docs default `db.major_version` to `15`, and the correct value is whichever major version your hosted Supabase project uses. Set `apps/api/supabase/config.toml` to match the hosted project after creation.

> **Local pooler note:** Current Supabase CLI defaults `db.pooler.enabled = false`. If you want local parity with hosted Supabase's pooled runtime connection, enable it explicitly in `apps/api/supabase/config.toml`:
>
> ```toml
> [db.pooler]
> enabled = true
> port = 54329
> pool_mode = "transaction"
> ```

**Verify PostGIS is available (it is, by default in Supabase):**
```bash
pnpm exec supabase db execute --local "SELECT PostGIS_Version();"
# Returns something like: 3.4.0 ...
```

### Step 4: Prisma Schema — Supabase-Specific Configuration

Prisma still requires **two connection contexts** when used with Supabase:
- `DATABASE_URL` → the pooled runtime connection string used by the API at request time
- `DIRECT_URL` → the direct Postgres connection string used by Prisma CLI for migrations and Studio

This is because pgBouncer's transaction-mode pooling is incompatible with Prisma Migrate.

> **Prisma 7 baseline in this repo:** Sellr now uses the Prisma 7 setup recommended in current docs:
> - use the `prisma-client` generator
> - add an explicit `output` path for the generated client
> - move datasource URL configuration into `prisma.config.ts`
> - load env vars explicitly for Prisma CLI
> - instantiate Prisma Client with a driver adapter such as `@prisma/adapter-pg`

`apps/api/prisma/schema.prisma` top block:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // Prisma 7 deprecates url/directUrl in schema.prisma.
  // Configure datasource URLs in prisma.config.ts instead.
}
```

`apps/api/prisma.config.ts`:
```typescript
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

for (const p of [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../../.env.local'),
  resolve(process.cwd(), '../../.env'),
]) {
  if (existsSync(p)) {
    loadEnv({ path: p });
  }
}

// Keep Prisma CLI usable when local development intentionally uses one URL.
if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Prisma CLI uses the direct connection for migrations and Studio.
    url: env('DIRECT_URL'),
  },
});
```

**Local `.env` values** (from `supabase start` output):

> **Note for Next.js (web app):** Next.js uses `.env.local` (not `.env`) for local overrides that are git-ignored. The `.env.example` at the repo root documents all variables; each app reads from its own `.env.local` during local development.

```bash
# Current repo default: local pooler off
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?connection_limit=1"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

If you enable the local pooler for parity testing, switch to the pooled/direct split below:

```bash
# Optional local pooler-on setup
DATABASE_URL="postgresql://postgres:postgres@localhost:54329/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

**Hosted Supabase `.env` values** (from the Supabase dashboard → Settings → Database):
```bash
# Transaction mode pooler (port 6543) — for runtime
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (port 5432) — for Prisma migrate only
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```

### Step 5: Full Prisma Schema

The Prisma schema entities, enums, indexes, and relations are unchanged from the domain model. The Prisma-7-specific differences from a plain-Postgres setup are: (1) the generator uses `provider = "prisma-client"` with an explicit `output`, (2) datasource URLs move to `prisma.config.ts`, and (3) runtime clients use a database driver adapter instead of the old built-in engine configuration.

```bash
# Generate Prisma client after schema changes
pnpm --filter @sellr/api prisma generate

# Run migrations against local Supabase
pnpm --filter @sellr/api prisma migrate dev --name init

# Open Prisma Studio (or use Supabase Studio at localhost:54323)
pnpm --filter @sellr/api prisma studio
```

`apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // URLs are configured in prisma.config.ts in Prisma 7.
  // PostGIS is enabled by default in all Supabase projects.
  // No extensions config needed. For non-Supabase Postgres, enable via raw SQL migration.
}

// ─── Users ──────────────────────────────────────────────────────────────────

model User {
  id                  String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  phoneE164           String    @unique @map("phone_e164") @db.VarChar(20)
  displayName         String    @map("display_name") @db.VarChar(100)
  avatarUrl           String?   @map("avatar_url")
  verifiedAt          DateTime? @map("verified_at")
  deviceFingerprint   String?   @map("device_fingerprint")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")

  communityMembers    CommunityMember[]
  listings            Listing[]
  buyerOffers         Offer[]   @relation("BuyerOffers")
  sellerOffers        Offer[]   @relation("SellerOffers")
  ratingsGiven        Rating[]  @relation("RatingsGiven")
  ratingsReceived     Rating[]  @relation("RatingsReceived")
  messages            Message[]
  savedSearches       SavedSearch[]
  reports             Report[]
  reputation          UserReputation?
  flags               UserFlag[]
  notifications       Notification[]

  @@map("users")
}

// ─── Communities ─────────────────────────────────────────────────────────────

model Community {
  id            String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name          String                @db.VarChar(100)
  type          CommunityType
  accessMethod  CommunityAccessMethod @map("access_method")
  emailDomain   String?               @map("email_domain") @db.VarChar(100)
  rules         Json                  @default("[]")   // CommunityRule[]
  status        String                @default("active")
  createdAt     DateTime              @default(now()) @map("created_at")

  members       CommunityMember[]
  listings      Listing[]
  inviteCodes   InviteCode[]
  savedSearches SavedSearch[]

  @@map("communities")
}

enum CommunityType {
  campus
  coworking
  residential
}

enum CommunityAccessMethod {
  invite_code
  email_domain
}

model CommunityMember {
  userId      String    @map("user_id") @db.Uuid
  communityId String    @map("community_id") @db.Uuid
  role        String    @default("member")   // member | admin
  status      String    @default("active")   // active | suspended | banned
  joinedAt    DateTime  @default(now()) @map("joined_at")

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  community   Community @relation(fields: [communityId], references: [id], onDelete: Cascade)

  @@id([userId, communityId])
  @@index([communityId])
  @@map("community_members")
}

model InviteCode {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  communityId String    @map("community_id") @db.Uuid
  code        String    @unique @db.VarChar(20)
  maxUses     Int?      @map("max_uses")
  useCount    Int       @default(0) @map("use_count")
  expiresAt   DateTime? @map("expires_at")
  createdBy   String    @map("created_by") @db.Uuid

  community   Community @relation(fields: [communityId], references: [id])

  @@index([code])
  @@map("invite_codes")
}

// ─── Listings ────────────────────────────────────────────────────────────────

model Listing {
  id                   String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  communityId          String        @map("community_id") @db.Uuid
  sellerId             String        @map("seller_id") @db.Uuid
  title                String        @db.VarChar(60)
  description          String        @db.Text
  category             String        @db.VarChar(50)
  subcategory          String?       @db.VarChar(50)
  condition            ListingCondition
  conditionNote        String?       @map("condition_note") @db.VarChar(200)
  price                Decimal       @db.Decimal(10, 2)
  negotiable           Boolean       @default(false)
  status               ListingStatus @default(draft)
  locationNeighborhood String        @map("location_neighborhood") @db.VarChar(100)
  locationRadiusM      Int           @default(1000) @map("location_radius_m")
  // PostGIS POINT column — managed via raw SQL migration, not Prisma
  // locationGeom is handled via $queryRaw for geo queries
  availabilityWindows  Json          @map("availability_windows")  // AvailabilityWindow[]
  photoUrls            Json          @map("photo_urls")             // string[] ordered
  aiGenerated          Boolean       @default(false) @map("ai_generated")
  createdAt            DateTime      @default(now()) @map("created_at")
  updatedAt            DateTime      @updatedAt @map("updated_at")

  community   Community @relation(fields: [communityId], references: [id])
  seller      User      @relation(fields: [sellerId], references: [id])
  offers      Offer[]

  @@index([communityId])
  @@index([sellerId])
  @@index([status])
  @@index([communityId, status])
  @@map("listings")
}

enum ListingStatus {
  draft
  pending_review
  active
  sold
  expired
}

enum ListingCondition {
  like_new
  good
  fair
  for_parts
}

// ─── Offers ──────────────────────────────────────────────────────────────────

model Offer {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  listingId     String      @map("listing_id") @db.Uuid
  buyerId       String      @map("buyer_id") @db.Uuid
  sellerId      String      @map("seller_id") @db.Uuid
  offeredPrice  Decimal     @map("offered_price") @db.Decimal(10, 2)
  requestedTime DateTime    @map("requested_time")
  status        OfferStatus @default(pending)
  counterCount  Int         @default(0) @map("counter_count")
  message       String?     @db.VarChar(300)
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  listing       Listing     @relation(fields: [listingId], references: [id])
  buyer         User        @relation("BuyerOffers", fields: [buyerId], references: [id])
  seller        User        @relation("SellerOffers", fields: [sellerId], references: [id])
  meetup        Meetup?
  conversation  Conversation?

  @@index([listingId])
  @@index([buyerId])
  @@index([sellerId])
  @@index([status])
  @@map("offers")
}

enum OfferStatus {
  pending
  countered
  accepted
  declined
  expired
}

// ─── Meetups ─────────────────────────────────────────────────────────────────

model Meetup {
  id                 String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  offerId            String       @unique @map("offer_id") @db.Uuid
  scheduledAt        DateTime     @map("scheduled_at")
  locationSuggestion Json         @map("location_suggestion")  // SafeLocation
  status             MeetupStatus @default(confirmed)
  completedAt        DateTime?    @map("completed_at")

  offer    Offer    @relation(fields: [offerId], references: [id])
  ratings  Rating[]

  @@map("meetups")
}

enum MeetupStatus {
  confirmed
  completed
  cancelled
  unresolved
}

// ─── Ratings ─────────────────────────────────────────────────────────────────

model Rating {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  meetupId       String   @map("meetup_id") @db.Uuid
  raterId        String   @map("rater_id") @db.Uuid
  rateeId        String   @map("ratee_id") @db.Uuid
  itemAccuracy   Int      @map("item_accuracy")
  responsiveness Int
  punctuality    Int
  note           String?  @db.VarChar(500)
  createdAt      DateTime @default(now()) @map("created_at")

  meetup  Meetup @relation(fields: [meetupId], references: [id])
  rater   User   @relation("RatingsGiven", fields: [raterId], references: [id])
  ratee   User   @relation("RatingsReceived", fields: [rateeId], references: [id])

  @@unique([meetupId, raterId])   // One rating per rater per meetup
  @@map("ratings")
}

model UserReputation {
  userId              String   @id @map("user_id") @db.Uuid
  avgItemAccuracy     Decimal  @default(0) @map("avg_item_accuracy") @db.Decimal(3, 2)
  avgResponsiveness   Decimal  @default(0) @map("avg_responsiveness") @db.Decimal(3, 2)
  avgPunctuality      Decimal  @default(0) @map("avg_punctuality") @db.Decimal(3, 2)
  transactionCount    Int      @default(0) @map("transaction_count")
  noShowCount         Int      @default(0) @map("no_show_count")
  lateCancelCount     Int      @default(0) @map("late_cancel_count")
  responseRatePct     Decimal  @default(0) @map("response_rate_pct") @db.Decimal(5, 2)
  avgResponseTimeMin  Decimal  @default(0) @map("avg_response_time_min") @db.Decimal(8, 2)
  computedAt          DateTime @default(now()) @map("computed_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_reputation")
}

// ─── Messaging ───────────────────────────────────────────────────────────────

model Conversation {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  offerId        String?          @unique @map("offer_id") @db.Uuid
  participantIds String[]         @map("participant_ids") @db.Uuid
  type           ConversationType @default(pre_offer)
  createdAt      DateTime         @default(now()) @map("created_at")

  offer    Offer?    @relation(fields: [offerId], references: [id])
  messages Message[]

  @@map("conversations")
}

enum ConversationType {
  pre_offer
  post_acceptance
}

model Message {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  conversationId String   @map("conversation_id") @db.Uuid
  senderId       String   @map("sender_id") @db.Uuid
  content        String   @db.Text
  aiSuggested    Boolean  @default(false) @map("ai_suggested")
  safetyFlagged  Boolean  @default(false) @map("safety_flagged")
  createdAt      DateTime @default(now()) @map("created_at")

  conversation Conversation @relation(fields: [conversationId], references: [id])
  sender       User         @relation(fields: [senderId], references: [id])

  @@index([conversationId, createdAt])
  @@map("messages")
}

// ─── Search ──────────────────────────────────────────────────────────────────

model SavedSearch {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  communityId     String   @map("community_id") @db.Uuid
  queryParams     Json     @map("query_params")  // SearchQueryParams
  lastNotifiedAt  DateTime? @map("last_notified_at")
  createdAt       DateTime @default(now()) @map("created_at")

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  community Community @relation(fields: [communityId], references: [id])

  @@map("saved_searches")
}

// ─── Trust & Safety ──────────────────────────────────────────────────────────

model Report {
  id          String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  reporterId  String         @map("reporter_id") @db.Uuid
  targetId    String         @map("target_id") @db.Uuid
  targetType  ReportTargetType @map("target_type")
  reason      String         @db.VarChar(500)
  severity    ReportSeverity
  status      String         @default("open")
  moderatorId String?        @map("moderator_id") @db.Uuid
  resolvedAt  DateTime?      @map("resolved_at")
  createdAt   DateTime       @default(now()) @map("created_at")

  reporter User @relation(fields: [reporterId], references: [id])

  @@index([status, severity])
  @@map("reports")
}

enum ReportTargetType {
  listing
  user
  message
}

enum ReportSeverity {
  safety
  quality
}

model UserFlag {
  id            String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId        String      @map("user_id") @db.Uuid
  flagType      UserFlagType @map("flag_type")
  count         Int         @default(1)
  lastOccurredAt DateTime   @default(now()) @map("last_occurred_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, flagType])
  @@map("user_flags")
}

enum UserFlagType {
  late_cancel
  no_show
  scam_report
}

// ─── Notifications ───────────────────────────────────────────────────────────

model Notification {
  id        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String           @map("user_id") @db.Uuid
  type      NotificationType
  payload   Json
  readAt    DateTime?        @map("read_at")
  sentAt    DateTime         @default(now()) @map("sent_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, sentAt])
  @@map("notifications")
}

enum NotificationType {
  new_offer
  offer_accepted
  offer_countered
  offer_declined
  meetup_reminder_24h
  meetup_reminder_2h
  new_message
  listing_inquiry
  rating_request
  new_match
}
```

### Step 6: PostGIS Geospatial Column

PostGIS is already enabled in every Supabase project. No `CREATE EXTENSION` step is needed. The raw SQL migration for the `location_geom` column is still required since Prisma doesn't manage PostGIS geometry columns natively.

Create a Prisma migration that adds the geometry column and index:

```bash
# Create a named empty migration
pnpm --filter @sellr/api prisma migrate dev --name add_postgis_location --create-only
```

Then edit the generated migration file at `apps/api/prisma/migrations/TIMESTAMP_add_postgis_location/migration.sql`:

```sql
-- PostGIS is already enabled in Supabase — no CREATE EXTENSION needed

-- Add geospatial location column to listings
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS location_geom geometry(Point, 4326);

-- GIST index for fast radius queries
CREATE INDEX IF NOT EXISTS listings_location_geom_idx 
ON listings USING GIST (location_geom);

-- Compound index for community-scoped active listing geo queries
CREATE INDEX IF NOT EXISTS listings_community_status_geom_idx
ON listings (community_id, status)
WHERE status = 'active';
```

Apply it:
```bash
pnpm --filter @sellr/api prisma migrate dev
```

**Using PostGIS for radius filtering** (raw query — unchanged from v1):
```typescript
// apps/api/src/modules/listings/repository.ts
async function findListingsNearby(params: {
  communityId: string;
  lat: number;
  lng: number;
  radiusM: number;
}) {
  return prisma.$queryRaw<Listing[]>`
    SELECT l.*, 
           ST_Distance(
             l.location_geom::geography, 
             ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
           ) AS distance_m
    FROM listings l
    WHERE l.community_id = ${params.communityId}::uuid
      AND l.status = 'active'
      AND ST_DWithin(
        l.location_geom::geography,
        ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
        ${params.radiusM}
      )
    ORDER BY distance_m ASC
    LIMIT 50
  `;
}
```

### Step 7: Prisma Client Singleton

```typescript
// apps/api/src/lib/prisma.ts
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { loadDatabaseEnv } from './loadDatabaseEnv';

loadDatabaseEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const adapter = new PrismaPg({ connectionString });

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'info', 'warn', 'error'] 
      : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Step 8: Supabase Row Level Security (RLS)

Supabase enables RLS on all tables by default. Since Sellr enforces community data isolation at the **API middleware layer** (not via RLS), you need to either disable RLS on all tables or create a permissive policy that allows the service role (used by Prisma) full access.

**Recommended approach:** Use the Supabase **service role key** in the API (not the anon key). The service role bypasses RLS entirely, which is correct here — access control is enforced in Fastify middleware, not the database layer.

Add to your Supabase migration or run once in the dashboard SQL editor:

```sql
-- Allow service role full access (Prisma uses this role via the connection string)
-- RLS enforcement happens at the API layer via requireCommunityMembership middleware

-- If you want to be explicit, create bypass policies per table:
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_bypass" ON listings
  USING (auth.role() = 'service_role');

-- Repeat for each table, or simply keep RLS disabled on all tables
-- if your team is confident in the API-layer enforcement:
ALTER TABLE listings DISABLE ROW LEVEL SECURITY;
-- (repeat for users, offers, meetups, messages, etc.)
```

> **Decision to make:** If you later use Supabase Realtime or the Supabase JS client directly from the frontend (not currently planned), you'll need proper RLS policies. For now, with Prisma + service role + API middleware, disabling RLS is the simplest correct approach.

**Verify it works:**
```bash
pnpm --filter @sellr/api prisma migrate dev --name init
# Should complete with "Your database is now in sync with your schema."
pnpm --filter @sellr/api prisma studio
# Studio should open and show all 15 tables
```

---

## 6. Redis + BullMQ Job Queue Setup

Redis backs two systems: the rate limiter and the BullMQ job queue. The job queue is load-bearing — it handles AI screening, reminder scheduling, search sync, and saved-search watchers.

> **Event-Driven Architecture Validation:** The BullMQ queue pattern is the right architectural choice for AI workloads. Production systems consistently see 70-90% latency reduction compared to polling-based approaches for async AI tasks. The queue decouples the HTTP response from the AI computation, allowing the API to return immediately while the AI pipeline runs in the background and delivers results via Socket.IO.

`apps/api/src/lib/redis.ts`:
```typescript
import IORedis from 'ioredis';

export const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,   // Required for BullMQ
  lazyConnect: false,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});
```

### Semantic Caching for LLM Queries

For the quick-reply and AI listing assistant workloads, add semantic caching to avoid redundant LLM calls for semantically similar inputs. This can reduce AI API costs by 40-60% for common queries.

```typescript
// apps/api/src/lib/semanticCache.ts
// Uses Upstash Redis with vector search, or a local pgvector if available

import { redis } from './redis';
import crypto from 'crypto';

// Simple exact-match cache for identical prompts (free, already have Redis)
export async function getCachedLLMResponse(
  promptHash: string
): Promise<string | null> {
  return redis.get(`llm:cache:${promptHash}`);
}

export async function setCachedLLMResponse(
  promptHash: string,
  response: string,
  ttlSeconds = 3600   // 1 hour — adjust based on content freshness needs
): Promise<void> {
  await redis.setex(`llm:cache:${promptHash}`, ttlSeconds, response);
}

export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt).digest('hex');
}

// For semantic (vector) caching, use Upstash Vector or Redis with RediSearch:
// - Upstash Vector: https://upstash.com/docs/vector/overall/getstarted
// - Embed the prompt, search for cosine similarity > 0.95, return cached response
// This is Phase 2 work — start with exact-match caching and upgrade when AI costs
// exceed ~$200/month.
```

### Queue Definitions

Define all queues centrally. Each queue name corresponds to a specific async workload.

`apps/api/src/lib/queues.ts`:
```typescript
import { Queue } from 'bullmq';
import { redis } from './redis';

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
};

// AI pipeline queue — image forensics, listing quality check
export const aiQueue = new Queue('ai', { connection: redis, defaultJobOptions });

// Algolia sync — triggered on listing create/update/delete
export const searchSyncQueue = new Queue('search-sync', { connection: redis, defaultJobOptions });

// Meetup reminders — 24hr and 2hr delayed jobs
export const notificationQueue = new Queue('notifications', { connection: redis, defaultJobOptions });

// Saved search watcher — runs on every new listing creation
export const savedSearchQueue = new Queue('saved-search', { connection: redis, defaultJobOptions });

// AI quick-reply — async question classification and draft generation
export const quickReplyQueue = new Queue('quick-reply', { connection: redis, defaultJobOptions });
```

### Job Type Definitions

```typescript
// apps/api/src/lib/jobTypes.ts

// AI Queue Jobs
export interface ImageForensicsJob {
  listingId: string;
  photoUrls: string[];
  sellerId: string;
}

export interface PhotoQualityCheckJob {
  listingId: string;
  photoUrls: string[];
}

// Search Sync Jobs
export interface AlgoliaSyncJob {
  listingId: string;
  action: 'upsert' | 'delete';
}

// Notification Jobs (delayed)
export interface MeetupReminderJob {
  meetupId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
  scheduledAt: string;
  type: 'reminder_24h' | 'reminder_2h';
}

export interface NoShowCheckJob {
  meetupId: string;
  offerId: string;
  buyerId: string;
  sellerId: string;
}

// Saved Search Jobs
export interface SavedSearchWatchJob {
  listingId: string;
  communityId: string;
}

// Quick Reply Jobs
export interface QuickReplyJob {
  messageId: string;
  conversationId: string;
  content: string;
  listingId: string;
  sellerId: string;
}
```

### Initializing All Workers

`apps/api/src/lib/queue.ts`:
```typescript
import { Worker } from 'bullmq';
import { redis } from './redis';
import { imageForensicsWorker } from '../jobs/imageForensics';
import { searchSyncWorker } from '../jobs/searchSync';
import { notificationWorker } from '../jobs/notifications';
import { savedSearchWorker } from '../jobs/savedSearch';
import { quickReplyWorker } from '../jobs/quickReply';

export async function initBullMQ() {
  // Workers process jobs from their respective queues
  new Worker('ai', imageForensicsWorker, { connection: redis, concurrency: 3 });
  new Worker('search-sync', searchSyncWorker, { connection: redis, concurrency: 5 });
  new Worker('notifications', notificationWorker, { connection: redis, concurrency: 10 });
  new Worker('saved-search', savedSearchWorker, { connection: redis, concurrency: 5 });
  new Worker('quick-reply', quickReplyWorker, { connection: redis, concurrency: 5 });

  console.log('BullMQ workers initialized');
}
```

**Verify it works:**
```bash
# In a test script or vitest test:
import { aiQueue } from './lib/queues';
await aiQueue.add('test', { listingId: 'test', photoUrls: [], sellerId: 'test' });
# Job should appear in BullMQ Bull Board (add bull-board in Phase 1 for visibility)
```

---

## 7. Mobile App Foundation (`apps/mobile/`)

### Step 1: Initialize Expo Project

```bash
cd apps/mobile
npx create-expo-app . --template default@sdk-55
# Clean up template files you don't need
```

Install core dependencies for SDK 55:
```bash
pnpm add expo-router@^55 expo-notifications@^55 expo-secure-store@^55 expo-image-picker@^55 expo-image@^55 expo-location@^55 expo-background-task@^55
pnpm add @sentry/react-native
pnpm add @tanstack/react-query
pnpm add zustand
pnpm add @sellr/shared @sellr/api-client
pnpm add socket.io-client
```

> **Expo package versions:** As of SDK 55, Expo packages use the same major version as the SDK. Keep your core Expo packages on `^55.x` so compatibility is obvious and consistent.

> **Maps:** `react-native-maps` remains the stable MVP choice. Re-evaluate `expo-maps` only against the current Expo docs at implementation time instead of assuming a future stable release date.

> **Background Sync:** `expo-background-task` is the replacement for `expo-background-fetch`. Use it for background data sync (token refresh, push token updates) and remove any legacy `expo-background-fetch` references entirely.

### Step 2: Expo Configuration `app.json`

```json
{
  "expo": {
    "name": "Sellr",
    "slug": "sellr",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "sellr",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.sellr.app",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "Sellr uses your location to show nearby listings.",
        "NSCameraUsageDescription": "Sellr uses your camera to photograph items for listing.",
        "NSPhotoLibraryUsageDescription": "Sellr accesses your photos to upload listing images."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.sellr.app",
      "edgeToEdgeEnabled": true,
      "permissions": [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Sellr uses your location to find nearby listings."
        }
      ],
      "expo-background-task",
      "@sentry/react-native",
      "expo-image",
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

> **Edge-to-Edge Android:** `edgeToEdgeEnabled: true` still gives you the modern full-screen layout behind system bars. If you use custom tab bars or fixed-bottom UI, verify padding with `useSafeAreaInsets()`. Expo Router's native-tabs layouts now handle safe areas automatically, but custom layouts still need a visual check.

> **New Architecture:** Expo SDK 55 removed Legacy Architecture support entirely, so `newArchEnabled` no longer belongs in `app.json`. Treat New Architecture compatibility as the default assumption when selecting third-party native libraries.

### Step 3: Expo Router v5 File Structure

```
apps/mobile/app/
├── _layout.tsx           ← Root layout (QueryClientProvider, auth guard)
├── (auth)/
│   ├── _layout.tsx
│   ├── phone.tsx         ← Phone number entry
│   ├── otp.tsx           ← OTP verification
│   ├── profile.tsx       ← Display name + photo
│   └── community.tsx     ← Join community (invite code / .edu)
├── (tabs)/
│   ├── _layout.tsx       ← Tab bar layout
│   ├── index.tsx         ← Feed (home)
│   ├── search.tsx        ← Search + filters
│   ├── sell.tsx          ← Listing creation
│   ├── inbox.tsx         ← Offers + messages
│   └── profile.tsx       ← User profile
├── listing/
│   └── [id].tsx          ← Listing detail
├── offer/
│   └── [id].tsx          ← Offer detail
├── meetup/
│   └── [id].tsx          ← Meetup card
└── conversation/
    └── [id].tsx          ← Chat thread
```

### Step 4: Root Layout with Auth Guard and QueryClient

The current app keeps a straightforward `useEffect`-based auth redirect in `_layout.tsx`. It is compatible with Expo SDK 55, works well with file-based routing, and keeps Phase 0 auth flow behavior easy to reason about.

`apps/mobile/app/_layout.tsx`:
```typescript
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import '../src/lib/sentry';
import { useAuthStore } from '../src/stores/auth';

const rehydrateAuth = () => useAuthStore.getState().rehydrate();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 minutes
      gcTime: 1000 * 60 * 10,         // 10 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    void rehydrateAuth();
  }, []);

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/phone');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}
```

> **Auth redirect pattern:** The repo currently uses the `useEffect`-based redirect above. If Expo Router's guard APIs become the team standard later, treat that as an implementation refinement rather than a Phase 0 blocker.

### Step 5: Auth Store (Zustand + SecureStore)

`apps/mobile/src/stores/auth.ts`:
```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { setAccessToken } from '@sellr/api-client';

const ACCESS_TOKEN_KEY = 'sellr_access_token';
const REFRESH_TOKEN_KEY = 'sellr_refresh_token';

interface AuthState {
  isAuthenticated: boolean;
  userId: string | null;
  accessToken: string | null;
  setTokens: (access: string, refresh: string, userId: string) => Promise<void>;
  clearTokens: () => Promise<void>;
  rehydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  userId: null,
  accessToken: null,

  setTokens: async (access, refresh, userId) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh);
    setAccessToken(access);   // Wire into the fetch client
    set({ isAuthenticated: true, accessToken: access, userId });
  },

  clearTokens: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    set({ isAuthenticated: false, accessToken: null, userId: null });
  },

  rehydrate: async () => {
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) {
      setAccessToken(token);
      // TODO: validate token expiry, trigger refresh if needed
      set({ isAuthenticated: true, accessToken: token });
    }
  },
}));
```

**Verify it works:**
```bash
npx expo start
# Should open in iOS Simulator and Android Emulator without errors
# Auth gate should redirect unauthenticated users to /(auth)/phone
```

---

## 8. Web App Foundation (`apps/web/`)

### Step 1: Initialize Next.js

```bash
cd apps/web
pnpm create next-app . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
pnpm add @sellr/shared @sellr/api-client
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

> **Why Next.js 16?** Next.js 16 keeps the App Router model intact, ships with React 19.2 support, and makes Turbopack the default compiler for both `next dev` and `next build`. It also formalizes `cacheComponents`, promotes the `turbopack` config key to top-level `next.config.ts`, and renames request interception from `middleware` to `proxy`.

> **React 19.2 Compatibility:** React 19.2 adds `useEffectEvent`, `<Activity />`, improved SSR primitives, and updated React Hooks linting. `@tanstack/react-query` v5 is compatible, but still verify peer dependencies for older libraries during the upgrade.

> **Turbopack default:** Run `next dev` and `next build` with no `--turbopack` flag. Next.js 16 uses Turbopack by default and only needs `--webpack` if you intentionally opt back out.

> **Proxy rename:** If you add request-time auth gates or rewrites later, use `proxy.ts` in new Next.js 16 code. Older `middleware.ts` naming is deprecated.

> **`.env.local` for Next.js:** Next.js reads from `.env.local` for local development overrides (not `.env`). The `.env.local` file is git-ignored by default. Copy `.env.example` to `.env.local` and fill in your values. Never commit `.env.local`.

### Step 2: Directory Structure

```
apps/web/
├── app/
│   ├── layout.tsx          ← Root layout (providers, fonts)
│   ├── page.tsx            ← Marketing/landing (or redirect to app)
│   ├── (app)/
│   │   ├── layout.tsx      ← Authenticated app shell
│   │   ├── dashboard/
│   │   │   └── page.tsx    ← Seller dashboard
│   │   └── listings/
│   │       └── [id]/
│   │           └── page.tsx ← Listing detail (SSR for SEO)
│   └── admin/
│       ├── layout.tsx      ← Internal moderation admin
│       └── moderation/
│           └── page.tsx    ← Moderation queue (React Admin)
├── components/
│   ├── ui/                 ← Reusable primitives (buttons, inputs)
│   └── features/           ← Feature-specific components
└── lib/
    └── queryClient.ts      ← QueryClient config for web
```

### Step 3: Root Layout

`apps/web/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sellr — The Marketplace That Actually Closes',
  description: 'A trust-native local marketplace for verified communities.',
  openGraph: {
    type: 'website',
    siteName: 'Sellr',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

`apps/web/app/providers.tsx` (client component for React Query):
```typescript
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000 * 60, retry: 1 },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

**Verify it works:**
```bash
cd apps/web
next dev
# App should load at http://localhost:3000 with Turbopack compiler active
```

---

## 9. Infrastructure & Hosting Setup

### Supabase (Database)

Supabase is the database layer for both local development and production. Railway still hosts the API and Redis.

**Create a hosted Supabase project:**
1. Go to `supabase.com` → New project
2. Set a strong database password and save it in 1Password immediately
3. Choose the region closest to your Railway API deployment (e.g., `us-east-1` if Railway is in `us-east-1`)
4. Wait ~2 minutes for provisioning

**Get your connection strings** (Supabase Dashboard → Settings → Database):

| Key | Where to find it | Used for |
|---|---|---|
| `DATABASE_URL` | Settings → Database → Connection Pooling → "Transaction" mode, port `6543` | Runtime API queries via pgBouncer |
| `DIRECT_URL` | Settings → Database → Connection String, port `5432` | Prisma migrations only |

**Run migrations against the hosted project:**
```bash
# Point DIRECT_URL at hosted Supabase, then:
pnpm --filter @sellr/api prisma migrate deploy
```

**Verify PostGIS is enabled** (it is by default in all Supabase projects, but confirm):
```sql
-- Run in Supabase Dashboard → SQL Editor
SELECT PostGIS_Version();
```

### Railway (API + Redis)

Railway hosts the Fastify API and Redis. It no longer hosts Postgres — that's Supabase's job.

**Setup steps:**
1. Create a Railway project at `railway.app`
2. Add a new service → **"Deploy from GitHub repo"** → point to your monorepo
3. Set **root directory** to `apps/api`
4. Add a **Redis** plugin to the Railway project (Railway manages it and auto-sets `REDIS_URL`)
5. Do **not** add a Postgres plugin — Supabase handles this

**Railway environment variables to set manually:**
```
NODE_ENV=production
DATABASE_URL=<Supabase pooled connection string, port 6543>
DIRECT_URL=<Supabase direct connection string, port 5432>
JWT_SECRET=<generate: openssl rand -base64 64>
JWT_REFRESH_SECRET=<separate secret>
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=...
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
ALGOLIA_APP_ID=...
ALGOLIA_API_KEY=...
CLOUDFLARE_ACCOUNT_ID=...
R2_BUCKET_NAME=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_CDN_URL=https://cdn.sellr.app
GOOGLE_CLOUD_API_KEY=...
ALLOWED_ORIGINS=https://app.sellr.com,https://admin.sellr.com
```

### Vercel (Web App)

1. Import the monorepo from GitHub at `vercel.com`
2. Set **root directory** to `apps/web`
3. Framework preset: `Next.js`
4. Set environment variables to match the API's public-facing values
5. Enable **preview deployments** on every PR automatically

### Cloudflare (CDN + DNS)

1. Add your domain to Cloudflare
2. Point `api.sellr.com` → Railway API URL (proxied)
3. Point `app.sellr.com` → Vercel deployment (proxied)
4. Point `cdn.sellr.com` → Cloudflare R2 bucket (for image delivery)
5. Enable **Cloudflare Images** or configure a Worker for on-the-fly resizing

**Cloudflare R2 presigned URL setup** (used by the API):
```typescript
// apps/api/src/lib/storage.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function generatePresignedUploadUrl(key: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: 'image/*',
  });
  return getSignedUrl(s3, command, { expiresIn: 300 });   // 5 minutes
}

export function getPublicUrl(key: string): string {
  return `${process.env.CLOUDFLARE_CDN_URL}/${key}`;
}
```

---

## 10. CI/CD Pipeline

### GitHub Actions

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env:
          POSTGRES_DB: sellr_test
          POSTGRES_USER: sellr
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run DB migrations against test DB
        run: pnpm --filter @sellr/api prisma migrate deploy
        env:
          DATABASE_URL: postgresql://sellr:test_password@localhost:5432/sellr_test
          DIRECT_URL: postgresql://sellr:test_password@localhost:5432/sellr_test

      - name: Typecheck all packages
        run: pnpm typecheck

      - name: Lint all packages
        run: pnpm lint

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: postgresql://sellr:test_password@localhost:5432/sellr_test
          DIRECT_URL: postgresql://sellr:test_password@localhost:5432/sellr_test
          REDIS_URL: redis://localhost:6379
```

> **Step order:** The workflow runs `prisma migrate deploy` **before** `typecheck` / `lint` / `test` so the CI Postgres has an applied schema. That is **not** the same order as a pure “typecheck → lint → test” local loop, and that is fine — see [Current repository baseline](#current-repository-baseline) and the **CI/CD** bullets under [§14 Phase 0 Completion Checklist](#14-phase-0-completion-checklist).

`.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run Prisma migrations against production
        run: pnpm --filter @sellr/api prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}

      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: sellr-api

  # Vercel handles web app deployments automatically via GitHub integration
  # EAS Build is triggered manually or via release tags for mobile
```

> **Migration as a deploy step:** Running `prisma migrate deploy` before the Railway deploy (not after) ensures the database schema is updated before the new API code starts serving traffic. This is important for zero-downtime deployments where the new code may depend on new columns.

### Mobile Release Workflow

```bash
# Development builds (includes native modules not in Expo Go)
eas build --profile development --platform all

# Preview builds for internal testing (no app store submission needed)
eas update --channel preview --message "Feature X update"

# Production builds for app store
eas build --profile production --platform all
eas submit --platform all   # Submits to App Store + Google Play
```

`eas.json`:
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "https://api-staging.sellr.com" }
    },
    "preview": {
      "distribution": "internal",
      "env": { "EXPO_PUBLIC_API_URL": "https://api-staging.sellr.com" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_API_URL": "https://api.sellr.com" },
      "cache": {
        "key": "sellr-production-cache-v1"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "team@sellr.com",
        "ascAppId": "YOUR_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

> **Remote Build Cache (SDK 55):** EAS supports Remote Build Cache for faster repeat builds — especially valuable when most native code hasn't changed. Enable by setting `cache.key` in `eas.json` as shown above. The cache is stored in EAS's infrastructure and dramatically reduces production build times after the first build.

> **TestFlight Workflow (SDK 55):** Use `eas build --profile production --platform ios && eas submit --platform ios` to automate TestFlight uploads. The build and submit pipeline is now stable enough that this can be your default iOS release path from the start.

---

## 11. Search: Algolia Setup

Algolia is the sole search layer at MVP. It is **never queried directly by the client** — the API proxies all queries, injecting the `communityId` filter server-side so clients cannot cross community boundaries.

### Step 1: Create the Index

```bash
# Install Algolia SDK in the API
pnpm --filter @sellr/api add algoliasearch
```

`apps/api/src/lib/algolia.ts`:
```typescript
import { algoliasearch } from 'algoliasearch';

export const algolia = algoliasearch(
  process.env.ALGOLIA_APP_ID!,
  process.env.ALGOLIA_API_KEY!    // Admin key — never exposed to clients
);

// Use prefixed index names to separate staging from production
export const LISTINGS_INDEX = `${process.env.NODE_ENV === 'production' ? 'prod' : 'staging'}_listings`;
```

### Step 2: Configure the Index (Run Once)

```typescript
// apps/api/src/scripts/configureAlgolia.ts
// Run this script once after account creation: tsx src/scripts/configureAlgolia.ts

import { algolia, LISTINGS_INDEX } from '../lib/algolia';

async function configure() {
  // Set searchable attributes (order matters — priority decreases)
  await algolia.setSettings({
    indexName: LISTINGS_INDEX,
    indexSettings: {
      searchableAttributes: [
        'title',           // Highest priority
        'description',
        'category,subcategory',
        'locationNeighborhood',
      ],
      attributesForFaceting: [
        'filterOnly(communityId)',   // Always filter, never expose to client queries
        'filterOnly(status)',
        'category',
        'condition',
        'filterOnly(sellerId)',
      ],
      ranking: [
        'geo',           // Distance ranking (when lat/lng provided)
        'typo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
      customRanking: [
        'desc(createdAtTimestamp)',  // Newer listings ranked higher
      ],
      synonyms: [
        {
          objectID: 'sofa-synonyms',
          type: 'synonym',
          synonyms: ['sofa', 'couch', 'loveseat', 'sectional'],
        },
        {
          objectID: 'fridge-synonyms',
          type: 'synonym',
          synonyms: ['fridge', 'refrigerator'],
        },
        {
          objectID: 'laptop-synonyms',
          type: 'synonym',
          synonyms: ['laptop', 'notebook', 'macbook', 'chromebook'],
        },
      ],
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
    }
  });

  console.log('Algolia index configured');
}

configure().catch(console.error);
```

### Step 3: Algolia Sync Job

`apps/api/src/jobs/searchSync.ts`:
```typescript
import { Job } from 'bullmq';
import { algolia, LISTINGS_INDEX } from '../lib/algolia';
import { prisma } from '../lib/prisma';
import { AlgoliaSyncJob } from '../lib/jobTypes';

export async function searchSyncWorker(job: Job<AlgoliaSyncJob>) {
  const { listingId, action } = job.data;

  if (action === 'delete') {
    await algolia.deleteObject({ indexName: LISTINGS_INDEX, objectID: listingId });
    return;
  }

  // Fetch listing with seller reputation for the search record
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      seller: {
        include: { reputation: true },
      },
    },
  });

  if (!listing || listing.status !== 'active') return;

  // Build Algolia record
  // Note: latitude/longitude come from a raw PostGIS query since Prisma doesn't map geometry
  const geomResult = await prisma.$queryRaw<{ lat: number; lng: number }[]>`
    SELECT ST_Y(location_geom::geometry) as lat, ST_X(location_geom::geometry) as lng
    FROM listings WHERE id = ${listingId}::uuid
  `;

  const geo = geomResult[0];

  await algolia.saveObject({
    indexName: LISTINGS_INDEX,
    body: {
      objectID: listing.id,
      communityId: listing.communityId,
      sellerId: listing.sellerId,
      title: listing.title,
      description: listing.description,
      category: listing.category,
      subcategory: listing.subcategory,
      condition: listing.condition,
      price: Number(listing.price),
      negotiable: listing.negotiable,
      status: listing.status,
      locationNeighborhood: listing.locationNeighborhood,
      photoUrl: (listing.photoUrls as string[])[0] ?? null,
      sellerAvgRating: listing.seller.reputation 
        ? Number(listing.seller.reputation.avgPunctuality)  
        : null,
      sellerTransactionCount: listing.seller.reputation?.transactionCount ?? 0,
      availabilityWindows: listing.availabilityWindows,
      createdAtTimestamp: Math.floor(listing.createdAt.getTime() / 1000),
      // PostGIS lat/lng for Algolia geosearch
      ...(geo ? { _geoloc: { lat: geo.lat, lng: geo.lng } } : {}),
    }
  });
}
```

---

## 12. Observability: Sentry, Logging, Analytics

### Sentry Setup

Create three separate Sentry projects: `sellr-api`, `sellr-mobile`, `sellr-web`.

**API (Fastify):**
```typescript
// apps/api/src/lib/sentry.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN_API,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [Sentry.prismaIntegration()],
});
```

**Mobile (Expo):**
```typescript
// apps/mobile/src/lib/sentry.ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  enableNativeNagger: false,
});
```

### Structured Logging (Pino → Logtail)

```typescript
// apps/api/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : {
        target: '@logtail/pino',
        options: { sourceToken: process.env.LOGTAIL_SOURCE_TOKEN },
      },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
  // Redact sensitive fields from logs
  redact: ['req.headers.authorization', 'body.phoneE164', 'body.code'],
});
```

### PostHog Product Analytics

Key events to track from the start — these are the metrics the entire product is evaluated against:

```typescript
// apps/api/src/lib/analytics.ts
import { PostHog } from 'posthog-node';

export const posthog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST ?? 'https://app.posthog.com',
  flushAt: 20,
  flushInterval: 10000,
});

// Capture an event with standard Sellr properties
export function captureEvent(
  userId: string, 
  event: string, 
  properties?: Record<string, unknown>
) {
  posthog.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      platform: 'api',
      environment: process.env.NODE_ENV,
    },
  });
}

// Standard events — call these at the right moments in each module
export const Events = {
  LISTING_CREATED: 'listing_created',
  OFFER_MADE: 'offer_made',
  OFFER_ACCEPTED: 'offer_accepted',
  OFFER_COUNTERED: 'offer_countered',
  OFFER_DECLINED: 'offer_declined',
  MEETUP_CONFIRMED: 'meetup_confirmed',
  MEETUP_COMPLETED: 'meetup_completed',
  NO_SHOW_FLAGGED: 'no_show_flagged',
  SCAM_REPORT_FILED: 'scam_report_filed',
  AI_LISTING_ASSIST_USED: 'ai_listing_assist_used',
  QUICK_REPLY_SENT: 'quick_reply_sent',
} as const;
```

### 12.1 AI-Specific Observability

Standard Sentry + Pino observability is insufficient for AI workloads. You need to track the full AI request lifecycle to control costs, detect regressions, and debug failures.

**What to track for every AI job:**
- `prompt_tokens` — input token count (cost driver)
- `completion_tokens` — output token count (cost driver)
- `cached_tokens` — tokens served from OpenAI prompt cache (cost reduction)
- `ttft_ms` — time-to-first-token (latency signal; >2000ms is degraded UX)
- `total_latency_ms` — full job duration including DB reads and writes
- `model` — model name and version (catches unexpected model routing)
- `job_type` — `image_forensics` | `listing_assist` | `quick_reply`
- `risk_level` — for image forensics results
- `auto_approved` — whether the listing bypassed human review

**Tooling options:**

**Option A — Langfuse (recommended for MVP):** MIT-licensed, self-hostable on Railway, has a generous free cloud tier, and integrates with the Vercel AI SDK and Anthropic SDK via OpenTelemetry. Add `langfuse` to the API dependencies and wrap LLM calls:

```typescript
// apps/api/src/lib/aiObservability.ts
import { Langfuse } from 'langfuse';

export const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
});

// Wrap each AI job with a trace
export async function traceAIJob<T>(
  jobType: string,
  fn: (trace: ReturnType<typeof langfuse.trace>) => Promise<T>
): Promise<T> {
  const trace = langfuse.trace({ name: jobType });
  try {
    const result = await fn(trace);
    trace.update({ output: result });
    return result;
  } catch (err) {
    trace.update({ metadata: { error: String(err) } });
    throw err;
  } finally {
    await langfuse.flushAsync();
  }
}
```

**Option B — Braintrust:** Managed service with a generous free tier, good for teams that don't want to self-host. Similar integration pattern via their SDK.

**Add AI cost tracking to PostHog:**
```typescript
// In each AI job worker, after the LLM call completes:
captureEvent(sellerId, 'ai_job_completed', {
  job_type: 'image_forensics',
  model: 'gpt-4o',
  prompt_tokens: usage.promptTokens,
  completion_tokens: usage.completionTokens,
  cached_tokens: usage.cachedTokens ?? 0,
  total_latency_ms: Date.now() - jobStartMs,
  auto_approved: result.autoApprove,
  risk_level: result.riskLevel,
});
```

Track `cost_per_listing` as a derived metric in PostHog: `(prompt_tokens * 0.0025 + completion_tokens * 0.01) / 1000`. Alert if it exceeds $0.10/listing.

> **PII Sanitization:** Before sending user-generated content (messages, listing descriptions) to LLM APIs, strip PII to comply with GDPR if expanding beyond the US. Microsoft Presidio (MIT-licensed) provides entity recognition for phone numbers, emails, addresses, and names. Add a `sanitizeForLLM(text: string)` wrapper in `apps/api/src/lib/aiUtils.ts` that runs Presidio's fast detection before any OpenAI or Anthropic call involving user content.

---

## 13. Secrets & Environment Management

### `.env.example` (committed to repo)

```bash
# ── Database (Supabase) ───────────────────────────────────────────────────────
# Local: from `supabase start` output (port 54322)
# Hosted: from Supabase Dashboard → Settings → Database

# pgBouncer pooled connection — used by Fastify at runtime (transaction mode)
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres?pgbouncer=true&connection_limit=1"

# Direct connection — used ONLY by Prisma for migrations (never at runtime)
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Hosted Supabase values look like:
# DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Auth ──────────────────────────────────────────────────────────────────────
JWT_SECRET=change_me_generate_with_openssl_rand_base64_64
JWT_REFRESH_SECRET=change_me_separate_secret
JWT_ACCESS_TOKEN_TTL=900         # 15 minutes in seconds
JWT_REFRESH_TOKEN_TTL=2592000    # 30 days in seconds

# ── Twilio ────────────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── AI ────────────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# ── AI Observability (Langfuse) ───────────────────────────────────────────────
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# ── Algolia ───────────────────────────────────────────────────────────────────
ALGOLIA_APP_ID=XXXXXXXXXX
ALGOLIA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
ALGOLIA_SEARCH_KEY=xxxxxxxxxxxx   # Public read-only key (used in server-side search proxy)

# ── Storage (Cloudflare R2) ───────────────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET_NAME=sellr-media
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_CDN_URL=https://cdn.sellr.com

# ── Google Cloud ──────────────────────────────────────────────────────────────
GOOGLE_CLOUD_API_KEY=AIza...

# ── Sentry ────────────────────────────────────────────────────────────────────
SENTRY_DSN_API=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN_MOBILE=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN_WEB=https://xxx@xxx.ingest.sentry.io/xxx

# ── Analytics ─────────────────────────────────────────────────────────────────
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com
LOGTAIL_SOURCE_TOKEN=xxxx

# ── App ───────────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3001
ALLOWED_ORIGINS=http://localhost:3000

# ── Mobile (prefix with EXPO_PUBLIC_ for client-side access) ─────────────────
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SENTRY_DSN_MOBILE=https://xxx@xxx.ingest.sentry.io/xxx

# ── Web (prefix with NEXT_PUBLIC_ for client-side access) ────────────────────
# NOTE: Next.js uses .env.local for local overrides (copy .env.example → .env.local)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> **CRITICAL:** The actual `.env` / `.env.local` files are git-ignored. Store secrets in 1Password. Share with co-founder via 1Password shared vault, not Slack, email, or any chat tool. The Supabase database password in particular must never appear in any chat log or git commit.

---

## 14. Phase 0 Completion Checklist

Before moving to Phase 1 (MVP Build), every item on this list must be checked off. If any are missing, Phase 1 work will be blocked.

This checklist assumes the current checked-in baseline: Prisma 7 on the API and Expo SDK 55 on mobile.

### Repository
- [ ] Turborepo monorepo initialized with correct workspace structure
- [ ] `packages/shared` compiles with all entity types, Zod 4 schemas, and AI output schemas
- [ ] `packages/api-client` compiles with fetch client scaffolded
- [ ] `packages/tsconfig` shared config consumed by all packages
- [ ] ESLint 9 flat config (`eslint.config.mjs`) configured at root; runs clean on all packages
- [ ] `.env.example` committed; actual `.env` / `.env.local` files git-ignored

### API
- [ ] Fastify v5 app starts and `/health` returns `200`
- [ ] ZodTypeProvider wired correctly — no TypeBox imports remain
- [ ] Global error handler registered; test error appears in Sentry
- [ ] JWT middleware scaffolded; protected routes behave as intended (route modules may already be scaffolded beyond a blank shell)
- [ ] Rate limit plugin registered
- [ ] `@sellr/shared` Zod schemas imported and validated in a sample route
- [ ] Pino logger outputs structured JSON in production mode

### Database (Supabase)

- [ ] Prisma schema has **no** `previewFeatures = ["postgresqlExtensions"]` and **no** `extensions = [...]` line
- [ ] Prisma generator uses `provider = "prisma-client"` with an explicit `output` path
- [ ] `prisma.config.ts` is committed and Prisma CLI reads `DIRECT_URL` from config
- [ ] Runtime Prisma client imports from the generated client path and uses `@prisma/adapter-pg`
- [ ] Supabase CLI installed (`pnpm exec supabase --version` returns a version)
- [ ] `supabase init` run inside `apps/api/` — `supabase/` directory created
- [ ] `supabase start` runs successfully — Postgres, PostGIS, and Studio all up at `localhost:54323`
- [ ] `SELECT PostGIS_Version()` returns a version string in Supabase Studio SQL editor
- [ ] `docker compose up -d` starts Redis without errors (Postgres is now Supabase's job)
- [ ] `DIRECT_URL` points to port `54322` locally (direct connection for migrations)
- [ ] `DATABASE_URL` points to port `54329` with `?pgbouncer=true` locally **when** the Supabase local pooler is enabled; **or** both point at `54322` when the pooler is off (see [§5](#5-database-supabase--postgis-setup))
- [ ] `prisma migrate dev --name init` runs successfully against local Supabase
- [ ] `prisma generate` generates typed client with all 15 entities
- [ ] PostGIS migration adds `location_geom` POINT column and GIST index to `listings`
- [ ] `prisma studio` (or Supabase Studio at `localhost:54323`) shows all tables correctly
- [ ] Hosted Supabase project created; `DIRECT_URL` and `DATABASE_URL` for hosted project saved in 1Password
- [ ] `prisma migrate deploy` runs successfully against hosted Supabase project

### Redis / BullMQ
- [ ] Redis connects locally without errors
- [ ] BullMQ `aiQueue` adds and processes a test job successfully
- [ ] All 5 queue names are defined and workers are scaffolded (empty processors are fine)
- [ ] Semantic cache utility (`getCachedLLMResponse`) wired and tested with a dummy key

### Mobile
- [ ] Expo SDK **55** project runs on iOS Simulator and Android Emulator via `npx expo start`
- [ ] `newArchEnabled` is absent from `app.json` (per SDK 55; Legacy Architecture support was removed in that release)
- [ ] `edgeToEdgeEnabled: true` set for Android; bottom tab bar verified with `useSafeAreaInsets()`
- [ ] Expo Router v5 file-based routing resolves `(auth)` and `(tabs)` layouts
- [ ] Auth guard (useEffect-based) correctly redirects unauthenticated users
- [ ] `expo-background-task` installed; `expo-background-fetch` removed
- [ ] Auth store reads/writes to SecureStore without errors
- [ ] `@sellr/shared` types import cleanly (no TypeScript errors)

### Web
- [ ] Next.js 16 app runs at `localhost:3000` without errors
- [ ] `next dev` starts with Turbopack compiler active by default (confirmed in terminal output)
- [ ] `.env.local` created from `.env.example` (not `.env`)
- [ ] Tailwind CSS classes render correctly
- [ ] React Query `QueryClientProvider` is wired in root layout
- [ ] `@sellr/shared` and `@sellr/api-client` import without errors

### Infrastructure
- [ ] Railway project created; API service connected to GitHub monorepo with root directory set to `apps/api`
- [ ] Railway **Redis** plugin added and `REDIS_URL` auto-populated
- [ ] Railway staging API is live and `/health` returns `200`
- [ ] Hosted Supabase `DATABASE_URL` and `DIRECT_URL` set as Railway environment variables
- [ ] `prisma migrate deploy` runs as part of the Railway deploy pipeline (before code deploy)
- [ ] Vercel project connected to GitHub; preview deployment triggers on PR
- [ ] Cloudflare R2 bucket created; test image upload via presigned URL works
- [ ] Cloudflare CDN URL serves the test image

### Algolia
- [ ] Algolia account created; `LISTINGS_INDEX` (staging) configured with settings script
- [ ] Algolia test record inserted and retrieved successfully via admin API
- [ ] Synonyms configured (sofa/couch, fridge/refrigerator, etc.)

### Observability
- [ ] Sentry DSNs created for API, mobile, web
- [ ] API logs a test error that appears in Sentry
- [ ] Mobile Sentry captures a test exception
- [ ] PostHog receives a test `listing_created` event
- [ ] Langfuse project created; test AI trace appears in the dashboard

### CI/CD
- [ ] GitHub Actions CI runs on every PR with Node.js 22 and pnpm 10: e.g. **migrate** (for test DB) → **typecheck** → **lint** → **test** (if your pipeline runs `migrate` first, that is OK; the “development loop” may still be typecheck → lint → test locally)
- [ ] `prisma migrate deploy` runs before Railway deploy in `deploy.yml`
- [ ] A PR merge to `main` triggers a Railway staging deploy
- [ ] A PR merge to `main` triggers a Vercel preview deploy
- [ ] EAS build produces a development build that installs on a physical device

---

## 15. What Comes Next: Phase 1 Preview

Phase 1 (Weeks 3–17) builds the complete MVP on top of this foundation. The dependency order matters — each system depends on the one before it.

```
Auth (OTP + JWT + community gating)
  → User profiles + R2 / S3 photo upload
    → Community management (admin: create communities, generate invite codes)
      → Listing creation + AI Listing Assistant (OpenAI Responses API multimodal model, structured output via Zod)
        → Photo quality check + Image Forensics job (multimodal risk review + heuristics)
          → HITL moderation gate (confidence threshold auto-approve vs. human review)
            → Algolia sync job (listing goes live in search)
              → Listing feed + keyword search + geospatial filters
                → Saved searches + push notifications
                  → Offer flow (make/accept/counter/decline)
                    → Meetup card + BullMQ reminder jobs (24hr + 2hr)
                      → Socket.IO chat + AI Quick-Reply suggestions (structured output, ≤2s latency)
                        → Post-meetup completion + bilateral ratings
                          → Reputation score computation
                            → No-show/late-cancel enforcement + UserFlags
                              → Report + block flow → moderation queue
                                → Internal React Admin moderation UI
                                  → Push notifications (all types wired)
```

**The three systems that require the most care in Phase 1 — do not cut corners here:**

1. **Trust & Safety Pipeline** — image forensics and off-platform payment detection must be live _before_ the first real listing is published. A scam in the alpha community is an existential event.

   **Human-in-the-Loop (HITL) for Moderation:** Implement confidence thresholds in the image forensics worker. `riskLevel === 'none'` → auto-approve and publish. `riskLevel === 'low'` → auto-approve with a review flag (moderator sees it in the queue but it's live). `riskLevel === 'medium'` or `'high'` → hold for human review before publishing. This lets the AI handle 80%+ of listings automatically while flagging the genuinely risky content. The `ImageForensicsResultSchema` in `packages/shared` already captures the `autoApprove` boolean for this purpose.

2. **Offer/Meetup Coordination** — this is the close-rate engine. The structured offer flow, meetup card, and reminder jobs are the core product differentiator. Get the state machine right: `pending → countered → accepted → meetup:confirmed → meetup:completed/cancelled/unresolved`.

3. **AI Token Cost Management** — rate limit the listing-assist multimodal model to 10/user/day from day one. Use prompt caching (the system prompt is static and eligible for OpenAI's prompt cache). Default to the cheaper model tier for user-facing production paths and reserve the flagship model for higher-value or moderator-facing flows. Use the latest Claude Haiku alias or pinned snapshot for text tasks. Track `cost_per_listing` as a PostHog metric from the first listing created. Alert if it exceeds $0.10/listing.

---

*Document version 2.2 — covers Phase 0: Foundation & Setup only. The current baseline in the monorepo is Node.js 22 LTS, Expo SDK 55, Next.js 16, Prisma 7, TypeScript 5.9 in sample snippets, Zod 4, ESLint 9, Fastify v5, and pnpm 10. Phase 1 implementation details to follow in a separate guide.*
