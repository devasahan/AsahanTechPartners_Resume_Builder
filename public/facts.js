/**
 * Facts bank: the only material the model may build bullets from. Mirrors the
 * content in js/data.js, tagged by employer. Add real facts here (for example
 * for Bottle Rocket) to give the builder more to work with; nothing outside
 * this file can appear in a generated bullet.
 */
export const FACTS = {
  lindy: [
    "Built a multi-agent RAG platform for clinical workflows that combines EHR context, knowledge graphs, and vector retrieval.",
    "Platform runs on GCP inference pipelines with on-prem/cloud routing, low-latency autoscaling, and HIPAA-compliant auditability.",
    "Retrieval combines BM25 keyword search, vector search, metadata filters, and a knowledge graph.",
    "Summarization and EHR-intent agents are orchestrated with LangGraph on the A2A protocol, with an MCP layer for tool authorization and encrypted context passing.",
    "Added LLM evals, drift checks, guardrails, and audit logging (Langfuse) to safeguard clinical output.",
    "Cut clinician documentation time by 30–40%.",
    "Used Vertex AI, Python, and FastAPI for AI services.",
  ],
  acquire: [
    "Built a due diligence assistant: when an offer is accepted, a background job redacts PII with Microsoft Presidio, then an LLM adapts an M&A advisor's checklist to the business type.",
    "Validated every LLM-generated task (structured output, LLM evals) before saving so no deal goes without a checklist.",
    "Ran background jobs with Celery on PostgreSQL.",
    "Built semantic matching between buyers and businesses for sale using OpenAI embeddings, pgvector similarity search, budget and business-type filters, and LLM-written match explanations.",
  ],
  orbital: [
    "Built Spring Batch ETL pipelines on Quartz schedules that consolidate student, attendance, and grading data into audit-ready PostgreSQL reporting models.",
    "Hardened pipelines with restartable steps, skip policies, and failure alerts using Java.",
    "Processed about 30,000 records nightly.",
    "Automated 120+ hours of manual reporting per month.",
    "Supported student records, grading, and reporting for 5,000+ students.",
  ],
  q2: [
    "Engineered TypeScript (Node.js) and Python microservices for authentication, accounts, investments, and transactions on a regulated digital banking platform.",
    "Built secure REST APIs on AWS, secured with OAuth 2.0, serving 500K+ users across web, iOS, and Android.",
    "Used RabbitMQ messaging to decouple transaction events; stored data in PostgreSQL and Redis.",
    "Diagnosed Celery and Redis bottlenecks with Flower and Redis SLOWLOG, routed long-running tasks to dedicated queues, tuned worker concurrency and prefetch, and added pipelining and connection pooling, which cleared task backlogs at peak load.",
  ],
  // No portfolio facts yet: add real ones here to get bullets for this employer.
  bottlerocket: [],
};

/** Skills Juan can claim; summary/skills output is limited to these. */
export const SKILLS = [
  "Python", "TypeScript", "JavaScript", "Java", "SQL", "FastAPI", "Node.js", "Express.js", "React",
  "PostgreSQL", "pgvector", "Redis", "BigQuery", "Feast", "ETL/ELT pipelines", "Spring Batch", "Celery", "RabbitMQ",
  "Google Cloud", "AWS", "Azure", "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "CI/CD",
  "OpenAI", "Claude", "Claude Code", "Gemini", "Vertex AI", "LangChain", "LangGraph", "Multi-agent systems", "A2A", "MCP",
  "Hybrid RAG", "Embeddings", "Vector search", "BM25", "Knowledge graphs", "LLM evals", "Langfuse", "Guardrails",
  "OAuth 2.0", "RBAC", "PII redaction (Presidio)", "HIPAA", "NIST AI RMF", "Audit logging",
];

/** Summary-level facts that are true overall. */
export const PROFILE = {
  years: "7+",
  headline: "Senior Software Engineer focused on backend systems and production AI",
  industries: ["healthcare", "FinTech", "EdTech", "online marketplaces"],
};
