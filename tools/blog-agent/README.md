# LUPO blog research agent

A weekly research agent that produces draft blog posts for the LUPO blog at https://lupolabs.ai/blog/. The agent **never publishes to production**. It generates a Markdown draft, validates it against a strict quality gate, writes it to `content/blog/drafts/`, and optionally opens a PR for human review.

## Design principles

1. **Fail closed.** If the agent cannot validate sources or pass the quality gate, it writes the draft with `recommendedPublish: false` and does not open a PR. A human must read and approve.
2. **No production writes.** The agent writes to a draft directory and (optionally) a PR branch. It never touches `main`, never pushes to Netlify, never edits live blog HTML.
3. **No fake metrics.** Every numeric claim in the body has to trace to a citation in `sources`. Em dashes are rejected outright (LUPO blog style rule).
4. **Operator-grade tone.** The system prompt enforces direct, specific, sales-ops voice. No AI slop, no "10 best" listicles, no generic "what is X" explainers.

## Repo layout

```
tools/blog-agent/
├── README.md                              this file
├── requirements.txt                       Python dependencies
├── generate_blog_draft.py                 the entrypoint
├── prompts/
│   ├── lupo_blog_research_prompt.md       agent system prompt
│   └── lupo_blog_quality_check.md         editor review prompt
└── examples/
    └── sample_output.json                 schema reference + example
```

Drafts are written to `content/blog/drafts/{slug}.md` at the repo root.

## Required environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `HERMES_MODEL` | optional | Model the agent uses. Default `claude-sonnet-4-6`. |
| `HERMES_ENABLED` | optional | Set to `false` to force the fallback path (no Hermes). |
| `ANTHROPIC_API_KEY` | required if Hermes uses Anthropic, or fallback path | LLM access |
| `OPENAI_API_KEY` | required if Hermes uses OpenAI, or fallback path | LLM access |
| `FIRECRAWL_API_KEY` | optional | Web search via Firecrawl |
| `TAVILY_API_KEY` | optional | Web search via Tavily (used if Firecrawl is not set) |
| `GITHUB_TOKEN` | optional | Needed only for PR creation |
| `BLOG_AGENT_CREATE_PR` | optional | Default `true`. Set `false` to skip PR step. |
| `BLOG_AGENT_AUTO_PUBLISH` | required | Must be `false`. The agent refuses to run if this is `true`. |
| `BLOG_AGENT_DRY_RUN` | optional | If `true`, prints JSON to stdout and does not write any files. |

No secrets are committed to this repo. Use your runtime's secret manager (Vercel project env, AWS Secrets Manager, 1Password CLI, etc.).

## Path A: Hermes built-in cron on a small persistent VM

This is the lowest-effort production setup if you already have a server.

1. **Provision a small VM.** AWS EC2 `t4g.small`, DigitalOcean droplet, Hetzner CX11, or any equivalent. Hermes does not need a lot of resources for a weekly job.

2. **Install Hermes.** Follow the install steps in the Hermes Agent repo at https://github.com/nousresearch/hermes-agent.

