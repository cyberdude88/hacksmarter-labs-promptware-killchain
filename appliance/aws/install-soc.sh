#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_TARBALL="${SOC_DIST_TARBALL:-${SCRIPT_DIR}/dist.tar.gz}"
WEB_ROOT="/var/www/soc"
SOC_DEMO_PROFILE="${SOC_DEMO_PROFILE:-0}"
SOC_DEMO_PASSWORD="${SOC_DEMO_PASSWORD:-}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

if [[ ! -f "${DIST_TARBALL}" ]]; then
  echo "missing ${DIST_TARBALL}" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends nginx ca-certificates

install -d -m 0755 "${WEB_ROOT}"
rm -rf "${WEB_ROOT:?}/"*
tar -xzf "${DIST_TARBALL}" -C "${WEB_ROOT}"
chown -R www-data:www-data "${WEB_ROOT}"
find "${WEB_ROOT}" -type d -exec chmod 0755 {} \;
find "${WEB_ROOT}" -type f -exec chmod 0644 {} \;

install -m 0644 "${SCRIPT_DIR}/nginx-soc.conf" /etc/nginx/sites-available/soc.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/soc.conf /etc/nginx/sites-enabled/soc.conf

nginx -t
systemctl enable nginx
systemctl restart nginx

install -d -m 0755 /etc/hacksmarter-soc

if [[ "${SOC_DEMO_PROFILE}" != "1" ]]; then
  # Cloud/production artifacts accept SSH keys only and never auto-login.
  printf '%s\n' 'production' >/etc/hacksmarter-soc/profile
  install -d -m 0755 /etc/ssh/sshd_config.d
  cat >/etc/ssh/sshd_config.d/60-hacksmarter-soc.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
  rm -f /etc/systemd/system/getty@tty1.service.d/autologin.conf
  systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || true
  systemctl daemon-reload || true
  echo "SOC appliance installed in production profile. Browse to http://<host>/"
  exit 0
fi

if [[ ${#SOC_DEMO_PASSWORD} -lt 12 ]]; then
  echo "SOC_DEMO_PASSWORD must be a unique value of at least 12 characters in demo mode" >&2
  exit 1
fi
printf '%s\n' 'LAB ONLY - ISOLATED NETWORK REQUIRED' >/etc/hacksmarter-soc/profile

# The explicitly selected demo profile auto-logs tty1 in to show the local URL.

# Auto-login on tty1.
install -d -m 0755 /etc/systemd/system/getty@tty1.service.d
cat >/etc/systemd/system/getty@tty1.service.d/autologin.conf <<'EOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin ubuntu --noclear %I $TERM
EOF

# Welcome script: clears the screen, prints the URL big, holds the tty.
install -m 0755 /dev/stdin /usr/local/bin/soc-welcome <<'EOF'
#!/usr/bin/env bash
while true; do
  IP=$(hostname -I | awk '{print $1}')
  [[ -z "${IP}" ]] && IP="(waiting for DHCP...)"
  clear
  cat <<BANNER

  ====================================================

       H A C K S M A R T E R   S O C   T R A I N E R

       LAB ONLY - ISOLATED NETWORK REQUIRED

  ====================================================

       Open this URL in a browser on your host:

           http://${IP}/

  ====================================================

       (Press Ctrl-Alt-F2 for a shell. Login: ubuntu)

BANNER
  sleep 30
done
EOF

# Trigger it from the auto-logged-in shell.
if id ubuntu >/dev/null 2>&1; then
  printf 'ubuntu:%s\n' "${SOC_DEMO_PASSWORD}" | chpasswd
  if ! grep -q 'soc-welcome' /home/ubuntu/.bash_profile 2>/dev/null; then
    cat >>/home/ubuntu/.bash_profile <<'EOF'

# Auto-launch SOC welcome on tty1 only (leaves SSH / other ttys alone).
if [[ "$(tty)" == "/dev/tty1" ]]; then
  exec /usr/local/bin/soc-welcome
fi
EOF
    chown ubuntu:ubuntu /home/ubuntu/.bash_profile
  fi
fi

systemctl daemon-reload || true

echo "SOC appliance installed in LAB-ONLY demo profile. Browse to http://<host>/"
