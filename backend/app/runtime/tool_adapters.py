"""Real tool adapters for the ToolRuntime execution pipeline.

Each adapter implements a common interface:
    async def run(operation: str, params: dict, env: dict) -> ToolResult

Adapters attempt real execution where the environment permits. When a
dependency (git, npm, python, etc.) is not available, the adapter returns
a real error — it never fabricates a successful result.

Architecture supports future adapters (SAST, SCA, Kubernetes, Cloud, etc.)
by implementing the same interface.
"""

from __future__ import annotations

import asyncio
import os
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class ToolResult:
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    files_changed: list[str] = field(default_factory=list)
    extra: dict = field(default_factory=dict)


class ToolAdapter:
    """Base class for all tool adapters."""

    name: str = "base"

    async def run(
        self,
        operation: str,
        params: dict,
        env: dict,
        timeout: int = 120,
        working_dir: Optional[str] = None,
    ) -> ToolResult:
        raise NotImplementedError

    @staticmethod
    def _check_available(binary: str) -> tuple[bool, str]:
        path = shutil.which(binary)
        if path is None:
            return False, f"'{binary}' is not installed or not on PATH"
        return True, path

    @staticmethod
    async def _run_command(
        cmd: list[str],
        timeout: int,
        env: Optional[dict] = None,
        cwd: Optional[str] = None,
    ) -> ToolResult:
        start = time.monotonic()
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, **(env or {})},
                cwd=cwd,
            )
            stdout_b, stderr_b = await asyncio.wait_for(
                proc.communicate(), timeout=timeout
            )
            elapsed = int((time.monotonic() - start) * 1000)
            return ToolResult(
                exit_code=proc.returncode,
                stdout=stdout_b.decode("utf-8", errors="replace"),
                stderr=stderr_b.decode("utf-8", errors="replace"),
                duration_ms=elapsed,
            )
        except FileNotFoundError as exc:
            elapsed = int((time.monotonic() - start) * 1000)
            return ToolResult(
                exit_code=127,
                stderr=str(exc),
                duration_ms=elapsed,
            )
        except asyncio.TimeoutError:
            elapsed = int((time.monotonic() - start) * 1000)
            return ToolResult(
                exit_code=124,
                stderr=f"Command timed out after {timeout}s",
                duration_ms=elapsed,
            )


# ---------------------------------------------------------------------------
# Git adapter
# ---------------------------------------------------------------------------

class GitAdapter(ToolAdapter):
    name = "git"

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        available, msg = self._check_available("git")
        if not available:
            return ToolResult(exit_code=127, stderr=msg)

        repo = params.get("repository", "")
        branch = params.get("branch", "")
        path = params.get("path", working_dir or ".")
        message = params.get("message", "")

        if operation == "clone":
            if not repo:
                return ToolResult(exit_code=1, stderr="repository parameter required")
            target = params.get("target", os.path.basename(repo).replace(".git", ""))
            return await self._run_command(["git", "clone", repo, target], timeout, cwd=path)

        if operation == "status":
            return await self._run_command(["git", "status", "--porcelain"], timeout, cwd=path)

        if operation == "branch":
            return await self._run_command(["git", "branch", "-a"], timeout, cwd=path)

        if operation == "checkout":
            if not branch:
                return ToolResult(exit_code=1, stderr="branch parameter required")
            return await self._run_command(["git", "checkout", branch], timeout, cwd=path)

        if operation == "diff":
            args = ["git", "diff"]
            if params.get("staged"):
                args.append("--staged")
            return await self._run_command(args, timeout, cwd=path)

        if operation == "log":
            count = str(params.get("count", 10))
            return await self._run_command(
                ["git", "log", f"--oneline=-{count}"], timeout, cwd=path
            )

        if operation == "add":
            files = params.get("files", ["."])
            if isinstance(files, str):
                files = [files]
            return await self._run_command(["git", "add", *files], timeout, cwd=path)

        if operation == "commit":
            if not message:
                return ToolResult(exit_code=1, stderr="message parameter required for commit")
            return await self._run_command(
                ["git", "commit", "-m", message], timeout, cwd=path
            )

        return ToolResult(exit_code=1, stderr=f"Unsupported git operation: {operation}")


# ---------------------------------------------------------------------------
# Filesystem adapter
# ---------------------------------------------------------------------------

