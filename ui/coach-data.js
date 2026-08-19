// Module coach scripts — the hand-holding layer for students who have never
// opened a SIEM before.
//
// A coach is a slice of the existing simulator, not a separate app: `allow`
// lists the only routes reachable while it runs, and every step points at a
// real element in a real view. Nothing here duplicates a view; if a step needs
// a page that does not exist yet, build the page, not a coach copy of it.
//
// Step shape:
//   route       hash the step lives on; the coach navigates there if needed
//   title/body  what the student reads
//   target      CSS selector to spotlight (ALL matches are highlighted)
//   actionLabel button text shown before `do` has been run
//   do()        performs the step for the student (a demonstration, not a gate)
//   check()     true when the student has done it themselves; while false the
//               Next button offers `actionLabel` instead of advancing
//   continueLabel explicit label for a reading step's continue button
//   finish      { label, href } shown on the last step

const MODULE_COACHES = [
  {
    id: 'm01',
    module: 1,
    name: 'Your first SOC alert',
    role: 'Tier 1 SOC analyst',
    summary: 'Open the alert, find the evidence behind it in the sign-in log, then take your verdict back to the module.',
    completionToken: 'm01',
    home: '#/defender/alerts',
    resetState: () => {
      sessionStorage.removeItem('defender-lab.signin.user');
      sessionStorage.removeItem('defender-lab.signin.result');
      sessionStorage.removeItem('defender-lab.signin.logtype');
    },
    // The mini-environment. Two pages, nothing else reachable. Module 1 is the
    // student's first hour: pivoting across three consoles to collect four
    // facts is the capstone's shape, not a first lesson's. Every fact the
    // verdict depends on is readable in the sign-in log; the account owner's
    // denial is handed to the student in the module's own evidence panel, the
    // way a service-desk callback would reach a Tier 1 analyst.
    allow: ['#/defender/alerts', '#/entra/sign-in-logs'],
    steps: [
      {
        route: '#/defender/alerts',
        target: 'tr[data-alert-id="A1701"]',
        require: true,
        title: 'Start at the alert',
        instruction: 'Open the alert <strong>Successful sign-in after repeated failures</strong> on j.santos.',
        body: 'This is the alert queue — the analyst\'s inbox. Your case is <strong>Successful sign-in after repeated failures</strong> on <strong>j.santos@hacksmarterlabs.example</strong>. Open it. Everything else is dimmed because this lab is one case; in a real queue you would pick by severity, age, and asset.',
        waitLabel: 'I have opened the alert',
        nudge: 'Click the highlighted alert row to open it.',
        check: () => {
          const panel = document.getElementById('panel-alert');
          return Boolean(panel && !panel.classList.contains('hidden'));
        },
      },
      {
        route: '#/defender/alerts',
        // The pivot lives in the alert pane, not the left rail: the rail on this
        // page belongs to Defender, and the sign-in log is an identity surface.
        // Following evidence from an alert into the log that recorded it is the
        // move itself, so the student makes it.
        target: '#panel-alert [data-pivot="signin-logs"]',
        require: true,
        title: 'Read the claim, then go to the log',
        instruction: 'Read the alert pane, then choose <strong>Investigate sign-ins for this account</strong>.',
        body: 'The pane claims eight failures then a success, one source address, and an unmanaged browser. That is a lead, not proof the session was unauthorized. Note the Medium severity, then follow the highlighted pivot to the <strong>sign-in log</strong> that recorded the activity. In a SIEM the first question is always "which log would record this?"',
        waitLabel: 'I am in the sign-in log',
        nudge: 'Use the highlighted "Investigate sign-ins for this account" button in the alert pane.',
        check: () => location.hash === '#/entra/sign-in-logs',
      },
      {
        route: '#/entra/sign-in-logs',
        target: '#signin-user-filter',
        require: true,
        title: 'Narrow the log to one account',
        instruction: 'Set the <strong>User</strong> filter to j.santos@hacksmarterlabs.example.',
        // No `do` here on purpose: filtering a log is the one motion every SOC
        // analyst repeats all day, so the student performs it. The coach
        // spotlights the control and waits instead of doing it for them.
        body: 'The tenant log mixes every user together. Use the highlighted <strong>User</strong> filter and choose <strong>j.santos@hacksmarterlabs.example</strong>. A burst of failures is invisible in mixed traffic and obvious once you filter — so make the log show you one account.',
        waitLabel: 'I have set the filter',
        nudge: 'Not filtered yet — open the highlighted User dropdown and pick j.santos@hacksmarterlabs.example.',
        check: () => sessionStorage.getItem('defender-lab.signin.user') === 'j.santos@hacksmarterlabs.example',
      },
      {
        route: '#/entra/sign-in-logs',
        target: '.signin-row[data-signin-id="SL-019"]',
        require: true,
        waitLabel: 'Next: find the success',
        nudge: 'Read the failure rows, then click the highlighted 09:09:41 Success row.',
        check: () => {
          const title = document.getElementById('technique-title');
          const panel = document.getElementById('panel-technique');
          return Boolean(panel && !panel.classList.contains('hidden')
            && title && title.textContent.includes('SL-019'));
        },
        title: 'Read the pattern, then open the success',
        instruction: 'Read the eight Failure rows, then open the highlighted 09:09:41 <strong>Success</strong>.',
        body: 'The eight failures from 09:02–09:08 all came from 185.220.101.24. At 09:09:41 the same IP succeeded. That change—from blocked attempts to obtained access—is the critical fact. Open the highlighted success to inspect whether its context fits the account owner.',
      },
      {
        route: '#/entra/sign-in-logs',
        target: null,
        title: 'You have the facts',
        instruction: 'You have the evidence. Take it back to Module 1 and record your verdict.',
        body: 'Three facts, one log: access succeeded; Location is <strong>Bucharest, RO</strong>; Device info shows <strong>Managed: No</strong> and <strong>Join type: Not registered</strong>; and Basic info shows <strong>Sign-in risk: High</strong>. The fourth fact — the account owner reached by phone, denying the activity — is waiting for you in the module, the way a service-desk callback would reach you. Together that is a confirmed unauthorized access incident, not a suspicious-but-unproven alert. Go back to Module 1 and record your verdict, priority, and case note.',
        finish: { label: 'Back to Module 1' },
      },
    ],
  },
];
