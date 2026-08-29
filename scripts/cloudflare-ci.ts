import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

type FetchLike = typeof fetch;
type Sleep = (milliseconds: number) => Promise<void>;

type CloudflareVersion = {
  id: string;
  message?: string;
  tag: string;
};

type SmokeCheck = {
  expectedStatus: number;
  headers?: Readonly<Record<string, string>>;
  method?: "GET" | "HEAD";
  path: string;
};

const defaultSleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const smokeChecks: readonly SmokeCheck[] = [
  {
    path: "/",
    expectedStatus: 200,
    headers: {
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "SAMEORIGIN",
    },
  },
  { path: "/?stage=S-090", expectedStatus: 200 },
  {
    path: "/manifest.webmanifest",
    expectedStatus: 200,
    headers: { "cache-control": "no-cache" },
  },
  {
    path: "/service-worker.js",
    expectedStatus: 200,
    headers: { "cache-control": "no-cache" },
  },
  {
    path: "/offline-beacon/network-probe",
    expectedStatus: 204,
    headers: {
      "cache-control": "no-store",
      "referrer-policy": "strict-origin-when-cross-origin",
      "x-content-type-options": "nosniff",
    },
  },
  {
    path: "/payment/method",
    method: "HEAD",
    expectedStatus: 204,
    headers: {
      "cache-control": "no-store",
      link: '</payment/payment-method-manifest.json>; rel="payment-method-manifest"',
    },
  },
];

function asRecord(
  value: unknown,
  description: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${description}がobjectではありません。`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, description: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${description}が空、またはstringではありません。`);
  }
  return value;
}

function requiredEnvironment(name: string): string {
  return requiredString(process.env[name], `環境変数${name}`);
}

export function resolveVersion(
  payload: unknown,
  expectedTag: string,
  expectedMessage?: string,
): CloudflareVersion | undefined {
  const envelope = asRecord(payload, "Cloudflare Versions API response");
  const result = asRecord(envelope.result, "Cloudflare Versions API result");
  if (!Array.isArray(result.items)) {
    throw new Error(
      "Cloudflare Versions API result.itemsがarrayではありません。",
    );
  }

  const matches = result.items.flatMap((item) => {
    const version = asRecord(item, "Cloudflare Version");
    const annotations = asRecord(
      version.annotations ?? {},
      "Cloudflare Version annotations",
    );
    const tag = annotations["workers/tag"];
    if (tag !== expectedTag) {
      return [];
    }
    return [
      {
        id: requiredString(version.id, "Cloudflare Version ID"),
        tag,
        message:
          typeof annotations["workers/message"] === "string"
            ? annotations["workers/message"]
            : undefined,
      },
    ];
  });

  if (matches.length > 1) {
    const ids = matches.map(({ id }) => id).join(", ");
    throw new Error(
      `Version tag ${expectedTag} が複数のVersionに一致しました: ${ids}`,
    );
  }

  const match = matches[0];
  if (
    match &&
    expectedMessage !== undefined &&
    match.message !== expectedMessage
  ) {
    throw new Error(
      `Version tag ${expectedTag} のmessageが期待値と一致しません。`,
    );
  }
  return match;
}

export function isVersionFullyDeployed(
  payload: unknown,
  expectedVersionId: string,
): boolean {
  const envelope = asRecord(payload, "Cloudflare Deployments API response");
  const result = asRecord(envelope.result, "Cloudflare Deployments API result");
  if (!Array.isArray(result.deployments)) {
    throw new Error(
      "Cloudflare Deployments API result.deploymentsがarrayではありません。",
    );
  }

  const latest = result.deployments[0];
  if (latest === undefined) {
    return false;
  }
  const deployment = asRecord(latest, "Cloudflare Deployment");
  if (!Array.isArray(deployment.versions)) {
    throw new Error("Cloudflare Deployment versionsがarrayではありません。");
  }
  if (deployment.versions.length !== 1) {
    return false;
  }
  const version = asRecord(
    deployment.versions[0],
    "Cloudflare Deployment version",
  );
  return version.version_id === expectedVersionId && version.percentage === 100;
}

