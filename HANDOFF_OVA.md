# HackSmarter SOC — OVA/AMI Handoff

Snapshot for the next agent. As of 2026-05-04.

## Goal
Ship the static React SOC trainer as an AWS AMI. Client wants OVA → AWS VM Import → AMI as the primary path so the artifact is portable and testable in VMware Player before upload. Student-facing UX is a browser URL.

## Repo layout (the parts that matter)
```
/home/alex/hacksmarterSOC/
├── dist/                              # vite build output (1.2 MB static)
├── src/, public/, package.json, ...   # the React app
├── HANDOFF.md                         # original app handoff (React app design)
├── HANDOFF_OVA.md                     # this file
└── appliance/aws/
    ├── install-soc.sh                 # in-guest installer (nginx + dist + autologin + welcome banner)
    ├── nginx-soc.conf                 # listen 80, SPA fallback
    ├── build-bundle.sh                # produces build/soc-bundle.tar.gz
    ├── test-local.sh                  # boots Ubuntu 24.04 cloud image in QEMU, runs install, smoke-tests
    ├── make-ova.sh                    # qcow2 → stream-optimized vmdk → OVA
    ├── README.md                      # user-facing usage + AWS deploy steps
    └── build/                         # gitignored. test-disk.qcow2, ova-stage/, OVAs
```

## What's verified working
End-to-end QEMU test passes:
- `./build-bundle.sh && ./test-local.sh` boots Ubuntu 24.04, installs, returns HTTP 200 on `/`, `/index.html`, `/assets/*`, `/scenarios/*`, SPA fallback.
- `systemctl --failed` empty, nginx active.
- Console (tty1) **auto-logs in as ubuntu** and runs `/usr/local/bin/soc-welcome` which displays a full-screen banner: `Open this URL in a browser on your host: http://<vm-ip>/`. Reads VM IP via `hostname -I`.
- Same VMDK extracted from the OVA boots in QEMU and serves the app correctly.

## What's blocked
**VMware Workstation/Player import fails:**
> Error importing OVF: SHA digest of file hacksmarter-soc-disk1.vmdk does not match manifest

The OVA is internally consistent every time it's built. Verified by extracting and recomputing:
```bash
cd /tmp && rm -rf v && mkdir v && cd v
tar -xf /home/alex/hacksmarterSOC/appliance/aws/build/hacksmarter-soc-v2.ova
cat hacksmarter-soc.mf                              # SHA256 + SHA1 lines for ovf and vmdk
sha256sum hacksmarter-soc.ovf hacksmarter-soc-disk1.vmdk  # matches
sha1sum   hacksmarter-soc.ovf hacksmarter-soc-disk1.vmdk  # matches
```

## What was tried (none fixed the VMware error)
1. Initial OVA with SHA256 manifest, minimal OVF → VMware: "OVF specification conformance" error.
2. Rewrote OVF with strict OVF 1.0 schema: all CIM fields (vssd, rasd Captions), `ovf:populatedSize`, `ovf:capacityAllocationUnits`, vmx-09 hardware, lsilogic SCSI, E1000 NIC, `<rasd:Caption>` on every Item. → "OVF specification" error went away. Now: SHA mismatch.
3. Switched manifest from SHA256 → SHA1 (per OVF 1.0 spec). → SHA mismatch.
4. Added BOTH SHA256 and SHA1 lines to manifest. → SHA mismatch.
5. Renamed output to `hacksmarter-soc-v2.ova` to defeat any VMware import-cache. → SHA mismatch.
6. USTAR tar format (OVA-spec-required), file order ovf → mf → vmdk. → SHA mismatch.

## Current artifacts
- `appliance/aws/build/hacksmarter-soc-v2.ova` — 802 MB, latest build. Internally consistent.
- `appliance/aws/build/ova-stage/` — extracted form: `hacksmarter-soc.ovf`, `hacksmarter-soc.mf`, `hacksmarter-soc-disk1.vmdk` (stream-optimized). Same content as inside the OVA.
- `appliance/aws/build/test-disk.qcow2` — the source qcow2 that QEMU tested against.

## New data point (2026-05-04, after handoff first written)
**Direct `.ovf` import from the extracted `ova-stage/` directory also fails with the same SHA digest mismatch error.** Tar layout is therefore *not* the cause. The bug is in the OVF/manifest content or in how VMware Player parses it. Possibilities still open:
- VMware computing SHA over decompressed VMDK content rather than file bytes (VMware bug per spec)
- Multi-algorithm manifest parsing quirk
- An OVF schema attribute VMware silently dislikes (e.g. multi-algorithm manifest, dual `xmlns` declaration on Envelope)

## Try next (priority order, updated)

