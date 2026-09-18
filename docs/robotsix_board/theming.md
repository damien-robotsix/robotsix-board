# CSS Theming

The board stylesheet is layered on top of the
[robotsix-ui](https://github.com/damien-robotsix/robotsix-ui) shared base.
See the robotsix-ui [consumption guide](https://github.com/damien-robotsix/robotsix-ui/blob/main/docs/consumption.md)
for details on the shared design tokens and base stylesheet.

## CSS custom properties (theming)

`board.css` is layered on top of the robotsix-ui shared base stylesheet
(vendored as `robotsix-ui-base.css`), which provides the design tokens
(`--rsu-*`), a minimal reset, and shared component styles.

`board.css` overrides the following `--rsu-*` tokens inside `#board` / `.board`
for the board's default dark theme:

| Token                         | Board default | Purpose              |
|-------------------------------|---------------|----------------------|
| `--rsu-color-bg`              | `#1a1a2e`     | Surface background   |
| `--rsu-color-bg-secondary`    | `#16213e`     | Column / drawer bg   |
| `--rsu-color-text`            | `#e0e0e0`     | Primary text         |
| `--rsu-color-text-secondary`  | `#c0c0e0`     | Secondary text       |
| `--rsu-color-border`          | `#2a2a4a`     | Card / column border |
| `--rsu-color-border-focus`    | `#4a6fa5`     | Focus ring           |
| `--rsu-color-primary`         | `#0f3460`     | Accent / button bg   |
| `--rsu-color-primary-hover`   | `#1a4a80`     | Hover state          |
| `--rsu-color-error`           | `#ff6b6b`     | Error text           |

Board-specific `--board-*` tokens (no `--rsu-*` equivalent):

| Category  | Property                     | Default     |
|-----------|------------------------------|-------------|
| Surfaces  | `--board-header-bg`          | `#0f3460`   |
|           | `--board-card-bg`            | `#1a1a2e`   |
| Borders   | `--board-border-hover`       | `#3a3a6a`   |
| Text      | `--board-text-muted`         | `#a0a0c0`   |
|           | `--board-text-dim`           | `#8080a0`   |
|           | `--board-text-empty`         | `#505070`   |
| Accent    | `--board-accent-merged`      | `#4a9eff`   |
| Badges    | `--board-badge-src-bg`       | `#2d1f4e`   |
|           | `--board-badge-src-color`    | `#c0a0e0`   |
|           | `--board-badge-src-border`   | `#4a3a6a`   |
| Shadows   | `--board-shadow-card-hover`  | `0 2px 8px rgba(0,0,0,0.3)` |
|           | `--board-shadow-focus`       | `0 0 0 2px rgba(74,111,165,0.4)` |
|           | `--board-shadow-focus-select`| `0 0 0 2px rgba(74,111,165,0.3)` |
|           | `--board-shadow-drawer`      | `-4px 0 16px rgba(0,0,0,0.4)` |

Consumers can override any `--rsu-*` or `--board-*` property on `#board` or
their own `:root` to customise the appearance without selector wars.

Example — light-theme override:

```css
#board {
  --rsu-color-bg: #ffffff;
  --rsu-color-bg-secondary: #f5f5f5;
  --rsu-color-text: #1a1a2e;
  --rsu-color-text-secondary: #4b5563;
  --rsu-color-border: #e5e7eb;
  /* ... */
}
```
