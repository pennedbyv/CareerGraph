CAREERGRAPH — AGENT HANDOFF / BUILD PLAN

PROJECT
CareerGraph: A persistent AI career-memory agent for the Neo4j hackathon.

CORE PITCH
An AI career agent that builds a persistent graph of a user's goals, skills,
projects, preferences, and decisions, then uses the relationships between them
to provide increasingly contextual career guidance.

==================================================
HACKATHON REQUIREMENTS
==================================================

1. AI Agent
The user interacts with an AI agent that performs career guidance.

2. Persistent Memory
Relevant information must survive beyond a single interaction.

3. Neo4j Integration
Neo4j must meaningfully represent, store, connect and retrieve information.

4. Contextual Retrieval
The agent retrieves relevant previous memories and connected entities.

5. Memory-Driven Improvement
The response becomes more contextual/personalized because of stored memory.


==================================================
CURRENT ARCHITECTURE
==================================================

Keep the implementation lightweight.

Reason:
- Python setup currently has issues.
- React/Vite/node_modules may consume unnecessary disk space.
- Hackathon time is limited.

FRONTEND:
- HTML
- CSS
- Vanilla JavaScript
- Tailwind via CDN if useful
- Cytoscape.js via CDN for graph visualization

BACKEND:
- Node.js
- Express
- neo4j-driver
- openai
- dotenv

AI:
- GraphAcademy LLM proxy
- Model: gpt-4o-mini
- Base URL:
  https://graphacademy.neo4j.com/api/llm/v1

DATABASE:
- Neo4j AuraDB

MCP:
- Neo4j MCP already configured.
- Neo4j GraphAcademy MCP already configured.
- MCP is primarily for development/AI-agent assistance.
- Runtime application should use neo4j-driver to connect to Aura.


==================================================
DIRECTORY STRUCTURE
==================================================

Parent:

D:\CareerGraph\

Existing workshop:

D:\CareerGraph\workshop-hackathon\

Actual application:

D:\CareerGraph\graph\

IMPORTANT:
Keep workshop-hackathon and careergraph as SIBLING folders.

Do NOT move the Neo4j workshop .env into careergraph.

The workshop folder contains MCP/workshop configuration.
The careergraph folder should have its own .env containing only the runtime
credentials/configuration required by the application.

Never expose or print API keys or Neo4j passwords.


==================================================
WHAT IS ALREADY DONE
==================================================

- Neo4j Aura instance created.
- Neo4j MCP configured.
- Neo4j GraphAcademy MCP configured.
- Neo4j GraphAcademy hackathon workshop repo cloned.
- New careergraph application folder created.
- package.json initialized.
- Lightweight Node dependencies installed:
    express
    neo4j-driver
    openai
    dotenv

Basic application files created:

graph/
    server.js
    .env
    public/
        index.html
        app.js
        style.css


==================================================
MCP CONFIGURATION
==================================================

Existing:

workshop-hackathon/.vscode/mcp.json

Contains:

neo4j-mcp
https://8cef7793.mcp-instances.neo4j.io

neo4j-graphacademy
https://mcp.graphacademy.neo4j.com/mcp

Do not unnecessarily modify this configuration.


==================================================
PLANNED NEO4J GRAPH
==================================================

NODE TYPES:

User
Career
Skill
Project
Preference
Decision

RELATIONSHIPS:

User -[:HAS_GOAL]-> Career

Career -[:REQUIRES]-> Skill

User -[:KNOWS]-> Skill

User -[:LEARNING]-> Skill

User -[:WORKED_ON]-> Project

Project -[:USES]-> Skill

User -[:PREFERS]-> Preference

User -[:MADE_DECISION]-> Decision


EXAMPLE:

User
 |
 +-- HAS_GOAL --> Cloud Engineer
 |                    |
 |                    +-- REQUIRES --> AWS
 |                    +-- REQUIRES --> Linux
 |                    +-- REQUIRES --> Networking
 |                    +-- REQUIRES --> Docker
 |                    +-- REQUIRES --> Python
 |
 +-- KNOWS --> Python
 |
 +-- LEARNING --> AWS
 |
 +-- WORKED_ON --> FastAPI Project
 |                    |
 |                    +-- USES --> Python
 |
 +-- PREFERS --> Project-Based Learning


