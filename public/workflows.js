/**
 * Career workflows: one per role type. The analyzer picks the best fit and the
 * user can override it; each one steers emphasis (what to lead with) without
 * ever adding facts that aren't in the uploaded draft.
 */
export const WORKFLOWS = {
  "ai-llm": {
    label: "AI / LLM engineer",
    emphasis:
      "Lead with production LLM systems where the draft shows them: RAG, agents, evaluation, guardrails, LLMOps. Put the most relevant experience first and keep supporting backend work as evidence of production rigor.",
  },
  "backend-platform": {
    label: "Backend / platform engineer",
    emphasis:
      "Lead with APIs, microservices, messaging, scale, reliability, performance tuning, cloud and CI/CD, wherever the draft shows them.",
  },
  "data-engineering": {
    label: "Data engineer",
    emphasis:
      "Lead with ETL/ELT pipelines, scheduling, data quality, reporting models and automation, wherever the draft shows them.",
  },
  "full-stack": {
    label: "Full-stack engineer",
    emphasis:
      "Lead with end-to-end delivery: front ends, APIs and the user-facing scale of the work. Be honest about which side the draft shows more of.",
  },
  "regulated-domain": {
    label: "Healthcare / FinTech / regulated systems",
    emphasis:
      "Lead with security and compliance: regulated platforms, access control, audit logging, privacy, wherever the draft shows them.",
  },
};

export const ROLE_TYPES = Object.keys(WORKFLOWS);
