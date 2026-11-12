#!/usr/bin/env bash
set -euo pipefail

repository="${1:-ayimmam/Access}"
branch="${2:-main}"

gh auth status >/dev/null

visibility="$(gh repo view "${repository}" --json visibility --jq .visibility)"
permission="$(gh repo view "${repository}" --json viewerPermission --jq .viewerPermission)"

case "${permission}" in
  ADMIN|MAINTAIN) ;;
  *)
    echo "Admin or maintain permission is required; current permission: ${permission}" >&2
    exit 1
    ;;
esac

echo "Configuring ${repository}:${branch} (${visibility}) with PR review and CI protection."

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "repos/${repository}/branches/${branch}/protection" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "GitGuardian Security Checks",
      "Repository checks",
      "Security baseline"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON

gh api \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "repos/${repository}/branches/${branch}/protection" \
  --jq '{required_checks: .required_status_checks.contexts, enforce_admins: .enforce_admins.enabled, required_approvals: .required_pull_request_reviews.required_approving_review_count, dismiss_stale_reviews: .required_pull_request_reviews.dismiss_stale_reviews, require_last_push_approval: .required_pull_request_reviews.require_last_push_approval, conversation_resolution: .required_conversation_resolution.enabled, linear_history: .required_linear_history.enabled, force_pushes: .allow_force_pushes.enabled, deletions: .allow_deletions.enabled}'
