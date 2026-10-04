import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  checkPreview,
  isAccessChallenge,
  uploadedPreview,
} from "./checkPreview.mjs";
import { preparePreview } from "./preparePreview.mjs";
import {
  finishDeployment,
  isCurrentPullRequest,
  resolvePreview,
  startDeployment,
} from "./previewContext.mjs";

const sha = "a".repeat(40);
const repository = "okathira-dev/busycube";
const pr = {
  number: 80,
  state: "open",
  draft: false,
  user: { login: "dependabot[bot]" },
  base: { ref: "main" },
  head: { sha, repo: { full_name: repository } },
};
function harness(overrides = {}) {
  const outputs = {};
  const statuses = [];
  const run = {
    id: 123,
    head_sha: sha,
    event: "pull_request",
    conclusion: "success",
    path: ".github/workflows/node.js.yml",
    head_repository: { full_name: repository },
    ...overrides.run,
  };
  const artifact = { id: 456, name: "cloudflare-preview", expired: false };
  const github = {
    rest: {
      actions: {
        getWorkflowRun: async () => ({ data: run }),
        listWorkflowRunArtifacts: async () => overrides.artifacts ?? [artifact],
      },
      pulls: { get: async () => ({ data: overrides.pr ?? pr }) },
      repos: {
        listPullRequestsAssociatedWithCommit: async () =>
          overrides.candidates ?? [pr],
        createDeployment: async (input) => {
          outputs.deployment = input;
          return { data: { id: 789 } };
        },
        createDeploymentStatus: async (input) => {
          statuses.push(input);
        },
      },
    },
    paginate: (method, input) => method(input),
  };
  const context = {
    repo: { owner: "okathira-dev", repo: "busycube" },
    payload: { workflow_run: { id: 123 } },
    serverUrl: "https://github.com",
    runId: 987,
  };
  const core = {
    setOutput: (name, value) => {
      outputs[name] = value;
    },
    notice: () => {},
    setFailed: (message) => {
      outputs.failure = message;
    },
  };
  return { github, context, core, outputs, statuses };
}

test("only the latest open same-repository Dependabot PR can deploy", () => {
  assert.equal(isCurrentPullRequest(pr, repository, sha), true);
  for (const changed of [
    { ...pr, state: "closed" },
    { ...pr, draft: true },
    { ...pr, user: { login: "someone" } },
    { ...pr, base: { ref: "other" } },
    { ...pr, head: { ...pr.head, sha: "b".repeat(40) } },
    { ...pr, head: { ...pr.head, repo: { full_name: "fork/busycube" } } },
  ])
    assert.equal(isCurrentPullRequest(changed, repository, sha), false);
});

test("resolve uses GitHub's run, current PR and run-scoped artifact identity", async () => {
  const h = harness();
  await resolvePreview(h);
  assert.equal(h.outputs.deploy, "true");
  assert.equal(h.outputs.sha, sha);
  assert.equal(h.outputs.pr, 80);
  assert.equal(h.outputs.artifact, 456);
});

test("failed, renamed, push, fork and obsolete runs cannot deploy", async () => {
  for (const overrides of [
    { run: { conclusion: "failure" } },
    { run: { event: "push" } },
    { run: { path: ".github/workflows/attacker.yml" } },
    { run: { head_repository: { full_name: "fork/busycube" } } },
    { pr: { ...pr, head: { ...pr.head, sha: "b".repeat(40) } } },
    { candidates: [] },
    { candidates: [pr, pr] },
  ]) {
    const h = harness(overrides);
    await resolvePreview(h);
    assert.equal(h.outputs.deploy, "false");
  }
});

test("missing, expired or ambiguous artifacts fail closed", async () => {
  for (const artifacts of [
    [],
    [{ id: 1, name: "cloudflare-preview", expired: true }],
    [
      { id: 1, name: "cloudflare-preview" },
      { id: 2, name: "cloudflare-preview" },
    ],
  ])
    await assert.rejects(resolvePreview(harness({ artifacts })));
});