export function resolveWorkersDevUrls(
  payload: unknown,
  workerName: string,
  previewAlias?: string,
): { previewUrl?: string; productionUrl: string } {
  if (!/^[a-z0-9-]+$/.test(workerName)) {
    throw new Error("Worker名に使用できない文字が含まれています。");
  }
  if (previewAlias !== undefined && !/^[a-z][a-z0-9-]*$/.test(previewAlias)) {
    throw new Error("Preview Aliasに使用できない文字が含まれています。");
  }
  const envelope = asRecord(payload, "Cloudflare Subdomain API response");
  const result = asRecord(envelope.result, "Cloudflare Subdomain API result");
  const subdomain = requiredString(
    result.subdomain,
    "Cloudflare workers.dev subdomain",
  );
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    throw new Error(
      "workers.dev subdomainに使用できない文字が含まれています。",
    );
  }

  return {
    productionUrl: `https://${workerName}.${subdomain}.workers.dev`,
    previewUrl:
      previewAlias === undefined
        ? undefined
        : `https://${previewAlias}-${workerName}.${subdomain}.workers.dev`,
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function responseError(response: Response): Promise<Error> {
  const body = (await response.text()).slice(0, 500);
  return new Error(
    `Cloudflare APIがHTTP ${response.status}を返しました${body ? `: ${body}` : ""}`,
  );
}

export async function fetchJsonWithRetry(
  url: URL,
  token: string,
  fetchImpl: FetchLike = fetch,
  sleep: Sleep = defaultSleep,
): Promise<unknown> {
  const attempts = 4;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await sleep(attempt * 1_000);
      continue;
    }
    if (response.ok) {
      return await response.json();
    }
    if (!isRetryableStatus(response.status) || attempt === attempts) {
      throw await responseError(response);
    }
    await sleep(attempt * 1_000);
  }
  throw new Error("Cloudflare APIのretry回数を超過しました。");
}

function cloudflareApiUrl(accountId: string, suffix: string): URL {
  return new URL(
    `/client/v4/accounts/${encodeURIComponent(accountId)}${suffix}`,
    "https://api.cloudflare.com",
  );
}

async function fetchVersions(
  accountId: string,
  workerName: string,
  token: string,
): Promise<unknown> {
  return fetchJsonWithRetry(
    cloudflareApiUrl(
      accountId,
      `/workers/scripts/${encodeURIComponent(workerName)}/versions?deployable=true`,
    ),
    token,
  );
}

async function fetchDeployments(
  accountId: string,
  workerName: string,
  token: string,
): Promise<unknown> {
  return fetchJsonWithRetry(
    cloudflareApiUrl(
      accountId,
      `/workers/scripts/${encodeURIComponent(workerName)}/deployments`,
    ),
    token,
  );
}

async function fetchSubdomain(
  accountId: string,
  token: string,
): Promise<unknown> {
  return fetchJsonWithRetry(
    cloudflareApiUrl(accountId, "/workers/subdomain"),
    token,
  );
}

function writeOutput(name: string, value: string | boolean): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `${name}=${String(value)}\n`, "utf8");
    return;
  }
  console.log(`${name}=${String(value)}`);
}

async function resolveVersionCommand(waitForVersion: boolean): Promise<void> {
  const accountId = requiredEnvironment("CLOUDFLARE_ACCOUNT_ID");
  const token = requiredEnvironment("CLOUDFLARE_API_TOKEN");
  const workerName = requiredEnvironment("CLOUDFLARE_WORKER_NAME");
  const expectedTag = requiredEnvironment("CLOUDFLARE_VERSION_TAG");
  const expectedMessage = requiredEnvironment("CLOUDFLARE_VERSION_MESSAGE");
  const attempts = waitForVersion ? 10 : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const version = resolveVersion(
      await fetchVersions(accountId, workerName, token),
      expectedTag,
      expectedMessage,
    );
    if (version) {
      writeOutput("found", true);
      writeOutput("version-id", version.id);
      return;
    }
    if (attempt < attempts) {
      await defaultSleep(3_000);
    }
  }

  if (waitForVersion) {
    throw new Error(`Version tag ${expectedTag} が見つかりませんでした。`);
  }
  writeOutput("found", false);
  writeOutput("version-id", "");
}

