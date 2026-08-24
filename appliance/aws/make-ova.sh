#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="${SCRIPT_DIR}/build"
SRC_QCOW2="${BUILD_DIR}/test-disk.qcow2"
NAME="hacksmarter-soc"
STAGE="${BUILD_DIR}/ova-stage"
VMDK_NAME="${NAME}-disk1.vmdk"
VMDK="${STAGE}/${VMDK_NAME}"
OVF="${STAGE}/${NAME}.ovf"
MF="${STAGE}/${NAME}.mf"
OVA="${BUILD_DIR}/${OUT_NAME:-${NAME}}.ova"

if rg -n "ubuntu:(hacksmarter|changeme)|Login: ubuntu /" "${SCRIPT_DIR}" \
    --glob '!build/**' --glob '!make-ova.sh' >/dev/null; then
  echo "refusing to build: a known default appliance credential is present" >&2
  exit 1
fi

if [[ ! -f "${SRC_QCOW2}" ]]; then
  echo "missing ${SRC_QCOW2} — run ./test-local.sh first to install the SOC bundle" >&2
  exit 1
fi

mkdir -p "${STAGE}"

if [[ -f "${VMDK}" && "${FORCE_REBUILD:-0}" != "1" ]]; then
  echo "reusing existing ${VMDK_NAME} (set FORCE_REBUILD=1 to reconvert)"
else
  if pgrep -af qemu-system 2>/dev/null | grep -q "test-disk.qcow2"; then
    echo "qemu still running on test-disk.qcow2 — shut the VM down first (kill \$(cat ${BUILD_DIR}/qemu.pid))" >&2
    exit 1
  fi
  echo "converting qcow2 -> stream-optimized vmdk"
  qemu-img convert -p -O vmdk -o subformat=streamOptimized "${SRC_QCOW2}" "${VMDK}.tmp"
  mv "${VMDK}.tmp" "${VMDK}"
fi

DISK_BYTES=$(qemu-img info --output=json "${VMDK}" 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['virtual-size'])")
DISK_GIB=$(( DISK_BYTES / 1073741824 ))
VMDK_BYTES=$(stat -c%s "${VMDK}")
POPULATED_BYTES=$(qemu-img info --output=json "${VMDK}" 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin)['actual-size'])")

