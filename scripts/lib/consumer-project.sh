# Sourced by smoke-create.sh and build-eval-project.sh. Packs the tarball, runs
# the shipped `create`, repoints the app at the tarball, and installs. Sets
# TARBALL_PATH and PKG_DIR; the caller removes the tarball and the work folder.
make_consumer_project() {
  local repo_root="$1" work="$2" app_dir="$3"
  local pkg_name tarball_name
  pkg_name="$(node -p "require('$repo_root/package.json').name")"

  echo "→ npm pack…"
  tarball_name="$(cd "$repo_root" && npm pack --silent)"
  TARBALL_PATH="$repo_root/$tarball_name"

  echo "→ Extracting tarball…"
  tar -xzf "$TARBALL_PATH" -C "$work"
  PKG_DIR="$work/package"

  echo "→ Scaffolding via shipped bin…"
  node "$PKG_DIR/bin/cli.mjs" create "$app_dir"

  echo "→ Repointing dependency at the tarball…"
  node -e "
    const fs = require('fs');
    const p = '$app_dir/package.json';
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    j.dependencies['$pkg_name'] = 'file:$TARBALL_PATH';
    fs.writeFileSync(p, JSON.stringify(j, null, 2));
  "

  echo "→ Installing…"
  (cd "$app_dir" && npm install --silent --no-audit --no-fund --loglevel=error)
}
