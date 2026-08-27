#!/usr/bin/env python3
"""Enforce constitution principles P1, P3 and P8 mechanically.

A requirement without evidence, a citation that does not resolve, or a blocking
gate that does not exist are all failures. Traceability that depends on a human
remembering is not traceability.
"""

from __future__ import annotations

import pathlib
import re
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
REGISTER_PATH = ROOT / "docs" / "discovery" / "evidence-register.yaml"

REQ_HEADING = re.compile(r"^\*\*(REQ-\d{3})\*\*")
SOURCE_LINE = re.compile(r"^- `source_legacy:`\s*(?P<body>.+)$")
EVIDENCE_URI = re.compile(
    r"github://(?P<repo>[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)"
    r"@(?P<sha>[0-9a-f]{40})"
    r"/(?P<path>[^#`]+)"
    r"#L(?P<start>\d+)(?:-L(?P<end>\d+))?"
)
GREENFIELD = "[GREENFIELD]"
CLAR_ID = re.compile(r"CLAR-\d{3}")


def load_register() -> dict:
    if not REGISTER_PATH.exists():
        sys.exit(f"error: evidence register is missing at {REGISTER_PATH}")
    return yaml.safe_load(REGISTER_PATH.read_text(encoding="utf-8"))


def collect_requirements(spec: pathlib.Path) -> list[tuple[str, list[str]]]:
    """Return each requirement id with the lines that belong to it."""
    requirements: list[tuple[str, list[str]]] = []
    current: str | None = None
    body: list[str] = []
    for line in spec.read_text(encoding="utf-8").splitlines():
        match = REQ_HEADING.match(line)
        if match:
            if current:
                requirements.append((current, body))
            current, body = match.group(1), []
        elif current:
            if line.startswith("## "):
                requirements.append((current, body))
                current, body = None, []
            else:
                body.append(line)
    if current:
        requirements.append((current, body))
    return requirements


def main() -> int:
    register = load_register()
    pinned_repo = register["legacy"]["repository"]
    pinned_sha = register["legacy"]["commit"]
    known_gates = {gate["id"] for gate in register.get("clarifications", [])}

    problems: list[str] = []
    seen_ids: dict[str, pathlib.Path] = {}
    total = 0

    specs = sorted((ROOT / "specs").rglob("spec.md"))
    if not specs:
        print("no specification found under specs/; nothing to validate")
        return 0

    for spec in specs:
        rel = spec.relative_to(ROOT)
        for req_id, body in collect_requirements(spec):
            total += 1
            if req_id in seen_ids:
                problems.append(
                    f"{rel}: {req_id} is already defined in {seen_ids[req_id]}"
                )
            seen_ids[req_id] = rel

            source_lines = [
                match.group("body")
                for match in (SOURCE_LINE.match(line) for line in body)
                if match
            ]
            if not source_lines:
                problems.append(
                    f"{rel}: {req_id} has no `source_legacy:` line (constitution P1)"
                )
                continue

            source = source_lines[0]
            if GREENFIELD in source:
                justification = source.split(GREENFIELD, 1)[1].strip(" `")
                if len(justification) < 20:
                    problems.append(
                        f"{rel}: {req_id} is marked {GREENFIELD} without a written justification"
                    )
                continue

            uri = EVIDENCE_URI.search(source)
            if not uri:
                problems.append(
                    f"{rel}: {req_id} cites evidence that is not a pinned "
                    f"github://<repo>@<sha>/<path>#L<start> URI (constitution P1)"
                )
                continue
            if uri.group("repo") != pinned_repo:
                problems.append(
                    f"{rel}: {req_id} cites {uri.group('repo')}, "
                    f"but the register pins {pinned_repo}"
                )
            if uri.group("sha") != pinned_sha:
                problems.append(
                    f"{rel}: {req_id} cites commit {uri.group('sha')[:12]}, "
                    f"but the register pins {pinned_sha[:12]}"
                )
            end = uri.group("end")
            if end and int(end) < int(uri.group("start")):
                problems.append(f"{rel}: {req_id} cites an inverted line range")

            for gate in CLAR_ID.findall("\n".join(body)):
                if gate not in known_gates:
                    problems.append(
                        f"{rel}: {req_id} refers to {gate}, "
                        "which is not in the evidence register (constitution P3)"
                    )

    for gate in register.get("clarifications", []):
        if gate.get("status") not in {"open", "awaiting-validation", "closed"}:
            problems.append(
                f"{REGISTER_PATH.name}: {gate['id']} has unknown status "
                f"{gate.get('status')!r}"
            )
        if gate.get("status") == "closed" and not gate.get("resolution"):
            problems.append(
                f"{REGISTER_PATH.name}: {gate['id']} is closed without a recorded resolution"
            )

    if problems:
        print(f"Traceability failed with {len(problems)} problem(s):\n")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    print(
        f"Traceability OK: {total} requirement(s) across {len(specs)} specification(s), "
        f"all pinned to {pinned_repo}@{pinned_sha[:12]}, "
        f"{len(known_gates)} clarification gate(s) registered."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
