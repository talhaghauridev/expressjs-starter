# AGENTS.md

Guidance for AI coding agents working in this repo. Rules here are the ones the code
and tooling can't tell you on their own — read this before making changes.

# Project & Setup

## Project overview

**Muslim99 backend** — an Express.js REST API (TypeScript) with local + OAuth auth,
Drizzle ORM over PostgreSQL, and a layered controller → service → repository architecture.

| Area           | Choice                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------ |
| Framework      | Express 5                                                                                  |
| ORM            | Drizzle ORM (`postgres` driver)                                                            |
| Validation     | Zod, via `validate()` middleware                                                           |
| Auth           | JWT access token + UUID refresh token (sessions table); Passport for Google/Facebook OAuth |
| Env validation | Zod schema in `src/env.ts` — every env var is typed and required at boot                   |
| Path alias     | `@/*` → `src/*` (resolved post-build via `tsc-alias`)                                      |

## Commands

Use `bun`; fall back to `npm` only if `bun` isn't available.

```bash
bun run dev            # dev server, hot reload (tsx + nodemon)
bun run build           # tsc -p . && tsc-alias  →  dist/
bun start                # run the production build
bun run db:generate       # generate a Drizzle migration from schema changes
bun run db:migrate        # apply pending migrations
bun run db:studio         # inspect the DB visually
npx tsc --noEmit            # typecheck — run this before finishing any change (verified working)
```

## Folder structure

```
src/
  app.ts            Express app + middleware stack
  index.ts          entry point, server start, graceful shutdown
  env.ts            Zod-validated environment variables
  routes/           routers, one per resource, mounted in routes/index.ts
  controllers/       HTTP <-> service translation only
  services/          business logic, orchestrates repositories
  repositories/       all DB queries (Drizzle), one per entity
  validators/         Zod request schemas
  middlewares/         auth, validate, error, multer, morgan
  database/
    schema/           Drizzle table schemas + relations.ts
    migrations/        auto-generated, don't hand-edit
    db.ts             Drizzle client instance
  utils/              shared helpers — see "Utilities inventory"
  constants/           static values (messages, roles, expiry durations)
  config/              app-level setup (CORS/Helmet, Passport strategies)
  clients/             third-party SDK init (Cloudinary, Google OAuth)
  types/               shared TS types + Express Request augmentation
```

# Architecture Reference

What exists in this repo and where — read before adding something that might already exist.

## Request flow

```
app.ts middleware (helmet -> body parsers -> compression -> cors -> morgan)
  -> routes/ (/api/v1 prefix)
    -> validate(schema) middleware
      -> authenticate middleware (protected routes only)
        -> controller -> service -> repository
          -> ApiResponse out, or a thrown ApiError caught by error.middleware.ts
```

## Utilities inventory — check before writing a new helper

| Utility                          | Use for                                                                     |
| -------------------------------- | --------------------------------------------------------------------------- |
| `utils/api-error.ts`             | `throw ApiError.badRequest(...)` — never throw a raw `Error`                |
| `utils/api-response.ts`          | `ApiResponse.success(res, data, message)` / `.created(...)`                 |
| `utils/async-handler.ts`         | wrap every controller handler in `asyncHandler(...)`                        |
| `utils/logger.ts`                | `logger.info/error(...)` — never `console.log`                              |
| `utils/schema-helpers.ts`        | `createSchema(...)` to build Zod validators; `timestamps` for schema tables |
| `utils/repository-helpers.ts`    | `normalizeSelect`/`buildReturning` — column selection, don't hand-roll it   |
| `utils/validation-helpers.ts`    | used with `validate()` middleware for request validation                    |
| `utils/transaction.ts`           | `withTransaction(async (tx) => {...})` — see "Transactions" below           |
| `utils/handle-postgres-error.ts` | `handlePostgresError()` — maps PG errors to user-friendly messages          |

## Transactions (`utils/transaction.ts`)

Every repository **mutation** method (`create`/`update`/`delete`) accepts `tx?: Transaction`
as its last parameter, even if the current call sites don't use it yet — this keeps every
mutation transaction-ready:

```ts
static async update(id: string, data: Partial<InsertUser>, select?: SelectFields<User>, tx?: Transaction) {
  const dbClient = tx ?? db;
  // ...
}
```

A **service** only needs to open a transaction when a flow does 2+ writes that must
succeed or fail together. Open it with `withTransaction` and pass `tx` into every
repository call inside the callback:

