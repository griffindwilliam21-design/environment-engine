import type { BuiltEnvironment, EnvironmentNeed, EnvironmentPlugin, EnvironmentProfile, PluginInstance, RuntimeMode } from "./types.js";

export class BasePlugin implements EnvironmentPlugin {
  id: string;
  requirements: string[];

  constructor(id: string, requirements: string[] = []) {
    this.id = id;
    this.requirements = requirements;
  }

  connect(context: Record<string, unknown>): Record<string, unknown> {
    return {
      ...context,
      connected: true,
      [`${this.id}Connected`]: true,
    };
  }

  configure(context: Record<string, unknown>): Record<string, unknown> {
    return {
      ...context,
      configured: true,
      [`${this.id}Configured`]: true,
    };
  }

  validate(context: Record<string, unknown>): boolean {
    return Boolean(context && context.ready !== false);
  }
}

export class RuntimePlugin extends BasePlugin {
  constructor() {
    super("runtime", ["runtime"]);
  }

  connect(context: Record<string, unknown>) {
    return {
      ...context,
      runtime: context.runtime ?? "app",
      runtimeConfig: {
        mode: context.runtime ?? "app",
        boot: "safe",
      },
      connected: true,
    };
  }

  configure(context: Record<string, unknown>) {
    return {
      ...context,
      environment: {
        ...(context.environment as Record<string, string> | undefined),
        APP_RUNTIME: String(context.runtime ?? "app"),
      },
      configured: true,
    };
  }
}

export class DatabasePlugin extends BasePlugin {
  constructor() {
    super("database", ["database", "storage"]);
  }

  configure(context: Record<string, unknown>) {
    return {
      ...context,
      environment: {
        ...(context.environment as Record<string, string> | undefined),
        DATABASE_URL: "postgres://localhost:5432/app",
        DATABASE_POOL: "10",
      },
      configured: true,
    };
  }
}

export class AuthPlugin extends BasePlugin {
  constructor() {
    super("auth", ["auth", "identity"]);
  }

  configure(context: Record<string, unknown>) {
    return {
      ...context,
      environment: {
        ...(context.environment as Record<string, string> | undefined),
        AUTH_MODE: "token",
        JWT_SECRET: "dev-secret",
      },
      configured: true,
    };
  }
}

export class CachePlugin extends BasePlugin {
  constructor() {
    super("cache", ["cache", "redis"]);
  }

  configure(context: Record<string, unknown>) {
    return {
      ...context,
      environment: {
        ...(context.environment as Record<string, string> | undefined),
        CACHE_URL: "redis://localhost:6379",
      },
      configured: true,
    };
  }
}

export class MonitoringPlugin extends BasePlugin {
  constructor() {
    super("monitoring", ["monitoring", "metrics", "logs"]);
  }

  configure(context: Record<string, unknown>) {
    return {
      ...context,
      environment: {
        ...(context.environment as Record<string, string> | undefined),
        LOG_LEVEL: "info",
        METRICS_ENABLED: "true",
      },
      configured: true,
    };
  }
}

export class NetworkPlugin extends BasePlugin {
  constructor() {
    super("network", ["network", "ingress", "proxy"]);
  }

  configure(context: Record<string, unknown>) {
    return {
      ...context,
      environment: {
        ...(context.environment as Record<string, string> | undefined),
        PORT: "8080",
        HOST: "0.0.0.0",
      },
      configured: true,
    };
  }
}

export const defaultEnvironmentProfiles: EnvironmentProfile[] = [
  {
    id: "local-stack",
    label: "Local app stack",
    match: (need) => need.runtime === "local" || need.runtime === "app",
    requiredPlugins: ["runtime", "database", "cache", "monitoring", "network"],
  },
  {
    id: "secure-api-production",
    label: "Secure API production",
    match: (need) => need.purpose.includes("api") && (need.securityLevel === "high" || need.runtime === "production"),
    requiredPlugins: ["runtime", "network", "auth", "database", "cache", "monitoring"],
  },
  {
    id: "build-runner",
    label: "Build runner",
    match: (need) => need.runtime === "build" || need.runtime === "ci",
    requiredPlugins: ["runtime", "monitoring", "network"],
  },
  {
    id: "hybrid-platform",
    label: "Hybrid platform",
    match: (need) => need.runtime === "hybrid" || need.components.includes("integration"),
    requiredPlugins: ["runtime", "database", "auth", "cache", "monitoring", "network"],
  },
];

export class EnvironmentEngine {
  private readonly plugins: Map<string, EnvironmentPlugin>;
  private readonly profiles: EnvironmentProfile[];

  constructor(
    plugins: EnvironmentPlugin[] = [],
    profiles: EnvironmentProfile[] = defaultEnvironmentProfiles,
  ) {
    this.plugins = new Map(plugins.map((plugin) => [plugin.id, plugin]));
    this.profiles = profiles;
  }

  registerPlugin(plugin: EnvironmentPlugin) {
    this.plugins.set(plugin.id, plugin);
  }

  listenForNeed(need: EnvironmentNeed): BuiltEnvironment {
    const profile = this.matchProfile(need);
    const orderedPlugins = profile.requiredPlugins
      .map((pluginId) => this.plugins.get(pluginId))
      .filter((plugin): plugin is EnvironmentPlugin => Boolean(plugin));

    const context: Record<string, unknown> = {
      need,
      runtime: need.runtime,
      environment: {} as Record<string, string>,
      ready: true,
    };

    const logs: string[] = [`Listening for need: ${need.purpose}`];
    const warnings: string[] = [];
    const dependencies: string[] = [];

    let currentContext = context;

    for (const plugin of orderedPlugins) {
      dependencies.push(plugin.id);
      logs.push(`Connecting plugin: ${plugin.id}`);
      currentContext = plugin.connect(currentContext);
      currentContext = plugin.configure(currentContext);

      if (!plugin.validate(currentContext)) {
        warnings.push(`Plugin ${plugin.id} did not validate.`);
      }
    }

    const mergedEnvironment = Object.entries((currentContext.environment as Record<string, unknown>) ?? {}).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {},
    );

    const result: BuiltEnvironment = {
      profile: profile.id,
      ready: currentContext.ready !== false && warnings.length === 0,
      runtime: need.runtime,
      environment: mergedEnvironment,
      components: profile.requiredPlugins,
      dependencies,
      logs,
      warnings,
    };

    return result;
  }

  private matchProfile(need: EnvironmentNeed): EnvironmentProfile {
    const matched = this.profiles.find((profile) => profile.match(need));
    return matched ?? {
      id: "adaptive-default",
      label: "Adaptive default",
      match: () => true,
      requiredPlugins: ["runtime"],
    };
  }
}

export const defaultPlugins: EnvironmentPlugin[] = [
  new RuntimePlugin(),
  new DatabasePlugin(),
  new AuthPlugin(),
  new CachePlugin(),
  new MonitoringPlugin(),
  new NetworkPlugin(),
];
