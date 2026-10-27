// Cross-platform `BACKEND=<name> <command...>` for package scripts.
import { spawnSync } from "node:child_process"

const [backend, ...command] = process.argv.slice(2)
if (!backend || command.length === 0) {
  console.error("Usage: node scripts/with-backend.mjs <qbittorrent|transmission> <command...>")
  process.exit(1)
}

const result = spawnSync(command.join(" "), {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, BACKEND: backend },
})
process.exit(result.status ?? 1)
