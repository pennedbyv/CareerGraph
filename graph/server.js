require('dotenv').config();

const express = require('express');
const path = require('path');
const neo4j = require('neo4j-driver');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3000;
const userId = 'demo-user';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const neo4jUri = process.env.NEO4J_URI;
const neo4jUsername = process.env.NEO4J_USERNAME || process.env.NEO4J_USER;
const neo4jPassword = process.env.NEO4J_PASSWORD;
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiBaseUrl = process.env.OPENAI_API_BASE || process.env.OPENAI_BASE_URL;
const openAiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const neo4jDatabase = process.env.NEO4J_DATABASE;

const driver = neo4jUri && neo4jUsername && neo4jPassword
  ? neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUsername, neo4jPassword))
  : null;

const openai = openAiApiKey && openAiBaseUrl
  ? new OpenAI({ apiKey: openAiApiKey, baseURL: openAiBaseUrl })
  : null;

const careerSkillMap = {
  'Cloud Engineer': ['AWS', 'Linux', 'Networking', 'Docker', 'Git'],
  'DevOps Engineer': ['Linux', 'Docker', 'AWS', 'Git', 'CI/CD'],
  'Software Engineer': ['Python', 'Java', 'Git', 'APIs', 'SQL'],
  'Full Stack Developer': ['JavaScript', 'React', 'Node.js', 'SQL', 'APIs'],
  'Backend Developer': ['Python', 'Java', 'Node.js', 'APIs', 'SQL'],
  'Data Analyst': ['SQL', 'Python', 'Statistics', 'Data Visualization'],
  'Data Scientist': ['Python', 'SQL', 'Statistics', 'Machine Learning', 'Data Visualization'],
  'ML Engineer': ['Python', 'Machine Learning', 'SQL', 'Git', 'Docker'],
  'AI Engineer': ['Python', 'Machine Learning', 'LLMs', 'APIs', 'Docker'],
  'Cybersecurity Analyst': ['Linux', 'Networking', 'Python', 'Git', 'Cloud Security'],
  'Database Engineer': ['SQL', 'Python', 'Linux', 'AWS', 'Database Systems'],
  'Product Manager': ['Product Strategy', 'Agile', 'Data Analysis', 'Communication', 'User Research']
};

const allCareers = Object.keys(careerSkillMap);
const allSkills = [...new Set(Object.values(careerSkillMap).flat())];

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
}

async function runCypher(query, params = {}) {
  if (!driver) {
    throw new Error('Neo4j is not configured. Check NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD.');
  }

  const session = driver.session({ database: neo4jDatabase || undefined });
  try {
    return await session.run(query, params);
  } finally {
    await session.close();
  }
}

