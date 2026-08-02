"""Smoke tests for the robotsix-board package skeleton."""

from __future__ import annotations

from pathlib import Path

import robotsix_board

REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def test_version_is_non_empty_string() -> None:
    assert isinstance(robotsix_board.__version__, str)
    assert robotsix_board.__version__


def test_version_matches_pyproject() -> None:
    """``__version__`` must match ``[project].version`` in pyproject.toml."""
    import tomllib

    pyproject = (REPO_ROOT / "pyproject.toml").read_text()
    expected = tomllib.loads(pyproject)["project"]["version"]
    assert robotsix_board.__version__ == expected, (
        f"__version__ is {robotsix_board.__version__!r}, "
        f"but pyproject.toml has {expected!r}"
    )


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
    assert 'w["robotsixBoardSetRefreshUrl"]' in source


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


def test_dependabot_config_present_and_covers_all_ecosystems() -> None:
    cfg = REPO_ROOT / ".github" / "dependabot.yml"
    assert cfg.is_file()
    text = cfg.read_text()
    assert "version: 2" in text
    assert 'package-ecosystem: "uv"' in text
    assert 'package-ecosystem: "npm"' in text
    assert 'package-ecosystem: "github-actions"' in text
    assert 'package-ecosystem: "pre-commit"' in text


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

    board_test = (
        REPO_ROOT / "tests" / "robotsix_board" / "static" / "board.helpers.test.js"
    )
    assert board_test.is_file()
    board_test_text = board_test.read_text()
    assert "robotsixBoardInternals" in board_test_text
    assert "esc" in board_test_text

    board_js_path = REPO_ROOT / "src" / "robotsix_board" / "static" / "board.js"
    board_js = board_js_path.read_text()
    assert 'w["robotsixBoardInternals"]' in board_js

    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text()
    assert "npm run test:js" in ci


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
    assert "npm run test:js" in ci

    agent_md = (REPO_ROOT / "AGENT.md").read_text()
    assert "coverage" in agent_md


def test_periodic_workflows_enabled() -> None:
    """Smoke: periodic agents are enabled."""
    periodic_dir = REPO_ROOT / ".robotsix-mill" / "periodic"
    assert periodic_dir.is_dir()
    yaml_files = sorted(periodic_dir.glob("*.yaml"))
    expected = {
        "audit.yaml",
        "bc_check.yaml",
        "changelog_autofill.yaml",
        "completeness_check.yaml",
        "copy_paste.yaml",
        "docstring_coverage.yaml",
        "health.yaml",
        "module_curator.yaml",
        "module_size.yaml",
        "repo_description_sync.yaml",
        "survey.yaml",
        "test_gap.yaml",
    }
    actual = {p.name for p in yaml_files}
    assert expected.issubset(actual), f"Expected at least {expected}, found: {actual}"


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


def test_board_config_id_consistent_across_python_and_js() -> None:
    """The #board-config script element ID must be identical across all files.

    ``_render.py`` emits ``<script id="board-config" …>``,
    ``board.js`` reads it with ``getElementById("board-config")``,
    and ``board_shared.js`` creates test elements with ``el.id = "board-config"``.
    If any of these three occurrences drift, the JS client silently
    fails to find the config element and ``bootConfig()`` returns false.
    """
    import re

    from robotsix_board._render import render_config_script

    # 1. Extract the id from the <script> tag rendered by _render.py
    from tests.robotsix_board.test_render import _adapter

    rendered = render_config_script(_adapter())
    py_match = re.search(r'id="([^"]+)"', rendered)
    assert py_match is not None, "Could not find id attribute in rendered script tag"
    py_id = py_match.group(1)

    # 2. Extract the getElementById argument from board.js
    js_source = (robotsix_board.static_dir() / "board.js").read_text()
    js_match = re.search(r'function bootConfig.*?getElementById\("([^"]+)"\)', js_source, re.DOTALL)
    assert js_match is not None, "Could not find getElementById call in board.js"
    js_id = js_match.group(1)

    # 3. Extract the el.id assignment from the JS test helper
    board_shared = REPO_ROOT / "tests" / "robotsix_board" / "static" / "board_shared.js"
    shared_source = board_shared.read_text()
    shared_match = re.search(r'\.id\s*=\s*"([^"]+)"', shared_source)
    assert shared_match is not None, "Could not find .id assignment in board_shared.js"
    shared_id = shared_match.group(1)

    assert py_id == js_id == shared_id, (
        f"board-config script ID mismatch: "
        f"_render.py={py_id!r}, "
        f"board.js={js_id!r}, "
        f"board_shared.js={shared_id!r}"
    )


def test_esc_consistent_across_python_and_js() -> None:
    """Python ``esc()`` and JS ``esc()`` must produce identical output.

    Both transports must escape the same set of characters
    (``&``, ``<``, ``>``, ``"``, ``'``) to identical entity
    references.  If either implementation drifts, XSS vectors can
    appear in one transport while the other remains safe, and no
    existing test would catch it.
    """
    import re

    from robotsix_board._render import esc as py_esc

    # Shared test vectors covering all five special characters
    # plus edge cases (empty string, already-escaped input).
    vectors: list[str] = [
        "<script>",
        "a&b",
        '"quoted"',
        "'single'",
        "normal",
        "",
        "<>&\"'",
        "hello <world> & goodbye",
        "already &amp; escaped",
        "\"'&<>",
    ]

    # Python esc() output
    py_outputs = [py_esc(v) for v in vectors]

    # Extract the JS ENTITY_MAP char→entity lookup from board.js source.
    # Keys are single characters inside single or double quotes;
    # values are entity strings inside double quotes.
    js_source = (robotsix_board.static_dir() / "board.js").read_text()
    _entity_re = re.compile('["\x27]([&<>"\x27])["\x27]\\s*:\\s*"([^"]*)"')
    entity_map: dict[str, str] = {}
    for m in _entity_re.finditer(js_source):
        entity_map[m.group(1)] = m.group(2)
    assert len(entity_map) == 5, (
        f"Expected 5 entries in JS ENTITY_MAP, found {len(entity_map)}: {entity_map}"
    )

    # Re-implement JS esc() behaviour in pure Python using the
    # extracted map so we test the map contents, not Node.js runtime.
    def _js_esc(s: str) -> str:
        return "".join(entity_map.get(ch, ch) for ch in s)

    js_outputs = [_js_esc(v) for v in vectors]

    # Normalise hex vs decimal numeric entities (&#x27; vs &#39;) —
    # they are semantically identical and Python's html.escape may
    # use either form depending on the stdlib version.
    def _normalise(s: str) -> str:
        return s.replace("&#x27;", "&#39;")

    py_outputs = [_normalise(p) for p in py_outputs]
    js_outputs = [_normalise(j) for j in js_outputs]

    mismatches = [
        (v, py, js)
        for v, py, js in zip(vectors, py_outputs, js_outputs, strict=True)
        if py != js
    ]
    assert not mismatches, (
        f"esc() mismatch between Python and JS for {len(mismatches)} vector(s):\n"
        + "\n".join(f"  {v!r} -> py={py!r}  js={js!r}" for v, py, js in mismatches)
    )
