#!/usr/bin/env python3
"""
Token usage and cost per SDLC phase for one OpenSpec change, computed from Claude Code session logs.

Writes <changes-dir>/<change>/cost-report.md. Run from the repository root (the folder that holds
openspec/):

    python3 openspec/schemas/sdlc-workflow/tools/phase-cost.py --change <name>
    python3 openspec/schemas/sdlc-workflow/tools/phase-cost.py --change <name> --stdout

Attribution
  Subagent logs are attributed exactly: to the artifact the subagent wrote under
  changes/<change>/, otherwise to the phase the main session was in when it dispatched it.
  Main-session turns are attributed by phase markers, in log order: `openspec instructions <id>
  --change <change>`, `openspec new change` / `openspec archive`, the apply skill, a write to
  changes/<change>/<artifact>.md, and the first code edit after tasks.md is written (apply).
  Turns before the first marker, or after a marker for a different change, are not counted.

  After final-code-review, work splits three ways: a full (not --stdout) run of this script is
  `cost-report`; fixing the review's findings -- code edits, task amendments, builds, tests -- is
  `review-fixes`; a re-dispatched review is `final-code-review` again. Archive is marked by
  `openspec instructions archive`, the archive skill, `openspec archive`, or -- while a phase is
  active -- a touch of changes/archive/<date>-<change>. The archive turn ends the change: nothing
  later in that session is counted, however it mentions the change.

Cost is list price from pricing.json next to this script. A model missing from that table is
reported as unpriced; its tokens are still shown, and its cost is never guessed.
"""
import argparse
import collections
import datetime
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCHEMA_FILE = os.path.join(HERE, os.pardir, "schema.yaml")
PRICING_FILE = os.path.join(HERE, "pricing.json")
IDLE_CAP_SECONDS = 300  # a gap longer than this between turns is waiting on a human, not work
APPLY_SKILLS = ("opsx:apply", "openspec-apply-change")
ARCHIVE_SKILLS = ("opsx:archive", "openspec-archive-change")
WRITE_TOOLS = ("Write", "Edit", "NotebookEdit")
REVIEW_FIXES = "review-fixes"
POST_REVIEW = ("final-code-review", "cost-report", REVIEW_FIXES)
# Bash that changes files or verifies a change -- the shape of fixing review findings.
FIXING_COMMAND = re.compile(r"sed -i|python3? - <<|\bcat >|\btee\b|\bdotnet (build|test)\b|\bnpx?\b|\bk6\b|\bgit (add|commit)\b")
DATE_SUFFIX = re.compile(r"-\d{8}$")


# ---------------------------------------------------------------- phases

def load_phases():
    """Artifact ids in schema order, with `apply` after the artifact apply requires, then archive."""
    text = open(SCHEMA_FILE).read()
    artifacts = re.findall(r"^  - id:\s*([a-z0-9-]+)\s*$", text, re.M)
    requires = re.search(r"^apply:\s*\n\s+requires:\s*\[([^\]]*)\]", text, re.M)
    anchor = requires.group(1).split(",")[-1].strip() if requires else artifacts[-1]
    phases = list(artifacts)
    phases.insert(phases.index(anchor) + 1 if anchor in phases else len(phases), "apply")
    if "final-code-review" in phases:
        phases.insert(phases.index("final-code-review") + 1, REVIEW_FIXES)
    phases.append("archive")
    return artifacts, phases


# ---------------------------------------------------------------- pricing

def load_pricing():
    return json.load(open(PRICING_FILE))


def model_rates(pricing, model):
    models = pricing["models"]
    return models.get(model) or models.get(DATE_SUFFIX.sub("", model or ""))


