export const SECTIONS = [
  { id: "overview", label: "Overview", icon: "overview" },
  {
    id: "learn", label: "Learn", icon: "learn",
    tabs: [
      { id: "domains", label: "Domains", count: (e) => e.domains.length },
      { id: "services", label: "Services", count: (e) => e.services.reduce((s, c) => s + c.services.length, 0) },
      { id: "confused", label: "Confused?", count: (e) => e.disambig.groups.length },
      { id: "sdk", label: "SDK", count: (e) => e.sdk?.groups.length, show: (e) => !!e.sdk },
      { id: "docs", label: "Docs", count: (e) => e.docs.length },
    ],
  },
  {
    id: "decide", label: "Decide", icon: "decide",
    tabs: [
      { id: "trees", label: "Decision trees", count: (e) => e.decisions.length },
      { id: "triggers", label: "Trigger phrases", count: (e) => e.triggers.length },
    ],
  },
  {
    id: "practice", label: "Practice", icon: "practice",
    tabs: [
      { id: "quiz", label: "Quiz", count: (e) => e.quiz.length },
      { id: "drills", label: "Drills", count: (e) => e.drills.length },
      { id: "cards", label: "Flashcards" },
    ],
  },
];

export const sectionById = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

export function defaultTab(sectionId) {
  return sectionById[sectionId]?.tabs?.[0]?.id;
}

// Tabs available for a given exam (some tabs only exist when the exam has that content).
export function tabsFor(sectionId, exam) {
  return (sectionById[sectionId]?.tabs || []).filter((t) => !t.show || t.show(exam));
}
