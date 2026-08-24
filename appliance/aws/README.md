# AWS AMI Path

Goal: install the SOC trainer on a stock Ubuntu 24.04 cloud image, test it locally in QEMU, then ship to AWS as an AMI.

Two ways to ship:

- **Path A (simplest, recommended):** install on a live EC2 instance, snapshot to AMI from the console.
- **Path B (offline artifact):** export the tested QEMU disk as an OVA, upload to S3, run `aws ec2 import-image` to convert to AMI.

## Files
- `install-soc.sh` — installs nginx, drops `dist/` into `/var/www/soc`, enables the SOC site.
- `nginx-soc.conf` — nginx site config (HTTP 80, SPA fallback, cache headers on `/assets/`).
- `build-bundle.sh` — packs `install-soc.sh` + `nginx-soc.conf` + `dist.tar.gz` into `build/soc-bundle.tar.gz`.
- `test-local.sh` — downloads Ubuntu 24.04 cloud image, boots in QEMU, runs the bundle, smoke-tests `/`.
- `make-ova.sh` — converts the tested QEMU disk to a stream-optimized VMDK and wraps it in `build/hacksmarter-soc.ova`.

The installer defaults to the production profile: SSH key authentication only,
no password login, and no tty autologin. The console demo profile is strictly
for an isolated training network and must be selected explicitly with a unique
password:

```bash
sudo SOC_DEMO_PROFILE=1 SOC_DEMO_PASSWORD='<unique-12+-character-secret>' ./install-soc.sh
```

Never distribute a demo-profile image to a bridged, shared, or cloud network.

## Local test

```bash
./build-bundle.sh
./test-local.sh
```

First run downloads the Ubuntu image (~600 MB). Then opens HTTP on `127.0.0.1:8080` and SSH on `127.0.0.1:2222`. The script SSHes in, runs the installer, and curls `/`, `/index.html`, and a scenario JSON to confirm. VM stays up after the smoke test.

Browse: `http://127.0.0.1:8080/`. Shut down with `kill $(cat build/qemu.pid)`.

## Path A — install on EC2, snapshot to AMI

```bash
# 1. Launch t3.micro (or larger) from a stock Ubuntu 24.04 AMI.
#    - Security group: allow your IP on 22 and 80.
#    - Attach a key pair you have.

# 2. Upload the bundle.
scp -i <key.pem> build/soc-bundle.tar.gz ubuntu@<instance-ip>:/tmp/

# 3. Install.
ssh -i <key.pem> ubuntu@<instance-ip> '
  set -e
  sudo mkdir -p /opt/soc-install
  sudo tar -xzf /tmp/soc-bundle.tar.gz -C /opt/soc-install
  sudo /opt/soc-install/install-soc.sh
'

# 4. Verify in a browser:  http://<instance-ip>/

# 5. Snapshot to AMI.
aws ec2 create-image --instance-id <id> --name hacksmarter-soc --no-reboot
```

## Path B — OVA → AMI via VM Import

After `./test-local.sh` has installed the bundle into `build/test-disk.qcow2`:

```bash
# 1. Shut down the test VM cleanly:
ssh -i build/id_test -p 2222 ubuntu@127.0.0.1 'sudo poweroff'

# 2. Build the OVA from the tested disk:
./make-ova.sh
# -> build/hacksmarter-soc.ova

# 3. Upload to S3:
aws s3 cp build/hacksmarter-soc.ova s3://<your-bucket>/

# 4. Import to AMI (requires the vmimport IAM role; see AWS docs):
aws ec2 import-image \
  --description "HackSmarter SOC trainer" \
  --disk-containers 'Format=ova,UserBucket={S3Bucket=<your-bucket>,S3Key=hacksmarter-soc.ova}'

# 5. Poll progress:
aws ec2 describe-import-image-tasks --import-task-ids <task-id>
# When Status=completed, the resulting AMI ID is in the output.
```

VM Import requires the `vmimport` IAM role to exist with access to your S3 bucket and EC2. See: https://docs.aws.amazon.com/vm-import/latest/userguide/required-permissions.html

## Notes
- HTTP only. For TLS, front the AMI with an ALB + ACM cert.
- SSH stays enabled — required for AWS to verify the AMI and for any debugging post-import.
- No firewall in the AMI. Use an EC2 security group.
- Ubuntu 24.04 was picked because it's on AWS's VM Import supported list, ships cloud-init, and has ENA/NVMe drivers in-kernel.