cat >"${OVF}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<Envelope xmlns="http://schemas.dmtf.org/ovf/envelope/1"
          xmlns:cim="http://schemas.dmtf.org/wbem/wscim/1/common"
          xmlns:ovf="http://schemas.dmtf.org/ovf/envelope/1"
          xmlns:rasd="http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_ResourceAllocationSettingData"
          xmlns:vmw="http://www.vmware.com/schema/ovf"
          xmlns:vssd="http://schemas.dmtf.org/wbem/wscim/1/cim-schema/2/CIM_VirtualSystemSettingData"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <References>
    <File ovf:href="${VMDK_NAME}" ovf:id="file1" ovf:size="${VMDK_BYTES}"/>
  </References>
  <DiskSection>
    <Info>List of the virtual disks used in the package</Info>
    <Disk ovf:capacity="${DISK_GIB}"
          ovf:capacityAllocationUnits="byte * 2^30"
          ovf:diskId="vmdisk1"
          ovf:fileRef="file1"
          ovf:format="http://www.vmware.com/interfaces/specifications/vmdk.html#streamOptimized"
          ovf:populatedSize="${POPULATED_BYTES}"/>
  </DiskSection>
  <NetworkSection>
    <Info>Logical networks used in the package</Info>
    <Network ovf:name="VM Network">
      <Description>The VM Network</Description>
    </Network>
  </NetworkSection>
  <VirtualSystem ovf:id="${NAME}">
    <Info>HackSmarter SOC trainer (Ubuntu 24.04 + nginx)</Info>
    <Name>${NAME}</Name>
    <OperatingSystemSection ovf:id="94" ovf:version="24.04" vmw:osType="ubuntu64Guest">
      <Info>The kind of installed guest operating system</Info>
      <Description>Ubuntu Linux (64-bit)</Description>
    </OperatingSystemSection>
    <VirtualHardwareSection>
      <Info>Virtual hardware requirements</Info>
      <System>
        <vssd:ElementName>Virtual Hardware Family</vssd:ElementName>
        <vssd:InstanceID>0</vssd:InstanceID>
        <vssd:VirtualSystemIdentifier>${NAME}</vssd:VirtualSystemIdentifier>
        <vssd:VirtualSystemType>vmx-09</vssd:VirtualSystemType>
      </System>
      <Item>
        <rasd:AllocationUnits>hertz * 10^6</rasd:AllocationUnits>
        <rasd:Caption>1 virtual CPU(s)</rasd:Caption>
        <rasd:Description>Number of Virtual CPUs</rasd:Description>
        <rasd:ElementName>1 virtual CPU(s)</rasd:ElementName>
        <rasd:InstanceID>1</rasd:InstanceID>
        <rasd:ResourceType>3</rasd:ResourceType>
        <rasd:VirtualQuantity>1</rasd:VirtualQuantity>
      </Item>
      <Item>
        <rasd:AllocationUnits>byte * 2^20</rasd:AllocationUnits>
        <rasd:Caption>1024 MB of memory</rasd:Caption>
        <rasd:Description>Memory Size</rasd:Description>
        <rasd:ElementName>1024 MB of memory</rasd:ElementName>
        <rasd:InstanceID>2</rasd:InstanceID>
        <rasd:ResourceType>4</rasd:ResourceType>
        <rasd:VirtualQuantity>1024</rasd:VirtualQuantity>
      </Item>
      <Item>
        <rasd:Address>0</rasd:Address>
        <rasd:Caption>scsiController0</rasd:Caption>
        <rasd:Description>SCSI Controller</rasd:Description>
        <rasd:ElementName>scsiController0</rasd:ElementName>
        <rasd:InstanceID>3</rasd:InstanceID>
        <rasd:ResourceSubType>lsilogic</rasd:ResourceSubType>
        <rasd:ResourceType>6</rasd:ResourceType>
      </Item>
      <Item>
        <rasd:AddressOnParent>0</rasd:AddressOnParent>
        <rasd:Caption>disk1</rasd:Caption>
        <rasd:Description>Disk Image</rasd:Description>
        <rasd:ElementName>disk1</rasd:ElementName>
        <rasd:HostResource>ovf:/disk/vmdisk1</rasd:HostResource>
        <rasd:InstanceID>4</rasd:InstanceID>
        <rasd:Parent>3</rasd:Parent>
        <rasd:ResourceType>17</rasd:ResourceType>
      </Item>
      <Item>
        <rasd:AddressOnParent>2</rasd:AddressOnParent>
        <rasd:AutomaticAllocation>true</rasd:AutomaticAllocation>
        <rasd:Caption>Ethernet adapter on "VM Network"</rasd:Caption>
        <rasd:Connection>VM Network</rasd:Connection>
        <rasd:Description>E1000 ethernet adapter</rasd:Description>
        <rasd:ElementName>Ethernet adapter on "VM Network"</rasd:ElementName>
        <rasd:InstanceID>5</rasd:InstanceID>
        <rasd:ResourceSubType>E1000</rasd:ResourceSubType>
        <rasd:ResourceType>10</rasd:ResourceType>
      </Item>
    </VirtualHardwareSection>
  </VirtualSystem>
</Envelope>
EOF

OVF_SHA1=$(sha1sum "${OVF}" | awk '{print $1}')
VMDK_SHA1=$(sha1sum "${VMDK}" | awk '{print $1}')
OVF_SHA256=$(sha256sum "${OVF}" | awk '{print $1}')
VMDK_SHA256=$(sha256sum "${VMDK}" | awk '{print $1}')
cat >"${MF}" <<EOF
SHA256(${NAME}.ovf)= ${OVF_SHA256}
SHA256(${VMDK_NAME})= ${VMDK_SHA256}
SHA1(${NAME}.ovf)= ${OVF_SHA1}
SHA1(${VMDK_NAME})= ${VMDK_SHA1}
EOF

echo "packing OVA"
tar -cf "${OVA}" -C "${STAGE}" --format=ustar "${NAME}.ovf" "${NAME}.mf" "${VMDK_NAME}"

echo
echo "wrote ${OVA}"
ls -lh "${OVA}" "${VMDK}"
echo
echo "OVA contents:"
tar -tvf "${OVA}"
