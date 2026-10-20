#!/usr/bin/env bash
# Runs as the dedicated deployment user on the server. Never requires sudo.
set -Eeuo pipefail
root=${1:?deployment root required}
version=${2:?commit SHA required}
site_url=${3:?site URL required}
[[ "$root" =~ ^/[a-zA-Z0-9/_-]+$ && "$root" != / ]] || exit 2
[[ "$version" =~ ^[a-f0-9]{40}$ ]] || exit 2
[[ "$site_url" =~ ^https?://[^[:space:]\;\'\"]+$ ]] || exit 2
exec 9>"$root/.deploy.lock"
flock -w 120 9
release="$root/releases/$version"
[[ -d "$release" && ! -L "$release" ]] || { echo 'Release is missing'; exit 1; }
cd "$release"
sha256sum --strict --check SHA256SUMS
[[ -s index.html && -s version.json && -d assets ]] || exit 1
node_not_required_version=$(sed -n 's/.*"sha"[[:space:]]*:[[:space:]]*"\([a-f0-9]*\)".*/\1/p' version.json)
[[ "$node_not_required_version" == "$version" ]] || exit 1
mkdir -p "$root/shared/assets"
cp -a assets/. "$root/shared/assets/"
previous=$(readlink "$root/current" || true)
switch_to() { ln -s "$1" "$root/.current-next-$$"; mv -Tf "$root/.current-next-$$" "$root/current"; }
health() {
    local expected=$1 html resource
    for attempt in 1 2 3; do
        if curl --fail --silent --show-error --max-time 20 "$site_url/version.json" | tr -d '[:space:]' | grep -Fq "\"sha\":\"$expected\""; then
            html=$(curl --fail --silent --show-error --max-time 20 "$site_url/") || continue
            mapfile -t resources < <(printf '%s' "$html" | grep -oE '/assets/[A-Za-z0-9._-]+\.(js|css)' | sort -u)
            (( ${#resources[@]} > 0 )) || continue
            local failed=0
            for resource in "${resources[@]}"; do curl --fail --silent --show-error --max-time 20 "$site_url$resource" -o /dev/null || failed=1; done
            (( failed == 0 )) && return 0
        fi
        sleep 2
    done
    return 1
}
switch_to "releases/$version"
if ! health "$version"; then
    echo "Health check failed for $version"
    if [[ "$previous" =~ ^releases/([a-f0-9]{40})$ ]]; then
        previous_version=${BASH_REMATCH[1]}
        switch_to "$previous"
        health "$previous_version" || { echo 'Rollback health check also failed'; exit 1; }
        echo "Rolled back to $previous_version"
    else
        # First release: no previous version exists. Remove only our own symlink.
        [[ $(readlink "$root/current") == "releases/$version" ]] && unlink "$root/current"
        echo 'First deployment failed; no previous version available'
    fi
    exit 1
fi
echo "Released $version"
# Keep the five most recent releases plus current and previous, if older.
mapfile -t versions < <(find "$root/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %f\n' | sort -nr | awk '{print $2}')
for old in "${versions[@]:5}"; do
    [[ "$old" =~ ^[a-f0-9]{40}$ ]] || continue
    [[ "$old" == "$version" || "releases/$old" == "$previous" ]] && continue
    rm -rf -- "$root/releases/$old"
done
