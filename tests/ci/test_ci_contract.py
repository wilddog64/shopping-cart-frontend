"""Offline contract checks for the frontend image publishing workflow."""

from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = ROOT / ".github/workflows/ci.yml"
DOCKERFILE = ROOT / "Dockerfile"


def publish_job_condition(workflow: str) -> str:
    lines = workflow.splitlines()
    job_index = next(
        index
        for index, line in enumerate(lines)
        if re.fullmatch(r"  publish:", line)
    )
    for line in lines[job_index + 1 :]:
        if line.startswith("  ") and not line.startswith("    "):
            break
        match = re.match(r"    if:\s*(.+)$", line)
        if match:
            return match.group(1)
    raise AssertionError("publish job has no if condition")


def evaluate_condition(expression: str, *, event: str, ref: str, message: str) -> bool:
    """Evaluate the workflow's small GitHub expression subset against event data."""
    expression = expression.replace("&&", " and ").replace("||", " or ")
    expression = re.sub(r"!(?!=)", " not ", expression)
    expression = expression.replace("github.ref", repr(ref))
    expression = expression.replace("github.event_name", repr(event))
    expression = expression.replace("github.event.head_commit.message", repr(message))
    expression = re.sub(r"\bstartsWith\s*\(", "starts_with(", expression)
    return bool(eval(expression, {"__builtins__": {}}, {"starts_with": lambda value, prefix: value.startswith(prefix)}))


def action_build_args(workflow: str, step_name: str) -> list[str]:
    lines = workflow.splitlines()
    start = next(
        index
        for index, line in enumerate(lines)
        if line.strip() == f"- name: {step_name}"
    )
    action_index = next(
        index
        for index in range(start, len(lines))
        if "uses: docker/build-push-action@" in lines[index]
    )
    build_args_index = next(
        index
        for index in range(action_index, len(lines))
        if re.match(r"\s+build-args:\s*\|", lines[index])
    )
    indent = len(lines[build_args_index]) - len(lines[build_args_index].lstrip())
    args = []
    for line in lines[build_args_index + 1 :]:
        if line.strip() and len(line) - len(line.lstrip()) <= indent:
            break
        args.append(line.strip())
    return args


class WorkflowEventContractTests(unittest.TestCase):
    def test_publish_job_event_matrix(self):
        condition = publish_job_condition(WORKFLOW.read_text())
        cases = [
            ("push", "refs/heads/main", "feat: update frontend", True),
            ("workflow_dispatch", "refs/heads/main", "", True),
            ("push", "refs/heads/main", "ci(deploy): update image tag", False),
            ("pull_request", "refs/heads/main", "feat: update frontend", False),
            ("workflow_dispatch", "refs/heads/feature", "", False),
        ]
        for event, ref, message, expected in cases:
            with self.subTest(event=event, ref=ref, message=message):
                self.assertEqual(
                    evaluate_condition(condition, event=event, ref=ref, message=message),
                    expected,
                )


class RuntimeUpgradeCacheContractTests(unittest.TestCase):
    def test_runtime_upgrade_has_per_build_cache_buster(self):
        dockerfile_lines = DOCKERFILE.read_text().splitlines()
        runtime_index = next(
            index
            for index, line in enumerate(dockerfile_lines)
            if line.startswith("FROM nginx:")
        )
        upgrade_index = next(
            index
            for index in range(runtime_index + 1, len(dockerfile_lines))
            if dockerfile_lines[index] == "RUN apk upgrade --no-cache"
        )
        self.assertEqual(dockerfile_lines[upgrade_index - 1], "ARG APK_UPGRADE_EPOCH")

        workflow = WORKFLOW.read_text()
        expected_arg = "APK_UPGRADE_EPOCH=${{ github.run_id }}"
        for step in ("Build Docker image", "Build, scan, and push frontend image"):
            with self.subTest(step=step):
                self.assertIn(expected_arg, action_build_args(workflow, step))


if __name__ == "__main__":
    unittest.main()
