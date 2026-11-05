const environment = "cloudflare-workers-preview";

export function isCurrentPullRequest(pr, repository, sha) {
  return (
    pr.state === "open" &&
    pr.user?.login === "dependabot[bot]" &&
    !pr.draft &&
    pr.base.ref === "main" &&
    pr.head.repo?.full_name === repository &&
    pr.head.sha === sha
  );
}

export async function resolvePreview({ github, context, core }) {
  core.setOutput("deploy", "false");
  const { owner, repo } = context.repo;
  const repository = `${owner}/${repo}`;
  const { data: run } = await github.rest.actions.getWorkflowRun({
    owner,
    repo,
    run_id: context.payload.workflow_run.id,
  });
  if (
    run.event !== "pull_request" ||
    run.conclusion !== "success" ||
    run.path !== ".github/workflows/node.js.yml" ||
    run.head_repository?.full_name !== repository
  ) {
    core.notice(
      "Only successful same-repository Node.js CI PR runs may deploy.",
    );
    return;
  }
  // Query GitHub rather than trusting PR metadata inside an artifact.
  const candidates = await github.paginate(
    github.rest.repos.listPullRequestsAssociatedWithCommit,
    { owner, repo, commit_sha: run.head_sha, per_page: 100 },
  );
  const current = [];
  for (const candidate of candidates) {
    const { data: pr } = await github.rest.pulls.get({
      owner,
      repo,
      pull_number: candidate.number,
    });
    if (isCurrentPullRequest(pr, repository, run.head_sha)) current.push(pr);
  }
  if (current.length !== 1) {
    core.notice(
      "CI no longer belongs to exactly one open, current PR; skipping.",
    );
    return;
  }
  const artifacts = await github.paginate(
    github.rest.actions.listWorkflowRunArtifacts,
    { owner, repo, run_id: run.id, per_page: 100 },
  );
  const bundles = artifacts.filter(
    (artifact) => artifact.name === "cloudflare-preview" && !artifact.expired,
  );
  if (bundles.length !== 1) {
    throw new Error(
      "Expected exactly one cloudflare-preview artifact from this CI run.",
    );
  }
  core.setOutput("pr", current[0].number);
  core.setOutput("sha", run.head_sha);
  core.setOutput("artifact", bundles[0].id);
  core.setOutput("deploy", "true");
}

async function currentPullRequest(github, context) {
  const { data: pr } = await github.rest.pulls.get({
    ...context.repo,
    pull_number: Number(process.env.PR_NUMBER),
  });
  return isCurrentPullRequest(
    pr,
    `${context.repo.owner}/${context.repo.repo}`,
    process.env.PR_SHA,
  );
}

export async function startDeployment({ github, context, core }) {
  if (!(await currentPullRequest(github, context))) {
    core.notice("The PR changed or closed while waiting; skipping deployment.");
    return;
  }
  const { data: deployment } = await github.rest.repos.createDeployment({
    ...context.repo,
    ref: process.env.PR_SHA,
    auto_merge: false,
    required_contexts: [],
    environment,
    transient_environment: true,
    production_environment: false,
    description: `CI-verified preview for PR #${process.env.PR_NUMBER}`,
  });
  core.setOutput("id", deployment.id);
  await github.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deployment.id,
    state: "in_progress",
    auto_inactive: false,
    log_url: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
  });
}

export async function finishDeployment({ github, context, core }) {
  const current = await currentPullRequest(github, context);
  const success = process.env.DEPLOYMENT_RESULT === "success" && current;
  await github.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: Number(process.env.DEPLOYMENT_ID),
    state: success ? "success" : "failure",
    auto_inactive: false,
    environment_url: process.env.PREVIEW_URL || undefined,
    log_url: `${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
    description: success
      ? process.env.SMOKE_RESULT === "access-protected"
        ? "Version uploaded; Access protected; CI runtime tests passed"
        : "Version uploaded; HTTP smoke checks passed"
      : "Upload/check failed or the PR changed; see workflow logs",
  });
  if (!current) core.setFailed("PR changed before the deployment completed.");
  if (success) await dispatchMergedProduction({ github, context, core });
}

export async function dispatchMergedProduction({
  github,
  context,
  core,
  pause = (milliseconds) =>
    new Promise((done) => setTimeout(done, milliseconds)),
  attempts = 60,
}) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const { data: pr } = await github.rest.pulls.get({
      ...context.repo,
      pull_number: Number(process.env.PR_NUMBER),
    });
    if (
      pr.head.sha !== process.env.PR_SHA ||
      pr.user?.login !== "dependabot[bot]" ||
      pr.base.ref !== "main" ||
      pr.head.repo?.full_name !== `${context.repo.owner}/${context.repo.repo}`
    ) {
      core.notice("PR identity changed; production dispatch skipped.");
      return;
    }
    if (pr.merged) {
      // GITHUB_TOKEN merges do not trigger push workflows. workflow_dispatch
      // is an explicit exception and uses the existing main-only deploy job.
      await github.rest.actions.createWorkflowDispatch({
        ...context.repo,
        workflow_id: "deploy-cloudflare-workers.yml",
        ref: "main",
      });
      core.notice(
        `Production deployment dispatched after PR #${pr.number} merged.`,
      );
      return;
    }
    if (
      pr.state !== "open" ||
      !pr.auto_merge ||
      pr.mergeable_state === "behind"
    ) {
      core.notice(
        "PR is not ready to auto-merge; production dispatch skipped.",
      );
      return;
    }
    if (attempt + 1 < attempts) await pause(5000);
  }
  core.warning("Auto-merge is still pending; production dispatch has not run.");
}