3. **Clone this repo on the VM and install agent deps.**
   ```bash
   git clone https://github.com/tjbaxter/LUPOWEB.git ~/lupoweb
   cd ~/lupoweb/tools/blog-agent
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Configure secrets on the VM.** Either a `.env` file outside the repo, or systemd env files, or your secret manager of choice.

5. **Register the cron with Hermes.** From the Hermes CLI:
   ```
   Every Monday at 8am New York time, research the last 7 days of inbound sales, RevOps, sales routing, AI SDR, CRM, and sales automation news. Draft one LUPO blog article for VP Sales and RevOps leaders. Create a draft file and a PR. Do not publish directly.
   ```
   Hermes converts this to a cron schedule and invokes the registered command, which should be:
   ```
   ~/lupoweb/tools/blog-agent/.venv/bin/python ~/lupoweb/tools/blog-agent/generate_blog_draft.py
   ```

6. **Verify the dry run.** Before the first scheduled run, run manually with `BLOG_AGENT_DRY_RUN=true` and confirm the agent produces a draft you would accept.

## Path B: AWS EventBridge Scheduler with ECS/Fargate

This is the AWS-native option. More moving parts, but no persistent VM to maintain.

1. **Build a container image** from the repo:
   ```dockerfile
   FROM python:3.12-slim
   WORKDIR /app
   COPY tools/blog-agent/requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   COPY tools/blog-agent /app/tools/blog-agent
   COPY content /app/content
   COPY blog /app/blog
   CMD ["python", "tools/blog-agent/generate_blog_draft.py"]
   ```

2. **Push to ECR.** Standard `aws ecr` workflow.

3. **Create a Fargate task definition** that runs the container. Allocate 1 vCPU / 2 GB RAM (cheap for a once-a-week task).

4. **Store secrets in AWS Secrets Manager** (Anthropic key, GitHub token, Firecrawl/Tavily key) and reference them from the task definition.

5. **Create an EventBridge Scheduler schedule** with:
   - Cron expression: `cron(0 13 ? * MON *)` for 8am New York time on Mondays (13:00 UTC during EDT, adjust during EST).
   - Target: the ECS RunTask API, pointing at your cluster and task definition.
   - Retry policy: 0. If the agent fails, the draft does not get written, and the next week's run produces a fresh attempt.

6. **Avoid Lambda for this job.** Hermes' transitive dependencies (browser automation, heavy LLM/search clients) exceed Lambda's 250 MB unzipped limit and 15-minute execution cap. Fargate is the right fit.

## What the agent produces

A draft file at `content/blog/drafts/{slug}.md` with frontmatter that includes:

```yaml
---
title: "Title here"
slug: "slug-here"
description: "1-2 sentence summary"
category: "AI in sales"          # one of: AI in sales | Buyer experience | Routing & ops | Inbound quality | AI safety & ops
readingTime: "7 min read"
draftGeneratedAt: "2026-05-15"
recommendedPublish: true
riskFlags: []
sources:
  - title: "..."
    publisher: "..."
    url: "..."
    dateAccessed: "2026-05-13"
    whyRelevant: "..."
---

Body markdown here.
```

If `recommendedPublish` is `false`, the agent failed at least one quality gate and a human must read the draft + fix it before it goes anywhere near production.

## Promoting a draft to a live post

The agent does not generate HTML. The live blog uses hand-authored HTML files at `/blog/{slug}.html`, matching the existing seed posts (`/blog/the-ai-sdr-has-moved-inbound.html`, etc.). To promote a draft:

1. Read the draft at `content/blog/drafts/{slug}.md`. Edit aggressively. The agent gets you 60-70% of the way to publishable.
2. Copy any existing seed post (e.g. `blog/the-inbound-triage-tax.html`) and use it as the HTML scaffold.
3. Fill in the title, category, summary, body paragraphs, sources block, related-articles block, and bottom CTA.
4. Add a card for the new post to `blog/index.html`.
5. Add the post to `sitemap.xml` (lowest, but include it).
6. Commit, push, let Netlify auto-deploy.

A future iteration of this agent can produce HTML directly. Today it produces Markdown drafts because Markdown is easier to edit by hand.

## Local testing

```bash
cd ~/lupoweb
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/blog-agent/requirements.txt

# Dry run (prints JSON to stdout, does not write files)
BLOG_AGENT_DRY_RUN=true \
ANTHROPIC_API_KEY=sk-ant-... \
python tools/blog-agent/generate_blog_draft.py

# Real run, no PR
BLOG_AGENT_CREATE_PR=false \
ANTHROPIC_API_KEY=sk-ant-... \
python tools/blog-agent/generate_blog_draft.py
```

## What this agent is NOT

- It is not a CMS.
- It is not a publish pipeline.
- It is not allowed to write to `main`.
- It is not allowed to push to Netlify.
- It is not allowed to invent customer logos, metrics, or dates.

## Safety contract

If any of the following is observed, kill the agent and investigate:

- Drafts with em dashes.
- Drafts with company names LUPO has not published as customers.
- Drafts with numeric claims that do not appear in any cited source.
- Drafts with publish-date claims in the body text (the agent should never write "in May 2026").
- Drafts that read as disguised LUPO product pages.

The agent's success criterion is one good draft per week. Empty weeks are acceptable. A bad post would cost more credibility than no post.
