const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');
const journeySummary = document.getElementById('journeySummary');
const graphContainer = document.getElementById('graphContainer');

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }

  return response.json();
}

function appendMessage(role, text) {
  const row = document.createElement('div');
  row.className = `message ${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setJourneySummary(context) {
  if (!context) {
    journeySummary.textContent = 'No memory stored yet.';
    journeySummary.classList.add('empty-state');
    return;
  }

  const goal = context.targetCareer || 'No goal yet';
  const known = context.knownSkills?.length ? context.knownSkills.join(', ') : 'None yet';
  const learning = context.learningSkills?.length ? context.learningSkills.join(', ') : 'None yet';
  const projects = context.projects?.length ? context.projects.join(', ') : 'None yet';

  journeySummary.classList.remove('empty-state');
  journeySummary.innerHTML = `
    <div><strong>Goal:</strong> ${goal}</div>
    <div><strong>Skills:</strong> ${known}</div>
    <div><strong>Learning:</strong> ${learning}</div>
    <div><strong>Projects:</strong> ${projects}</div>
    <div><strong>Gaps:</strong> ${context.skillGaps?.length ? context.skillGaps.join(', ') : 'No major gaps identified'}</div>
  `;
}

async function loadContext() {
  try {
    const result = await fetchJson('/api/context');
    if (result.ok) {
      setJourneySummary(result.context);
    }
  } catch (error) {
    journeySummary.textContent = 'Unable to load memory right now.';
  }
}

async function syncSeed() {
  try {
    await fetchJson('/api/seed');
  } catch (error) {
    console.warn('Seed unavailable:', error.message);
  }
}

function renderGraph(graph) {
  if (!graph || !graph.nodes?.length) {
    graphContainer.innerHTML = '<div class="empty-state">Graph is empty right now.</div>';
    return;
  }

  const nodes = graph.nodes.map((node) => ({
    data: {
      id: node.id,
      label: node.label,
      type: node.type
    }
  }));

  const edges = graph.edges.map((edge) => ({
    data: {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label
    }
  }));

  const cy = cytoscape({
    container: graphContainer,
    elements: [...nodes, ...edges],
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'text-wrap': 'wrap',
          'text-max-width': '120px',
          color: '#e5eef9',
          'background-color': '#3b82f6',
          'border-width': 2,
          'border-color': '#1d4ed8',
          'font-size': 12,
          width: 90,
          height: 60
        }
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#8ec5ff',
          'target-arrow-color': '#8ec5ff',
          'target-arrow-shape': 'triangle',
          label: 'data(label)',
          color: '#dbeafe',
          'font-size': 10,
          'curve-style': 'bezier'
        }
      }
    ],
    layout: {
      name: 'breadthfirst',
      directed: true,
      padding: 24,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.0
    }
  });

  cy.resize();
}

async function loadGraph() {
  try {
    const result = await fetchJson('/api/graph');
    if (result.ok) {
      renderGraph(result.graph);
    }
  } catch (error) {
    graphContainer.innerHTML = '<div class="empty-state">Graph unavailable.</div>';
  }
}

async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage('user', message);
  chatInput.value = '';

  const thinking = document.createElement('div');
  thinking.className = 'message bot';
  const bubble = document.createElement('div');
  bubble.className = 'bubble loading';
  bubble.textContent = 'Thinking...';
  thinking.appendChild(bubble);
  chatMessages.appendChild(thinking);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const result = await fetchJson('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });

    chatMessages.removeChild(thinking);
    appendMessage('bot', result.reply || 'I can help with that.');
    setJourneySummary(result.context);
    await loadGraph();
  } catch (error) {
    chatMessages.removeChild(thinking);
    appendMessage('bot', `I hit a problem while processing that: ${error.message}`);
  }
}

sendButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

(async function init() {
  await syncSeed();
  await loadContext();
  await loadGraph();
})();