async function deploymentStatusCommand(
  waitForDeployment: boolean,
): Promise<void> {
  const accountId = requiredEnvironment("CLOUDFLARE_ACCOUNT_ID");
  const token = requiredEnvironment("CLOUDFLARE_API_TOKEN");
  const workerName = requiredEnvironment("CLOUDFLARE_WORKER_NAME");
  const versionId = requiredEnvironment("CLOUDFLARE_VERSION_ID");
  const attempts = waitForDeployment ? 10 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const deployed = isVersionFullyDeployed(
      await fetchDeployments(accountId, workerName, token),
      versionId,
    );
    if (deployed) {
      writeOutput("deployed", true);
      return;
    }
    if (attempt < attempts) {
      await defaultSleep(3_000);
    }
  }
  if (waitForDeployment) {
    throw new Error(`Version ID ${versionId} が100%配信されていません。`);
  }
  writeOutput("deployed", false);
}

async function resolveUrlsCommand(): Promise<void> {
  const accountId = requiredEnvironment("CLOUDFLARE_ACCOUNT_ID");
  const token = requiredEnvironment("CLOUDFLARE_API_TOKEN");
  const workerName = requiredEnvironment("CLOUDFLARE_WORKER_NAME");
  const previewAlias = process.env.CLOUDFLARE_PREVIEW_ALIAS || undefined;
  const urls = resolveWorkersDevUrls(
    await fetchSubdomain(accountId, token),
    workerName,
    previewAlias,
  );
  writeOutput("production-url", urls.productionUrl);
  if (urls.previewUrl) {
    writeOutput("preview-url", urls.previewUrl);
  }
}

export async function runSmokeTests(
  baseUrl: string,
  fetchImpl: FetchLike = fetch,
  sleep: Sleep = defaultSleep,
): Promise<void> {
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:") {
    throw new Error("スモークテスト対象はHTTPS URLである必要があります。");
  }

  for (const check of smokeChecks) {
    const url = new URL(check.path, origin);
    const attempts = 12;
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const response = await fetchImpl(url, {
          method: check.method ?? "GET",
        });
        if (response.status !== check.expectedStatus) {
          throw new Error(
            `${url.href}がHTTP ${response.status}を返しました（期待値: ${check.expectedStatus}）。`,
          );
        }
        for (const [name, expectedValue] of Object.entries(
          check.headers ?? {},
        )) {
          const actualValue = response.headers.get(name);
          if (actualValue !== expectedValue) {
            throw new Error(
              `${url.href}の${name} headerが期待値と一致しません（実値: ${actualValue ?? "なし"}）。`,
            );
          }
        }
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < attempts) {
          await sleep(5_000);
        }
      }
    }
    if (lastError) {
      throw lastError;
    }
    console.log(`OK ${check.method ?? "GET"} ${url.href}`);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2];
  switch (command) {
    case "find-version":
      await resolveVersionCommand(false);
      break;
    case "wait-version":
      await resolveVersionCommand(true);
      break;
    case "deployment-status":
      await deploymentStatusCommand(false);
      break;
    case "wait-deployment":
      await deploymentStatusCommand(true);
      break;
    case "resolve-urls":
      await resolveUrlsCommand();
      break;
    case "smoke":
      await runSmokeTests(requiredEnvironment("BUSYCUBE_BASE_URL"));
      break;
    default:
      throw new Error(`未対応のcommandです: ${command ?? "なし"}`);
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
