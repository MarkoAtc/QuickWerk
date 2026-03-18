type ProductAppRuntimeEnv = {
  EXPO_PUBLIC_PLATFORM_API_BASE_URL?: string;
  EXPO_PUBLIC_PLATFORM_API_BASE_URL_NATIVE?: string;
  EXPO_PUBLIC_PLATFORM_API_BASE_URL_WEB?: string;
};

const defaultPlatformApiBaseUrl = 'http://127.0.0.1:3101';

const runtimeEnv = (globalThis as typeof globalThis & { process?: { env?: ProductAppRuntimeEnv } }).process?.env;

const isWebRuntime = () => typeof document !== 'undefined';

const resolvePlatformApiBaseUrl = () => {
  const sharedBaseUrl = runtimeEnv?.EXPO_PUBLIC_PLATFORM_API_BASE_URL;

  if (isWebRuntime()) {
    return runtimeEnv?.EXPO_PUBLIC_PLATFORM_API_BASE_URL_WEB ?? sharedBaseUrl ?? defaultPlatformApiBaseUrl;
  }

  return runtimeEnv?.EXPO_PUBLIC_PLATFORM_API_BASE_URL_NATIVE ?? sharedBaseUrl ?? defaultPlatformApiBaseUrl;
};

export const runtimeConfig = {
  platformApiBaseUrl: resolvePlatformApiBaseUrl(),
} as const;