# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

**Install and run development server:**
```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5174/` (or the next available port).

**Build for production:**
```bash
npm run build
npm run preview  # Preview production build locally
```

## Project Overview

This is a SvelteKit web application for sharing and rating posts with comments and reactions. It uses LibSQL (SQLite) for persistence and supports user authentication with session management.

## Architecture

### Stack
- **Frontend**: Svelte 4 with SvelteKit
- **Styling**: Tailwind CSS with PostCSS/Autoprefixer
- **Database**: LibSQL (SQLite file-based, `dirsa.db`)
- **Auth**: Session-based with scrypt password hashing
- **Server**: SvelteKit with Node adapter

### Core Modules

**`src/lib/db.ts`** — Database layer
- Manages SQLite connection and schema initialization
- Post CRUD: `createPost()`, `getPosts()`, `getTopPostToday()`
- Voting: `castVote()`, `getVoterVotes()`
- Comments: `getComments()`, `addComment()`
- "Also me" reactions: `toggleAlsoMe()`, `getAlsoMeByVoter()`
- Stats: `getDailyStats()`
- Post interface includes aggregated counts: `vote_count`, `avg_score`, `comment_count`, `also_me_count`

**`src/lib/auth.ts`** — Authentication
- Password hashing with scrypt: `hashPassword()`, `verifyPassword()`
- Session management: `createSession()`, `getSession()`, `deleteSession()`
- Sessions expire after 30 days

**`src/hooks.server.ts`** — Server initialization
- Runs database schema setup on first request

### Database Schema

- **users**: `id`, `username` (unique), `password_hash`, `created_at`
- **sessions**: `id` (primary), `user_id`, `expires_at`
- **posts**: `id`, `content`, `tag`, `username`, `user_id`, `media_url`, `media_type`, `created_at`
- **votes**: `id`, `post_id`, `score` (1-5), `voter_key`, `created_at` (unique per post+voter)
- **comments**: `id`, `post_id`, `content`, `username`, `user_id`, `created_at`
- **also_me**: `id`, `post_id`, `voter_key`, `created_at` (toggle reaction, unique per post+voter)

Voting uses a generic `voter_key` (can be session ID or anonymous identifier) rather than requiring login.

### Routes

**Pages:**
- `GET /` — Feed of posts
- `GET /login` — Login form
- `POST /login` — Handle login
- `GET /register` — Registration form
- `POST /register` — Handle registration
- `GET /logout` — Clear session and redirect

**APIs:**
- `POST /api/comment` — Add comment to a post
- `GET /api/comments/[postId]` — Get comments for a post
- `POST /api/vote` — Cast or update a vote
- `POST /api/alsome` — Toggle "also me" reaction

## Common Development Tasks

**Add a new page:**
1. Create `src/routes/[route]/+page.svelte` for UI
2. Create `src/routes/[route]/+page.server.ts` if you need server-side data loading
3. Use `export let data` in the `.svelte` file to access server data

**Add a new API endpoint:**
1. Create `src/routes/api/[endpoint]/+server.ts`
2. Export `POST`, `GET`, etc. handlers
3. Use the `db` module for data access

**Add a new database table:**
1. Add the table schema to the `initDb()` function in `src/lib/db.ts`
2. Wrap in `try/catch` if adding to existing databases (for backward compatibility)
3. Create query functions and export types alongside the schema

**Session/Auth patterns:**
- Sessions are stored in cookies (handled by SvelteKit)
- Use `event.locals.user` (populated by server hooks if needed) to access authenticated user
- Anonymous voting uses a stable `voter_key` identifier (could be based on IP or persistent client ID)

## Notes

- CSRF protection is disabled in `svelte.config.js` (see `csrf: { checkOrigin: false }`)
- Database file (`dirsa.db`) is in the project root
- The `names.ts` module is present but its purpose should be checked in context
- Media fields (`media_url`, `media_type`) exist on posts for future media support