==================================================
DATASET STRATEGY
==================================================

Do NOT download a large external dataset.

Use a small manually seeded career knowledge graph.

Initial careers:

Cloud Engineer
- DevOps Engineer
- Software Engineer
- Full Stack Developer
- Backend Developer
- Data Analyst
- Data Scientist
- ML Engineer
- AI Engineer
- Cybersecurity Analyst
- Database Engineer
- Product Manager


Initial skills can include:

-Python
- Java
- JavaScript
- SQL
- AWS
- Azure
- Linux
- Networking
- Docker
- Kubernetes
- Git
- CI/CD
- Machine Learning
- Deep Learning
- LLMs
- Data Visualization
- Statistics
- APIs
- React
- Node.js

The user's own conversations become the dynamic/persistent memory dataset.

The graph should demonstrate relationships rather than quantity of data.


==================================================
CORE AGENT FLOW example 
==================================================

STEP 1 — REMEMBER

User:

"I want to become a Cloud Engineer. I know Python and I'm learning AWS.
I prefer project-based learning."

LLM extracts:

goal:
Cloud Engineer

known skills:
Python

learning skills:
AWS

preference:
Project-Based Learning

Backend stores these in Neo4j.


STEP 2 — ADD EXPERIENCE

User:

"I recently built a FastAPI application."

Backend stores:

User
  |
  +-- WORKED_ON --> FastAPI Project
                         |
                         +-- USES --> Python


STEP 3 — CONTEXTUAL RETRIEVAL

User:

"What should I work on next?"

Backend queries Neo4j:

User
  |
  +-- HAS_GOAL --> Career
                       |
                       +-- REQUIRES --> Skills

Compare:

Required Skills
        -
Existing User Skills
        =
Skill Gaps

Roles & Skills:
Cloud Engineer
 ├── AWS
 ├── Linux
 ├── Networking
 ├── Docker
 └── Git

DevOps Engineer
 ├── Linux
 ├── Docker
 ├── AWS
 ├── Git
 └── CI/CD

ML Engineer
 ├── Python
 ├── Machine Learning
 ├── SQL
 ├── Git
 └── Docker

Data Analyst
 ├── SQL
 ├── Python
 ├── Statistics
 └── Data Visualization

AI Engineer
 ├── Python
 ├── Machine Learning
 ├── LLMs
 ├── APIs
 └── Docker

 Cloud Engineer → AWS, Linux, Networking, Docker, Git; DevOps Engineer → Linux, Docker, AWS, Git, CI/CD; Software Engineer → Python, Java, Git, APIs, SQL; Full Stack Developer → JavaScript, React, Node.js, SQL, APIs; Backend Developer → Python, Java, Node.js, APIs, SQL; Data Analyst → SQL, Python, Statistics, Data Visualization; Data Scientist → Python, SQL, Statistics, Machine Learning, Data Visualization; ML Engineer → Python, Machine Learning, SQL, Git, Docker; AI Engineer → Python, Machine Learning, LLMs, APIs, Docker; Cybersecurity Analyst → Linux, Networking, Python, Git, Cloud Security; Database Engineer → SQL, Python, Linux, AWS, Database Systems; Product Manager → Product Strategy, Agile, Data Analysis, Communication, User Research.

STEP 4 — AI RESPONSE

Send the relevant graph context to gpt-4o-mini.

Example context:

Goal:
Cloud Engineer

Known:
Python

Learning:
AWS

Project:
FastAPI

Preference:
Project-Based Learning

Potential gaps:
Linux
Networking
Docker

The model generates a personalized recommendation.


STEP 5 — PERSISTENCE DEMO

Start a later interaction.

User:

"What are my current career gaps?"

Agent retrieves the information from Neo4j without requiring the user to repeat it.


==================================================
REMAINING WORK
==================================================

