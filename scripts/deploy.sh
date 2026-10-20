#!/usr/bin/env bash
set -Eeuo pipefail
: "${DEPLOY_HOST:?}" "${DEPLOY_USER:?}" "${DEPLOY_PATH:?}" "${DEPLOY_PORT:?}" "${SITE_URL:?}"
version=${1:?commit SHA required}
[[ "$version" =~ ^[a-f0-9]{40}$ ]] || exit 2
[[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ && "$DEPLOY_USER" =~ ^[a-zA-Z_][a-zA-Z0-9_-]*$ && "$DEPLOY_PORT" =~ ^[0-9]+$ && "$DEPLOY_PATH" =~ ^/[a-zA-Z0-9/_-]+$ && "$DEPLOY_PATH" != / ]] || exit 2
[[ "$SITE_URL" =~ ^https?://[a-zA-Z0-9.:/-]+$ ]] || exit 2
ssh_args=(-p "$DEPLOY_PORT" -o BatchMode=yes -o StrictHostKeyChecking=yes)
remote="$DEPLOY_USER@$DEPLOY_HOST"
staging="$DEPLOY_PATH/incoming/$version-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
ssh "${ssh_args[@]}" "$remote" "mkdir -p '$staging' '$DEPLOY_PATH/releases' '$DEPLOY_PATH/shared/assets'"
rsync -az --checksum -e "ssh -p $DEPLOY_PORT -o BatchMode=yes -o StrictHostKeyChecking=yes" dist/ "$remote:$staging/"
ssh "${ssh_args[@]}" "$remote" "cd '$staging' && sha256sum --strict --check SHA256SUMS && test ! -e '$DEPLOY_PATH/releases/$version' && mv '$staging' '$DEPLOY_PATH/releases/$version'"
ssh "${ssh_args[@]}" "$remote" bash -s -- "$DEPLOY_PATH" "$version" "$SITE_URL" < scripts/release.sh