### 1. Use VirtualBox to produce the OVA (most likely OVA-route fix)
```bash
sudo apt install -y virtualbox
# Convert qcow2 → vdi:
qemu-img convert -O vdi appliance/aws/build/test-disk.qcow2 /tmp/soc.vdi
# Create VM, attach, export:
vboxmanage createvm --name hacksmarter-soc --ostype Ubuntu_64 --register
vboxmanage modifyvm hacksmarter-soc --memory 1024 --cpus 1 --nic1 nat
vboxmanage storagectl hacksmarter-soc --name SCSI --add scsi --controller LsiLogic
vboxmanage storageattach hacksmarter-soc --storagectl SCSI --port 0 --type hdd --medium /tmp/soc.vdi
vboxmanage export hacksmarter-soc -o appliance/aws/build/hacksmarter-soc-vbox.ova
```
VirtualBox-produced OVAs import into VMware Workstation reliably in production.

### 2. Use VirtualBox to produce the OVA
```bash
sudo apt install -y virtualbox virtualbox-ext-pack
vboxmanage createvm --name hacksmarter-soc --ostype Ubuntu_64 --register
# import the qcow2 as VDI, attach, then:
vboxmanage export hacksmarter-soc -o /tmp/hacksmarter-soc-vbox.ova \
  --product "HackSmarter SOC" --vsys 0
```
VirtualBox-produced OVAs import into VMware Workstation reliably in production.

### 3. Use VMware ovftool (their official packager)
Free download from `https://developer.vmware.com/web/tool/ovf-tool` (requires VMware account).
```bash
ovftool source.vmx /tmp/hacksmarter-soc-ovftool.ova
```
If user provides credentials/installer, this is the most reliable path.

### 4. Skip OVA, ship VMDK to S3 directly
AWS VM Import accepts raw VMDK upload, no OVA wrapper:
```bash
aws s3 cp build/ova-stage/hacksmarter-soc-disk1.vmdk s3://<bucket>/
aws ec2 import-image \
  --description "HackSmarter SOC" \
  --disk-containers 'Format=VMDK,UserBucket={S3Bucket=<bucket>,S3Key=hacksmarter-soc-disk1.vmdk}'
```
Sidesteps OVF/manifest entirely. Loses local VMware testability.

### 5. Skip OVA + VMDK, install on EC2 + snapshot
Simplest direct path to AMI. See `appliance/aws/README.md` "Path A".

## Test loop
```bash
cd /home/alex/hacksmarterSOC/appliance/aws

# Full rebuild (slow, ~5 min):
rm -rf build/test-disk.qcow2 build/ova-stage build/*.ova
./build-bundle.sh && ./test-local.sh
# (test-local.sh leaves QEMU running on http://127.0.0.1:8080/, ssh :2222)

# After installing, shut down the VM:
ssh -i build/id_test -p 2222 ubuntu@127.0.0.1 'sudo poweroff'

# Then build OVA:
./make-ova.sh                              # writes build/hacksmarter-soc.ova
OUT_NAME=hacksmarter-soc-v3 ./make-ova.sh  # custom name

# Boot the OVA's VMDK in QEMU GUI to verify before shipping:
cd build
qemu-img create -f qcow2 -F vmdk -b "$(pwd)/ova-stage/hacksmarter-soc-disk1.vmdk" overlay.qcow2
DISPLAY=:1 qemu-system-x86_64 \
  -machine accel=kvm -cpu host -smp 2 -m 1024 \
  -drive file=overlay.qcow2,format=qcow2,if=virtio \
  -device virtio-net-pci,netdev=n0 \
  -netdev user,id=n0,hostfwd=tcp::8081-:80,hostfwd=tcp::2223-:22 \
  -display gtk
# Browser test: http://127.0.0.1:8081/
# SSH: ssh -i id_test -p 2223 ubuntu@127.0.0.1
```

## Environment notes
- Ubuntu 24.04 host with KVM + QEMU 8.2. `/dev/kvm` accessible to user via ACL.
- No VirtualBox installed. No ovftool installed. No xmllint installed.
- Passwordless sudo.
- 200+ GB free disk.
- Display `:1` (X11). GTK display works for QEMU.

## User preferences (carried forward)
- Terse responses, no trailing summaries (see memory `feedback_style.md`).
- Hates over-engineering; called out the original codex Packer/preseed appliance build as way too much for a static React app.
- Default ship path is whatever's simplest that meets the requirement. Sealed-appliance hardening is *not* a requirement — this is training content.
- HTTP only inside the AMI; TLS belongs on an ALB if needed.

## Console credentials
- `ubuntu` / `hacksmarter` (set by install-soc.sh, lets you Ctrl-Alt-F2 to a shell on the VMware/QEMU console if needed)
- SSH from host (during local test only): `ssh -i appliance/aws/build/id_test -p 2222 ubuntu@127.0.0.1`
