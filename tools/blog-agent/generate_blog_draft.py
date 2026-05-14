#!/usr/bin/env python3
"""
LUPO blog research agent — weekly draft generator.

This script is designed to run on a weekly cron (Hermes built-in cron, or
AWS EventBridge Scheduler firing an ECS/Fargate task). It produces a
Markdown draft blog post and either writes it to disk or opens a PR
against the LUPOWEB repo for human review.

It NEVER publishes to production. The pipeline is:

    cron fires --> generate_blog_draft.py --> Markdown draft + JSON metadata
                                          --> write to content/blog/drafts/
                                          --> open PR (default off)
                                          --> human reviews + merges

Configuration is entirely via environment variables. See README.md.
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# Hermes AIAgent is the preferred path. If it is not installed in the
# runtime, we fall back to a direct Anthropic or OpenAI call. Both
# fallbacks honor the same prompt + quality-check pipeline.
try:
    from hermes_agent import AIAgent  # type: ignore[import-not-found]
    HERMES_AVAILABLE = True
except Exception:  # noqa: BLE001 - we want to catch any import error
    HERMES_AVAILABLE = False

try:
    import jsonschema  # type: ignore[import-not-found]
except ImportError:
    print("ERROR: jsonschema is required. Run `pip install -r requirements.txt`.", file=sys.stderr)
    sys.exit(2)

REPO_ROOT = Path(__file__).resolve().parents[2]
TOOL_DIR = Path(__file__).resolve().parent
PROMPT_RESEARCH = TOOL_DIR / "prompts" / "lupo_blog_research_prompt.md"
PROMPT_QUALITY = TOOL_DIR / "prompts" / "lupo_blog_quality_check.md"
SAMPLE_OUTPUT = TOOL_DIR / "examples" / "sample_output.json"
DRAFTS_DIR = REPO_ROOT / "content" / "blog" / "drafts"

ALLOWED_CATEGORIES = {
    "AI in sales",
    "Buyer experience",
    "Routing & ops",
    "Inbound quality",
    "AI safety & ops",
}

# Strict schema. Mirrors the agent prompt. Extra keys are tolerated but
# all of these are required for the output to be considered valid.
OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "title",
        "slug",
        "description",
        "category",
        "readingTime",
        "recommendedPublish",
        "riskFlags",
        "sources",
        "bodyMarkdown",
    ],
    "properties": {
        "title": {"type": "string", "minLength": 12, "maxLength": 200},
        "slug": {"type": "string", "pattern": r"^[a-z0-9]+(?:-[a-z0-9]+)*$"},
        "description": {"type": "string", "minLength": 40, "maxLength": 320},
        "category": {"type": "string", "enum": sorted(ALLOWED_CATEGORIES)},
        "readingTime": {"type": "string", "pattern": r"^\d+\s+min\s+read$"},
        "recommendedPublish": {"type": "boolean"},
        "riskFlags": {"type": "array", "items": {"type": "string"}},
        "sources": {
            "type": "array",
            "minItems": 3,
            "items": {
                "type": "object",
                "required": ["title", "publisher", "url", "dateAccessed", "whyRelevant"],
                "properties": {
                    "title": {"type": "string"},
                    "publisher": {"type": "string"},
                    "url": {"type": "string", "pattern": r"^https?://"},
                    "dateAccessed": {"type": "string", "pattern": r"^\d{4}-\d{2}-\d{2}$"},
                    "whyRelevant": {"type": "string"},
                },
            },
        },
        "bodyMarkdown": {"type": "string", "minLength": 1200},
    },
}


@dataclass
class AgentConfig:
    model: str
    hermes_enabled: bool
    create_pr: bool
    auto_publish: bool
    search_provider: Optional[str]
    github_token: Optional[str]
    dry_run: bool


def load_config() -> AgentConfig:
    return AgentConfig(
        model=os.environ.get("HERMES_MODEL", "claude-sonnet-4-6"),
        hermes_enabled=HERMES_AVAILABLE and os.environ.get("HERMES_ENABLED", "true").lower() == "true",
        create_pr=os.environ.get("BLOG_AGENT_CREATE_PR", "true").lower() == "true",
        auto_publish=os.environ.get("BLOG_AGENT_AUTO_PUBLISH", "false").lower() == "true",
        search_provider=(
            "firecrawl" if os.environ.get("FIRECRAWL_API_KEY")
            else "tavily" if os.environ.get("TAVILY_API_KEY")
            else None
        ),
        github_token=os.environ.get("GITHUB_TOKEN"),
        dry_run=os.environ.get("BLOG_AGENT_DRY_RUN", "false").lower() == "true",
    )


def run_research_agent(cfg: AgentConfig) -> dict[str, Any]:
    """
    Invoke the research agent and return its JSON output.

    Preferred path: Hermes AIAgent with the research prompt and the
    selected web-search provider. Fallback: a direct LLM call with the
    same prompt, no web access (the agent is told to refuse to publish
    if it cannot ground its claims).
    """
    research_prompt = PROMPT_RESEARCH.read_text()
    sample_schema = SAMPLE_OUTPUT.read_text()

    system_prompt = (
        research_prompt
        + "\n\n## Output schema example\n\n"
        + "```json\n"
        + sample_schema
        + "\n```\n"
        + "\nReturn ONLY the JSON object. No prose before or after."
    )

    if cfg.hermes_enabled:
        agent = AIAgent(
            model=cfg.model,
            search_provider=cfg.search_provider,
            system_prompt=system_prompt,
        )
        raw = agent.run(
            instruction=(
                "Research the last 7 days of public-web content on inbound sales, "
                "AI SDRs, routing, and RevOps. Pick one focused topic and produce "
                "a draft blog post matching the JSON schema."
            )
        )
        return _coerce_json(raw)

    # Fallback path. Anthropic preferred. OpenAI second. Both use the
    # same prompt and produce the same JSON shape.
    if os.environ.get("ANTHROPIC_API_KEY"):
        from anthropic import Anthropic  # type: ignore[import-not-found]

        client = Anthropic()
        msg = client.messages.create(
            model=cfg.model,
            max_tokens=8192,
            system=system_prompt,
            messages=[{
                "role": "user",
                "content": (
                    "Produce a draft blog post matching the JSON schema. You have "
                    "no live web access in this fallback path, so only cite sources "
                    "you can verify from your training data and set recommendedPublish "
                    "to false if you cannot ground every numeric claim."
                ),
            }],
        )
        raw = msg.content[0].text  # type: ignore[union-attr]
        return _coerce_json(raw)

    if os.environ.get("OPENAI_API_KEY"):
        from openai import OpenAI  # type: ignore[import-not-found]

        client = OpenAI()
        resp = client.chat.completions.create(
            model=cfg.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Produce a draft blog post matching the JSON schema."},
            ],
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content or ""
        return _coerce_json(raw)

    raise RuntimeError(
        "No LLM provider available. Install hermes-agent OR set ANTHROPIC_API_KEY OR OPENAI_API_KEY."
    )


def _coerce_json(raw: str) -> dict[str, Any]:
    """Extract the first JSON object from a response. Tolerates fences and pre/post prose."""
    raw = raw.strip()
    if raw.startswith("```"):
        # Drop the first fence line and any trailing fence
        lines = raw.splitlines()
        lines = lines[1:] if lines and lines[0].startswith("```") else lines
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        raw = "\n".join(lines)
    # Find the first balanced JSON object in the response
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError("Could not find JSON object in agent response")
    return json.loads(match.group(0))


def validate_output(output: dict[str, Any]) -> list[str]:
    """Return a list of validation failures. Empty list means valid."""
    failures: list[str] = []

    try:
        jsonschema.validate(instance=output, schema=OUTPUT_SCHEMA)
    except jsonschema.ValidationError as exc:
        failures.append(f"schema: {exc.message}")

    body = output.get("bodyMarkdown", "")

    # Hard quality rules.
    if "—" in body or "&mdash;" in body:
        failures.append("style: em dash found in body")

    if "$" in body and not output.get("sources"):
        failures.append("integrity: dollar-amount claim without sources")

    if re.search(r"\b\d+%", body):
        # Numbers with % require at least one citation in the body
        if not re.search(r"\[\d+\]|\(see source", body, re.IGNORECASE):
            # Soft warning, not a hard failure. Risk-flag it.
            output.setdefault("riskFlags", []).append("percentage claim without inline citation")

    # Heading discipline.
    h2_count = sum(1 for line in body.splitlines() if line.startswith("## "))
    if h2_count < 3:
        failures.append(f"structure: only {h2_count} H2 sections (need 3+)")

    # Word count.
    word_count = len(body.split())
    if word_count < 700 or word_count > 1800:
        failures.append(f"length: body is {word_count} words (target 800-1500)")

    # Category.
    if output.get("category") not in ALLOWED_CATEGORIES:
        failures.append(f"category: '{output.get('category')}' not in allowed set")

    # Slug uniqueness against existing live blog posts.
    slug = output.get("slug", "")
    live_blog = REPO_ROOT / "blog" / f"{slug}.html"
    draft_md = DRAFTS_DIR / f"{slug}.md"
    if live_blog.exists():
        failures.append(f"slug: '{slug}' already exists at /blog/{slug}.html on the live site")
    if draft_md.exists():
        failures.append(f"slug: a draft for '{slug}' already exists at {draft_md.relative_to(REPO_ROOT)}")

    return failures


def write_draft(output: dict[str, Any]) -> Path:
    """Write the draft to content/blog/drafts/{slug}.md and return the path."""
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    slug = output["slug"]
    target = DRAFTS_DIR / f"{slug}.md"

    today = datetime.now(timezone.utc).date().isoformat()

    sources_yaml = []
    for src in output.get("sources", []):
        sources_yaml.append(
            "  - title: " + json.dumps(src["title"], ensure_ascii=False)
            + "\n    publisher: " + json.dumps(src["publisher"], ensure_ascii=False)
            + "\n    url: " + json.dumps(src["url"], ensure_ascii=False)
            + "\n    dateAccessed: " + json.dumps(src["dateAccessed"], ensure_ascii=False)
            + "\n    whyRelevant: " + json.dumps(src["whyRelevant"], ensure_ascii=False)
        )

    frontmatter = (
        "---\n"
        f"title: {json.dumps(output['title'], ensure_ascii=False)}\n"
        f"slug: {slug}\n"
        f"description: {json.dumps(output['description'], ensure_ascii=False)}\n"
        f"category: {json.dumps(output['category'], ensure_ascii=False)}\n"
        f"readingTime: {json.dumps(output['readingTime'], ensure_ascii=False)}\n"
        f"draftGeneratedAt: {today}\n"
        f"recommendedPublish: {str(output['recommendedPublish']).lower()}\n"
        f"riskFlags: {json.dumps(output.get('riskFlags', []))}\n"
        "sources:\n"
        + "\n".join(sources_yaml) + "\n"
        "---\n\n"
    )

    target.write_text(frontmatter + output["bodyMarkdown"].strip() + "\n")
    return target


def open_pr(cfg: AgentConfig, draft_path: Path, output: dict[str, Any]) -> Optional[str]:
    """
    Open a PR with the draft, on a branch named `blog-draft/YYYY-MM-DD-{slug}`.
    Returns the PR URL on success, None on failure.

    This function is intentionally minimal. In production it should
    use a library like `pygithub` or the GitHub REST API directly to:
      1. Create a new branch from main.
      2. Add the draft file to the branch.
      3. Open a PR with body "Draft: {title}".
      4. Tag the maintainer for review.

    The skeleton below documents the intent. Filling it in is a one-shot
    integration task that depends on which CI/CD path you adopt (Hermes
    cron on a VM, ECS/Fargate, GitHub Actions runner).
    """
    if not cfg.create_pr:
        print(f"[blog-agent] BLOG_AGENT_CREATE_PR=false; skipping PR step. Draft at {draft_path}", file=sys.stderr)
        return None
    if not cfg.github_token:
        print("[blog-agent] No GITHUB_TOKEN available; cannot open PR. Draft written.", file=sys.stderr)
        return None

    # NOTE: actual PR creation is intentionally left as a one-line
    # integration call. We do not want this script to run a destructive
    # git operation without an explicit GitHub permission scope.
    branch = f"blog-draft/{datetime.now(timezone.utc).date().isoformat()}-{output['slug']}"
    print(f"[blog-agent] Would open PR on branch {branch} for {draft_path}", file=sys.stderr)
    return None


def main() -> int:
    cfg = load_config()
    print(f"[blog-agent] starting (hermes={cfg.hermes_enabled}, dry_run={cfg.dry_run})", file=sys.stderr)

    if cfg.auto_publish:
        print(
            "[blog-agent] ERROR: BLOG_AGENT_AUTO_PUBLISH is set. This script never "
            "publishes to production. Set it to false.",
            file=sys.stderr,
        )
        return 2

    try:
        output = run_research_agent(cfg)
    except Exception as exc:  # noqa: BLE001
        print(f"[blog-agent] agent failed: {exc}", file=sys.stderr)
        return 1

    failures = validate_output(output)
    if failures:
        print("[blog-agent] validation failed:", file=sys.stderr)
        for fail in failures:
            print(f"  - {fail}", file=sys.stderr)
        # Surface failures by forcing recommendedPublish=false and
        # writing the draft for human inspection. This is the "fail
        # closed" behavior the spec asks for.
        output["recommendedPublish"] = False
        output.setdefault("riskFlags", []).extend(failures)

    if cfg.dry_run:
        print(json.dumps(output, indent=2))
        return 0

    draft_path = write_draft(output)
    print(f"[blog-agent] wrote draft to {draft_path}", file=sys.stderr)

    if output.get("recommendedPublish"):
        pr_url = open_pr(cfg, draft_path, output)
        if pr_url:
            print(f"[blog-agent] opened PR: {pr_url}", file=sys.stderr)
    else:
        print(
            "[blog-agent] draft NOT recommended for publish. Risk flags: "
            + ", ".join(output.get("riskFlags", []) or ["none"]),
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
