# NEZZ_ — AI Data Visualizer

**Big Ideas. Cheap Model. The constraint is the creativity.**

> `best_project = weakest_possible_model × highest_possible_impact`

[![Model](https://img.shields.io/badge/Model-Qwen3%200.6B-orange)](https://ollama.com/library/qwen3)
[![Tier](https://img.shields.io/badge/Tier-1%20%C2%B7%20Absolute%20Garage%20MAX-red)](https://garage-inference.dev)
[![Cost](https://img.shields.io/badge/Cost-%240.00%20local-green)](https://ollama.com)
[![Live Demo](https://img.shields.io/badge/Live-nezz--data--visualizer.vercel.app-blue)](https://nezz-data-visualizer.vercel.app)

---

## What It Does

Nezz is a data visualization tool that takes any CSV or JSON dataset, runs it through a **0.6 billion parameter model**, and returns:

- Natural language trend analysis
- Anomaly detection with row-level flagging
- Auto chart type recommendation (line / bar / scatter)
- Confidence score
- Heuristic fallback if the model fails

A model that barely follows instructions produces analyst-grade insights. That is the Wow Gap.

---

## The Problem

Most data tools require expensive cloud APIs or large models. A student with a $500 laptop and no API budget cannot run GPT-4 to analyze their CSV. Nezz runs entirely offline on a CPU using a 0.6B model — the smallest model that still gets the job done.

---

## Model Declaration

| Field | Value |
|---|---|
| **Model** | `qwen3:0.6b` (Qwen 3 0.6B Q4_K_M) |
| **Tier** | Tier 1 · Absolute Garage MAX |
| **Parameters** | 600 million |
| **Runs on** | Local CPU via Ollama — fully offline |
| **Deployed demo** | Groq free tier · `llama-3.1-8b-instant` |
| **Cost (local)** | $0.00 |
| **Cost (deployed)** | $0.00 (Groq free tier) |
| **Latency** | ~1.2s on CPU laptop |
| **Tokens/sec** | ~38 t/s |

---

## Engineering Scaffolding

The model is weak. The engineering compensates.

### 1. Structured Prompts
The model receives strict XML output tags — `<trend>`, `<anomalies>`, `<recommendation>`, `<confidence>`, `<chartType>`, `<reasoning>`. This constrains output to what a 0.6B model can reliably handle. No freeform generation.

### 2. Validation Layer
Every response is parsed and validated. If any required XML tag is missing, the response is rejected and retried. The model never silently fails.

### 3. Multi-Step Pipeline (`src/lib/pipeline.ts`)
```
Step 1: Parse + clean CSV (handle missing values, type detection)
Step 2: Send cleaned data to model with structured prompt
Step 3: Validate XML output → retry if invalid
Step 4: If 2 attempts fail → heuristic fallback
```

### 4. Heuristic Fallback (`src/lib/heuristic.ts`)
When the model fails, a pure math fallback kicks in — mean, standard deviation, outlier detection via z-score. The app never breaks. The fallback is clearly labeled in the UI.

### 5. Few-Shot Examples
The prompt includes 2 worked examples (time-series and scatter). This alone increased valid output rate from ~40% to ~85% on the 0.6B model.

---

## Live Demo

**[nezz-data-visualizer.vercel.app](https://nezz-data-visualizer.vercel.app)**

Two demo datasets are pre-loaded on the page:

**Success Demo — E-commerce Sales**
```
month,revenue,orders,returns
Jan,42000,1200,89
Feb,38500,1050,102
Mar,51200,1480,76
Apr,44800,1290,91
May,67300,1820,64
Jun,71200,1950,58
```
Expected output: trend detected, March anomaly flagged, line chart recommended, confidence ~90%.

**Failure Demo — Sensor Data (intentionally messy)**
```
timestamp,temp_c,humidity,pressure_hpa
08:00,22.1,45,1013
08:15,22.4,46,1012
08:30,99.9,46,1012
08:45,,47,1011
09:00,23.1,220,1010
09:15,23.0,48,999
09:30,22.8,48,
```
Expected output: model struggles with missing values and outliers → heuristic fallback activates → UI shows fallback banner.

---

## Cost & Performance Metrics

| Metric | Value |
|---|---|
| Total API spend | $0.00 |
| Local inference cost | $0.00 |
| Avg latency (0.6B local) | 1.2s |
| Avg latency (Groq deployed) | 0.8s |
| Tokens per analysis | ~1,200 |
| Tokens/sec (local CPU) | ~38 t/s |
| Valid output rate (raw) | ~40% |
| Valid output rate (with scaffolding) | ~85% |
| Fallback rate | ~15% |

---

## Known Failures

Honesty is part of the submission.

| Failure | Impact | Mitigation |
|---|---|---|
| **Scale limit** | >500 rows causes context window overflow | Data sampled to 50 rows automatically |
| **Hallucinated column names** | Model occasionally references wrong columns | XML validation layer rejects and retries |
| **Confidence not calibrated** | Score is model intuition, not statistical | Labeled clearly in UI as "model estimate" |
| **Non-English headers** | Significantly degrades output quality | Warning shown if non-ASCII headers detected |
| **Nested JSON** | Fails to parse deeply nested structures | Only flat CSV and flat JSON supported |

---

## Run Locally (Judges)

Prerequisites: Node.js 18+, [Ollama](https://ollama.com)

```bash
# 1. Clone
git clone https://github.com/Iniyan-06/nezz-data-visualizer.git
cd nezz-data-visualizer

# 2. Pull the model
ollama pull qwen3:0.6b

# 3. Start Ollama
ollama serve

# 4. Install and run
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000)

That is it. No API keys. No GPU. No cloud account. Runs on any laptop with 4GB RAM.

---

## Architecture

```
User uploads CSV / JSON
        ↓
dataCleaner.ts     → parse, fix missing values, detect types
        ↓
ollamaAnalyzer.ts  → structured XML prompt → Qwen 3 0.6B
        ↓
Validation Layer   → check all 4 XML tags present
        ↓ (fail × 2)
heuristic.ts       → mean / std dev / z-score fallback
        ↓
ollama.ts          → Chart.js config generation
        ↓
Frontend           → render chart + insight cards + model receipt
```

---

## Project Structure

```
nezz/
├── src/
│   ├── lib/
│   │   ├── pipeline.ts        # Multi-step orchestration
│   │   ├── ollamaAnalyzer.ts  # Structured prompt + retry + validation
│   │   ├── ollama.ts          # Chart.js config generation
│   │   ├── heuristic.ts       # Math fallback (no model)
│   │   └── dataCleaner.ts     # CSV/JSON parse + clean
│   └── app/
│       ├── page.tsx           # Main UI
│       └── api/               # Next.js API routes
├── next.config.js
├── .env.local                 # GROQ_API_KEY (not committed)
└── README.md
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, React, TypeScript |
| Charts | Chart.js |
| AI (local) | Qwen 3 0.6B via Ollama |
| AI (deployed) | Llama 3.1 8B via Groq free tier |
| Styling | CSS Modules |
| Deployment | Vercel |

---

## The Wow Gap

A 0.6B model — the kind that struggles to follow basic instructions — produces:

- Multi-point trend analysis in plain English
- Row-level anomaly detection with reasons
- Chart type recommendation with reasoning
- Confidence scoring
- Graceful degradation to heuristics when it fails

Expected capability of a 0.6B model: basic text completion, often incoherent.
Actual output quality: junior data analyst level.

That gap is the engineering. Structured prompts + validation + fallback + few-shot examples closed a 4× capability gap.

---

## Submission Checklist

- [x] Working demo — [nezz-data-visualizer.vercel.app](https://nezz-data-visualizer.vercel.app)
- [x] Public GitHub repo — clean README, one-command setup
- [x] Exact model declaration — `qwen3:0.6b` Q4_K_M, Tier 1
- [x] Technical writeup — pipeline, prompts, validation documented
- [x] Cost & performance metrics — $0.00, 1.2s, 38 t/s
- [x] Known failures — 5 documented with mitigations
- [x] Open source — MIT license

---

## License

MIT
