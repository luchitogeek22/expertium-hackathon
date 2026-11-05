# Expertium: a verifiable industrial knowledge engine

Expertium turns a manufacturing nonconformity into a traceable quality record: answers grounded in cited procedures, a proposed corrective action, human approval, and a tamper-evident audit log.

Built solo by Luis Herrera (Peru) for the Meta Global AI Developer Hackathon, Indie track.

## Live demo
* https://www.youtube.com/watch?v=WzPiYtQtylw

## The problem
When a quality deviation occurs on a factory floor, floor operators and quality managers struggle to manually locate the exact regulatory procedure across massive internal documentation. Deciding on immediate corrective actions without immediate compliance context delays production and risks failing external regulatory audits due to a lack of verifiable, tamper-evident evidence.

## How it works
Four agents share one model, **Muse Spark 1.3** on **Meta Model API**, enforcing strict structured outputs:

*   **Knowledge:** Finds the applicable technical procedure and extracts precise cited source sections.
*   **Quality:** Evaluates the current operational nonconformity against the retrieved compliance criteria.
*   **CAPA:** Automatically generates corrective and preventive actions with assigned owners and due dates, then pauses the process to wait for mandatory human approval.
*   **Audit:** Seamlessly records all agent outputs, cited documentation, and final human approvals into a hash-chained, tamper-evident quality log.

### Example case
A line operator reports a *"pressure deviation in line 2"* during a production batch. The **Knowledge Agent** instantly retrieves the specific pressure threshold protocol, the **Quality Agent** flags the critical deviation, the **CAPA Agent** generates an emergency pressure valve inspection task assigned to maintenance, and once approved by the supervisor, the entire process is permanently sealed into the audit log.

## Measured results
Averages over demo cases:

| Metric | Result |
| :--- | :--- |
| Cost per case | **$0.008** |
| Latency per agent step | **10.2 s** |
| Backend tests | passing (`cd backend && pytest`) |

**Conclusion:** It demonstrates high operational efficiency and economic viability, processing complex cases at an ultra-low cost of \$0.008 USD per process. Furthermore, the average latency of 10.2 seconds per agent validates the speed of the automated multi-agent workflow compared to traditional manual auditing.

## Run locally
1. Copy `.env.example` to `.env` and add your Meta Model API key (server-side only, never committed).
2. Follow instructions in `backend/README.md` and `frontend/README.md`.
3. Demo data is automatically seeded on startup from `backend/app/db.py`.

## What's new compared to previous work
*   **Before the event:** The foundational concept and architectural design (a private MVP outline and the author's master's thesis proposal on semantic patterns for industrial quality control).
*   **During the hackathon:** Developed the entire live production system from scratch using **Meta Muse Code** and **Muse Spark 1.3**. Built and implemented the 4-agent orchestration workflow, structured JSON outputs validation, a custom cryptographic hash-chained audit system, the live human-in-the-loop approval flow, and integrated the full backend architecture with the responsive UI. All code in this repository was entirely written during the event.

## Limitations and roadmap
*   **Current state:** Configured for a single organization with demo seed data. By design, every CAPA action strictly requires human verification to prevent model hallucination risks in industrial setups.
*   **Roadmap:** Multitenant enterprise support, automated visual defect inspection using **SAM 3.1**, and direct integration for industrial smart factory pilots.