def cost_of(pricing, model, usage):
    rates = model_rates(pricing, model)
    if not rates:
        return None
    per_token = lambda price: price / 1e6
    cost = (usage["input"] * per_token(rates["input"])
            + usage["output"] * per_token(rates["output"])
            + usage["cache_read"] * per_token(rates["cache_read"])
            + usage["cache_write_5m"] * per_token(rates["input"]) * pricing["cache_write_5m_multiplier"]
            + usage["cache_write_1h"] * per_token(rates["input"]) * pricing["cache_write_1h_multiplier"])
    return cost * (pricing["fast_mode_multiplier"] if usage.get("fast") else 1.0)


# ---------------------------------------------------------------- log reading

def read_messages(path, subagent_log=False):
    """One record per API response. Claude Code logs a response once per content block, all
    sharing one message id and one usage object, so counting log lines double-counts.
    Every entry in a subagent log is a sidechain; in a main-session log, sidechain entries
    belong to a subagent and are skipped there."""
    order, by_id = [], {}
    with open(path) as handle:
        for line in handle:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            sidechain = entry.get("isSidechain") and not subagent_log
            if entry.get("type") == "user" and not sidechain:
                content = (entry.get("message") or {}).get("content")
                is_prompt = isinstance(content, str) or not any(
                    isinstance(b, dict) and b.get("type") == "tool_result" for b in content or [])
                if is_prompt:
                    order.append({"user_prompt": True})
                continue
            if entry.get("type") != "assistant" or sidechain:
                continue
            message = entry.get("message") or {}
            if message.get("model") in (None, "<synthetic>"):
                continue
            message_id = message.get("id") or entry.get("uuid")
            record = by_id.get(message_id)
            if record is None:
                record = {"id": message_id, "model": message["model"], "usage": {},
                          "timestamp": entry.get("timestamp"), "tool_uses": []}
                by_id[message_id] = record
                order.append(record)
            record["usage"] = message.get("usage") or record["usage"]
            for block in message.get("content") or []:
                if isinstance(block, dict) and block.get("type") == "tool_use":
                    record["tool_uses"].append(block)
    return order


def usage_of(record):
    usage = record["usage"]
    split = usage.get("cache_creation") or {}
    write_5m = split.get("ephemeral_5m_input_tokens", 0)
    write_1h = split.get("ephemeral_1h_input_tokens", 0)
    if not (write_5m or write_1h):
        write_5m = usage.get("cache_creation_input_tokens", 0)
    return {"input": usage.get("input_tokens", 0), "output": usage.get("output_tokens", 0),
            "cache_read": usage.get("cache_read_input_tokens", 0),
            "cache_write_5m": write_5m, "cache_write_1h": write_1h,
            "fast": usage.get("speed") == "fast"}


# ---------------------------------------------------------------- attribution

