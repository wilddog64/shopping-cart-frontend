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
    """Evaluate the workflow's small GitHub expression subset against event data, without eval()."""
    variables = {
        "github.ref": ref,
        "github.event_name": event,
        "github.event.head_commit.message": message,
    }
    tokens = re.findall(r"&&|\|\||==|!=|!|\(|\)|,|'[^']*'|[A-Za-z_][\w.]*", expression)
    if "".join(tokens) != re.sub(r"\s+", "", expression):
        raise AssertionError(f"unsupported expression: {expression}")
    position = 0

    def peek():
        return tokens[position] if position < len(tokens) else None

    def take(expected=None):
        nonlocal position
        token = peek()
        if token is None or (expected is not None and token != expected):
            raise AssertionError(f"expected {expected!r} at {token!r} in: {expression}")
        position += 1
        return token

    def value():
        token = take()
        if token.startswith("'"):
            return token[1:-1]
        if token in variables:
            return variables[token]
        raise AssertionError(f"unknown identifier {token!r} in: {expression}")

    def primary():
        token = peek()
        if token == "!":
            take()
            return not primary()
        if token == "(":
            take("(")
            result = disjunction()
            take(")")
            return result
        if token == "startsWith":
            take()
            take("(")
            subject = value()
            take(",")
            prefix = value()
            take(")")
            return subject.startswith(prefix)
        left = value()
        operator = take()
        right = value()
        if operator == "==":
            return left == right
        if operator == "!=":
            return left != right
        raise AssertionError(f"unsupported operator {operator!r} in: {expression}")

    def conjunction():
        result = primary()
        while peek() == "&&":
            take()
            result = primary() and result
        return result

    def disjunction():
        result = conjunction()
        while peek() == "||":
            take()
            result = conjunction() or result
        return result

    result = disjunction()
    if peek() is not None:
        raise AssertionError(f"trailing tokens in: {expression}")
    return result


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
