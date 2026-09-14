#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="rvk-setup"
VERSION="$(cd "${ROOT_DIR}" && node -p "require('./package.json').version")"
PACKAGE_NAME="${APP_NAME}_${VERSION}_all"
BUILD_DIR="${ROOT_DIR}/.deb-build/${PACKAGE_NAME}"
OUTPUT_DIR="${ROOT_DIR}/release"
ALIAS_OUTPUT="${OUTPUT_DIR}/RVK-Setup.deb"
DEBIAN_DIR="${BUILD_DIR}/DEBIAN"
PKG_ROOT="${BUILD_DIR}/opt/rvk"

rm -rf "${BUILD_DIR}" "${OUTPUT_DIR}"
mkdir -p "${DEBIAN_DIR}" "${PKG_ROOT}" "${BUILD_DIR}/usr/bin" "${BUILD_DIR}/usr/share/applications" "${OUTPUT_DIR}"

npm run build --prefix "${ROOT_DIR}"
npm ci --prefix "${ROOT_DIR}/backend" --omit=dev

cp -a "${ROOT_DIR}/dist" "${PKG_ROOT}/"
cp -a "${ROOT_DIR}/backend" "${PKG_ROOT}/"
cp -a "${ROOT_DIR}/README.md" "${PKG_ROOT}/README.md"
cp -a "${ROOT_DIR}/package.json" "${PKG_ROOT}/package.json"
cp -a "${ROOT_DIR}/package-lock.json" "${PKG_ROOT}/package-lock.json"

if [[ -f "${ROOT_DIR}/.env" ]]; then
  cp -a "${ROOT_DIR}/.env" "${PKG_ROOT}/.env"
fi

cat > "${DEBIAN_DIR}/control" <<EOF
Package: ${APP_NAME}
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: all
Depends: bash, nodejs, xdg-utils
Maintainer: RVK Software <local@localhost>
Description: RVK Billing System for Ubuntu
 Local billing and stock management app packaged for Ubuntu.
EOF

cat > "${BUILD_DIR}/usr/bin/rvk" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/rvk"
LOG_FILE="/tmp/rvk-server.log"
APP_URL="http://127.0.0.1:5000"

NODE_BIN="$(command -v node || command -v nodejs || true)"

if [[ -z "${NODE_BIN}" ]]; then
  echo "RVK requires Node.js to run." >"${LOG_FILE}"
  exit 1
fi

cd "${APP_DIR}"

if ! pgrep -f "${APP_DIR}/backend/server.js" >/dev/null 2>&1; then
  nohup "${NODE_BIN}" "${APP_DIR}/backend/server.js" >"${LOG_FILE}" 2>&1 &
fi

for _ in $(seq 1 30); do
  if exec 3<>/dev/tcp/127.0.0.1/5000; then
    exec 3>&-
    exec 3<&-
    break
  fi
  sleep 1
done

xdg-open "${APP_URL}" >/dev/null 2>&1 || true
EOF

cat > "${BUILD_DIR}/usr/share/applications/rvk.desktop" <<'EOF'
[Desktop Entry]
Type=Application
Name=RVK Billing System
Comment=Launch the RVK local billing app
Exec=rvk
Terminal=false
Categories=Office;Finance;
EOF

cat > "${DEBIAN_DIR}/prerm" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

pkill -f "/opt/rvk/backend/server.js" >/dev/null 2>&1 || true
EOF

chmod 0755 "${BUILD_DIR}/usr/bin/rvk" "${DEBIAN_DIR}/prerm"

dpkg-deb --build "${BUILD_DIR}" "${OUTPUT_DIR}/${PACKAGE_NAME}.deb"
cp -f "${OUTPUT_DIR}/${PACKAGE_NAME}.deb" "${ALIAS_OUTPUT}"

echo "Built ${OUTPUT_DIR}/${PACKAGE_NAME}.deb"
echo "Alias: ${ALIAS_OUTPUT}"