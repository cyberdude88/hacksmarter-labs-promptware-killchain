## qa-sweep — 2026-08-21T16:57:10+02:00
```
views: 129/129 render clean (10 mount-time, not statically checked); dead NAV routes: 0
  mount-time: xdr/hunting
  mount-time: siem/hunting/authentication
  mount-time: siem/hunting/network-session
  mount-time: siem/graph
  mount-time: siem/logs
  mount-time: cloud/workflow
  mount-time: governance/dlp
  mount-time: governance/audit
  mount-time: siem/hunting/dns
  mount-time: xdr/threat-explorer

carve-out scope check: isHelpDeskTechnicalContent still gates on exactly .wl-helpdesk + #content, #sidenav
neutral-check: 129/129 views checked (10 mount-time — only their static html field is checked, onMount-injected content is not; 0 skipped, no html)

helpdesk views' raw (pre-neutralization) blocked-term occurrences — what the live .wl-helpdesk carve-out is expected to preserve on purpose, informational only — 1 occurrence(s):
  #/helpdesk/group-policy: "Defender" — ...ge ok">Enabled</span></td><td>Firewall, Defender, lock screen, audit policy</td></tr><tr...

clean: no blocked term survives neutralizeTerminology() in any view.
```
- Result: **CLEAN**

## qa-sweep — 2026-08-21T17:01:13+02:00
```
views: 129/129 render clean (10 mount-time, not statically checked); dead NAV routes: 0
  mount-time: xdr/hunting
  mount-time: siem/hunting/authentication
  mount-time: siem/hunting/network-session
  mount-time: siem/graph
  mount-time: siem/logs
  mount-time: cloud/workflow
  mount-time: governance/dlp
  mount-time: governance/audit
  mount-time: siem/hunting/dns
  mount-time: xdr/threat-explorer

carve-out scope check: isHelpDeskTechnicalContent gates on .wl-helpdesk, all of #content, and only helpdesk-owned #sidenav rows (not the whole global rail)
neutral-check: 129/129 views checked (10 mount-time — only their static html field is checked, onMount-injected content is not; 0 skipped, no html)

helpdesk views' raw (pre-neutralization) blocked-term occurrences — what the live .wl-helpdesk carve-out is expected to preserve on purpose, informational only — 1 occurrence(s):
  #/helpdesk/group-policy: "Defender" — ...ge ok">Enabled</span></td><td>Firewall, Defender, lock screen, audit policy</td></tr><tr...

clean: no blocked term survives neutralizeTerminology() in any view.
```
- Result: **CLEAN**

## qa-sweep — 2026-08-21T17:22:44+02:00
```
views: 124/124 render clean (10 mount-time, not statically checked); dead NAV routes: 0
  mount-time: xdr/hunting
  mount-time: siem/hunting/authentication
  mount-time: siem/hunting/network-session
  mount-time: siem/graph
  mount-time: siem/logs
  mount-time: cloud/workflow
  mount-time: governance/dlp
  mount-time: governance/audit
  mount-time: siem/hunting/dns
  mount-time: xdr/threat-explorer

carve-out scope check: isHelpDeskTechnicalContent gates on .wl-helpdesk, all of #content, and only helpdesk-owned #sidenav rows (not the whole global rail)
neutral-check: 124/124 views checked (10 mount-time — only their static html field is checked, onMount-injected content is not; 0 skipped, no html)

helpdesk views' raw (pre-neutralization) blocked-term occurrences — what the live .wl-helpdesk carve-out is expected to preserve on purpose, informational only — 1 occurrence(s):
  #/helpdesk/group-policy: "Defender" — ...ge ok">Enabled</span></td><td>Firewall, Defender, lock screen, audit policy</td></tr><tr...

clean: no blocked term survives neutralizeTerminology() in any view.
```
- Result: **CLEAN**

