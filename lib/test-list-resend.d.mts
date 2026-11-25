type TestListConfig = { apiKey: string; from: string; segment: string };
export function testListConfig(env: NodeJS.ProcessEnv): TestListConfig | null;
export function registerForTesting(email: string, config: TestListConfig, request?: typeof fetch, now?: () => number): Promise<"confirmed" | "confirmation_pending" | "confirmation_unknown">;
