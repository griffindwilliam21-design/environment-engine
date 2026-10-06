import { EnvironmentEngine, defaultPlugins } from "./engine.js";
import type { EnvironmentNeed } from "./types.js";

const buildRequest: EnvironmentNeed = {
  purpose: "secure API service",
  runtime: "production",
  components: ["api", "auth", "database", "cache", "monitoring"],
  securityLevel: "high",
  scale: "medium",
  tags: ["secure", "runtime", "buildable"],
  target: "production",
};

const engine = new EnvironmentEngine(defaultPlugins);
const builtEnvironment = engine.build(buildRequest);

console.log("Environment engine built a ready environment:");
console.log(
  JSON.stringify(
    {
      profile: builtEnvironment.profile,
      ready: builtEnvironment.ready,
      runtime: builtEnvironment.runtime,
      components: builtEnvironment.components,
      dependencies: builtEnvironment.dependencies,
      environment: builtEnvironment.environment,
      manifest: builtEnvironment.manifest,
      logs: builtEnvironment.logs,
      warnings: builtEnvironment.warnings,
    },
    null,
    2,
  ),
);

export { engine, buildRequest, builtEnvironment };