class Markers:
    def __init__(self, change, artifacts):
        name = re.escape(change)
        self.artifacts = set(artifacts)
        self.change_file = re.compile(r"changes/" + name + r"/(specs/|(?P<file>[a-z0-9-]+)\.md\b)")
        self.other_change = re.compile(r"changes/(?!archive/)(?P<other>[a-z0-9][a-z0-9-]*)/")
        self.change_flag = re.compile(r"--change[ =][\"']?(?P<other>[a-z0-9-]+)")
        self.instructions = re.compile(r"openspec\s+instructions\s+(?P<id>[a-z0-9-]+)")
        self.new_change = re.compile(r"openspec\s+new\s+change\s+[\"']?" + name + r"\b")
        self.archive = re.compile(r"openspec\s+archive\s+[\"']?" + name + r"\b")
        self.archived = re.compile(r"changes/archive/\d{4}-\d{2}-\d{2}-" + name + r"\b")
        self.cost_run = re.compile(r"phase-cost\.py\b[^;&|]*--change[ =][\"']?" + name + r"\b")
        self.change = change

    def artifact_written(self, text, current):
        """Phase implied by a path under changes/<change>/, or None."""
        hit = self.change_file.search(text)
        if not hit:
            return None
        if hit.group(1) == "specs/":
            return "specs"
        name = hit.group("file")
        if name == "interview":
            return "proposal"
        if name == "tasks" and current not in (None, "proposal", "specs", "design", "test-plan"):
            return current  # ticking checkboxes during apply or after is not tasks authoring
        return name if name in self.artifacts else current

    def names_other_change(self, text):
        for pattern in (self.other_change, self.change_flag):
            for hit in pattern.finditer(text):
                if hit.group("other") != self.change:
                    return True
        return False

    def next_phase(self, current, tool_uses):
        if current and any(self.archived.search(json.dumps(tool.get("input") or {})) for tool in tool_uses):
            return "archive"  # the archive moved the change; only counts mid-change, not a later read
        phase = self.after_review(current, tool_uses) if current in POST_REVIEW else current
        for tool in tool_uses:
            name, data = tool.get("name"), tool.get("input") or {}
            if name == "Bash":
                command = str(data.get("command", ""))
                instructions = self.instructions.search(command)
                if self.change in command and instructions:
                    wanted = instructions.group("id")
                    phase = wanted if wanted in self.artifacts or wanted in ("apply", "archive") else phase
                elif self.new_change.search(command):
                    phase = "proposal"
                elif self.archive.search(command):
                    phase = "archive"
                elif self.change_file.search(command):
                    phase = self.artifact_written(command, phase)
                elif self.names_other_change(command):
                    phase = None
            elif name in WRITE_TOOLS:
                path = str(data.get("file_path", ""))
                if self.change_file.search(path):
                    phase = self.artifact_written(path, phase)
                elif self.names_other_change(path):
                    phase = None
                elif phase == "tasks" and "/openspec/" not in path:
                    phase = "apply"  # first code edit after the task list exists
            elif name == "Skill":
                skill, args = str(data.get("skill", "")), str(data.get("args", ""))
                if skill in APPLY_SKILLS and self.change in args:
                    phase = "apply"
                elif skill in ARCHIVE_SKILLS and self.change in args:
                    phase = "archive"
            elif name == "Agent":
                prompt = str(data.get("prompt", ""))
                if self.change_file.search(prompt):
                    phase = self.artifact_written(prompt, phase)
        return phase

    def after_review(self, current, tool_uses):
        """Phase entered by one turn once final-code-review has run; see the module docstring."""
        for tool in tool_uses:
            name, data = tool.get("name"), tool.get("input") or {}
            text = str(data.get("command") or data.get("file_path") or data.get("prompt") or "")
            if name == "Bash" and self.cost_run.search(text):
                if "--stdout" not in text:
                    return "cost-report"
                continue
            written = self.artifact_written(text, current) if self.change_file.search(text) else None
            if name in WRITE_TOOLS + ("Agent", "Bash") and written == "final-code-review":
                return "final-code-review"
            if (name in WRITE_TOOLS and "/openspec/" not in text) or written == "tasks" \
                    or (name == "Agent" and "tasks.md" in text) \
                    or (name == "Bash" and FIXING_COMMAND.search(text)):
                return REVIEW_FIXES
        return current


def blank_bucket():
    return {"messages": 0, "input": 0, "output": 0, "cache_read": 0, "cache_write": 0,
            "cost": 0.0, "unpriced": 0, "subagent_cost": 0.0, "timestamps": [],
            "models": collections.Counter()}


def credit(bucket, pricing, record, from_subagent=False):
    usage = usage_of(record)
    bucket["messages"] += 1
    bucket["input"] += usage["input"]
    bucket["output"] += usage["output"]
    bucket["cache_read"] += usage["cache_read"]
    bucket["cache_write"] += usage["cache_write_5m"] + usage["cache_write_1h"]
    bucket["models"][record["model"]] += 1
    cost = cost_of(pricing, record["model"], usage)
    if cost is None:
        bucket["unpriced"] += 1
    else:
        bucket["cost"] += cost
        if from_subagent:
            bucket["subagent_cost"] += cost
    if record.get("timestamp"):
        bucket["timestamps"].append(record["timestamp"])