class FilesystemAdapter(ToolAdapter):
    name = "filesystem"

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        file_path = params.get("path", "")
        if not file_path:
            return ToolResult(exit_code=1, stderr="path parameter required")

        base = working_dir or "."
        full = os.path.join(base, file_path) if not os.path.isabs(file_path) else file_path

        if operation == "read":
            try:
                content = Path(full).read_text(encoding="utf-8", errors="replace")
                return ToolResult(exit_code=0, stdout=content)
            except FileNotFoundError:
                return ToolResult(exit_code=1, stderr=f"File not found: {file_path}")
            except OSError as exc:
                return ToolResult(exit_code=1, stderr=str(exc))

        if operation == "write":
            content = params.get("content", "")
            try:
                Path(full).parent.mkdir(parents=True, exist_ok=True)
                Path(full).write_text(content, encoding="utf-8")
                return ToolResult(exit_code=0, files_changed=[file_path])
            except OSError as exc:
                return ToolResult(exit_code=1, stderr=str(exc))

        if operation == "list":
            try:
                entries = sorted(os.listdir(full))
                return ToolResult(exit_code=0, stdout="\n".join(entries))
            except FileNotFoundError:
                return ToolResult(exit_code=1, stderr=f"Directory not found: {file_path}")
            except OSError as exc:
                return ToolResult(exit_code=1, stderr=str(exc))

        if operation == "search":
            pattern = params.get("pattern", "")
            if not pattern:
                return ToolResult(exit_code=1, stderr="pattern parameter required for search")
            try:
                import fnmatch
                matches: list[str] = []
                for root, _dirs, files in os.walk(full):
                    for f in files:
                        if fnmatch.fnmatch(f, pattern):
                            matches.append(os.path.relpath(os.path.join(root, f), full))
                return ToolResult(exit_code=0, stdout="\n".join(matches))
            except OSError as exc:
                return ToolResult(exit_code=1, stderr=str(exc))

        return ToolResult(exit_code=1, stderr=f"Unsupported filesystem operation: {operation}")


# ---------------------------------------------------------------------------
# Terminal / Shell adapter
# ---------------------------------------------------------------------------

class TerminalAdapter(ToolAdapter):
    name = "terminal"

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        if operation != "execute":
            return ToolResult(exit_code=1, stderr=f"Unsupported terminal operation: {operation}")
        command = params.get("command", "")
        if not command:
            return ToolResult(exit_code=1, stderr="command parameter required")
        return await self._run_command(
            ["bash", "-c", command], timeout, env=env, cwd=working_dir
        )


class ShellAdapter(ToolAdapter):
    name = "shell"

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        if operation == "execute":
            command = params.get("command", "")
            if not command:
                return ToolResult(exit_code=1, stderr="command parameter required")
            return await self._run_command(
                ["bash", "-c", command], timeout, env=env, cwd=working_dir
            )

        if operation == "script":
            script = params.get("script", "")
            if not script:
                return ToolResult(exit_code=1, stderr="script parameter required")
            script_env = {**os.environ, **env, **params.get("env", {})}
            return await self._run_command(
                ["bash", "-c", script], timeout, env=script_env, cwd=working_dir
            )

        return ToolResult(exit_code=1, stderr=f"Unsupported shell operation: {operation}")


# ---------------------------------------------------------------------------
# Build / package tool adapters
# ---------------------------------------------------------------------------

class NpmAdapter(ToolAdapter):
    name = "npm"

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        available, msg = self._check_available("npm")
        if not available:
            return ToolResult(exit_code=127, stderr=msg)

        args = params.get("args", [])
        if isinstance(args, str):
            args = [args]

        if operation == "install":
            cmd = ["npm", "install"] + args
        elif operation == "test":
            cmd = ["npm", "test"] + args
        elif operation == "run":
            script_name = params.get("script", "")
            if not script_name:
                return ToolResult(exit_code=1, stderr="script parameter required for 'run'")
            cmd = ["npm", "run", script_name] + args
        elif operation == "build":
            cmd = ["npm", "run", "build"] + args
        else:
            return ToolResult(exit_code=1, stderr=f"Unsupported npm operation: {operation}")

        return await self._run_command(cmd, timeout, env=env, cwd=working_dir)


class PythonAdapter(ToolAdapter):
    name = "python"

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        available, msg = self._check_available("python3")
        if not available:
            available, msg = self._check_available("python")
            if not available:
                return ToolResult(exit_code=127, stderr=msg)
            binary = "python"
        else:
            binary = "python3"

        args = params.get("args", [])
        if isinstance(args, str):
            args = [args]

        if operation == "execute":
            script = params.get("command", "")
            if not script:
                return ToolResult(exit_code=1, stderr="command parameter required")
            return await self._run_command(
                [binary, "-c", script], timeout, env=env, cwd=working_dir
            )

        if operation == "pip":
            subcmd = params.get("command", "install")
            return await self._run_command(
                [binary, "-m", "pip", subcmd] + args, timeout, env=env, cwd=working_dir
            )

        if operation == "pytest":
            return await self._run_command(
                [binary, "-m", "pytest"] + args, timeout, env=env, cwd=working_dir
            )

        return ToolResult(exit_code=1, stderr=f"Unsupported python operation: {operation}")


