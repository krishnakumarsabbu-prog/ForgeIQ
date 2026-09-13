"""Real tool adapters for the ToolRuntime execution pipeline.

Each adapter implements a common interface:
    async def run(operation: str, params: dict, env: dict) -> ToolResult

Adapters attempt real execution where the environment permits. When a
dependency (git, npm, python, etc.) is not available, the adapter returns
a real error — it never fabricates a successful result.

Every operation returns:
    command, working directory, start time, end time, exit code, stdout, stderr, artifacts

Build results produce structured artifact metadata:
    name, version, path, checksum, created

Test results capture structured data:
    framework, tests, passed, failed, skipped, duration, coverage

Architecture supports future adapters (SAST, SCA, Kubernetes, Cloud, etc.)
by implementing the same interface.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import re
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


@dataclass
class ArtifactMetadata:
    name: str
    version: str = ""
    path: str = ""
    checksum: str = ""
    created: str = ""
    size_bytes: int = 0

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "path": self.path,
            "checksum": self.checksum,
            "created": self.created,
            "size_bytes": self.size_bytes,
        }


@dataclass
class TestResult:
    framework: str = ""
    tests: int = 0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    duration_seconds: float = 0.0
    coverage: Optional[float] = None

    def to_dict(self) -> dict:
        d = {
            "framework": self.framework,
            "tests": self.tests,
            "passed": self.passed,
            "failed": self.failed,
            "skipped": self.skipped,
            "duration_seconds": self.duration_seconds,
        }
        if self.coverage is not None:
            d["coverage"] = self.coverage
        return d


@dataclass
class ToolResult:
    exit_code: int
    stdout: str = ""
    stderr: str = ""
    duration_ms: int = 0
    files_changed: list[str] = field(default_factory=list)
    extra: dict = field(default_factory=dict)
    start_time: str = ""
    end_time: str = ""
    command: str = ""
    working_directory: str = ""
    artifacts: list[ArtifactMetadata] = field(default_factory=list)
    test_result: Optional[TestResult] = None


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
    def _now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _checksum(path: str) -> str:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return f"sha256:{h.hexdigest()}"

    @staticmethod
    async def _run_command(
        cmd: list[str],
        timeout: int,
        env: Optional[dict] = None,
        cwd: Optional[str] = None,
    ) -> ToolResult:
        start_dt = datetime.now(timezone.utc)
        start = time.monotonic()
        cmd_str = " ".join(cmd)
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
            end_dt = datetime.now(timezone.utc)
            elapsed = int((time.monotonic() - start) * 1000)
            return ToolResult(
                exit_code=proc.returncode,
                stdout=stdout_b.decode("utf-8", errors="replace"),
                stderr=stderr_b.decode("utf-8", errors="replace"),
                duration_ms=elapsed,
                start_time=start_dt.isoformat(),
                end_time=end_dt.isoformat(),
                command=cmd_str,
                working_directory=cwd or os.getcwd(),
            )
        except FileNotFoundError as exc:
            end_dt = datetime.now(timezone.utc)
            elapsed = int((time.monotonic() - start) * 1000)
            return ToolResult(
                exit_code=127,
                stderr=str(exc),
                duration_ms=elapsed,
                start_time=start_dt.isoformat(),
                end_time=end_dt.isoformat(),
                command=cmd_str,
                working_directory=cwd or os.getcwd(),
            )
        except asyncio.TimeoutError:
            end_dt = datetime.now(timezone.utc)
            elapsed = int((time.monotonic() - start) * 1000)
            return ToolResult(
                exit_code=124,
                stderr=f"Command timed out after {timeout}s",
                duration_ms=elapsed,
                start_time=start_dt.isoformat(),
                end_time=end_dt.isoformat(),
                command=cmd_str,
                working_directory=cwd or os.getcwd(),
            )

    # ------------------------------------------------------------------
    # Artifact discovery
    # ------------------------------------------------------------------

    @staticmethod
    def _discover_artifacts(
        cwd: str,
        patterns: list[tuple[str, str]],
    ) -> list[ArtifactMetadata]:
        """Discover build artifacts by glob pattern.

        patterns: list of (glob_pattern, artifact_type)
        Returns list of ArtifactMetadata for files that exist.
        """
        artifacts: list[ArtifactMetadata] = []
        base = Path(cwd) if cwd else Path.cwd()

        for pattern, artifact_type in patterns:
            for path in base.glob(pattern):
                if not path.is_file():
                    continue
                try:
                    stat = path.stat()
                    checksum = ToolAdapter._checksum(str(path))
                    artifacts.append(ArtifactMetadata(
                        name=path.name,
                        path=str(path.relative_to(base)) if path.is_relative_to(base) else str(path),
                        checksum=checksum,
                        created=datetime.fromtimestamp(
                            stat.st_mtime, tz=timezone.utc
                        ).isoformat(),
                        size_bytes=stat.st_size,
                    ))
                except (OSError, ValueError):
                    continue
        return artifacts

    @staticmethod
    def _extract_version(cwd: str) -> str:
        """Try to read version from package.json or pom.xml."""
        base = Path(cwd) if cwd else Path.cwd()

        pkg = base / "package.json"
        if pkg.is_file():
            try:
                import json
                data = json.loads(pkg.read_text())
                return data.get("version", "")
            except (OSError, ValueError):
                pass

        pom = base / "pom.xml"
        if pom.is_file():
            try:
                text = pom.read_text()
                m = re.search(r"<version>([^<]+)</version>", text)
                if m:
                    return m.group(1).strip()
            except OSError:
                pass

        return ""

    # ------------------------------------------------------------------
    # Test result parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_pytest_result(stdout: str, stderr: str, exit_code: int) -> TestResult:
        """Parse pytest output for structured test results."""
        result = TestResult(framework="pytest")

        summary_line = ""
        for line in (stdout + "\n" + stderr).splitlines():
            if "passed" in line or "failed" in line or "error" in line or "skipped" in line:
                if "===" in line or line.strip().startswith("====="):
                    summary_line = line
                    break

        if not summary_line:
            for line in (stdout + "\n" + stderr).splitlines():
                stripped = line.strip()
                if re.match(r"^(=+.*passed|=+.*failed|=+.*error)", stripped):
                    summary_line = stripped
                    break

        if summary_line:
            passed_m = re.search(r"(\d+)\s+passed", summary_line)
            failed_m = re.search(r"(\d+)\s+failed", summary_line)
            error_m = re.search(r"(\d+)\s+error", summary_line)
            skipped_m = re.search(r"(\d+)\s+skipped", summary_line)

            if passed_m:
                result.passed = int(passed_m.group(1))
            if failed_m:
                result.failed = int(failed_m.group(1))
            if error_m:
                result.failed += int(error_m.group(1))
            if skipped_m:
                result.skipped = int(skipped_m.group(1))
            result.tests = result.passed + result.failed + result.skipped

        dur_m = re.search(r"in\s+([\d.]+)s", stdout + stderr)
        if dur_m:
            result.duration_seconds = float(dur_m.group(1))

        cov_m = re.search(r"Total coverage:\s*([\d.]+)%", stdout + stderr)
        if cov_m:
            result.coverage = float(cov_m.group(1))
        else:
            cov_m2 = re.search(r"Lines\s*[=:]\s*([\d.]+)%", stdout + stderr)
            if cov_m2:
                result.coverage = float(cov_m2.group(1))

        return result

    @staticmethod
    def _parse_jest_result(stdout: str, stderr: str, exit_code: int) -> TestResult:
        """Parse Jest output for structured test results."""
        result = TestResult(framework="jest")

        for line in (stdout + "\n" + stderr).splitlines():
            line = line.strip()
            m = re.match(
                r"Tests:\s+(\d+)\s+(?:failed|passed|skipped|todo|total)",
                line,
            )
            if m:
                result.tests = int(m.group(1))

            passed_m = re.match(r"(\d+)\s+passed", line)
            failed_m = re.match(r"(\d+)\s+failed", line)
            skipped_m = re.match(r"(\d+)\s+(?:skipped|todo)", line)

            if passed_m:
                result.passed = int(passed_m.group(1))
            if failed_m:
                result.failed = int(failed_m.group(1))
            if skipped_m:
                result.skipped = int(skipped_m.group(1))

        if result.tests == 0:
            result.tests = result.passed + result.failed + result.skipped

        dur_m = re.search(r"Time:\s+([\d.]+)\s*s", stdout + stderr)
        if dur_m:
            result.duration_seconds = float(dur_m.group(1))

        cov_m = re.search(r"All files[^|]*\|\s*([\d.]+)\s*\|", stdout)
        if cov_m:
            result.coverage = float(cov_m.group(1))

        return result

    @staticmethod
    def _parse_junit_result(stdout: str, stderr: str, exit_code: int) -> TestResult:
        """Parse Maven Surefire/JUnit output for structured test results."""
        result = TestResult(framework="junit")

        combined = stdout + "\n" + stderr
        for line in combined.splitlines():
            line = line.strip()
            tests_m = re.match(r"Tests\s+run:\s+(\d+)", line)
            if tests_m:
                result.tests = int(tests_m.group(1))
                fail_m = re.search(r"Failures:\s+(\d+)", line)
                err_m = re.search(r"Errors:\s+(\d+)", line)
                skip_m = re.search(r"Skipped:\s+(\d+)", line)
                if fail_m:
                    result.failed = int(fail_m.group(1))
                if err_m:
                    result.failed += int(err_m.group(1))
                if skip_m:
                    result.skipped = int(skip_m.group(1))
                result.passed = result.tests - result.failed - result.skipped
                break

        dur_m = re.search(r"BUILD SUCCESS.*\(([\d.]+)s\)|Total time:\s+([\d.]+)\s*s", combined)
        if dur_m:
            result.duration_seconds = float(dur_m.group(1) or dur_m.group(2))

        return result

    @staticmethod
    def _parse_npm_test_result(stdout: str, stderr: str, exit_code: int) -> TestResult:
        """Parse npm test output — delegates to jest or mocha pattern matching."""
        combined = stdout + "\n" + stderr

        if "jest" in combined.lower() or "Tests:" in combined:
            return ToolAdapter._parse_jest_result(stdout, stderr, exit_code)

        result = TestResult(framework="npm-test")
        for line in combined.splitlines():
            line = line.strip()
            passing_m = re.match(r"(\d+)\s+passing", line)
            failing_m = re.match(r"(\d+)\s+failing", line)
            pending_m = re.match(r"(\d+)\s+pending", line)
            if passing_m:
                result.passed = int(passing_m.group(1))
            if failing_m:
                result.failed = int(failing_m.group(1))
            if pending_m:
                result.skipped = int(pending_m.group(1))
        result.tests = result.passed + result.failed + result.skipped
        return result


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
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "test":
            cmd = ["npm", "test"] + args
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            result.test_result = self._parse_npm_test_result(
                result.stdout, result.stderr, result.exit_code
            )
            return result

        if operation == "run":
            script_name = params.get("script", "")
            if not script_name:
                return ToolResult(exit_code=1, stderr="script parameter required for 'run'")
            cmd = ["npm", "run", script_name] + args
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "build":
            cmd = ["npm", "run", "build"] + args
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            if result.exit_code == 0:
                version = self._extract_version(working_dir or ".")
                artifacts = self._discover_artifacts(
                    working_dir or ".",
                    [("dist/**/*.js", "js"), ("dist/**/*.css", "css"),
                     ("dist/**/*.html", "html"), ("build/**/*.js", "js")],
                )
                for a in artifacts:
                    a.version = version
                result.artifacts = artifacts
            return result

        return ToolResult(exit_code=1, stderr=f"Unsupported npm operation: {operation}")


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
            result = await self._run_command(
                [binary, "-m", "pytest"] + args, timeout, env=env, cwd=working_dir
            )
            result.test_result = self._parse_pytest_result(
                result.stdout, result.stderr, result.exit_code
            )
            return result

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
        result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "test":
            result.test_result = self._parse_junit_result(
                result.stdout, result.stderr, result.exit_code
            )
        elif operation in ("package", "verify"):
            if result.exit_code == 0:
                version = self._extract_version(working_dir or ".")
                artifacts = self._discover_artifacts(
                    working_dir or ".",
                    [("target/*.jar", "jar"), ("target/*.war", "war"),
                     ("target/*.ear", "ear")],
                )
                for a in artifacts:
                    a.version = version
                result.artifacts = artifacts

        return result


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
        result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if task in ("test", "check") and result.exit_code is not None:
            result.test_result = self._parse_junit_result(
                result.stdout, result.stderr, result.exit_code
            )
        elif task in ("build", "assemble", "bootJar", "bootWar"):
            if result.exit_code == 0:
                version = self._extract_version(working_dir or ".")
                artifacts = self._discover_artifacts(
                    working_dir or ".",
                    [("build/libs/*.jar", "jar"), ("build/libs/*.war", "war"),
                     ("build/distributions/*.zip", "zip")],
                )
                for a in artifacts:
                    a.version = version
                result.artifacts = artifacts

        return result


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
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            result.test_result = self._parse_pytest_result(
                result.stdout, result.stderr, result.exit_code
            )
            return result

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
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            result.test_result = self._parse_junit_result(
                result.stdout, result.stderr, result.exit_code
            )
            return result

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
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            result.test_result = self._parse_jest_result(
                result.stdout, result.stderr, result.exit_code
            )
            return result

        if operation == "watch":
            cmd = ["npx", "jest", "--watch"] + ([test_path] if test_path else [])
            return await self._run_command(cmd, timeout, env=env, cwd=working_dir)

        if operation == "coverage":
            cmd = ["npx", "jest", "--coverage"] + ([test_path] if test_path else []) + options
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            result.test_result = self._parse_jest_result(
                result.stdout, result.stderr, result.exit_code
            )
            return result

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
            result = await self._run_command(cmd, timeout, env=env, cwd=working_dir)
            result.test_result = TestResult(framework="playwright")
            for line in result.stdout.splitlines():
                line = line.strip()
                passed_m = re.match(r"(\d+)\s+passed", line)
                failed_m = re.match(r"(\d+)\s+failed", line)
                skipped_m = re.match(r"(\d+)\s+skipped", line)
                if passed_m:
                    result.test_result.passed = int(passed_m.group(1))
                if failed_m:
                    result.test_result.failed = int(failed_m.group(1))
                if skipped_m:
                    result.test_result.skipped = int(skipped_m.group(1))
            result.test_result.tests = (
                result.test_result.passed + result.test_result.failed + result.test_result.skipped
            )
            dur_m = re.search(r"finished in\s+([\d.]+)s", result.stdout)
            if dur_m:
                result.test_result.duration_seconds = float(dur_m.group(1))
            return result

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
        cwd = working_dir or project or "."

        if operation == "build":
            if shutil.which("npm"):
                result = await self._run_command(
                    ["npm", "run", "build"], timeout, env=env, cwd=cwd
                )
                if result.exit_code == 0:
                    version = self._extract_version(cwd)
                    artifacts = self._discover_artifacts(
                        cwd,
                        [("dist/**/*.js", "js"), ("dist/**/*.css", "css"),
                         ("dist/**/*.html", "html"), ("build/**/*.js", "js")],
                    )
                    for a in artifacts:
                        a.version = version
                    result.artifacts = artifacts
                return result
            if shutil.which("mvn"):
                result = await self._run_command(
                    ["mvn", "compile"], timeout, env=env, cwd=cwd
                )
                if result.exit_code == 0:
                    version = self._extract_version(cwd)
                    artifacts = self._discover_artifacts(
                        cwd,
                        [("target/classes/**/*.class", "class"),
                         ("target/*.jar", "jar")],
                    )
                    for a in artifacts:
                        a.version = version
                    result.artifacts = artifacts
                return result
            return ToolResult(exit_code=127, stderr="No build tool (npm or mvn) found")

        if operation == "package":
            if shutil.which("mvn"):
                result = await self._run_command(
                    ["mvn", "package", "-DskipTests"], timeout, env=env, cwd=cwd
                )
                if result.exit_code == 0:
                    version = self._extract_version(cwd)
                    artifacts = self._discover_artifacts(
                        cwd, [("target/*.jar", "jar"), ("target/*.war", "war")]
                    )
                    for a in artifacts:
                        a.version = version
                    result.artifacts = artifacts
                return result
            if shutil.which("npm"):
                result = await self._run_command(
                    ["npm", "pack"], timeout, env=env, cwd=cwd
                )
                if result.exit_code == 0:
                    version = self._extract_version(cwd)
                    artifacts = self._discover_artifacts(cwd, [("./*.tgz", "tgz")])
                    for a in artifacts:
                        a.version = version
                    result.artifacts = artifacts
                return result
            return ToolResult(exit_code=127, stderr="No packaging tool found")

        if operation == "publish":
            if shutil.which("npm"):
                return await self._run_command(
                    ["npm", "publish"], timeout, env=env, cwd=cwd
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
