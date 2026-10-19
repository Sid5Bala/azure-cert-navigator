# Exam content schema

Each exam lives in its own module (`az104.js`, `az305.js`, `ai103.js`) and default-exports one plain object.
The UI is fully data-driven: add rows here and they show up in Learn, Decide, Practice, Search and Flashcards.

Run `npm run validate` after any edit. It checks shape, ids, cross-references and quiz answers.

```js
export default {
  id: "az104",                 // url-safe, unique
  code: "AZ-104",
  name: "Microsoft Azure Administrator",
  level: "Associate",          // Associate | Expert
  color: "#0EA5E9",            // exam accent
  skillsDate: "April 17, 2026",// "Skills measured as of" date on Microsoft Learn
  tagline: "One-line positioning of the exam",
  studyGuide: "https://learn.microsoft.com/...",   // official study guide URL

  // Official "skills measured" outline. ids MUST match domains[].id.
  blueprint: [
    { id: "identity", title: "Manage Azure identities and governance", weight: "20–25%",
      areas: [ { title: "Manage Microsoft Entra users and groups", bullets: ["Create users and groups", "..."] } ] },
  ],

  // Deep-dive study content per domain.
  domains: [
    { id: "identity", title: "Identity & Governance", short: "Identity", icon: "🔐",
      weight: "20–25%", color: "#4F46E5", desc: "One sentence.",
      terms:   [ { t: "Term", d: "Definition / exam angle" } ],
      tables:  [ { title: "Table title", h: ["Col A", "Col B"], r: [ ["a", "b"] ] } ],   // every row has h.length cells
      gotchas: [ "Exam trap written as a single sentence." ] },
  ],

  // "Same word, different thing" disambiguation.
  disambig: { desc: "Intro sentence",
    groups: [ { label: "Vault", items: [ { t: "Name", d: "What it is", r: "Pick when / rule" } ], tip: "One-line rule of thumb" } ] },

  // Service navigator cards.
  services: [ { category: "Identity + Governance", color: "#4F46E5",
    services: [ { name: "Azure Policy", use: "What it is", choose: "Choose when ...", not: "Do not confuse with ...", cues: ["deny", "audit"] } ] } ],

  // Decision trees. Lines use ├── │ └── prefixes (4 chars per depth level). "→" marks an answer.
  decisions: [ { title: "Load Balancing", color: "#3B82F6",
    tree: [ "Need to load balance?", "├── GLOBAL", "│   └── HTTP only? → Front Door" ],
    combos: [ "Real-world combination ..." ], antipatterns: [ "Don't ..." ] } ],

  // Exam wording → answer.
  triggers: [ { phrase: "minimize admin effort", a: "Managed PaaS service" } ],

  // Scenario drills (say the answer, then reveal). why = 2-3 trap eliminations ("Why not X: ...").
  drills: [ { domain: "identity", s: "Scenario text", a: "Model answer", why: ["Why not X: ...", "Why not Y: ..."] } ],

  // Multiple-choice practice. answer = index into options. Exactly one correct answer.
  quiz: [ { domain: "identity", q: "Question?", options: ["A", "B", "C", "D"], answer: 2, explain: "Why C is right and the others are wrong." } ],

  // Open-book / Microsoft Learn quick links.
  docs: [ { n: "RBAC built-in roles", p: "Search phrase to type on Learn", url: "https://learn.microsoft.com/..." } ],
};
```

Conventions

- Keep strings plain text (no HTML/Markdown). Use `→` for "leads to".
- Gotchas and drills are written for exam recall: short, specific, one idea each.
- Mark preview features as "(preview)" and retired/renamed products explicitly (e.g. "Azure AD → Microsoft Entra ID").
