import { describe, it, expect } from 'vitest';
import { isCrewAIYaml, parseCrewAIAgentsYaml, parseCrewAITasksYaml, isCrewAIPython } from '../crewaiParser';
import { isLangGraph, parseLangGraph } from '../langgraphParser';
import { isAutoGen, parseAutoGen } from '../autogenParser';
import { isOpenAIAgents, parseOpenAIAgents } from '../openaiAgentsParser';

// ── CrewAI ──────────────────────────────────────────────────────────────────

const CREWAI_AGENTS_YAML = `
researcher:
  role: "Senior Data Researcher"
  goal: "Uncover cutting-edge developments in AI"
  backstory: "You're a seasoned researcher with a knack for uncovering the latest developments."
  llm: "gpt-4o"

writer:
  role: "Tech Content Writer"
  goal: "Write compelling articles about AI"
  backstory: "You're a renowned content writer specializing in tech."
  llm: "gpt-4o-mini"
`;

const CREWAI_TASKS_YAML = `
research_task:
  description: "Research the latest AI trends"
  expected_output: "A comprehensive report"
  agent: researcher

writing_task:
  description: "Write a blog post based on the research"
  expected_output: "A well-written blog post"
  agent: writer
  context: [research_task]
`;

const CREWAI_PY = `
from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task

@CrewBase
class BlogCrew:
    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential
        )
`;

describe('CrewAI Parser', () => {
  it('detects agents.yaml', () => {
    expect(isCrewAIYaml(CREWAI_AGENTS_YAML, 'config/agents.yaml')).toBe(true);
    expect(isCrewAIYaml(CREWAI_AGENTS_YAML, 'agents.yaml')).toBe(true);
  });

  it('rejects non-crewai yaml', () => {
    expect(isCrewAIYaml('name: test\nversion: 1', 'package.yaml')).toBe(false);
  });

  it('parses agents from YAML', () => {
    const agents = parseCrewAIAgentsYaml(CREWAI_AGENTS_YAML);
    expect(agents).toHaveLength(2);
    expect(agents[0].name).toBe('Researcher');
    expect(agents[0].role).toBe('Senior Data Researcher');
    expect(agents[0].model).toBe('gpt-4o');
    expect(agents[0].tags).toContain('crewai');
    expect(agents[1].name).toBe('Writer');
    expect(agents[1].role).toBe('Tech Content Writer');
  });

  it('parses task edges from YAML', () => {
    const agents = parseCrewAIAgentsYaml(CREWAI_AGENTS_YAML);
    const edges = parseCrewAITasksYaml(CREWAI_TASKS_YAML, agents);
    expect(edges.length).toBeGreaterThanOrEqual(1);
    // writing_task depends on research_task via context
    const edge = edges.find(e => e.source === 'researcher' && e.target === 'writer');
    expect(edge).toBeTruthy();
    expect(edge!.type).toBe('pipeline');
  });

  it('detects CrewAI Python files', () => {
    expect(isCrewAIPython(CREWAI_PY, 'crew.py')).toBe(true);
    expect(isCrewAIPython('print("hello")', 'main.py')).toBe(false);
  });
});

// ── LangGraph ───────────────────────────────────────────────────────────────

const LANGGRAPH_PY = `
from langgraph.graph import StateGraph, START, END

class AgentState(TypedDict):
    messages: list

def researcher(state):
    return {"messages": ["researched"]}

def writer(state):
    return {"messages": ["written"]}

def router(state):
    if state["needs_review"]:
        return "reviewer"
    return "writer"

builder = StateGraph(AgentState)
builder.add_node("researcher", researcher)
builder.add_node("writer", writer)
builder.add_node("reviewer", review_fn)
builder.add_edge(START, "researcher")
builder.add_edge("researcher", "writer")
builder.add_edge("writer", END)
builder.add_conditional_edges("researcher", router, {"reviewer": "reviewer", "writer": "writer"})

graph = builder.compile()
`;

describe('LangGraph Parser', () => {
  it('detects LangGraph Python files', () => {
    expect(isLangGraph(LANGGRAPH_PY, 'agent.py')).toBe(true);
    expect(isLangGraph('print("hello")', 'main.py')).toBe(false);
  });

  it('parses nodes as agents', () => {
    const { agents } = parseLangGraph(LANGGRAPH_PY, 'agent.py');
    expect(agents).toHaveLength(3);
    expect(agents.map(a => a.name).sort()).toEqual(['Researcher', 'Reviewer', 'Writer']);
    expect(agents[0].tags).toContain('langgraph');
  });

  it('parses edges', () => {
    const { edges } = parseLangGraph(LANGGRAPH_PY, 'agent.py');
    // Should have at least researcher->writer direct edge
    const directEdge = edges.find(e => e.source === 'researcher' && e.target === 'writer');
    expect(directEdge).toBeTruthy();
  });

  it('parses conditional edges', () => {
    const { edges } = parseLangGraph(LANGGRAPH_PY, 'agent.py');
    // Should have conditional edge researcher->reviewer
    const condEdge = edges.find(e => e.source === 'researcher' && e.target === 'reviewer');
    expect(condEdge).toBeTruthy();
  });

  it('detects langgraph.json', () => {
    const json = '{"graphs": {"agent": "src/agent.py:graph"}}';
    expect(isLangGraph(json, 'langgraph.json')).toBe(true);
  });
});

