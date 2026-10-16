# Makefile for robotsix-board — a dual-language (Python + JavaScript) project.
#
# Run `make help` to list the available targets. Python commands use uv and
# JavaScript commands use npm, mirroring the commands documented in README.md
# and CONTRIBUTING.md.

.DEFAULT_GOAL := help

.PHONY: help install test-python test-js test-all lint format clean

help: ## List all targets with descriptions
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install Python (uv) and Node (npm) dependencies
	uv sync --extra dev
	npm install

test-python: ## Run Python tests with coverage (pytest + pytest-cov)
	uv run pytest

test-js: ## Run JavaScript tests (vitest + Playwright e2e)
	npm run test:js
	npm run test:e2e

test-all: test-python test-js ## Run all tests (Python + JavaScript)

lint: ## Lint Python (ruff, mypy, bandit) and JavaScript (eslint, stylelint)
	uv run ruff check .
	uv run mypy
	uv run bandit -q -r src
	npm run lint:js
	npm run lint:css

format: ## Format Python (ruff format) and JavaScript (eslint --fix)
	uv run ruff format .
	npm run lint:js -- --fix

clean: ## Remove build artifacts and caches
	rm -rf dist build .pytest_cache node_modules/.cache
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
