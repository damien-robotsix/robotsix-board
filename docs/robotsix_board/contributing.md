# Contributing

See [`CONTRIBUTING.md`](https://github.com/damien-robotsix/robotsix-board/blob/main/CONTRIBUTING.md)
for the full contributing guide.

## Development setup

Clone the repo and install dev dependencies:

```bash
uv sync --extra dev --extra docs
```

Run tests:
```bash
uv run pytest
```

Build the docs site:
```bash
uv run mkdocs serve
```