def attribute_session(path, markers, pricing, totals, seen):
    """Main-session pass. Returns {tool_use_id: phase} for the Agent dispatches it made."""
    dispatch_phase, phase = {}, None
    for record in read_messages(path):
        if record.get("user_prompt"):
            if phase == "archive":
                break  # archive ends the change; later work in the session is unrelated
            continue
        phase = markers.next_phase(phase, record["tool_uses"])
        for tool in record["tool_uses"]:
            if tool.get("name") == "Agent" and phase:
                dispatch_phase[tool.get("id")] = phase
        if phase and record["id"] not in seen:
            seen.add(record["id"])
            credit(totals[phase], pricing, record)
    return dispatch_phase


def attribute_subagents(session_dir, dispatch_phase, markers, pricing, totals, seen):
    count = 0
    for path in sorted(glob.glob(os.path.join(session_dir, "subagents", "*.jsonl"))):
        meta_path = path[:-len(".jsonl")] + ".meta.json"
        meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}
        records = [r for r in read_messages(path, subagent_log=True) if not r.get("user_prompt")]
        phase = None
        for record in records:
            for tool in record["tool_uses"]:
                data = tool.get("input") or {}
                probe = str(data.get("file_path") or data.get("command") or "")
                if tool.get("name") in WRITE_TOOLS + ("Bash",) and markers.change_file.search(probe):
                    phase = markers.artifact_written(probe, phase)
            if phase:
                break
        phase = phase or dispatch_phase.get(meta.get("toolUseId"))
        if not phase:
            continue
        count += 1
        for record in records:
            if record["id"] not in seen:
                seen.add(record["id"])
                credit(totals[phase], pricing, record, from_subagent=True)
    return count


# ---------------------------------------------------------------- report

def active_seconds(stamps):
    times = sorted(datetime.datetime.fromisoformat(s.replace("Z", "+00:00")) for s in stamps)
    return sum(min((b - a).total_seconds(), IDLE_CAP_SECONDS) for a, b in zip(times, times[1:]))


