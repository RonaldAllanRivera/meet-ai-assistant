# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-15
### Added
- Phase 2: Caption reader with MutationObserver and DOM fallback scanning
- Phase 2: Caption normalization, dedupe, and rolling buffer
- Phase 3: Question detection heuristics with cooldown and dedupe
- Phase 4: Overlay UI for listening/question/answer states
- Phase 5: Serverless API endpoints for install + answer with token auth
- Phase 5: Basic safety filter, rate limiting, and OpenAI request wrapper
- Docker support for local Fastify dev (Dockerfile + compose)
- Backend API fully tested and functional

## [0.1.0] - 2026-01-15
### Added
- Monorepo scaffold for extension, backend, and shared types
- Vercel-ready serverless API placeholders (`/api/answer`, `/api/install`)
- Base TypeScript configuration and workspace setup
- Initial project documentation and deployment notes
