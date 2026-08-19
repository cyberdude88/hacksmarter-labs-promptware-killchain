#!/usr/bin/env python3
"""Tiny Microsoft Defender-for-Endpoint lookalike.

Models the one behavior the lab cares about: a suppression rule is a list of
conditions joined with logical AND. An event is suppressed only when *every*
condition matches. Change any indicator the rule pins on (hash, path, signer)
and the rule silently stops matching.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Condition:
    field: str
    op: str
    value: str

    def matches(self, event: dict) -> bool:
        actual = event.get(self.field)
        if self.op == "equals":
            return actual == self.value
        if self.op == "in":
            return actual in self.value
        raise ValueError(f"unsupported op: {self.op}")


@dataclass
class SuppressionRule:
    name: str
    conditions: list[Condition]

    def matches(self, event: dict) -> bool:
        # Defender joins suppression conditions with AND.
        return all(c.matches(event) for c in self.conditions)


def load_rules(path: Path) -> list[SuppressionRule]:
    raw = json.loads(path.read_text())
    return [
        SuppressionRule(
            name=r["name"],
            conditions=[Condition(**c) for c in r["conditions"]],
        )
        for r in raw
    ]


def load_events(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def process(events: list[dict], rules: list[SuppressionRule]) -> None:
    for ev in events:
        suppressed_by = next((r.name for r in rules if r.matches(ev)), None)
        status = f"SUPPRESSED by '{suppressed_by}'" if suppressed_by else "ALERT RAISED"
        print(
            f"[{ev['timestamp']}] {ev['file_name']} "
            f"(sha256={ev['sha256'][:12]}…) -> {status}"
        )


def main() -> int:
    here = Path(__file__).parent
    rules = load_rules(here / "rules.json")
    events = load_events(here / "events.jsonl")
    process(events, rules)
    return 0


if __name__ == "__main__":
    sys.exit(main())