def duration(seconds):
    seconds = int(seconds)
    if seconds >= 3600:
        return "%dh%02dm" % (seconds // 3600, seconds % 3600 // 60)
    return "%dm%02ds" % (seconds // 60, seconds % 60)


def tokens(n):
    return "%.2fM" % (n / 1e6) if n >= 1e6 else ("%.1fK" % (n / 1e3) if n >= 1e3 else str(n))


def usd(value):
    return "$%s" % format(value, ",.2f")


def render(change, phases, totals, pricing, sessions, subagents):
    grand = blank_bucket()
    for bucket in totals.values():
        for key in ("messages", "input", "output", "cache_read", "cache_write", "cost",
                    "unpriced", "subagent_cost"):
            grand[key] += bucket[key]
        grand["timestamps"] += bucket["timestamps"]
        grand["models"].update(bucket["models"])

    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Cost Report: %s" % change, "",
        "- **Generated:** %s by `phase-cost.py` -- do not edit by hand; re-run the script." % now,
        "- **Pricing:** list prices as of %s (`tools/pricing.json`)." % pricing["as_of"],
        "- **Sources:** %d session log(s), %d subagent log(s) attributed to this change." % (sessions, subagents),
        "- **Models:** %s" % (", ".join("`%s` (%d)" % kv for kv in grand["models"].most_common()) or "none"),
        "",
        "| Phase | Responses | Input | Output | Cache read | Cache write | Cost | of which subagents | Share | Active time |",
        "| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |",
    ]
    for phase in phases:
        bucket = totals.get(phase)
        if not bucket or not bucket["messages"]:
            lines.append("| `%s` | -- | | | | | | | | |" % phase)
            continue
        share = bucket["cost"] / grand["cost"] * 100 if grand["cost"] else 0
        lines.append("| `%s` | %d | %s | %s | %s | %s | %s%s | %s | %.0f%% | %s |" % (
            phase, bucket["messages"], tokens(bucket["input"]), tokens(bucket["output"]),
            tokens(bucket["cache_read"]), tokens(bucket["cache_write"]), usd(bucket["cost"]),
            " +%d unpriced" % bucket["unpriced"] if bucket["unpriced"] else "",
            usd(bucket["subagent_cost"]), share, duration(active_seconds(bucket["timestamps"]))))
    lines.append("| **Total** | **%d** | **%s** | **%s** | **%s** | **%s** | **%s** | **%s** | 100%% | **%s** |" % (
        grand["messages"], tokens(grand["input"]), tokens(grand["output"]), tokens(grand["cache_read"]),
        tokens(grand["cache_write"]), usd(grand["cost"]), usd(grand["subagent_cost"]),
        duration(sum(active_seconds(b["timestamps"]) for b in totals.values()))))
    lines += [
        "",
        "`--` means no usage was attributed: the phase was excluded by the Artifact Plan or has not run.",
        "",
        "> **How to read this.** Cost is computed at API list price from the token counts in the "
        "session logs; a subscription or negotiated rate bills differently, so compare phases with "
        "each other rather than against a single record. Subagent rows are exact. Main-session turns are "
        "attributed to the phase the session was in when they ran (see the script header for the "
        "markers), so orchestration overhead lands on the phase being orchestrated. Active time sums "
        "the gaps between responses, capping each gap at %d minutes, so time spent waiting on a "
        "person is excluded." % (IDLE_CAP_SECONDS // 60),
    ]
    if grand["unpriced"]:
        lines += ["", "> **%d response(s) used a model missing from `pricing.json`.** Their tokens "
                  "are counted, their cost is not. Add the model to the table and re-run."
                  % grand["unpriced"]]
    return "\n".join(lines) + "\n"


def project_log_dir(root):
    return os.path.expanduser("~/.claude/projects/" + re.sub(r"[^A-Za-z0-9]", "-", os.path.abspath(root)))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    parser.add_argument("--change", required=True)
    parser.add_argument("--root", default=".", help="repository root holding openspec/ (default: cwd)")
    parser.add_argument("--logs", action="append",
                        help="session log directory; repeatable (default: this project's ~/.claude/projects folder)")
    parser.add_argument("--stdout", action="store_true", help="print the report instead of writing it")
    args = parser.parse_args()

    change_dir = os.path.join(args.root, "openspec", "changes", args.change)
    if not os.path.isdir(change_dir):
        archived = sorted(glob.glob(os.path.join(args.root, "openspec", "changes", "archive", "*-" + args.change)))
        if not (archived and args.stdout):
            sys.exit("No change directory at %s%s" % (change_dir, " (archived changes: use --stdout)" if archived else ""))
    log_dirs = args.logs or [project_log_dir(args.root)]
    session_files = sorted(f for d in log_dirs for f in glob.glob(os.path.join(d, "*.jsonl")))
    if not session_files:
        sys.exit("No session logs found under %s -- pass --logs <dir>." % ", ".join(log_dirs))

    artifacts, phases = load_phases()
    pricing = load_pricing()
    markers = Markers(args.change, artifacts)
    totals = collections.defaultdict(blank_bucket)
    seen, sessions, subagents = set(), 0, 0
    for path in session_files:
        before = sum(b["messages"] for b in totals.values())
        dispatch_phase = attribute_session(path, markers, pricing, totals, seen)
        subagents += attribute_subagents(path[:-len(".jsonl")], dispatch_phase, markers, pricing, totals, seen)
        sessions += sum(b["messages"] for b in totals.values()) > before

    if not any(b["messages"] for b in totals.values()):
        sys.exit("No usage attributed to change '%s' in %d session log(s)." % (args.change, len(session_files)))
    report = render(args.change, phases, totals, pricing, sessions, subagents)
    if args.stdout:
        sys.stdout.write(report)
        return
    out = os.path.join(change_dir, "cost-report.md")
    open(out, "w").write(report)
    print("Wrote %s" % out)


if __name__ == "__main__":
    main()
