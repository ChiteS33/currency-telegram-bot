# C4 Model diagrams

These PlantUML sources describe the architecture currently implemented in this repository.

- [System context](01-system-context.puml) — people and external systems around the bot.
- [Container](02-container.puml) — the single Node.js process, its entry points, and external integrations.
- [Component](03-component.puml) — the Telegram currency-request path inside that process.

## Rendering

Install PlantUML and Graphviz outside this project, then render SVG files from the repository root:

```powershell
plantuml -tsvg docs/c4/*.puml
```

The diagrams use PlantUML's bundled C4-PlantUML library (`!include <C4/...>`). Rendered files are local build artifacts and are not committed.
