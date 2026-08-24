#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
BASE_IMG="${BUILD_DIR}/ubuntu-24.04-base.img"
DISK="${BUILD_DIR}/test-disk.qcow2"
SEED="${BUILD_DIR}/seed.iso"
USER_DATA="${BUILD_DIR}/user-data"
META_DATA="${BUILD_DIR}/meta-data"
SSH_KEY="${BUILD_DIR}/id_test"
BUNDLE="${BUILD_DIR}/soc-bundle.tar.gz"

UBUNTU_URL="https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img"

mkdir -p "${BUILD_DIR}"

if [[ ! -f "${BUNDLE}" ]]; then
  "${SCRIPT_DIR}/build-bundle.sh"
fi

if [[ ! -f "${BASE_IMG}" ]]; then
  echo "downloading Ubuntu 24.04 cloud image"
  curl -fL --retry 3 -o "${BASE_IMG}.part" "${UBUNTU_URL}"
  mv "${BASE_IMG}.part" "${BASE_IMG}"
fi

if [[ ! -f "${SSH_KEY}" ]]; then
  ssh-keygen -t ed25519 -N "" -f "${SSH_KEY}" -C "soc-test"
fi

cp -f "${BASE_IMG}" "${DISK}"
qemu-img resize "${DISK}" 8G >/dev/null

cat >"${USER_DATA}" <<EOF
#cloud-config
hostname: soc-test
ssh_pwauth: false
users:
  - name: ubuntu
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - $(cat "${SSH_KEY}.pub")
EOF
echo -e "instance-id: soc-test\nlocal-hostname: soc-test" >"${META_DATA}"
cloud-localds "${SEED}" "${USER_DATA}" "${META_DATA}"

SSH_PORT=2222
HTTP_PORT=8080
echo "booting QEMU (ssh -> 127.0.0.1:${SSH_PORT}, http -> 127.0.0.1:${HTTP_PORT})"

qemu-system-x86_64 \
  -name soc-test \
  -machine accel=kvm:tcg -cpu host -smp 2 -m 1024 \
  -drive file="${DISK}",if=virtio,format=qcow2 \
  -drive file="${SEED}",if=virtio,format=raw,readonly=on \
  -device virtio-net-pci,netdev=n0 \
  -netdev user,id=n0,hostfwd=tcp::${SSH_PORT}-:22,hostfwd=tcp::${HTTP_PORT}-:80 \
  -nographic -serial mon:stdio \
  -pidfile "${BUILD_DIR}/qemu.pid" &

QEMU_PID=$!
trap 'kill ${QEMU_PID} 2>/dev/null || true' EXIT

echo "waiting for ssh on 127.0.0.1:${SSH_PORT}"
for i in $(seq 1 90); do
  if ssh -i "${SSH_KEY}" -p ${SSH_PORT} \
       -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
       -o ConnectTimeout=2 -o BatchMode=yes \
       ubuntu@127.0.0.1 true 2>/dev/null; then
    echo "ssh up after ${i}s"
    break
  fi
  sleep 2
  if [[ $i -eq 90 ]]; then
    echo "ssh never came up" >&2
    exit 1
  fi
done

SSH="ssh -i ${SSH_KEY} -p ${SSH_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null ubuntu@127.0.0.1"
SCP="scp -i ${SSH_KEY} -P ${SSH_PORT} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

echo "uploading bundle"
${SCP} "${BUNDLE}" ubuntu@127.0.0.1:/tmp/soc-bundle.tar.gz

echo "running install-soc.sh"
${SSH} 'set -e; sudo mkdir -p /opt/soc-install && sudo tar -xzf /tmp/soc-bundle.tar.gz -C /opt/soc-install && sudo /opt/soc-install/install-soc.sh'

echo
echo "smoke test:"
sleep 1
curl -sS -o /dev/null -w "  GET /              -> %{http_code}\n" http://127.0.0.1:${HTTP_PORT}/
curl -sS -o /dev/null -w "  GET /index.html    -> %{http_code}\n" http://127.0.0.1:${HTTP_PORT}/index.html
curl -sS -o /dev/null -w "  GET /scenarios/... -> %{http_code}\n" http://127.0.0.1:${HTTP_PORT}/scenarios/fortigate_ai_attack.json
TITLE=$(curl -sS http://127.0.0.1:${HTTP_PORT}/ | grep -oE '<title>[^<]+</title>' || echo "(no title)")
echo "  title: ${TITLE}"

echo
echo "VM still running. Browse to http://127.0.0.1:${HTTP_PORT}/"
echo "ssh in:  ssh -i ${SSH_KEY} -p ${SSH_PORT} ubuntu@127.0.0.1"
echo "shut down with: kill ${QEMU_PID}  (or Ctrl-C this script)"
trap - EXIT
wait ${QEMU_PID}
