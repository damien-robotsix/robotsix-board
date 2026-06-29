"""Smoke tests for the robotsix-board package skeleton."""

from __future__ import annotations

from pathlib import Path

import robotsix_board

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_version_is_non_empty_string() -> None:
    assert isinstance(robotsix_board.__version__, str)
    assert robotsix_board.__version__


def test_static_dir_contains_assets() -> None:
    static = robotsix_board.static_dir()
    assert static.is_dir()
    assert (static / "board.css").is_file()
    assert (static / "board.js").is_file()


def test_adapter_contract_importable() -> None:
    assert robotsix_board.BoardAdapter is not None
    assert robotsix_board.RenderMode is not None


def test_board_js_exposes_set_refresh_url() -> None:
    source = (robotsix_board.static_dir() / "board.js").read_text()
    assert "function robotsixBoardSetRefreshUrl" in source
    assert "window.robotsixBoardSetRefreshUrl" in source


def test_eslint_config_present_and_configured() -> None:
    cfg = REPO_ROOT / "eslint.config.mjs"
    pkg = REPO_ROOT / "package.json"
    assert cfg.is_file()
    assert pkg.is_file()
    text = cfg.read_text()
    assert "@eslint/js" in text
    assert "no-unused-vars" in text
    assert "caughtErrorsIgnorePattern" in text


def test_stylelint_config_present_and_configured() -> None:
    cfg = REPO_ROOT / ".stylelintrc.json"
    pkg = REPO_ROOT / "package.json"
    assert cfg.is_file()
    text = cfg.read_text()
    assert '"stylelint-config-standard"' in text
    pkg_text = pkg.read_text()
    assert '"stylelint"' in pkg_text
    assert '"lint:css"' in pkg_text
    pre_commit = (REPO_ROOT / ".pre-commit-config.yaml").read_text()
    assert "stylelint" in pre_commit
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "stylelint" in ci


def test_check_jsonschema_workflows_hook_configured() -> None:
    pre_commit = (REPO_ROOT / ".pre-commit-config.yaml").read_text()
    assert "python-jsonschema/check-jsonschema" in pre_commit
    assert "check-github-workflows" in pre_commit

    pyproject = (REPO_ROOT / "pyproject.toml").read_text()
    assert '"check-jsonschema"' in pyproject


def test_dependabot_config_present_and_covers_three_ecosystems() -> None:
    cfg = REPO_ROOT / ".github" / "dependabot.yml"
    assert cfg.is_file()
    text = cfg.read_text()
    assert "version: 2" in text
    assert 'package-ecosystem: "uv"' in text
    assert 'package-ecosystem: "npm"' in text
    assert 'package-ecosystem: "github-actions"' in text


def test_release_workflow_present_and_publishes_to_pypi() -> None:
    import re

    import yaml  # type: ignore[import-untyped]

    workflow = REPO_ROOT / ".github" / "workflows" / "release.yml"
    assert workflow.is_file()
    text = workflow.read_text()
    assert "published" in text
    assert "id-token: write" in text
    assert "secrets: inherit" in text
    # Release-time gate: tag / pyproject version / CHANGELOG consistency.
    assert "verify:" in text
    assert "needs: verify" in text
    assert "tomllib" in text
    assert "CHANGELOG.md" in text
    assert "github.event.release.tag_name" in text

    # Cross-repo reusable workflow pin: must reference the shared
    # robotsix-github-workflows workflow at a full 40-char commit SHA
    # (not a mutable branch ref).
    doc = yaml.safe_load(text)
    publish_job = doc["jobs"]["publish"]
    uses_ref = publish_job["uses"]
    expected_prefix = "robotsix-github-workflows/.github/workflows/python-release.yml@"
    assert expected_prefix in uses_ref
    sha = uses_ref.split("@", 1)[1]
    assert re.fullmatch(r"[0-9a-f]{40}", sha), (
        f"expected 40-char hex SHA after '@', got {sha!r}"
    )


def test_changelog_present_and_follows_keep_a_changelog() -> None:
    changelog = REPO_ROOT / "CHANGELOG.md"
    assert changelog.is_file()
    text = changelog.read_text()
    assert "# Changelog" in text
    assert "## [Unreleased]" in text
    assert "## [0.1.0]" in text
    assert "### Added" in text
    assert "keepachangelog.com" in text


