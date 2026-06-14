"""Smoke tests for the robotsix-board package skeleton."""

from __future__ import annotations

import robotsix_board


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
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    cfg = root / "eslint.config.mjs"
    pkg = root / "package.json"
    assert cfg.is_file()
    assert pkg.is_file()
    text = cfg.read_text()
    assert "@eslint/js" in text
    assert "no-unused-vars" in text
    assert "caughtErrorsIgnorePattern" in text


def test_stylelint_config_present_and_configured() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    cfg = root / ".stylelintrc.json"
    pkg = root / "package.json"
    assert cfg.is_file()
    text = cfg.read_text()
    assert '"stylelint-config-standard"' in text
    pkg_text = pkg.read_text()
    assert '"stylelint"' in pkg_text
    assert '"lint:css"' in pkg_text
    pre_commit = (root / ".pre-commit-config.yaml").read_text()
    assert "stylelint" in pre_commit
    ci = (root / ".github" / "workflows" / "ci.yml").read_text()
    assert "stylelint" in ci


def test_dependabot_config_present_and_covers_three_ecosystems() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    cfg = root / ".github" / "dependabot.yml"
    assert cfg.is_file()
    text = cfg.read_text()
    assert "version: 2" in text
    assert 'package-ecosystem: "uv"' in text
    assert 'package-ecosystem: "npm"' in text
    assert 'package-ecosystem: "github-actions"' in text


def test_release_workflow_present_and_publishes_to_pypi() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    workflow = root / ".github" / "workflows" / "release.yml"
    assert workflow.is_file()
    text = workflow.read_text()
    assert "published" in text
    assert "id-token: write" in text
    assert (
        "damien-robotsix/robotsix-mill/.github/workflows/python-release.yml@main"
        in text
    )
    assert "secrets: inherit" in text
    # Release-time gate: tag / pyproject version / CHANGELOG consistency.
    assert "verify:" in text
    assert "needs: verify" in text
    assert "tomllib" in text
    assert "CHANGELOG.md" in text
    assert "github.event.release.tag_name" in text


def test_changelog_present_and_follows_keep_a_changelog() -> None:
    from pathlib import Path

    root = Path(__file__).resolve().parent.parent
    changelog = root / "CHANGELOG.md"
    assert changelog.is_file()
    text = changelog.read_text()
    assert "# Changelog" in text
    assert "## [Unreleased]" in text
    assert "## [0.1.0]" in text
    assert "### Added" in text
    assert "keepachangelog.com" in text


def test_closed_toggle_styles_live_in_css_not_js() -> None:
    static = robotsix_board.static_dir()
    css = (static / "board.css").read_text()
    js = (static / "board.js").read_text()

    assert "#board-closed-toggle {" in css
    assert "#board-closed-toggle label {" in css

    assert "color: #c0c0e0" not in js
    assert "user-select: none" not in js
    assert "padding: 8px 16px" not in js
