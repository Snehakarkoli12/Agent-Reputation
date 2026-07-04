# Agent Reputation Passport

A blockchain-ready trust infrastructure for autonomous AI agents featuring reputation scoring, cryptographic verification, audit trails, and tamper-evident agent passports.

---

## Overview

Agent Reputation Passport is an AI + Web3 system designed to evaluate autonomous AI agents, track their historical performance, compute evolving reputation scores, and generate cryptographic proofs for integrity verification.

The platform introduces a trust and accountability layer for AI agents by combining:

* AI task evaluation
* Dynamic reputation scoring
* Historical audit logs
* Deterministic cryptographic hashing
* Blockchain-ready proof anchoring

---

## Problem Statement

As autonomous AI agents become more capable, there is still no standardized way to:

* Measure agent reliability
* Verify historical behavior
* Detect tampering of reputation data
* Audit previous agent outputs
* Establish trust between users and autonomous systems

Most AI applications focus only on generation, not accountability.

---

## Solution

Agent Reputation Passport creates a persistent identity and trust profile for AI agents.

Each agent:

* executes tasks,
* gets evaluated,
* receives a reputation score,
* stores historical logs,
* generates cryptographic state proofs,
* and supports tamper-evident verification workflows.

---

## Core Features

### AI Agent Evaluation

Run sandboxed prompts/tasks against AI agents and evaluate response quality.

### Dynamic Reputation Engine

Reputation scores evolve based on:

* successful tasks,
* evaluation outcomes,
* historical consistency.

### Cryptographic State Verification

Every agent state generates a deterministic cryptographic hash.

Any modification to the state changes the hash instantly.

### Historical Audit Trail

Append-only logs store:

* prompts,
* responses,
* timestamps,
* evaluation results.

### Blockchain-Ready Proof Anchoring

Prepared for immutable on-chain verification of agent state hashes.

### Passport Dashboard

Visual visualization of:

* reputation score,
* success rate,
* verification status,
* historical logs,
* proof state.

---

## Architecture

User Prompt
↓
AI Agent Executes Task
↓
Evaluation Engine Scores Output
↓
Reputation Engine Updates Trust Score
↓
Cryptographic Hash Computed
↓
Verification / Proof Sync
↓
Dashboard Displays Passport State

---

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js API Routes
* TypeScript

### Database

* Supabase

### AI Layer

* OpenAI API

### Blockchain Layer

* Solidity
* Hardhat
* Ethers.js

### Cryptography

* SHA-256 / Keccak256 hashing

---

## Reputation Workflow

1. User submits task prompt
2. AI agent generates response
3. Evaluation engine scores response
4. Reputation score updates
5. Agent state version increments
6. Cryptographic hash recalculated
7. Verification status updated
8. Historical log appended

---

## Example Passport Metrics

* Reputation Score
* Successful Tasks
* Total Tasks
* Verification Status
* State Version
* Cryptographic State Hash
* Audit Logs

---

## Future Improvements

* Real blockchain proof anchoring
* Multi-agent reputation federation
* Decentralized identity integration
* Reputation explainability engine
* Advanced evaluation metrics
* zk-proof based verification
* Cross-platform agent passports

---

## Installation

Clone the repository:

```bash
git clone https://github.com/Snehakarkoli12/Agent-Reputation.git
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

---

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_KEY
OPENAI_API_KEY=YOUR_OPENAI_KEY
RPC_URL=YOUR_RPC_URL
PRIVATE_KEY=YOUR_WALLET_PRIVATE_KEY
```

---

## Current MVP Status

### Implemented

* AI task execution
* Reputation engine
* Historical logs
* Cryptographic hashing
* Verification workflow
* Passport dashboard

### In Progress

* Immutable on-chain proof anchoring

---

## Why This Project Matters

As AI agents become autonomous, trust and verification become critical infrastructure problems.

Agent Reputation Passport focuses on:

* accountability,
* transparency,
* auditability,
* and verifiable AI trust.

---

## Author

Sneha Karkoli

---

## License

MIT License

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