def test_js_unit_test_infrastructure_present() -> None:
    pkg = (REPO_ROOT / "package.json").read_text()
    assert '"vitest"' in pkg
    assert '"test:js"' in pkg

    vitest_cfg = REPO_ROOT / "vitest.config.mjs"
    assert vitest_cfg.is_file()
    assert "happy-dom" in vitest_cfg.read_text()

    board_test = REPO_ROOT / "tests" / "robotsix_board" / "board.helpers.test.js"
    assert board_test.is_file()
    board_test_text = board_test.read_text()
    assert "robotsixBoardInternals" in board_test_text
    assert "esc" in board_test_text

    board_js_path = REPO_ROOT / "src" / "robotsix_board" / "static" / "board.js"
    board_js = board_js_path.read_text()
    assert "window.robotsixBoardInternals" in board_js

    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "npx vitest run" in ci


def test_js_coverage_infrastructure_present() -> None:
    pkg = (REPO_ROOT / "package.json").read_text()
    assert "@vitest/coverage-v8" in pkg
    assert "vitest run --coverage" in pkg

    vitest_cfg = (REPO_ROOT / "vitest.config.mjs").read_text()
    assert "coverage" in vitest_cfg
    assert "provider" in vitest_cfg
    assert '"v8"' in vitest_cfg
    assert "thresholds" in vitest_cfg

    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "npx vitest run --coverage" in ci

    agent_md = (REPO_ROOT / "AGENT.md").read_text()
    assert "coverage" in agent_md
    assert "ratchet" in agent_md


def test_module_curator_periodic_enabled() -> None:
    cfg = REPO_ROOT / ".robotsix-mill" / "periodic" / "module_curator.yaml"
    assert cfg.is_file()
    assert "name: module_curator" in cfg.read_text()


def test_pyproject_has_urls_and_classifiers() -> None:
    import tomllib

    pyproject = REPO_ROOT / "pyproject.toml"
    assert pyproject.is_file()
    data = tomllib.loads(pyproject.read_text())

    project = data["project"]

    urls = project["urls"]
    assert urls["Homepage"] == "https://github.com/damien-robotsix/robotsix-board"
    assert urls["Repository"] == "https://github.com/damien-robotsix/robotsix-board"
    assert urls["Documentation"] == "https://damien-robotsix.github.io/robotsix-board/"
    assert urls["Issues"] == "https://github.com/damien-robotsix/robotsix-board/issues"
    assert urls["Changelog"].startswith(
        "https://github.com/damien-robotsix/robotsix-board/blob/"
    )

    classifiers = project["classifiers"]
    assert "Development Status :: 4 - Beta" in classifiers
    assert "Intended Audience :: Developers" in classifiers
    assert "License :: OSI Approved :: MIT License" in classifiers
    assert "Programming Language :: Python :: 3.14" in classifiers
    assert "Typing :: Typed" in classifiers


def test_support_md_present() -> None:
    support_md = REPO_ROOT / ".github" / "SUPPORT.md"
    assert support_md.is_file()
    text = support_md.read_text()
    assert "GitHub Discussions" in text
    assert "Bug Report" in text
    assert "Feature Request" in text
    assert "SECURITY.md" in text


def test_closed_toggle_styles_live_in_css_not_js() -> None:
    static = robotsix_board.static_dir()
    css = (static / "board.css").read_text()
    js = (static / "board.js").read_text()

    assert "#board-closed-toggle {" in css
    assert "#board-closed-toggle label {" in css

    assert "color: #c0c0e0" not in js
    assert "user-select: none" not in js
    assert "padding: 8px 16px" not in js


def test_json_hydration_string_consistent_across_python_and_js() -> None:
    """The RenderMode.JSON_HYDRATION enum value must appear in board.js.

    If the enum value is renamed, the JS bail-out checks would silently
    fail and the board would never initialize in JSON_HYDRATION mode.
    """
    expected = robotsix_board.RenderMode.JSON_HYDRATION.value
    js_source = (robotsix_board.static_dir() / "board.js").read_text()
    assert expected in js_source, (
        f"Enum value {expected!r} not found in board.js — "
        "JS bail-out checks would silently fail"
    )
