/**
 * Career workflows: one per role type. The analyzer picks the best fit; each
 * workflow steers emphasis (what to lead with, what to prefer in bullets).
 */
export const WORKFLOWS = {
  "ai-llm": {
    label: "AI / LLM engineer",
    emphasis:
      "Lead with production LLM systems: RAG, agents, evals, guardrails, LLMOps. Prefer Lindy and Acquire.com facts; use backend facts as supporting evidence of production rigor.",
    skillFocus: ["AI & LLMs", "Retrieval & LLMOps", "Languages & frameworks"],
  },
  "backend-platform": {
    label: "Backend / platform engineer",
    emphasis:
      "Lead with APIs, microservices, messaging, scale, reliability, performance tuning, cloud and CI/CD. Prefer Q2 Holdings and Orbital facts.",
    skillFocus: ["Languages & frameworks", "Databases & messaging", "Cloud & DevOps"],
  },
  "data-engineering": {
    label: "Data engineer",
    emphasis:
      "Lead with ETL/ELT pipelines, scheduling, data quality, reporting models, and automation. Prefer Orbital Education facts, then pipeline-related Lindy and Q2 facts.",
    skillFocus: ["Databases & messaging", "Languages & frameworks", "Cloud & DevOps"],
  },
  "full-stack": {
    label: "Full-stack engineer",
    emphasis:
      "Lead with end-to-end delivery: React/TypeScript front ends, Node/Python APIs, and the user-facing scale of the banking platform. Be honest that backend is the stronger side.",
    skillFocus: ["Languages & frameworks", "Databases & messaging", "Cloud & DevOps"],
  },
  "regulated-domain": {
    label: "Healthcare / FinTech / regulated systems",
    emphasis:
      "Lead with security and compliance: HIPAA, OAuth 2.0, audit logging, PII redaction, regulated platforms. Prefer Lindy and Q2 Holdings facts.",
    skillFocus: ["Security & compliance", "Languages & frameworks", "AI & LLMs"],
  },
};

export const ROLE_TYPES = Object.keys(WORKFLOWS);
