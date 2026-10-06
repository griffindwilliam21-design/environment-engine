export type RuntimeMode = "local" | "build" | "app" | "production" | "ci" | "hybrid";
export type SecurityLevel = "low" | "medium" | "high";
export type Scale = "small" | "medium" | "large";

export type EnvironmentNeed = {
  purpose: string;
  runtime: RuntimeMode;
  components: string[];
  securityLevel?: SecurityLevel;
  scale?: Scale;
  tags?: string[];
  prefer?: string[];
};

export type BuiltEnvironment = {
  profile: string;
  ready: boolean;
  runtime: RuntimeMode;
  environment: Record<string, string>;
  components: string[];
  dependencies: string[];
  logs: string[];
  warnings: string[];
};

export interface EnvironmentPlugin {
  id: string;
  requirements: string[];
  connect(context: Record<string, unknown>): Record<string, unknown>;
  configure(context: Record<string, unknown>): Record<string, unknown>;
  validate(context: Record<string, unknown>): boolean;
}

export type EnvironmentProfile = {
  id: string;
  label: string;
  match: (need: EnvironmentNeed) => boolean;
  requiredPlugins: string[];
};

export type PluginInstance = EnvironmentPlugin & {
  configured: boolean;
};
