/**
 * Web export with route-level chunks. Native bundles stay synchronous.
 */
import { spawn } from "node:child_process";

const child = spawn(
  "npx",
  ["expo", "export", "--platform", "web", "--output-dir", "dist"],
  {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, EXPO_ROUTER_IMPORT_MODE: "lazy" },
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