// ── AutoGen ─────────────────────────────────────────────────────────────────

const AUTOGEN_PY = `
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

researcher = AssistantAgent(
    name="Researcher",
    system_message="You research topics thoroughly.",
    llm_config={"config_list": [{"model": "gpt-4"}]},
)

coder = AssistantAgent(
    name="Coder",
    system_message="You write clean Python code.",
    llm_config=llm_config,
)

user = UserProxyAgent(
    name="User",
    human_input_mode="NEVER",
)

group_chat = GroupChat(
    agents=[user, researcher, coder],
    messages=[],
    max_round=12,
    allowed_or_disallowed_speaker_transitions={
        researcher: [coder, user],
        coder: [user],
    },
    speaker_transitions_type="allowed",
)

manager = GroupChatManager(groupchat=group_chat, llm_config=llm_config)
`;

describe('AutoGen Parser', () => {
  it('detects AutoGen Python files', () => {
    expect(isAutoGen(AUTOGEN_PY, 'agents.py')).toBe(true);
    expect(isAutoGen('print("hello")', 'main.py')).toBe(false);
  });

  it('parses agents', () => {
    const { agents } = parseAutoGen(AUTOGEN_PY, 'agents.py');
    expect(agents.length).toBeGreaterThanOrEqual(3);
    const names = agents.map(a => a.name);
    expect(names).toContain('Researcher');
    expect(names).toContain('Coder');
    expect(names).toContain('User');
    expect(agents[0].tags).toContain('autogen');
  });

  it('parses speaker transitions as edges', () => {
    const { edges } = parseAutoGen(AUTOGEN_PY, 'agents.py');
    const researcherToCoder = edges.find(e => e.source === 'researcher' && e.target === 'coder');
    expect(researcherToCoder).toBeTruthy();
  });
});

// ── OpenAI Agents SDK ───────────────────────────────────────────────────────

const OPENAI_AGENTS_PY = `
from agents import Agent, handoff, Runner

billing_agent = Agent(
    name="Billing Agent",
    instructions="Handle billing questions and payment issues.",
    model="gpt-4o",
    handoff_description="Handles billing and payment issues",
)

refund_agent = Agent(
    name="Refund Agent",
    instructions="Process refund requests.",
    model="gpt-4o",
)

triage_agent = Agent(
    name="Triage Agent",
    instructions="Route users to the right specialist.",
    model="gpt-4o-mini",
    handoffs=[billing_agent, refund_agent],
)
`;

describe('OpenAI Agents SDK Parser', () => {
  it('detects OpenAI Agents SDK Python files', () => {
    expect(isOpenAIAgents(OPENAI_AGENTS_PY, 'main.py')).toBe(true);
    expect(isOpenAIAgents('print("hello")', 'main.py')).toBe(false);
  });

  it('parses agents', () => {
    const { agents } = parseOpenAIAgents(OPENAI_AGENTS_PY, 'main.py');
    expect(agents).toHaveLength(3);
    const names = agents.map(a => a.name);
    expect(names).toContain('Billing Agent');
    expect(names).toContain('Refund Agent');
    expect(names).toContain('Triage Agent');
    expect(agents[0].tags).toContain('openai-agents');
  });

  it('detects triage agent as orchestrator', () => {
    const { agents } = parseOpenAIAgents(OPENAI_AGENTS_PY, 'main.py');
    const triage = agents.find(a => a.name === 'Triage Agent');
    expect(triage?.isOrchestrator).toBe(true);
    expect(triage?.roleType).toBe('orchestrator');
  });

  it('parses handoff edges', () => {
    const { edges } = parseOpenAIAgents(OPENAI_AGENTS_PY, 'main.py');
    const triageToBilling = edges.find(e => e.source === 'triage_agent' && e.target === 'billing_agent');
    expect(triageToBilling).toBeTruthy();
    const triageToRefund = edges.find(e => e.source === 'triage_agent' && e.target === 'refund_agent');
    expect(triageToRefund).toBeTruthy();
  });

  it('extracts model and instructions', () => {
    const { agents } = parseOpenAIAgents(OPENAI_AGENTS_PY, 'main.py');
    const billing = agents.find(a => a.name === 'Billing Agent');
    expect(billing?.model).toBe('gpt-4o');
    expect(billing?.instructions).toContain('Handle billing');
  });
});