async function pingNeo4j() {
  try {
    const result = await runCypher('RETURN 1 AS ok');
    return {
      ok: true,
      response: result.records[0]?.get('ok')
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function pingOpenAI() {
  if (!openai) {
    return {
      ok: false,
      error: 'OpenAI is not configured. Check OPENAI_API_KEY and OPENAI_API_BASE.'
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: openAiModel,
      messages: [{ role: 'user', content: 'Reply with OK.' }],
      max_tokens: 8
    });

    return {
      ok: true,
      response: response.choices?.[0]?.message?.content?.trim() || 'OK'
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

async function seedDemoGraph() {
  await runCypher(`
    MERGE (u:User {id: $userId})
    SET u.name = $userName
  `, { userId, userName: 'Demo User' });

  for (const career of allCareers) {
    await runCypher(`MERGE (c:Career {name: $career})`, { career });
  }

  for (const skill of allSkills) {
    await runCypher(`MERGE (s:Skill {name: $skill})`, { skill });
  }

  for (const [career, requiredSkills] of Object.entries(careerSkillMap)) {
    for (const skill of requiredSkills) {
      await runCypher(`
        MATCH (c:Career {name: $career})
        MATCH (s:Skill {name: $skill})
        MERGE (c)-[:REQUIRES]->(s)
      `, { career, skill });
    }
  }

  const knownSkills = ['Python', 'Git'];
  const learningSkills = ['AWS', 'Docker'];
  const preference = 'Project-Based Learning';
  const goal = 'Cloud Engineer';

  for (const skill of knownSkills) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MATCH (s:Skill {name: $skill})
      MERGE (u)-[:KNOWS]->(s)
    `, { userId, skill });
  }

  for (const skill of learningSkills) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MATCH (s:Skill {name: $skill})
      MERGE (u)-[:LEARNING]->(s)
    `, { userId, skill });
  }

  await runCypher(`
    MATCH (u:User {id: $userId})
    MATCH (c:Career {name: $goal})
    MERGE (u)-[:HAS_GOAL]->(c)
  `, { userId, goal });

  await runCypher(`
    MERGE (p:Project {name: $project})
  `, { project: 'FastAPI Project' });

  await runCypher(`
    MATCH (u:User {id: $userId})
    MATCH (p:Project {name: $project})
    MERGE (u)-[:WORKED_ON]->(p)
  `, { userId, project: 'FastAPI Project' });

  await runCypher(`
    MATCH (p:Project {name: $project})
    MATCH (s:Skill {name: $skill})
    MERGE (p)-[:USES]->(s)
  `, { project: 'FastAPI Project', skill: 'Python' });

  await runCypher(`
    MATCH (u:User {id: $userId})
    MERGE (pref:Preference {name: $name})
    MERGE (u)-[:PREFERS]->(pref)
  `, { userId, name: preference });

  await runCypher(`
    MATCH (u:User {id: $userId})
    MERGE (d:Decision {text: $text})
    MERGE (u)-[:MADE_DECISION]->(d)
  `, { userId, text: 'Prioritize hands-on learning with AWS and Docker labs.' });

  return {
    ok: true,
    userId,
    goal,
    knownSkills,
    learningSkills,
    preference
  };
}

function normalizeSkill(skillName) {
  if (!skillName) return null;

  const cleaned = String(skillName)
    .trim()
    .replace(/[.!?,;]+$/g, '')
    .replace(/^\s*(?:the|a|an)\s+/i, '')
    .trim();

  if (!cleaned || /^(?:i\s+(?:am|prefer|want|recently)|project-based learning|project based learning|learning|hands-on learning|hands on learning)$/i.test(cleaned)) {
    return null;
  }

  const exact = allSkills.find((skill) => skill.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;

  const partial = allSkills.find((skill) => cleaned.toLowerCase().includes(skill.toLowerCase()));
  return partial || cleaned;
}

function normalizeProjectName(value) {
  if (!value) return null;

  const cleaned = String(value)
    .trim()
    .replace(/[.!?,;]+$/g, '')
    .replace(/^\s*(?:a|an|the)\s+/i, '')
    .trim();

  if (!cleaned) return null;
  if (/^project-based\s+learning$/i.test(cleaned) || /^project based\s+learning$/i.test(cleaned)) {
    return null;
  }
  if (/^(?:i\s+(?:do|did|prefer|know|like|want)|learning|hands-on learning|hands on learning)$/i.test(cleaned)) {
    return null;
  }

  return cleaned;
}

function extractCareerMemory(message) {
  const text = (message || '').trim();
  if (!text) return null;

  const goal = (() => {
    const match = text.match(/(?:want to become|become|career goal|goal is|aspiring to be|aim to be|want to work as)\s+(?:a\s+)?([A-Za-z][A-Za-z\s-]+)/i);
    if (!match) {
      for (const career of allCareers) {
        if (text.toLowerCase().includes(career.toLowerCase())) return career;
      }
      return null;
    }

    const value = match[1].trim();
    return allCareers.find((career) => career.toLowerCase() === value.toLowerCase()) || value;
  })();

  const knownSkills = [...new Set(
    [...text.matchAll(/(?:i\s+(?:know|have|used|do|did|have used)|know|knows|familiar with|have experience with)\s+([^.;!?]+?)(?=(?:\s+(?:and|,)?\s*(?:i\s+am\s+learning|i\s+prefer|i\s+want|i\s+recently)|\.|;|!|\?|$))/gi)]
      .map((match) => normalizeSkill(match[1]))
      .filter(Boolean)
  )];

  const learningSkills = [...new Set(
    [...text.matchAll(/(?:i\s+(?:am\s+)?learning|learning|studying|practicing)\s+(?:about\s+)?([^.;!?]+?)(?=(?:\s+(?:and|,)?\s*(?:i\s+prefer|i\s+know|i\s+want|i\s+recently)|\.|;|!|\?|$))/gi)]
      .map((match) => normalizeSkill(match[1]))
      .filter(Boolean)
  )];

  const project = (() => {
    const match = text.match(/(?:built|created|worked on|developed|launched|project called|project named|completed|deployed)\s+(?:a\s+|an\s+|the\s+)?([A-Za-z0-9 .-]+)/i);
    if (!match) return null;
    return normalizeProjectName(match[1]);
  })();

  const preference = (() => {
    const match = text.match(/(?:prefer|prefers|preference is|i like)\s+(.+)/i);
    if (!match) return null;
    const value = match[1].trim().replace(/[.!?,;]+$/g, '');
    if (/^project[- ]?based\s+learning$/i.test(value)) return 'Project-Based Learning';
    if (/^hands[- ]?on\s+learning$/i.test(value)) return 'Hands-On Learning';
    return value;
  })();

  const decision = (() => {
    const match = text.match(/(?:decided to|choose|chose|plan to|going to|will)\s+(.+)/i);
    return match ? match[1].trim().replace(/[.!?,;]+$/g, '') : null;
  })();

  if (!goal && knownSkills.length === 0 && learningSkills.length === 0 && !project && !preference && !decision) {
    return null;
  }

  return { goal, knownSkills, learningSkills, project, preference, decision, message: text };
}

async function rememberMessage(message) {
  const parsed = extractCareerMemory(message);
  if (!parsed) {
    return { ok: false, reason: 'No recognizable career-memory content found in the message.' };
  }

  if (parsed.goal) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MERGE (c:Career {name: $goal})
      MERGE (u)-[:HAS_GOAL]->(c)
    `, { userId, goal: parsed.goal });
  }

  for (const skill of parsed.knownSkills) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MATCH (s:Skill {name: $skill})
      MERGE (u)-[:KNOWS]->(s)
    `, { userId, skill });
  }

  for (const skill of parsed.learningSkills) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MATCH (s:Skill {name: $skill})
      MERGE (u)-[:LEARNING]->(s)
    `, { userId, skill });
  }

  if (parsed.project) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MERGE (p:Project {name: $project})
      MERGE (u)-[:WORKED_ON]->(p)
    `, { userId, project: parsed.project });

    for (const skill of [...parsed.knownSkills, ...parsed.learningSkills]) {
      await runCypher(`
        MATCH (p:Project {name: $project})
        MATCH (s:Skill {name: $skill})
        MERGE (p)-[:USES]->(s)
      `, { project: parsed.project, skill });
    }
  }

  if (parsed.preference) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MERGE (pref:Preference {name: $pref})
      MERGE (u)-[:PREFERS]->(pref)
    `, { userId, pref: parsed.preference });
  }

  if (parsed.decision) {
    await runCypher(`
      MATCH (u:User {id: $userId})
      MERGE (d:Decision {text: $decision})
      MERGE (u)-[:MADE_DECISION]->(d)
    `, { userId, decision: parsed.decision });
  }

  return { ok: true, extracted: parsed };
}

async function buildCareerResponse(message) {
  const context = await getUserContext();

  const prompt = [
    'You are CareerGraph, a concise career guidance assistant.',
    `Goal: ${context.targetCareer}`,
    `Known skills: ${context.knownSkills.join(', ') || 'none'}`,
    `Learning skills: ${context.learningSkills.join(', ') || 'none'}`,
    `Projects: ${context.projects.join(', ') || 'none'}`,
    `Preferences: ${context.preferences.join(', ') || 'none'}`,
    `Skill gaps: ${context.skillGaps.join(', ') || 'none'}`,
    `User question: ${message}`,
    'Give a short, actionable, personalized answer grounded in the user’s stored memory and mention the most relevant next steps or skill gaps.'
  ].join('\n');

  if (!openai) {
    return {
      ok: true,
      message: `Based on your goal as ${context.targetCareer}, you should focus on ${context.learningSkills.join(', ') || 'upskilling'} and the most relevant gaps: ${context.skillGaps.join(', ') || 'none identified yet'}. A project-based next step would be most aligned with your learning style.`
    };
  }

  const response = await openai.chat.completions.create({
    model: openAiModel,
    messages: [
      {
        role: 'system',
        content: 'You are CareerGraph, a helpful career coach. Keep the response brief and grounded in the user\'s memory and graph context.'
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 220
  });

  return {
    ok: true,
    message: response.choices?.[0]?.message?.content?.trim() || 'I can help with that.'
  };
}

async function getUserContext() {
  const result = await runCypher(`
    MATCH (u:User {id: $userId})
    OPTIONAL MATCH (u)-[:HAS_GOAL]->(goal:Career)
    OPTIONAL MATCH (u)-[:KNOWS]->(known:Skill)
    OPTIONAL MATCH (u)-[:LEARNING]->(learning:Skill)
    OPTIONAL MATCH (u)-[:WORKED_ON]->(project:Project)
    OPTIONAL MATCH (u)-[:PREFERS]->(pref:Preference)
    OPTIONAL MATCH (u)-[:MADE_DECISION]->(decision:Decision)
    OPTIONAL MATCH (goal)-[:REQUIRES]->(required:Skill)
    RETURN {
      goals: collect(DISTINCT goal.name),
      knownSkills: collect(DISTINCT known.name),
      learningSkills: collect(DISTINCT learning.name),
      projects: collect(DISTINCT project.name),
      preferences: collect(DISTINCT pref.name),
      decisions: collect(DISTINCT decision.text),
      requiredSkills: collect(DISTINCT required.name)
    } AS data
  `, { userId });

  const data = result.records[0]?.get('data') || {};
  const goals = asArray(data.goals);
  const knownSkills = asArray(data.knownSkills);
  const learningSkills = asArray(data.learningSkills);
  const projects = asArray(data.projects);
  const preferences = asArray(data.preferences);
  const decisions = asArray(data.decisions);
  const requiredSkills = asArray(data.requiredSkills);

  const targetCareer = goals[0] || 'Cloud Engineer';
  const skillGaps = requiredSkills.filter((skill) => !knownSkills.includes(skill) && !learningSkills.includes(skill));

  return {
    targetCareer,
    goals,
    knownSkills,
    learningSkills,
    projects,
    preferences,
    decisions,
    requiredSkills,
    skillGaps
  };
}

async function getGraphData() {
  const result = await runCypher(`
    MATCH (n)
    OPTIONAL MATCH (n)-[r]->(m)
    RETURN n, r, m
  `);

  const nodes = new Map();
  const edges = [];

  for (const record of result.records) {
    const node = record.get('n');
    const rel = record.get('r');
    const other = record.get('m');

    if (node) {
      const key = node.identity.toString();
      if (!nodes.has(key)) {
        nodes.set(key, {
          id: key,
          label: node.properties.name || node.labels[0] || 'Node',
          type: node.labels[0] || 'Node'
        });
      }
    }

    if (other) {
      const key = other.identity.toString();
      if (!nodes.has(key)) {
        nodes.set(key, {
          id: key,
          label: other.properties.name || other.labels[0] || 'Node',
          type: other.labels[0] || 'Node'
        });
      }
    }

    if (rel) {
      edges.push({
        id: `${rel.start.toString()}-${rel.end.toString()}-${rel.type}`,
        source: rel.start.toString(),
        target: rel.end.toString(),
        label: rel.type
      });
    }
  }

  return { nodes: [...nodes.values()], edges };
}

app.get('/health', async (req, res) => {
  const neo4jStatus = await pingNeo4j();
  const llmStatus = await pingOpenAI();
  const ok = neo4jStatus.ok && llmStatus.ok;

  res.status(ok ? 200 : 503).json({
    ok,
    service: 'CareerGraph',
    checks: {
      neo4j: neo4jStatus,
      llm: llmStatus
    }
  });
});

app.get('/api/test', async (req, res) => {
  const neo4jStatus = await pingNeo4j();
  const llmStatus = await pingOpenAI();

  res.json({
    ok: neo4jStatus.ok && llmStatus.ok,
    neo4j: neo4jStatus,
    llm: llmStatus
  });
});

app.get('/api/seed', async (req, res) => {
  try {
    const result = await seedDemoGraph();
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/context', async (req, res) => {
  try {
    const context = await getUserContext();
    res.json({ ok: true, context });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/graph', async (req, res) => {
  try {
    const graph = await getGraphData();
    res.json({ ok: true, graph });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/remember', async (req, res) => {
  const { message } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ ok: false, error: 'A message is required.' });
  }

  try {
    const result = await rememberMessage(message);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body || {};

  if (!message || !String(message).trim()) {
    return res.status(400).json({ ok: false, error: 'A message is required.' });
  }

  try {
    const memoryResult = await rememberMessage(message);
    const assistantReply = await buildCareerResponse(message);
    const context = await getUserContext();

    res.json({
      ok: true,
      memory: memoryResult,
      reply: assistantReply.message,
      context
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function shutdown() {
  if (driver) {
    await driver.close();
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
  app.listen(port, () => {
    console.log(`CareerGraph server running on http://localhost:${port}`);
  });
}

module.exports = {
  app,
  pingNeo4j,
  pingOpenAI,
  seedDemoGraph,
  rememberMessage,
  buildCareerResponse,
  getUserContext,
  getGraphData,
  extractCareerMemory
};
