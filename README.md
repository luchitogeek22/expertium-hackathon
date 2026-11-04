# Expertium: a verifiable industrial knowledge engine

Expertium turns a manufacturing non-conformity into a traceable quality file: sourced answers, a corrective-action proposal, human approval, and a tamper-evident audit trail. Built solo by Luis Herrera (Peru) for the Meta Global AI Developer Hackathon, Indie track.

## How it works
Four agents share one model, Muse Spark 1.3 on Meta Model API, with structured outputs:
1. **Knowledge** finds the applicable procedure and cites the source section.
2. **Quality** checks the case against the retrieved criteria.
3. **CAPA** proposes corrective and preventive actions with owner and due date, then waits for human approval.
4. **Audit** compiles decisions, sources and approvals into a hash-chained quality file.

## Measured results
- Cost per case: about $[X]
- Latency: about [Y] s per agent step
- Backend tests: `pytest` in `backend/`

## Run locally
Copy `.env.example` to `.env` and add your Meta Model API key (server side only, never committed). Then follow `backend/README.md` and `frontend/README.md`. Demo data is seeded on startup from `backend/app/db.py`.

## What is new vs. prior
- Prior: the concept and design (a private MVP created before the event, and the author's master's thesis proposal).
- During the hackathon: [all code in this repository, confirm before keeping this line].
- Built with Muse Code and Muse Spark 1.3.

## Limits and roadmap
Single organization, demo data. Next: multi-organization support, visual inspection with SAM 3.1, industrial pilots.
