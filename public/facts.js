/**
 * Facts bank: the only material the model may build bullets from. Taken from
 * Juan's own résumé and portfolio, tagged by employer. Add real facts here to
 * give the builder more to work with; nothing outside this file can appear in
 * a generated bullet.
 */
export const FACTS = {
  lindy: [
    "Led architecture and production deployment of a multi-agent hybrid RAG platform for clinical workflows that combines EHR context, knowledge graphs, and vector retrieval.",
    "Platform runs on GCP inference pipelines with on-prem/cloud routing, low-latency autoscaling, and HIPAA-compliant auditability.",
    "Cut clinician documentation time by 30–40%.",
    "Built a hybrid retrieval layer combining BM25 keyword search, dense vector retrieval, metadata filtering, and graph-linked records, improving answer relevance and reducing hallucinations.",
    "Designed agent orchestration in LangChain and LangGraph on the A2A protocol, with an MCP layer for state handoffs, tool authorization, and encrypted context passing between summarization and EHR-intent agents.",
    "Established an agent evaluation framework with A/B tests, model evals, drift detection, and automated rollback triggers to support safe continuous deployment, plus guardrails and audit logging.",
    "Technologies used: LangGraph, A2A, MCP, Vertex AI, BigQuery.",
  ],
  acquire: [
    "Shipped AI-generated, listing-specific conversation starters: 3–5 questions that help buyers open conversations with sellers, with guardrails, per-listing Redis caching to cut inference costs, Langfuse prompt tracing, and an A/B test on replies.",
    "Built an AI due diligence task manager: when an offer is accepted, a background job redacts PII with Microsoft Presidio, then an LLM adapts an M&A advisor's checklist to the business type.",
    "Validated every LLM-generated task (structured output, LLM evals) before saving so no deal goes without a checklist.",
    "Designed semantic buyer–listing matching using OpenAI embeddings, PostgreSQL pgvector similarity search, budget and business-type filters, and LLM-written match explanations.",
    "Provisioned the infrastructure for all three AI features with Terraform.",
    "Technologies used: FastAPI, OpenAI, Celery, PostgreSQL, pgvector, Redis, Terraform.",
  ],
  orbital: [
    "Built an LLM chatbot that answers school staff questions about attendance, grades, and records for 5,000+ students, using OpenAI function calling against the reporting database with role-based access control (RBAC).",
    "Developed rubric-based LLM grading of short-answer and essay responses with structured feedback that teachers review and approve before any grade is recorded (human-in-the-loop).",
    "Engineered OCR and LLM document extraction, and Spring Batch ETL pipelines on Quartz schedules that consolidate student, attendance, and grading data into audit-ready PostgreSQL reporting models.",
    "Pipelines process about 30,000 records nightly, with restartable steps, skip policies, and failure alerts, eliminating 120+ hours of manual reporting each month.",
    "Led a team of three engineers across technical planning, mentoring, code reviews, and production delivery.",
    "Technologies used: OpenAI, Java, Spring Batch, PostgreSQL.",
  ],
  q2: [
    "Engineered TypeScript (Node.js) and Python microservices for authentication, accounts, investments, and transactions on a regulated digital banking platform serving 500,000+ users across web, iOS, and Android.",
    "Developed secure REST APIs on AWS with OAuth 2.0, PostgreSQL, and Redis, and used RabbitMQ messaging to decouple transaction events.",
    "Cleared task backlogs at peak load by diagnosing Celery and Redis bottlenecks with Flower and Redis SLOWLOG, routing long-running tasks to dedicated queues, tuning worker concurrency and prefetch, and adding pipelining and connection pooling.",
    "Helped build CI/CD pipelines with Jenkins and automated testing standards adopted by more than 15 internal teams.",
    "Technologies used: TypeScript, Node.js, Python, AWS, RabbitMQ, Jenkins.",
  ],
  bottlerocket: [
    "Maintained and modernized client web apps in React and Node.js, improving stability, performance, and maintainability.",
    "Built REST APIs with Express.js to power React front ends and integrate third-party services.",
    "Fixed memory leaks, blocked event loops, slow API responses, and unnecessary re-renders using Chrome DevTools, the React Profiler, and the Node.js inspector.",
    "Technologies used: React, Node.js, Express.js, AWS.",
  ],
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

/**
 * Summary-level facts that are true overall. There is deliberately no fixed
 * job title here: the summary opens with the target job's own title.
 */
export const PROFILE = {
  years: "7+",
  strengths: [
    "production LLM systems (RAG, agents, evals, guardrails)",
    "backend APIs and microservices",
    "data pipelines",
    "secure systems for regulated industries",
  ],
  industries: ["healthcare", "FinTech", "EdTech", "online marketplaces"],
};
