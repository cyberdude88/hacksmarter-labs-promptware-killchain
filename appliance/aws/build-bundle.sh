#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
BUNDLE="${BUILD_DIR}/soc-bundle.tar.gz"

mkdir -p "${BUILD_DIR}"

if [[ ! -d "${REPO_ROOT}/dist" ]]; then
  echo "building dist/"
  (cd "${REPO_ROOT}" && npm run build)
fi

DIST_TARBALL="${BUILD_DIR}/dist.tar.gz"
tar -czf "${DIST_TARBALL}" -C "${REPO_ROOT}/dist" .

STAGE="$(mktemp -d)"
trap 'rm -rf "${STAGE}"' EXIT

cp "${SCRIPT_DIR}/install-soc.sh" "${STAGE}/"
cp "${SCRIPT_DIR}/nginx-soc.conf" "${STAGE}/"
cp "${DIST_TARBALL}" "${STAGE}/dist.tar.gz"
chmod +x "${STAGE}/install-soc.sh"

tar -czf "${BUNDLE}" -C "${STAGE}" .

echo "wrote ${BUNDLE}"
ls -lh "${BUNDLE}"
