/**
 * Named technologies, products and languages. Used to stop a rewritten line
 * from claiming a tool the draft never mentions, and to stop AI-drafted lines
 * (written without any facts) from naming tools at all. General concepts such
 * as "APIs", "microservices", "RAG" or "CI/CD" are deliberately not listed.
 * Not specific to any one person.
 */
export const TECH_TERMS = [
  // Languages
  "Python", "Java", "JavaScript", "TypeScript", "Kotlin", "Swift", "Scala", "Ruby", "PHP", "Rust", "C++", "C#", "Golang", "SQL",
  "PL/SQL", "Bash", "PowerShell", "Objective-C", "Dart", "Elixir", "Perl", "MATLAB",
  // Web and application frameworks
  "React", "React Native", "Angular", "Vue", "Svelte", "Next.js", "Node.js", "Express.js", "NestJS", "Django", "Flask", "FastAPI",
  "Spring", "Spring Boot", "Spring Batch", ".NET", "ASP.NET", "Rails", "Laravel", "Redux", "jQuery", "Tailwind", "Flutter",
  "GraphQL", "gRPC", "WebSockets",
  // Data stores, messaging, pipelines
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "OpenSearch", "DynamoDB", "Cassandra", "SQLite", "Oracle", "SQL Server",
  "Snowflake", "BigQuery", "Redshift", "Databricks", "Kafka", "RabbitMQ", "Celery", "Airflow", "Spark", "Hadoop", "dbt", "Flink",
  "pgvector", "Pinecone", "Weaviate", "Neo4j", "Feast", "Quartz", "Flower",
  // Cloud and DevOps
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "GitLab CI",
  "CircleCI", "ArgoCD", "Helm", "Prometheus", "Grafana", "Datadog", "Splunk", "New Relic", "Sentry", "CloudFormation", "Lambda",
  "S3", "EC2", "Linux",
  // AI and machine learning
  "OpenAI", "Anthropic", "Claude", "Gemini", "ChatGPT", "LangChain", "LangGraph", "LlamaIndex", "Hugging Face", "PyTorch",
  "TensorFlow", "scikit-learn", "Pandas", "NumPy", "Vertex AI", "SageMaker", "Bedrock", "Langfuse", "MLflow", "spaCy",
  "XGBoost", "Presidio", "Whisper",
  // Tools and platforms
  "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence", "Figma", "Postman", "Swagger", "Selenium", "Cypress", "Playwright", "Jest",
  "JUnit", "Pytest", "Webpack", "Vite", "Storybook", "Chrome DevTools", "React Profiler", "Stripe", "Twilio", "Salesforce",
  "ServiceNow", "Tableau", "Power BI", "Looker", "Okta", "Auth0", "Keycloak", "OAuth", "OAuth 2.0", "OpenAPI",
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
// Words that are also ordinary English: match only with this exact capitalisation ("Spring Batch", not "spring semester").
const AMBIGUOUS = new Set(["Swift", "Spring", "Flower", "Whisper", "Looker", "Quartz", "Oracle", "Helm", "Dart", "Rails", "Rust", "Ruby", "Perl", "Lambda", "Vue"]);
const PATTERNS = TECH_TERMS.map((term) => [term, new RegExp(`(?<![\\w.])${escape(term)}(?![\\w])`, AMBIGUOUS.has(term) ? "" : "i")]);

/** The (lower-case) technologies mentioned in `text`. */
export function termsIn(text) {
  const found = new Set();
  for (const [term, pattern] of PATTERNS) if (pattern.test(text)) found.add(term.toLowerCase());
  return found;
}