class MavenAdapter(ToolAdapter):
    name = "maven"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        available, msg = self._check_available("mvn")
        if not available:
            return ToolResult(exit_code=127, stderr=msg)

        goal_map = {
            "compile": ["compile"],
            "test": ["test"],
            "package": ["package"],
            "verify": ["verify"],
        }
        goals = goal_map.get(operation)
        if goals is None:
            return ToolResult(exit_code=1, stderr=f"Unsupported maven operation: {operation}")

        profile = params.get("profile")
        cmd = ["mvn"] + goals
        if profile:
            cmd.extend([f"-P{profile}"])
        return await self._run_command(cmd, timeout, env=env, cwd=working_dir)


class GradleAdapter(ToolAdapter):
    name = "gradle"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        gradle_bin = shutil.which("gradle")
        if gradle_bin is None:
            wrapper = os.path.join(working_dir or ".", "gradlew") if working_dir else "gradlew"
            if os.path.exists(wrapper):
                gradle_bin = wrapper
            else:
                return ToolResult(exit_code=127, stderr="'gradle' not found and no gradlew wrapper")

        task = params.get("task", operation)
        args = params.get("args", [])
        if isinstance(args, str):
            args = [args]
        cmd = [gradle_bin, task] + args
        return await self._run_command(cmd, timeout, env=env, cwd=working_dir)


# ---------------------------------------------------------------------------
# Test runner adapters
# ---------------------------------------------------------------------------

class PytestAdapter(ToolAdapter):
    name = "pytest"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        available, msg = self._check_available("pytest")
        if not available:
            available2, msg2 = self._check_available("python3")
            if not available2:
                return ToolResult(exit_code=127, stderr=msg)
            binary = "python3"
        else:
            binary = "pytest"

        test_path = params.get("test_path", "")
        options = params.get("options", [])
        if isinstance(options, str):
            options = [options]

        if operation == "run":
            if binary == "pytest":
                cmd = ["pytest", test_path] + options if test_path else ["pytest"] + options
            else:
                cmd = [binary, "-m", "pytest", test_path] + options if test_path else [binary, "-m", "pytest"] + options
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "collect":
            cmd = [binary, "--collect-only", "-q"] + ([test_path] if test_path else [])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "report":
            cmd = [binary, "--html=report.html", "--self-contained-html"] + ([test_path] if test_path else [])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        return ToolResult(exit_code=1, stderr=f"Unsupported pytest operation: {operation}")


class JUnitAdapter(ToolAdapter):
    name = "junit"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        available, msg = self._check_available("mvn")
        if not available:
            return ToolResult(exit_code=127, stderr=msg)

        test_class = params.get("test_class", "")
        if operation == "run":
            cmd = ["mvn", "test"]
            if test_class:
                cmd.extend([f"-Dtest={test_class}"])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "report":
            cmd = ["mvn", "surefire-report:report"]
            if test_class:
                cmd.extend([f"-Dtest={test_class}"])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        return ToolResult(exit_code=1, stderr=f"Unsupported junit operation: {operation}")


class JestAdapter(ToolAdapter):
    name = "jest"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        available, msg = self._check_available("npx")
        if not available:
            return ToolResult(exit_code=127, stderr=msg)

        test_path = params.get("test_path", "")
        options = params.get("options", [])
        if isinstance(options, str):
            options = [options]

        if operation == "run":
            cmd = ["npx", "jest"] + ([test_path] if test_path else []) + options
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "watch":
            cmd = ["npx", "jest", "--watch"] + ([test_path] if test_path else [])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "coverage":
            cmd = ["npx", "jest", "--coverage"] + ([test_path] if test_path else []) + options
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        return ToolResult(exit_code=1, stderr=f"Unsupported jest operation: {operation}")


class PlaywrightAdapter(ToolAdapter):
    name = "playwright"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        available, msg = self._check_available("npx")
        if not available:
            return ToolResult(exit_code=127, stderr=msg)

        spec = params.get("spec", "")
        browser = params.get("browser", "")

        if operation == "run":
            cmd = ["npx", "playwright", "test"]
            if spec:
                cmd.append(spec)
            if browser:
                cmd.extend([f"--browser={browser}"])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "debug":
            cmd = ["npx", "playwright", "test", "--debug"]
            if spec:
                cmd.append(spec)
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "report":
            return await self._run_command(
                ["npx", "playwright", "show-report"], timeout, env=env, cwd=working_dir
            )

        return ToolResult(exit_code=1, stderr=f"Unsupported playwright operation: {operation}")


