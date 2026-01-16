export type ExtensionConfig = {
  apiBaseUrl: string;
  familyAccessKey: string;
};

const DEFAULT_CONFIG: ExtensionConfig = {
  apiBaseUrl: "http://localhost:8787",
  familyAccessKey: ""
};

let cachedConfig: ExtensionConfig | null = null;

function normalizeConfig(input: Partial<ExtensionConfig>): ExtensionConfig {
  const apiBaseUrl = typeof input.apiBaseUrl === "string" ? input.apiBaseUrl.trim() : "";
  const familyAccessKey =
    typeof input.familyAccessKey === "string" ? input.familyAccessKey.trim() : "";
  return {
    apiBaseUrl: apiBaseUrl || DEFAULT_CONFIG.apiBaseUrl,
    familyAccessKey
  };
}

export async function getConfig(): Promise<ExtensionConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const runtime = (globalThis as any).chrome?.runtime;
    const configUrl: string | undefined = runtime?.getURL?.("config.json");
    if (configUrl) {
      const response = await fetch(configUrl, { cache: "no-store" });
      if (response.ok) {
        const json = (await response.json()) as Partial<ExtensionConfig>;
        cachedConfig = normalizeConfig(json);
        return cachedConfig;
      }
    }
  } catch {
    // fall back to defaults
  }

  cachedConfig = DEFAULT_CONFIG;
  return cachedConfig;
}