PHASE 1 — CONNECTIONS

D:\CareerGraph\workshop-hackathon\.vscode\mcp.json

herein the mcps are running currently .

1. graph/.env.

Expected variables:

OPENAI_API_KEY=<secret>
OPENAI_API_BASE=https://graphacademy.neo4j.com/api/llm/v1
OPENAI_MODEL=gpt-4o-mini

Neo4j variables:

NEO4J_URI=<Aura URI>
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=<secret>

Do not print secrets.

2. Connect Node.js -> Neo4j Aura.

3. Connect Node.js -> GraphAcademy LLM.

4. Create a simple health/test endpoint.

5. Verify both connections before building other features.


PHASE 2 — GRAPH SEED

1. Create Cypher schema/seed logic.

2. Seed careers.

3. Seed required skills.

4. Create demo user.

5. Create career-skill relationships.

6. Verify graph visually in Neo4j.


PHASE 3 — PERSISTENT MEMORY

1. Send user messages to gpt-4o-mini.

2. Extract structured career information.

3. Convert extracted information into Neo4j MERGE operations.

4. Avoid duplicate nodes and relationships.

5. Store:
   - goals
   - skills
   - learning areas
   - projects
   - preferences
   - decisions


PHASE 4 — CONTEXTUAL RETRIEVAL

Create Cypher queries that retrieve:

- Target career
- Required skills
- Known skills
- Learning skills
- Projects
- Preferences
- Decisions
- Skill gaps

Do NOT retrieve the entire graph unnecessarily.


PHASE 5 — AGENT RESPONSE

1. Retrieve relevant graph context.
2. Build a prompt containing the context.
3. Send it to gpt-4o-mini.
4. Generate a concise personalized response.
5. Ensure the response actually reflects stored memory.


PHASE 6 — FRONTEND

Build a polished single-page UI.

Suggested layout:

These left & right pages must be able to wrap to their respected sides , then only chat option should be visible on screen .
LEFT:
"My Journey"

- Career goal
- Skills
- Learning Currently
- Projects

CENTER:
"CareerAgent"

- Conversation
- Input box
- Send button

RIGHT:
"Memory Graph"

- Graph visualization
- Important relationships

Use Cytoscape.js for the graph.

Use Tailwind CDN if needed for polished styling.

No React/Vite required.


PHASE 7 — DEMO POLISH

Add:

- Loading state
- Error state
- Empty state
- Graph visualization
- Memory status
- Seed/demo data
- Clear visual distinction between user message and AI response

Optional if time allows:
Show generic response vs memory-enhanced response.


==================================================


==================================================
WHAT NOT TO BUILD
==================================================

Do NOT build:

- React/Vite unless absolutely necessary
- Python backend
- Vector database
- Large external dataset
- Authentication
- LinkedIn integration
- Job scraping
- Course APIs
- Multi-agent architecture
- Complex dashboards
- Full document GraphRAG pipeline

The core memory + graph retrieval + personalized response is more important.


==================================================
TIME PRIORITY
==================================================

Priority 1:
Neo4j connection

Priority 2:
LLM connection

Priority 3:
Persistent memory

Priority 4:
Graph-based contextual retrieval

Priority 5:
Personalized AI response

Priority 6:
Basic polished UI

Priority 7:
Graph visualization and polish


==================================================
SECURITY
==================================================

- Never hardcode API keys.
- Never commit .env.
- Never expose Neo4j password to frontend.
- All Neo4j operations happen server-side.
- Keep secrets local.
- Validate/limit data written from LLM extraction.
- Prefer MERGE over CREATE where duplicate memories are possible.


==================================================
AGENT WORKING INSTRUCTIONS
==================================================

- Make small changes.
- Test after each phase.
- Reuse existing workshop/MCP setup where useful.
- Do not introduce new frameworks without a strong reason.
- Prefer simple reliable code.
- Do not rebuild working infrastructure.
- Keep the implementation focused on the five judging requirements.
- If a feature is not necessary for the demo, skip it.
- Prioritize a working end-to-end demo over feature count.