# ---------------------------------------------------------------------------
# Build runner adapter
# ---------------------------------------------------------------------------

class BuildRunnerAdapter(ToolAdapter):
    name = "build-runner"

    async def run(self, operation, params, env, timeout=300, working_dir=None):
        project = params.get("project", "")
        target = params.get("target", "")

        if operation == "build":
            if shutil.which("npm"):
                return await self._run_command(
                    ["npm", "run", "build"], timeout, env=env, cwd=working_dir or project
                )
            if shutil.which("mvn"):
                return await self._run_command(
                    ["mvn", "compile"], timeout, env=env, cwd=working_dir or project
                )
            return ToolResult(exit_code=127, stderr="No build tool (npm or mvn) found")

        if operation == "package":
            if shutil.which("mvn"):
                return await self._run_command(
                    ["mvn", "package", "-DskipTests"], timeout, env=env, cwd=working_dir or project
                )
            if shutil.which("npm"):
                return await self._run_command(
                    ["npm", "pack"], timeout, env=env, cwd=working_dir or project
                )
            return ToolResult(exit_code=127, stderr="No packaging tool found")

        if operation == "publish":
            if shutil.which("npm"):
                return await self._run_command(
                    ["npm", "publish"], timeout, env=env, cwd=working_dir or project
                )
            return ToolResult(exit_code=127, stderr="No publish tool (npm) found")

        return ToolResult(exit_code=1, stderr=f"Unsupported build-runner operation: {operation}")


# ---------------------------------------------------------------------------
# Stub adapters for future integrations
# ---------------------------------------------------------------------------

class StubAdapter(ToolAdapter):
    """Adapter for tools that require external services not available in this environment.

    Returns a real configuration/connection error — never a fake success.
    """

    def __init__(self, name: str, reason: str = "requires external service configuration"):
        self._name = name
        self._reason = reason

    @property
    def name(self) -> str:  # type: ignore[override]
        return self._name

    async def run(self, operation, params, env, timeout=120, working_dir=None):
        return ToolResult(
            exit_code=1,
            stderr=f"Tool '{self._name}' {self._reason}. "
                  f"Operation '{operation}' not executed — configure the external service to enable.",
        )


# ---------------------------------------------------------------------------
# Adapter registry
# ---------------------------------------------------------------------------

_ADAPTERS: dict[str, ToolAdapter] = {}


def _register(adapter: ToolAdapter) -> ToolAdapter:
    _ADAPTERS[adapter.name] = adapter
    return adapter


_GIT = _register(GitAdapter())
_FILESYSTEM = _register(FilesystemAdapter())
_TERMINAL = _register(TerminalAdapter())
_SHELL = _register(ShellAdapter())
_NPM = _register(NpmAdapter())
_PYTHON = _register(PythonAdapter())
_MAVEN = _register(MavenAdapter())
_GRADLE = _register(GradleAdapter())
_PYTEST = _register(PytestAdapter())
_JUNIT = _register(JUnitAdapter())
_JEST = _register(JestAdapter())
_PLAYWRIGHT = _register(PlaywrightAdapter())
_BUILD_RUNNER = _register(BuildRunnerAdapter())

# Stub adapters for future integrations
_SAST_SCANNER = _register(StubAdapter("sast-scanner", "requires SAST scanner installation (e.g. Semgrep)"))
_DEPENDENCY_SCANNER = _register(StubAdapter("dependency-scanner", "requires dependency scanner installation (e.g. OWASP Dep-Check)"))
_ARTIFACT_REPOSITORY = _register(StubAdapter("artifact-repository", "requires artifact repository connection (e.g. Nexus, Artifactory)"))
_DEPLOYMENT_API = _register(StubAdapter("deployment-api", "requires cloud deployment API configuration"))
_KUBERNETES = _register(StubAdapter("kubernetes", "requires kubectl and cluster access"))
_CLOUD_API = _register(StubAdapter("cloud-api", "requires cloud provider credentials"))
_OBSERVABILITY_API = _register(StubAdapter("observability-api", "requires observability platform connection (e.g. Datadog, Prometheus)"))
_JIRA = _register(StubAdapter("jira", "requires Jira API token and configuration"))
_DOCUMENTATION = _register(StubAdapter("documentation", "requires documentation platform configuration"))
_SLACK = _register(StubAdapter("slack", "requires Slack API token and configuration"))


def get_adapter(tool_name: str) -> Optional[ToolAdapter]:
    return _ADAPTERS.get(tool_name)
