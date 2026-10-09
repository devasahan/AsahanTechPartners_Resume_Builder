/**
 * Locked resume content, exactly as in Juan's draft resume. The model never
 * supplies or changes the company names, dates or education; the page renders
 * them from here. Employer ids match the keys used in facts.js.
 *
 * `recordTitle` is the job title on his original résumé. It is the reference
 * for the per-job titles the builder suggests (same level, never higher), and
 * the fallback when a suggestion breaks the rules.
 */
export const LOCKED = {
  name: "Juan Daniel Ramirez",
  contact: [
    "Texas, United States",
    "juandanielramirezjr1@gmail.com",
    "www.linkedin.com/in/juan-ramirez-127360365/",
  ],
  employers: [
    { id: "lindy", name: "Lindy", dates: "Feb 2025 – Present", recordTitle: "Applied AI Engineer" },
    { id: "acquire", name: "Acquire.com", dates: "Jul 2024 – Feb 2025", recordTitle: "AI Engineer" },
    { id: "orbital", name: "Orbital Education", dates: "Jun 2021 – Jun 2024", recordTitle: "AI Engineer" },
    { id: "q2", name: "Q2 Holdings", dates: "May 2020 – May 2021", recordTitle: "Software Engineer" },
    { id: "bottlerocket", name: "Bottle Rocket", dates: "Mar 2019 – May 2020", recordTitle: "Software Engineer (Part-Time)" },
  ],
  education: [{ name: "Fontbonne University", dates: "Aug 2016 – May 2020" }],
};
