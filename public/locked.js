/**
 * Locked resume content, exactly as in Juan's draft resume. The model never
 * supplies or changes any of these fields; the page renders them from here.
 * Employer ids match the keys used in facts.js.
 */
export const LOCKED = {
  name: "Juan Daniel Ramirez",
  contact: [
    "Texas, United States",
    "juandanielramirezjr1@gmail.com",
    "www.linkedin.com/in/juan-ramirez-127360365/",
  ],
  employers: [
    { id: "lindy", name: "Lindy", dates: "Feb 2025 – Present" },
    { id: "acquire", name: "Acquire.com", dates: "Jul 2024 – Feb 2025" },
    { id: "orbital", name: "Orbital Education", dates: "Jun 2021 – Jun 2024" },
    { id: "q2", name: "Q2 Holdings", dates: "May 2020 – May 2021" },
    { id: "bottlerocket", name: "Bottle Rocket", dates: "Mar 2019 – May 2020" },
  ],
  education: [{ name: "Fontbonne University", dates: "Aug 2016 – May 2020" }],
};