test("deployment records the PR SHA and does not deactivate other PR previews", async () => {
  const saved = { ...process.env };
  try {
    process.env.PR_NUMBER = "80";
    process.env.PR_SHA = sha;
    const h = harness();
    await startDeployment(h);
    assert.equal(h.outputs.deployment.ref, sha);
    assert.equal(h.outputs.deployment.auto_merge, false);
    assert.deepEqual(h.outputs.deployment.required_contexts, []);
    process.env.DEPLOYMENT_ID = "789";
    process.env.DEPLOYMENT_RESULT = "success";
    process.env.SMOKE_RESULT = "passed";
    await finishDeployment(h);
    assert.equal(h.statuses.at(-1).state, "success");
    assert.equal(h.statuses.at(-1).auto_inactive, false);
    const stale = harness({ pr: { ...pr, state: "closed" } });
    await startDeployment(stale);
    assert.equal(stale.outputs.id, undefined);
    await finishDeployment(stale);
    assert.equal(stale.statuses.at(-1).state, "failure");
    assert.ok(stale.outputs.failure);
    process.env.DEPLOYMENT_RESULT = "failure";
    await finishDeployment(h);
    assert.equal(h.statuses.at(-1).state, "failure");
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});

async function fixture(callback) {
  const root = await mkdtemp(join(tmpdir(), "busycube-preview-"));
  try {
    const bundle = join(root, "artifact");
    await mkdir(join(bundle, "busycube"), { recursive: true });
    await mkdir(join(bundle, "client"));
    await writeFile(join(bundle, "busycube/index.js"), "export default {};");
    await writeFile(join(bundle, "client/index.html"), "<html></html>");
    const config = join(root, "trusted.json");
    await writeFile(
      config,
      JSON.stringify({
        name: "busycube",
        compatibility_date: "2026-08-27",
        workers_dev: true,
        assets: { binding: "ASSETS", run_worker_first: ["/payment/method"] },
        build: { command: "must-never-run" },
        vars: { SECRET: "must-not-copy" },
      }),
    );
    await callback(bundle, config);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("upload config is reconstructed from trusted main with no build hooks or vars", async () => {
  await fixture(async (bundle, trusted) => {
    const config = await preparePreview(bundle, trusted);
    assert.equal(config.no_bundle, true);
    assert.equal(config.assets.directory, "./client");
    assert.equal(config.build, undefined);
    assert.equal(config.vars, undefined);
    assert.deepEqual(config.assets.run_worker_first, ["/payment/method"]);
  });
});

test("artifact config, credentials, tooling, unexpected roots and symlinks are rejected", async () => {
  for (const path of [
    "busycube/wrangler.json",
    "client/.env",
    "busycube/.dev.vars",
    "client/node_modules",
    "unexpected",
  ]) {
    await fixture(async (bundle, trusted) => {
      await writeFile(join(bundle, path), "{}");
      await assert.rejects(preparePreview(bundle, trusted));
    });
  }
  await fixture(async (bundle, trusted) => {
    await symlink(
      join(bundle, "client"),
      join(bundle, "busycube/link"),
      "junction",
    );
    await assert.rejects(preparePreview(bundle, trusted), /symlink/);
  });
});

test("only an immutable Cloudflare URL from successful version output is probed", () => {
  const output = (preview_url) =>
    JSON.stringify({
      type: "version-upload",
      version_id: "version-id",
      preview_url,
    });
  assert.equal(
    uploadedPreview(output("https://1234abcd-busycube.account.workers.dev")),
    "https://1234abcd-busycube.account.workers.dev",
  );
  for (const url of [
    "https://pr-80-busycube.account.workers.dev",
    "https://1234abcd-busycube.account.workers.dev.evil.test",
    "http://1234abcd-busycube.account.workers.dev",
    "https://secret@1234abcd-busycube.account.workers.dev",
    "https://1234abcd-busycube.account.workers.dev/other",
  ])
    assert.throws(() => uploadedPreview(output(url)));
});

test("Access login is reported as protected, never as a passed runtime smoke", async () => {
  const challenge = new Response(null, {
    status: 302,
    headers: {
      location:
        "https://team.cloudflareaccess.com/cdn-cgi/access/login/preview",
    },
  });
  assert.equal(isAccessChallenge(challenge), true);
  assert.equal(
    await checkPreview("https://example.workers.dev", async () => challenge),
    "access-protected",
  );
  assert.equal(
    isAccessChallenge(
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.test/login" },
      }),
    ),
    false,
  );
});

test("public preview smoke verifies static assets and Hono runtime responses", async () => {
  const requested = [];
  const result = await checkPreview(
    "https://example.workers.dev",
    async (url, options) => {
      requested.push(url.pathname);
      assert.equal(options.redirect, "manual");
      if (url.pathname === "/")
        return new Response("<html></html>", {
          headers: { "content-type": "text/html" },
        });
      if (url.pathname.endsWith(".json"))
        return new Response("{}", {
          headers: { "content-type": "application/json" },
        });
      return new Response(null, {
        status: 204,
        headers:
          url.pathname === "/payment/method"
            ? {
                link: '</payment/payment-method-manifest.json>; rel="payment-method-manifest"',
              }
            : { "cache-control": "no-store" },
      });
    },
  );
  assert.equal(result, "passed");
  assert.equal(requested.length, 4);
  await assert.rejects(
    checkPreview(
      "https://example.workers.dev",
      async () =>
        new Response("login page", {
          headers: { "content-type": "text/plain" },
        }),
    ),
    /content type/,
  );
});