```ts
const { user } = await withTransaction(async (tx) => {
  const user = await UserRepository.update(id, { isVerified: true }, { password: false }, tx);
  await VerificationRepository.deleteByToken(token, tx);
  return { user };
});
```

A single repository call needs no transaction at all — don't wrap reads or standalone
writes in `withTransaction`.

# Code Writing Rules

How to write new code in this repo, layer by layer. Don't blend one layer's job into
another — repositories only query, services only orchestrate, controllers only translate
HTTP <-> service.

## Naming conventions

- **Files:** kebab-case always, with a layer suffix matching the folder: `*.controller.ts`,
  `*.service.ts`, `*.repository.ts`, `*.route.ts`, `*.middleware.ts`, `*.validator.ts`,
  `*.config.ts`.
- **File name = plural resource** (`users.service.ts`), **class name = singular**
  (`UserService`, `UserRepository`). Keep this pairing for new entities — don't mix.
## Constants

- **Never use TypeScript `enum`.** Always use a plain object with `as const` — it's
  erased at compile time (no runtime footprint), and its values are usable directly
  where a string is expected without an `enum`'s casting friction:

  ```ts
  // Wrong
  enum UserRole {
    Admin = 'admin',
    User = 'user',
  }

  // Right
  export const UserRoles = { ADMIN: 'admin', USER: 'user' } as const;
  ```

- **Enum-like object** (you index into it, `X.Y`) → object name `PascalCase`, inner keys
  `SCREAMING_SNAKE_CASE`: `UserRoles.ADMIN`, `CacheKeyPrefix.USERS`, `ExpiryTime.ACCESS_TOKEN`.
- **Standalone primitive** (no dot, used directly) → `SCREAMING_SNAKE_CASE`:
  `MAX_RETRIES`, `DEFAULT_TIMEOUT_MS`.

## Import aliases

Always import from `@/*`, never a relative path across folders (`../../utils/...`).

```ts
'@/*' → ./src/*
```

```ts
// Wrong
import ApiError from '../../utils/api-error';

// Right
import ApiError from '@/utils/api-error';
```

A relative import (`./`, `../`) is only fine for a same-folder sibling file. Anything
crossing into another top-level `src/` folder (`utils`, `repositories`, `services`,
`database`, `constants`, etc.) goes through `@/`.

## Comments: write almost none

**Do not add comments unless the user explicitly asks, or the code is genuinely dangerous
without one.** Default to zero. This is a hard rule — noisy comments are actively harmful
here, not just untidy.

Only add a comment at a **very-very-very important** spot — a constraint the code cannot
show on its own, one that would get silently "fixed" and break something. That is the only
bar. Everywhere else, do not spend time writing one — no summarizing what a function does,
no explaining a change, no restating a name, no "why" for something already obvious from the
code. If you're unsure whether a spot qualifies, it doesn't — skip it.

Never write a comment that:

- says what the next line does (`// hash the password` above `hashPassword(...)`)
- explains your change to a reviewer (`// changed this to use ApiError`)
- narrates structure (`// --- helpers ---`)
- restates a name (`/** Gets the user */` over `getProfile()`)

Real examples of the rare cases that do qualify:

```ts
// AUTO-GENERATED by drizzle-kit — DO NOT EDIT BY HAND.   (a migration file — prevents lost work)
// tx must be last param — services rely on this order for withTransaction to work
```

The test: _if someone deleted this comment, would they later break the code?_ If no, don't
write it. Good naming replaces almost every comment you were about to write.

## Repository — `repositories/<entity>.repository.ts`

Class singular, every method `static`. Reads take an optional `select?: SelectFields<T>`
through `normalizeSelect`/`buildReturning`. Mutations always take `tx?: Transaction` last.

```typescript
import { db } from '@/database/db';
import { users, type InsertUser, type User } from '@/database/schema';
import { SelectFields } from '@/types';
import { buildReturning, normalizeSelect } from '@/utils/repository-helpers';
import { Transaction } from '@/utils/transaction';
import { eq } from 'drizzle-orm';

export class UserRepository {
  static async findById(id: string, select?: SelectFields<User>) {
    return await db.query.users.findFirst({
      where: { id },
      columns: normalizeSelect(select),
    });
  }

  static async update(
    id: string,
    data: Partial<InsertUser>,
    select?: SelectFields<User>,
    tx?: Transaction
  ) {
    const dbClient = tx ?? db;
    const [updated] = await dbClient
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning(buildReturning(users, select));
    return updated as User;
  }
}
```

## Service — `services/<entity>.service.ts`

Class singular, every method `static`. Owns business rules; throws `ApiError` for domain
failures. Wraps multi-write flows in `withTransaction` (see "Transactions" above).

```typescript
import { UserRepository } from '@/repositories/users.repository';
import { VerificationRepository } from '@/repositories/verifications.repository';
import ApiError from '@/utils/api-error';
import { withTransaction } from '@/utils/transaction';

export class UserService {
  static async getProfile(userId: string) {
    const user = await UserRepository.findById(userId, { password: false });
    if (!user) throw ApiError.notFound('User not found');
    return { user };
  }

  static async verifyEmail(token: string) {
    const verification = await VerificationRepository.findByToken(token);
    if (!verification) throw ApiError.badRequest('Invalid or expired token');

    const { user } = await withTransaction(async (tx) => {
      const user = await UserRepository.update(
        verification.userId,
        { isVerified: true },
        { password: false },
        tx
      );
      await VerificationRepository.deleteByToken(token, tx);
      return { user };
    });

    return { user };
  }
}
```

## DB Schema — `database/schema/<entity>.ts`

Table var plural (`users`), export `type Entity`/`InsertEntity` via
`$inferSelect`/`$inferInsert`, spread `timestamps` from `utils/schema-helpers.ts`.

```typescript
import { timestamps } from '@/utils/schema-helpers';
import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  ...timestamps,
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
```

## Validator — `validators/<entity>.validator.ts`

One `createSchema({...})` export per route, named `<action>Schema`. Error text always
comes from `ApiMessages.VALIDATION.*`, never an inline string.

```typescript
import { ApiMessages } from '@/constants/api-messages';
import { createSchema } from '@/utils/validation-helpers';
import { z } from 'zod';

export const updateProfileSchema = createSchema({
  body: {
    name: z
      .string({ error: ApiMessages.VALIDATION.MUST_BE_STRING('Name') })
      .trim()
      .min(2, { error: ApiMessages.VALIDATION.MIN_LENGTH('Name', 2), abort: true }),
  },
});
```

## Controller — `controllers/<entity>.controller.ts`

Every handler wrapped in `asyncHandler` — no try/catch needed. Only extracts request
data, calls the service, sends `ApiResponse`. No DB/business logic here.

```typescript
import { UserService } from '@/services/users.service';
import ApiResponse from '@/utils/api-response';
import asyncHandler from '@/utils/async-handler';

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user?.id!;
  const { user } = await UserService.getProfile(userId);
  return ApiResponse.success(res, { user });
});
```

## Route — `routes/<entity>.route.ts`

Middleware order: `authenticate` (if protected) → `validate(schema)` → controller. Mount
the router in `routes/index.ts`.

```typescript
import * as usersController from '@/controllers/users.controller';
import { authenticate } from '@/middlewares/auth.middleware';
import { validate } from '@/middlewares/validate.middleware';
import { updateProfileSchema } from '@/validators/users.validator';
import { Router } from 'express';

const router = Router();

router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  usersController.updateProfile
);

export default router;
```

# Gotchas

Hard-won details — read before touching related code.

## `src/env.ts` is the single source of truth for environment variables

Every env var used anywhere in the app must be declared in the Zod schema in `src/env.ts`
first — `process.env.X` outside that file is not type-safe and won't be validated at
boot. Add new vars to the schema (and `.env.example`) before reading them elsewhere.

## Migrations are generated, never hand-written

`src/database/migrations/` is drizzle-kit output. Change the schema file, then run
`bun run db:generate` to produce the migration — don't edit schema and migration SQL
separately, they'll drift.

# Process

## Before you finish

1. `npx tsc --noEmit` must pass — nothing else runs it for you, and there's no CI to
   catch it later.
2. Never run `format`/prettier by hand — it runs automatically on commit. Don't reformat
   files yourself.
3. Grep for stale imports/references after any rename or delete (especially repository/
   service class renames, since call sites aren't refactored automatically).
4. Don't leave `console.log` in place of `logger`, or debug code, behind.
5. New mutations in a repository must accept `tx?: Transaction` as the last parameter,
   even if the current caller doesn't pass one.
6. New env vars must be added to `src/env.ts`'s Zod schema (and `.env.example`) or the
   app won't boot.
