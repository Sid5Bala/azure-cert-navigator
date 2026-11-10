// AI-103 Python SDK quick reference. Patterns verified against Microsoft Learn / official SDK READMEs (Nov 2026).
// Code is stored as template literals: escape "${" as "\${" so Python placeholders survive.

const auth = {
  id: "auth", title: "Auth, endpoints & clients", icon: "🔑", domain: "plan",
  pkg: "azure-identity · openai",
  install: "pip install azure-identity openai",
  summary: "Keyless (Microsoft Entra ID) auth is the default answer. Know the three endpoint shapes and which client goes with each.",
  api: [
    { name: "DefaultAzureCredential()", d: "Tries env vars, managed identity, then developer logins (Azure CLI, VS Code…) — the same code runs on a laptop and in Azure." },
    { name: "ManagedIdentityCredential(client_id=...)", d: "Explicit (user-assigned) managed identity for production apps." },
    { name: 'get_bearer_token_provider(credential, "https://ai.azure.com/.default")', d: "Callable that hands fresh Entra tokens to the openai client. Pass the callable itself as api_key." },
    { name: "AzureKeyCredential(key)", d: "Key auth for Foundry Tools clients (Language, Translator, Content Safety, Search…). Bypasses RBAC; blocked when disableLocalAuth = true." },
    { name: "https://<resource>.services.ai.azure.com/api/projects/<project>", d: "Project endpoint → AIProjectClient (Entra ID only)." },
    { name: "https://<resource>.openai.azure.com/openai/v1/", d: "OpenAI v1 endpoint → plain OpenAI(base_url=…) client; no api-version parameter." },
    { name: "https://<resource>.cognitiveservices.azure.com/", d: "Foundry Tools endpoint → Language, Translator, Document Intelligence, Content Safety clients." },
  ],
  snippets: [
    {
      title: "Keyless clients for a project, a model endpoint and a Foundry Tool",
      code: `from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from azure.ai.projects import AIProjectClient
from openai import OpenAI
from azure.ai.textanalytics import TextAnalyticsClient

cred = DefaultAzureCredential()

# 1) Foundry project (agents, connections, evaluations) — Entra ID only
project = AIProjectClient(endpoint="https://contoso.services.ai.azure.com/api/projects/support",
                          credential=cred)

# 2) Models over the OpenAI v1 endpoint — plain OpenAI client, no api-version
token_provider = get_bearer_token_provider(cred, "https://ai.azure.com/.default")
client = OpenAI(base_url="https://contoso.openai.azure.com/openai/v1/",
                api_key=token_provider)            # the callable, so tokens refresh

# 3) A Foundry Tool (Azure Language) with the same identity
language = TextAnalyticsClient(endpoint="https://contoso.cognitiveservices.azure.com/",
                               credential=cred)`,
      notes: ["Roles: Foundry User on the project; Cognitive Services OpenAI User for direct model calls; Cognitive Services User / Language-specific roles for Foundry Tools."],
    },
  ],
  gotchas: [
    "model= is always the DEPLOYMENT name you chose, not the base model id.",
    "AIProjectClient accepts only Entra credentials — there is no API key option.",
    "Pass api_key=token_provider (the function), not token_provider() — a single token expires after about an hour.",
    "The v1 endpoint (/openai/v1/) needs no api-version; the older AzureOpenAI(api_version=…) client is legacy.",
    "Setting disableLocalAuth = true on the resource breaks every AzureKeyCredential client — that's the point.",
  ],
};

const project = {
  id: "project", title: "Foundry project client", icon: "🏗️", domain: "genai",
  pkg: "azure-ai-projects 2.x (new Foundry) · 1.x = classic",
  install: "pip install azure-ai-projects azure-identity openai",
  summary: "AIProjectClient is the entry point for Foundry-native work (connections, deployments, datasets, agents, telemetry) and hands you an authenticated OpenAI client for everything model-shaped.",
  api: [
    { name: "AIProjectClient(endpoint, credential)", d: "Connect to a Foundry project by its project endpoint." },
    { name: "project.get_openai_client()", d: "OpenAI client bound to the project (responses, conversations, evals, files, fine-tuning)." },
    { name: "project.connections.list(connection_type=...) / get(name, include_credentials=...) / get_default(...)", d: "Discover linked resources (Azure OpenAI, AI Search, storage, App Insights…)." },
    { name: "project.deployments.list(model_publisher=..., model_name=...) / get(name)", d: "List model deployments available to the project." },
    { name: "project.datasets.upload_file(name, version, file_path)", d: "Register a dataset (e.g. evaluation JSONL)." },
    { name: "project.agents.create_version(agent_name, definition)", d: "Create or version a prompt agent (see Agents)." },
    { name: "project.telemetry.get_application_insights_connection_string()", d: "Connection string for tracing (see Tracing)." },
  ],
  snippets: [
    {
      title: "Connect to a project and look around",
      code: `from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import ConnectionType

endpoint = "https://<resource>.services.ai.azure.com/api/projects/<project>"
with DefaultAzureCredential() as cred, AIProjectClient(endpoint=endpoint, credential=cred) as project:
    for c in project.connections.list(connection_type=ConnectionType.AZURE_OPEN_AI):
        print(c.name)
    search_conn = project.connections.get("my-search-connection")      # by name
    for d in project.deployments.list(model_publisher="Microsoft"):
        print(d.name, d.model_name, d.model_version)

    openai = project.get_openai_client()
    print(openai.responses.create(model="gpt-4.1-mini", input="Ping").output_text)`,
    },
  ],
  gotchas: [
    "azure-ai-projects 2.x (new Foundry) is not compatible with 1.x (classic); in 2.x create_agent() was replaced by agents.create_version().",
    "Conversations and responses live on the OpenAI client from get_openai_client(), not on AIProjectClient.",
    "Embeddings go to the resource's /openai/v1 endpoint rather than through the project client.",
    "Minimum role to work in a project = Foundry User (formerly Azure AI User).",
  ],
};

const responses = {
  id: "responses", title: "Models: Responses, chat & structured output", icon: "💬", domain: "genai",
  pkg: "openai (via project.get_openai_client() or the /openai/v1 endpoint)",
  install: "pip install openai pydantic azure-identity",
  summary: "Responses is the recommended API for new apps (built-in state, tools, streaming). Chat Completions still works. Structured outputs guarantee a JSON schema.",
  api: [
    { name: "responses.create(model, input, instructions, previous_response_id, stream, tools, text)", d: "Generate a response; read .output_text. previous_response_id chains turns." },
    { name: 'responses.create(..., stream=True) → event.type == "response.output_text.delta"', d: "Stream tokens as they're produced. Errors mid-stream arrive as error events (HTTP is already 200)." },
    { name: "responses.parse(model, input, text_format=PydanticModel)", d: "Structured output into a Pydantic model; read .output_parsed." },
    { name: 'text={"format": {"type": "json_schema", "name": ..., "strict": True, "schema": {...}}}', d: "Raw JSON-schema structured output on the Responses API." },
    { name: "chat.completions.create(model, messages)", d: "Classic chat API; read choices[0].message.content." },
    { name: "beta.chat.completions.parse(model, messages, response_format=PydanticModel)", d: "Structured output on Chat Completions; read choices[0].message.parsed." },
    { name: "responses.retrieve(id) / responses.delete(id)", d: "Responses are stored (30 days by default) — fetch or delete them later." },
  ],
  snippets: [
    {
      title: "Generate, continue the conversation, stream",
      code: `r1 = client.responses.create(
    model="gpt-4.1-mini",                      # deployment name
    instructions="Answer briefly.",
    input="What is the size of France in square miles?")
print(r1.output_text)

r2 = client.responses.create(model="gpt-4.1-mini",
    previous_response_id=r1.id,               # multi-turn without resending history
    input="And what is the capital?")

for event in client.responses.create(model="gpt-4.1-mini", input="Summarize RAG in one line.", stream=True):
    if event.type == "response.output_text.delta":
        print(event.delta, end="")`,
    },
    {
      title: "Structured output with Pydantic (and the raw schema form)",
      code: `from pydantic import BaseModel

class CalendarEvent(BaseModel):
    name: str
    date: str
    participants: list[str]

r = client.responses.parse(model="gpt-4.1-mini",
    input="Alice and Bob are going to a science fair on Friday.",
    text_format=CalendarEvent)
event = r.output_parsed                       # a CalendarEvent instance

r = client.responses.create(model="gpt-4.1-mini", input="...", text={"format": {
    "type": "json_schema", "name": "CalendarEvent", "strict": True,
    "schema": {"type": "object",
               "properties": {"name": {"type": "string"}, "date": {"type": "string"}},
               "required": ["name", "date"], "additionalProperties": False}}})`,
      notes: ["Chat Completions puts the schema in response_format={\"type\": \"json_schema\", \"json_schema\": {...}}; Responses puts it in text.format."],
    },
  ],
  gotchas: [
    "JSON mode only guarantees valid JSON; strict structured outputs guarantee your schema.",
    "Strict schemas: every property must be listed in required (use a null type for optional fields) and additionalProperties must be false.",
    "Structured outputs don't support parallel function calls — set parallel_tool_calls=False when using strict tools.",
    "Reasoning models: use max_completion_tokens (Chat) and the reasoning effort setting; temperature/top_p aren't supported.",
    "For tool calling with the newest reasoning models, prefer the Responses API.",
  ],
};

const agents = {
  id: "agents", title: "Agents (Foundry Agent Service)", icon: "🤖", domain: "genai",
  pkg: "azure-ai-projects ≥ 2.x (classes in azure.ai.projects.models)",
  install: "pip install azure-ai-projects azure-identity openai",
  summary: "Define a prompt agent as a versioned resource, then talk to it through conversations + the Responses API. Tools are declared on the agent definition.",
  api: [
    { name: "project.agents.create_version(agent_name, definition=PromptAgentDefinition(model, instructions, tools))", d: "Creates the agent or adds a new immutable version. The endpoint uses the latest version unless you pin one." },
    { name: "project.get_openai_client(agent_name=...)", d: "OpenAI client bound to one agent (or pass extra_body={\"agent_reference\": {\"name\": …, \"type\": \"agent_reference\"}} per call)." },
    { name: "openai.conversations.create(items=[...])", d: "Server-side conversation state (replaces classic threads)." },
    { name: "openai.responses.create(conversation=conv.id, input=...)", d: "Run the agent for a turn (replaces classic runs)." },
    { name: "FunctionTool(name, description, parameters, strict)", d: "Declare a function; the agent returns a function_call item your code must execute." },
    { name: 'FunctionCallOutput(type="function_call_output", call_id, output)', d: "Send the function result back (call_id, not tool_call_id)." },
    { name: "FileSearchTool(vector_store_ids=[...])", d: "Ground on uploaded files (openai.vector_stores.create + files.upload_and_poll)." },
    { name: "CodeInterpreterTool(container=AutoCodeInterpreterToolParam(file_ids=[...]))", d: "Sandboxed Python over uploaded files (purpose=\"assistants\")." },
    { name: "AzureAISearchTool(azure_ai_search=AzureAISearchToolResource(indexes=[AISearchIndexResource(...)]))", d: "Ground on an existing index via a project connection ID + index_name + query_type." },
    { name: "MCPTool(server_label, server_url, require_approval, project_connection_id, allowed_tools)", d: "Remote MCP server tools; require_approval defaults to \"always\"." },
    { name: 'McpApprovalResponse(type="mcp_approval_response", approve, approval_request_id)', d: "Answer an mcp_approval_request item (human-in-the-loop)." },
    { name: "project.agents.delete_version(agent_name, agent_version)", d: "Clean up an agent version." },
  ],
  snippets: [
    {
      title: "Prompt agent with a function tool (full round trip)",
      code: `import json
from azure.ai.projects.models import PromptAgentDefinition, FunctionTool
from openai.types.responses.response_input_param import FunctionCallOutput

weather = FunctionTool(name="get_weather", description="Current weather for a city.",
    parameters={"type": "object", "properties": {"city": {"type": "string"}},
                "required": ["city"], "additionalProperties": False}, strict=True)

agent = project.agents.create_version(agent_name="travel-helper",
    definition=PromptAgentDefinition(model="gpt-4.1-mini",
        instructions="Help travelers. Use tools for live data.", tools=[weather]))

with project.get_openai_client(agent_name=agent.name) as openai:
    conv = openai.conversations.create()
    response = openai.responses.create(conversation=conv.id, input="Do I need a coat in Oslo?")
    outputs = []
    for item in response.output:
        if item.type == "function_call" and item.name == "get_weather":
            result = get_weather(**json.loads(item.arguments))        # YOUR code runs it
            outputs.append(FunctionCallOutput(type="function_call_output",
                                              call_id=item.call_id, output=json.dumps(result)))
    response = openai.responses.create(conversation=conv.id, input=outputs)
    print(response.output_text)`,
      notes: ["Return every function result in one follow-up call."],
    },
    {
      title: "Built-in tools: file search, code interpreter, AI Search, MCP",
      code: `from azure.ai.projects.models import (PromptAgentDefinition, FileSearchTool, CodeInterpreterTool,
    AutoCodeInterpreterToolParam, AzureAISearchTool, AzureAISearchToolResource,
    AISearchIndexResource, AzureAISearchQueryType, MCPTool)

openai = project.get_openai_client()
vs = openai.vector_stores.create(name="handbook")
with open("handbook.pdf", "rb") as f:
    openai.vector_stores.files.upload_and_poll(vector_store_id=vs.id, file=f)
with open("sales.csv", "rb") as f:
    csv = openai.files.create(purpose="assistants", file=f)

tools = [
    FileSearchTool(vector_store_ids=[vs.id]),
    CodeInterpreterTool(container=AutoCodeInterpreterToolParam(file_ids=[csv.id])),
    AzureAISearchTool(azure_ai_search=AzureAISearchToolResource(indexes=[AISearchIndexResource(
        project_connection_id=project.connections.get("search-conn").id,   # the ID, not the name
        index_name="policies", query_type=AzureAISearchQueryType.SIMPLE)])),
    MCPTool(server_label="github", server_url="https://api.githubcopilot.com/mcp",
            require_approval="always", project_connection_id="github-mcp-conn"),
]
agent = project.agents.create_version(agent_name="analyst",
    definition=PromptAgentDefinition(model="gpt-4.1", instructions="...", tools=tools))`,
    },
    {
      title: "Approve (or reject) an MCP tool call",
      code: `from openai.types.responses.response_input_param import McpApprovalResponse

response = openai.responses.create(conversation=conv.id, input="Open an issue for the login bug")
approvals = []
for item in response.output:
    if item.type == "mcp_approval_request":
        print("Agent wants:", item.server_label, item.name, item.arguments)
        approvals.append(McpApprovalResponse(type="mcp_approval_response",
                                             approve=user_said_yes(), approval_request_id=item.id))
if approvals:
    response = openai.responses.create(conversation=conv.id, input=approvals)
print(response.output_text)`,
      notes: ["require_approval: \"always\" (default), \"never\", or per-tool {\"never\": [...]} / {\"always\": [...]}."],
    },
  ],
  gotchas: [
    "Function calling: the agent only PROPOSES the call — your app executes it and sends function_call_output with the matching call_id.",
    "MCPTool allowed_tools=[] means ALL tools, not none. server_label must be unique per agent.",
    "MCPTool (new, azure.ai.projects.models) vs McpTool (classic, azure.ai.agents.models) — note the casing.",
    "AzureAISearchTool needs the connection's ID; default query_type is vector_semantic_hybrid and top_k is 5.",
    "Agent versions are immutable; the agent endpoint routes to the latest version unless you pin one.",
    "Roles: Foundry User to build and run agents; Foundry Agent Consumer to only invoke them. API keys don't work on agent endpoints.",
    "Code interpreter sessions last up to an hour (30 minutes idle) and are billed separately.",
  ],
};

const classicAgents = {
  id: "classic", title: "Classic agents (threads & runs)", icon: "🧵", domain: "genai",
  pkg: "azure-ai-agents · azure-ai-projects 1.x — deprecated, retires Mar 31, 2027",
  install: "pip install azure-ai-agents azure-identity",
  summary: "Older exam questions use the threads → messages → runs model. Know the run lifecycle and how tool outputs are submitted; new code should migrate to conversations + responses.",
  api: [
    { name: "create_agent(model, name, instructions, tools | toolset)", d: "Create a classic agent (removed in azure-ai-projects 2.x)." },
    { name: "threads.create() · messages.create(thread_id, role, content)", d: "Conversation container + user message." },
    { name: "runs.create(thread_id, agent_id) / runs.create_and_process(...)", d: "Start a run; create_and_process polls until it finishes (and auto-executes functions if enabled)." },
    { name: "run.status", d: "queued → in_progress → requires_action → completed | failed | cancelled | expired." },
    { name: "run.required_action.submit_tool_outputs.tool_calls", d: "The function calls the agent is waiting on." },
    { name: 'runs.submit_tool_outputs(thread_id, run_id, tool_outputs=[{"tool_call_id": ..., "output": ...}])', d: "Return function results so the run can continue." },
    { name: "enable_auto_function_calls(toolset)", d: "Let the SDK execute FunctionTool functions automatically during create_and_process." },
    { name: "messages.list(thread_id, order=ListSortOrder.ASCENDING) · delete_agent(agent_id)", d: "Read the conversation; clean up." },
  ],
  snippets: [
    {
      title: "Manual requires_action loop",
      code: `import time
from azure.ai.agents.models import FunctionTool

functions = FunctionTool(functions={fetch_weather})
agent = agents.create_agent(model="gpt-4.1-mini", name="weather",
                            instructions="Use tools for weather.", tools=functions.definitions)
thread = agents.threads.create()
agents.messages.create(thread_id=thread.id, role="user", content="Weather in New York?")
run = agents.runs.create(thread_id=thread.id, agent_id=agent.id)

while run.status in ("queued", "in_progress", "requires_action"):
    time.sleep(1)
    run = agents.runs.get(thread_id=thread.id, run_id=run.id)
    if run.status == "requires_action":
        calls = run.required_action.submit_tool_outputs.tool_calls
        outputs = [{"tool_call_id": c.id, "output": fetch_weather("New York")} for c in calls]
        agents.runs.submit_tool_outputs(thread_id=thread.id, run_id=run.id, tool_outputs=outputs)

agents.delete_agent(agent.id)`,
      notes: ["agents = project_client.agents (azure-ai-projects 1.x) or AgentsClient(endpoint, credential)."],
    },
  ],
  gotchas: [
    "Migration map: threads → conversations, runs → responses, create_agent → agents.create_version.",
    "Classic tool outputs use tool_call_id; the new Responses API uses call_id.",
    "A run stuck in requires_action is waiting for submit_tool_outputs — nothing happens until your code replies.",
    "Runs expire if tool outputs aren't submitted in time (about 10 minutes).",
  ],
};

const searchQuery = {
  id: "search", title: "Embeddings + AI Search queries", icon: "🔎", domain: "extraction",
  pkg: "openai · azure-search-documents 12.x",
  install: "pip install openai azure-search-documents azure-identity",
  summary: "Embed text, then retrieve with hybrid (keyword + vector) search and the semantic ranker — the default RAG retrieval pattern.",
  api: [
    { name: "client.embeddings.create(model, input, dimensions)", d: "Vectors for one or many chunks; read data[i].embedding. dimensions shortens text-embedding-3* vectors." },
    { name: "SearchClient(endpoint, index_name, credential)", d: "Query/load one index. DefaultAzureCredential needs RBAC enabled on the service; or AzureKeyCredential." },
    { name: "VectorizableTextQuery(text, k_nearest_neighbors, fields)", d: "Send TEXT; the index's vectorizer embeds it at query time." },
    { name: "VectorizedQuery(vector, k_nearest_neighbors, fields)", d: "Send a vector you already computed." },
    { name: "search(search_text, vector_queries, query_type=\"semantic\", semantic_configuration_name, filter, select, top)", d: "search_text + vector_queries = hybrid (RRF); query_type=\"semantic\" adds L2 re-ranking." },
    { name: "query_caption=\"extractive\" · query_answer=\"extractive\" · results.get_answers()", d: "Semantic captions/answers (verbatim text from your documents)." },
    { name: "r[\"@search.score\"] · r[\"@search.reranker_score\"] · r[\"@search.captions\"]", d: "Per-result relevance: BM25/RRF score, semantic score (0–4), captions." },
    { name: "upload_documents / merge_or_upload_documents / delete_documents(documents=[...])", d: "Push model: write documents directly instead of using an indexer." },
  ],
  snippets: [
    {
      title: "Embed and run a hybrid + semantic query",
      code: `from azure.identity import DefaultAzureCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizableTextQuery

emb = client.embeddings.create(model="text-embedding-3-large",      # deployment name
                               input=["chunk one", "chunk two"], dimensions=1024)
vectors = [d.embedding for d in emb.data]

search = SearchClient(SEARCH_ENDPOINT, "policies", DefaultAzureCredential())
results = search.search(
    search_text=question,                                            # keyword leg
    vector_queries=[VectorizableTextQuery(text=question, k_nearest_neighbors=50, fields="text_vector")],
    query_type="semantic", semantic_configuration_name="semantic-config",
    query_caption="extractive", query_answer="extractive",
    filter="department eq 'HR'", select=["chunk_id", "chunk", "title"], top=5)

for r in results:
    print(r["@search.reranker_score"], r["title"], r["chunk"][:80])`,
      notes: ["Use k_nearest_neighbors=50 with the semantic ranker — it only re-ranks the top 50."],
    },
  ],
  gotchas: [
    "VectorizableTextQuery only works if a vectorizer is attached to the field's vector profile; otherwise compute the vector and use VectorizedQuery.",
    "The query vector must match the index field's dimensions — and come from the same embedding model used at indexing time.",
    "@search.reranker_score runs 0–4 and only exists when query_type=\"semantic\".",
    "Semantic answers/captions are extracted verbatim, not generated; ordering by a field with semantic ranking returns an error.",
    "Keyless search: enable RBAC on the service; roles = Search Index Data Reader (query), Search Index Data Contributor (load), Search Service Contributor (manage indexes).",
    "text-embedding-3-large defaults to 3,072 dimensions and 3-small to 1,536; switching models means re-embedding everything.",
  ],
};

const searchIndex = {
  id: "indexing", title: "AI Search index & ingestion", icon: "🗂️", domain: "extraction",
  pkg: "azure-search-documents 12.x (SearchIndexClient · SearchIndexerClient)",
  install: "pip install azure-search-documents azure-identity",
  summary: "Define the index (vector field, HNSW, vectorizer, semantic config) and an indexer pipeline that chunks and embeds documents automatically (integrated vectorization).",
  api: [
    { name: "SearchField(name, type=SearchFieldDataType.Collection(SearchFieldDataType.SINGLE), vector_search_dimensions, vector_search_profile_name)", d: "A vector field. Other fields: key=True, filterable, searchable (SearchableField)." },
    { name: "VectorSearch(algorithms=[HnswAlgorithmConfiguration], profiles=[VectorSearchProfile], vectorizers=[AzureOpenAIVectorizer])", d: "Algorithm (HNSW or exhaustive KNN) + profile tying a field to an algorithm and a vectorizer." },
    { name: "AzureOpenAIVectorizer(vectorizer_name, parameters=AzureOpenAIVectorizerParameters(resource_url, deployment_name, model_name))", d: "Embeds query text at search time." },
    { name: "SemanticSearch(configurations=[SemanticConfiguration(prioritized_fields=SemanticPrioritizedFields(...))])", d: "Which fields the semantic ranker reads (title, content, keywords)." },
    { name: "SearchIndexClient(endpoint, credential).create_or_update_index(SearchIndex(...))", d: "Create/update the index definition." },
    { name: "SearchIndexerClient.create_or_update_data_source_connection / _skillset / _indexer", d: "Pull model: data source → skillset → indexer; run_indexer(name) to re-run." },
    { name: "SplitSkill(text_split_mode=\"pages\", maximum_page_length, page_overlap_length)", d: "Chunk documents with overlap." },
    { name: "AzureOpenAIEmbeddingSkill(resource_url, deployment_name, model_name, dimensions)", d: "Embed each chunk during indexing." },
    { name: "SearchIndexerIndexProjection(selectors=[...], parameters=...SKIP_INDEXING_PARENT_DOCUMENTS)", d: "Index projections: one source document → many chunk documents with a parent key." },
  ],
  snippets: [
    {
      title: "Index with a vector field, vectorizer and semantic config",
      code: `from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (SearchIndex, SearchField, SearchableField,
    SearchFieldDataType, VectorSearch, HnswAlgorithmConfiguration, VectorSearchProfile,
    AzureOpenAIVectorizer, AzureOpenAIVectorizerParameters, SemanticSearch,
    SemanticConfiguration, SemanticPrioritizedFields, SemanticField)

fields = [
    SearchField(name="chunk_id", type=SearchFieldDataType.STRING, key=True, analyzer_name="keyword"),
    SearchField(name="parent_id", type=SearchFieldDataType.STRING, filterable=True),
    SearchableField(name="chunk", type=SearchFieldDataType.STRING),
    SearchField(name="text_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.SINGLE),
                searchable=True, vector_search_dimensions=1024, vector_search_profile_name="hnsw-profile"),
]
vector_search = VectorSearch(
    algorithms=[HnswAlgorithmConfiguration(name="hnsw")],
    profiles=[VectorSearchProfile(name="hnsw-profile", algorithm_configuration_name="hnsw", vectorizer_name="aoai")],
    vectorizers=[AzureOpenAIVectorizer(vectorizer_name="aoai", parameters=AzureOpenAIVectorizerParameters(
        resource_url=AOAI_ENDPOINT, deployment_name="text-embedding-3-large", model_name="text-embedding-3-large"))])
semantic = SemanticSearch(default_configuration_name="semantic-config", configurations=[SemanticConfiguration(
    name="semantic-config", prioritized_fields=SemanticPrioritizedFields(content_fields=[SemanticField(field_name="chunk")]))])

SearchIndexClient(SEARCH_ENDPOINT, cred).create_or_update_index(
    SearchIndex(name="policies", fields=fields, vector_search=vector_search, semantic_search=semantic))`,
    },
    {
      title: "Indexer pipeline: chunk + embed + project to chunk documents",
      code: `from azure.search.documents.indexes import SearchIndexerClient
from azure.search.documents.indexes.models import (SearchIndexerDataSourceConnection, SearchIndexerDataContainer,
    SplitSkill, AzureOpenAIEmbeddingSkill, InputFieldMappingEntry as In, OutputFieldMappingEntry as Out,
    SearchIndexerSkillset, SearchIndexerIndexProjection, SearchIndexerIndexProjectionSelector,
    SearchIndexerIndexProjectionsParameters, IndexProjectionMode, SearchIndexer)

ic = SearchIndexerClient(SEARCH_ENDPOINT, cred)
ds = ic.create_or_update_data_source_connection(SearchIndexerDataSourceConnection(name="docs-ds",
    type="azureblob", connection_string=STORAGE_CONN, container=SearchIndexerDataContainer(name="docs")))

split = SplitSkill(context="/document", text_split_mode="pages", maximum_page_length=2000, page_overlap_length=500,
    inputs=[In(name="text", source="/document/content")], outputs=[Out(name="textItems", target_name="pages")])
embed = AzureOpenAIEmbeddingSkill(context="/document/pages/*", resource_url=AOAI_ENDPOINT,
    deployment_name="text-embedding-3-large", model_name="text-embedding-3-large", dimensions=1024,
    inputs=[In(name="text", source="/document/pages/*")], outputs=[Out(name="embedding", target_name="text_vector")])
projection = SearchIndexerIndexProjection(
    selectors=[SearchIndexerIndexProjectionSelector(target_index_name="policies", parent_key_field_name="parent_id",
        source_context="/document/pages/*", mappings=[In(name="chunk", source="/document/pages/*"),
                                                      In(name="text_vector", source="/document/pages/*/text_vector")])],
    parameters=SearchIndexerIndexProjectionsParameters(projection_mode=IndexProjectionMode.SKIP_INDEXING_PARENT_DOCUMENTS))

ic.create_or_update_skillset(SearchIndexerSkillset(name="docs-ss", skills=[split, embed], index_projection=projection))
ic.create_or_update_indexer(SearchIndexer(name="docs-idxr", data_source_name=ds.name,
                                          target_index_name="policies", skillset_name="docs-ss"))`,
      notes: ["The indexer runs when created; call ic.run_indexer(\"docs-idxr\") to re-run it."],
    },
  ],
  gotchas: [
    "The embedding skill's dimensions must equal the field's vector_search_dimensions (and the vectorizer must use the same model).",
    "Chunk BEFORE embedding — the embedding skill has an input token limit.",
    "The search service's managed identity needs Cognitive Services OpenAI User on the model resource to call the embedding skill/vectorizer.",
    "azure-search-documents 12.x uses UPPER_CASE SearchFieldDataType members (STRING, SINGLE); old PascalCase names still work.",
    "Vector fields use Collection(Edm.Single) — SearchFieldDataType.Collection(SearchFieldDataType.SINGLE).",
  ],
};

const docIntel = {
  id: "docintel", title: "Document Intelligence", icon: "📄", domain: "extraction",
  pkg: "azure-ai-documentintelligence (v4 API 2024-11-30)",
  install: "pip install azure-ai-documentintelligence azure-identity",
  summary: "Run prebuilt or custom models over documents: layout as markdown for RAG chunking, or typed fields with confidence from invoices, receipts, IDs and more.",
  api: [
    { name: "DocumentIntelligenceClient(endpoint, credential)", d: "v4 client. (The older DocumentAnalysisClient lives in azure-ai-formrecognizer.)" },
    { name: "begin_analyze_document(model_id, body, *, pages, locale, features, output_content_format)", d: "Long-running operation; call .result() on the poller." },
    { name: "AnalyzeDocumentRequest(url_source=...) / (bytes_source=...)", d: "Analyze from a URL or bytes (or pass an open file as body)." },
    { name: "output_content_format=DocumentContentFormat.MARKDOWN", d: "Markdown content keeps headings and tables — ideal for layout-aware chunking." },
    { name: "\"prebuilt-read\" / \"prebuilt-layout\" / \"prebuilt-invoice\" …", d: "Model ids: OCR only, structure + tables, or a typed document model." },
    { name: "result.content · result.tables · result.documents[i].fields", d: "Text/markdown, tables (cells with row/column index) and typed fields (value_string, value_currency…, confidence)." },
  ],
  snippets: [
    {
      title: "Layout to markdown, then invoice fields with confidence",
      code: `from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest, DocumentContentFormat
from azure.identity import DefaultAzureCredential

client = DocumentIntelligenceClient(DI_ENDPOINT, DefaultAzureCredential())

layout = client.begin_analyze_document("prebuilt-layout", AnalyzeDocumentRequest(url_source=pdf_url),
                                       output_content_format=DocumentContentFormat.MARKDOWN).result()
markdown = layout.content                       # feed to a layout-aware chunker / index
for t in layout.tables or []:
    print(t.row_count, t.column_count)

with open("invoice.pdf", "rb") as f:
    inv = client.begin_analyze_document("prebuilt-invoice", body=f, locale="en-US").result()
for doc in inv.documents or []:
    total = doc.fields.get("InvoiceTotal")
    if total and total.confidence >= 0.8:
        print(total.value_currency.amount, total.value_currency.currency_code)
    else:
        send_to_human_review(doc)`,
    },
  ],
  gotchas: [
    "begin_ = long-running: you get a poller; .result() waits for the analysis.",
    "Pass URLs through AnalyzeDocumentRequest(url_source=…) — v4 has no separate *_from_url method.",
    "Typed values are on value_string / value_number / value_date / value_currency; content is the raw text; confidence is 0–1.",
    "Entra ID auth needs a custom-subdomain endpoint (not a regional endpoint).",
  ],
};

const contentUnderstanding = {
  id: "cu", title: "Content Understanding", icon: "🧩", domain: "extraction",
  pkg: "azure-ai-contentunderstanding (GA, API 2025-11-01)",
  install: "pip install azure-ai-contentunderstanding azure-identity",
  summary: "Generative analyzers for documents, images, audio and video: markdown for RAG plus schema fields (extract / generate / classify) with confidence and grounding.",
  api: [
    { name: "ContentUnderstandingClient(endpoint, credential)", d: "Endpoint of the Foundry resource; caller needs Cognitive Services User." },
    { name: "update_defaults(model_deployments={...})", d: "ONE-TIME mapping of model names to your deployments — analyzers fail until this is set." },
    { name: "ContentFieldDefinition(type, method=GenerationMethod.EXTRACT | GENERATE | CLASSIFY, description, enum)", d: "One field in the schema; CLASSIFY picks from enum values." },
    { name: "ContentAnalyzer(base_analyzer_id, field_schema, config, models)", d: "Custom analyzer built on a prebuilt base (e.g. prebuilt-document)." },
    { name: "begin_create_analyzer(analyzer_id, resource)", d: "Create the analyzer (long-running)." },
    { name: "begin_analyze(analyzer_id, inputs=[AnalysisInput(url=...)]) · begin_analyze_binary(...)", d: "Analyze a URL or bytes; result.contents[0].markdown and .fields[name].value / .confidence." },
    { name: "REST: PUT /contentunderstanding/analyzers/{id} · POST …/{id}:analyze · GET analyzerResults/{id}", d: "Same flow over REST: 201/202 + Operation-Location to poll." },
  ],
  snippets: [
    {
      title: "Custom analyzer with extract, generate and classify fields",
      code: `from azure.ai.contentunderstanding import ContentUnderstandingClient
from azure.ai.contentunderstanding.models import (AnalysisInput, ContentAnalyzer, ContentAnalyzerConfig,
    ContentFieldSchema, ContentFieldDefinition, ContentFieldType, GenerationMethod)
from azure.identity import DefaultAzureCredential

cu = ContentUnderstandingClient(endpoint=FOUNDRY_ENDPOINT, credential=DefaultAzureCredential())
cu.update_defaults(model_deployments={"gpt-4.1": "gpt-4.1", "text-embedding-3-large": "text-embedding-3-large"})

schema = ContentFieldSchema(name="invoice_schema", description="Invoice fields", fields={
    "vendor":   ContentFieldDefinition(type=ContentFieldType.STRING, method=GenerationMethod.EXTRACT,
                                       description="Vendor name", estimate_source_and_confidence=True),
    "summary":  ContentFieldDefinition(type=ContentFieldType.STRING, method=GenerationMethod.GENERATE,
                                       description="One-line summary"),
    "doc_type": ContentFieldDefinition(type=ContentFieldType.STRING, method=GenerationMethod.CLASSIFY,
                                       description="Document type", enum=["invoice", "receipt", "other"])})

analyzer = ContentAnalyzer(base_analyzer_id="prebuilt-document", field_schema=schema,
    config=ContentAnalyzerConfig(estimate_field_source_and_confidence=True),
    models={"completion": "gpt-4.1", "embedding": "text-embedding-3-large"})
cu.begin_create_analyzer(analyzer_id="invoice_analyzer", resource=analyzer).result()

result = cu.begin_analyze(analyzer_id="invoice_analyzer", inputs=[AnalysisInput(url=file_url)]).result()
content = result.contents[0]
print(content.markdown[:200])
for name, field in (content.fields or {}).items():
    print(name, field.value, field.confidence)`,
      notes: ["Model names in the defaults mapping depend on what the docs recommend at the time (gpt-4.1 in SDK 1.1 samples; newer guidance moves to GPT-5 family)."],
    },
  ],
  gotchas: [
    "\"Default model deployment not configured\" = you skipped update_defaults (or PATCH /contentunderstanding/defaults).",
    "extract works for documents only; use generate or classify for images, audio and video fields.",
    "Analyze is a POST to …/{analyzerId}:analyze (note the colon); poll the Operation-Location until Succeeded.",
    "Content Understanding inherits the guardrails of the model deployments it calls — blocked content shows up as warnings/missing fields.",
    "Use confidence thresholds to send low-confidence fields to human review instead of straight-through processing.",
  ],
};

const language = {
  id: "language", title: "Language & Translator", icon: "🌐", domain: "text",
  pkg: "azure-ai-textanalytics 5.x · azure-ai-translation-text 2.x · azure-ai-translation-document 2.x",
  install: "pip install azure-ai-textanalytics azure-ai-translation-text azure-ai-translation-document",
  summary: "Deterministic text analytics (entities, PII, sentiment, language, key phrases, summaries) and translation of text or whole documents.",
  api: [
    { name: "TextAnalyticsClient(endpoint, credential)", d: "Azure Language client (5.x GA). A 6.x TextAnalysisClient exists in preview." },
    { name: "recognize_entities(docs) · recognize_pii_entities(docs, categories_filter=[...])", d: "NER; PII returns entities + redacted_text per document." },
    { name: "analyze_sentiment(docs, show_opinion_mining=True)", d: "Document/sentence sentiment; sentences[].mined_opinions[] → target + assessments (is_negated)." },
    { name: "detect_language(docs, country_hint=\"none\") · extract_key_phrases(docs)", d: "primary_language.name / iso6391_name; key_phrases list." },
    { name: "begin_extract_summary(docs, max_sentence_count) · begin_abstract_summary(docs, sentence_count)", d: "Long-running summarization (extractive picks sentences; abstractive writes new ones)." },
    { name: "TextTranslationClient(credential, region=...) .translate(body=[...], to_language=[...], from_language=...)", d: "Translate text to several languages in ONE call; result[i].translations[j].language / .text." },
    { name: "TranslateInputItem(text, targets=[TranslationTarget(language, deployment_name, tone, gender)])", d: "Translator 2.x per-target options, including LLM-powered translation via a model deployment." },
    { name: "transliterate(body, language, from_script, to_script)", d: "Change script without translating." },
    { name: "DocumentTranslationClient(endpoint, credential).begin_translation(source_url, target_url, target_language, glossaries=[...])", d: "Async batch translation of documents in storage, preserving formatting." },
  ],
  snippets: [
    {
      title: "Entities, PII redaction, opinion mining, summary",
      code: `from azure.core.credentials import AzureKeyCredential
from azure.ai.textanalytics import TextAnalyticsClient

client = TextAnalyticsClient(endpoint=LANGUAGE_ENDPOINT, credential=AzureKeyCredential(KEY))
docs = ["The food was great but the service was not good. Call me at 555-0100."]

for d in client.recognize_pii_entities(docs):
    if not d.is_error:
        print(d.redacted_text)                           # "... Call me at ********."

for d in client.analyze_sentiment(docs, show_opinion_mining=True):
    if d.is_error:
        continue
    print(d.sentiment, d.confidence_scores)
    for s in d.sentences:
        for op in s.mined_opinions:
            print(op.target.text, op.target.sentiment, [(a.text, a.is_negated) for a in op.assessments])

for r in client.begin_abstract_summary(docs, sentence_count=2).result():
    if r.kind == "AbstractiveSummarization":
        print([s.text for s in r.summaries])`,
      notes: ["Results mix real results and DocumentError objects — always check is_error."],
    },
    {
      title: "Translate text (multi-target) and documents",
      code: `from azure.core.credentials import AzureKeyCredential
from azure.ai.translation.text import TextTranslationClient
from azure.ai.translation.document import DocumentTranslationClient

text_client = TextTranslationClient(credential=AzureKeyCredential(KEY), region="westeurope")
resp = text_client.translate(body=["Your order has shipped."], to_language=["fr", "de", "ja"])
for t in resp[0].translations:
    print(t.language, t.text)

doc_client = DocumentTranslationClient(TRANSLATOR_ENDPOINT, AzureKeyCredential(KEY))
poller = doc_client.begin_translation(source_container_sas_url, target_container_sas_url, "es")
for doc in poller.result():
    print(doc.status, doc.translated_document_url)`,
      notes: ["Document translation needs a custom-domain endpoint and container SAS URLs (or managed identity)."],
    },
  ],
  gotchas: [
    "Language/Translator with Entra ID need a custom-subdomain endpoint — regional endpoints only work with keys.",
    "Summaries are long-running: begin_extract_summary / begin_abstract_summary return pollers.",
    "Translator 1.0+ parameter names: body (not content), to_language (not to), from_language (not from_parameter).",
    "A Translator key is paired with region=; omitting the region with a global key fails.",
    "Need formatting preserved? Document translation, not text translation.",
  ],
};

const speech = {
  id: "speech", title: "Speech & Voice Live", icon: "🎙️", domain: "text",
  pkg: "azure-cognitiveservices-speech · azure-ai-transcription · azure-ai-voicelive",
  install: "pip install azure-cognitiveservices-speech",
  summary: "Speech to text (with phrase lists and custom models), text to speech with SSML, speech translation — and the Voice Live SDK for real-time voice agents.",
  api: [
    { name: "SpeechConfig(subscription=key, endpoint=...) | (subscription, region) | (token_credential, endpoint)", d: "Service config; speech_recognition_language = \"en-US\"; endpoint_id = custom speech deployment." },
    { name: "SpeechRecognizer(speech_config, audio_config).recognize_once_async().get()", d: "One utterance (≈30 s or until silence); check result.reason == ResultReason.RecognizedSpeech." },
    { name: "start_continuous_recognition() + recognized / canceled / session_stopped events", d: "Long audio or live captions." },
    { name: "PhraseListGrammar.from_recognizer(rec).addPhrase(\"Contoso\")", d: "Boost specific words at runtime — no training. Note the camelCase addPhrase." },
    { name: "SpeechSynthesizer(speech_config, audio_config).speak_text_async(text) / speak_ssml_async(ssml)", d: "Text to speech; speech_synthesis_voice_name picks the voice (SSML <voice> overrides it)." },
    { name: "SpeechTranslationConfig + add_target_language(\"fr\") → TranslationRecognizer", d: "Speech translation; result.translations[\"fr\"]." },
    { name: "TranscriptionClient(...).transcribe(...)  (azure-ai-transcription)", d: "Fast transcription of a file (synchronous). Batch transcription is REST-only." },
    { name: "azure.ai.voicelive connect(endpoint, credential, model) → conn.session.update(...)", d: "Voice Live: real-time speech-to-speech sessions for voice agents (PCM16 audio)." },
  ],
  snippets: [
    {
      title: "Recognize with a phrase list, then speak a reply",
      code: `import os
import azure.cognitiveservices.speech as speechsdk

cfg = speechsdk.SpeechConfig(subscription=os.environ["SPEECH_KEY"], endpoint=os.environ["SPEECH_ENDPOINT"])
cfg.speech_recognition_language = "en-US"
# cfg.endpoint_id = "<custom-speech-endpoint-id>"      # use a trained Custom Speech model

audio = speechsdk.audio.AudioConfig(use_default_microphone=True)
rec = speechsdk.SpeechRecognizer(speech_config=cfg, audio_config=audio)
phrases = speechsdk.PhraseListGrammar.from_recognizer(rec)
phrases.addPhrase("Contoso")                            # camelCase in Python

result = rec.recognize_once_async().get()
if result.reason == speechsdk.ResultReason.RecognizedSpeech:
    print("Heard:", result.text)
elif result.reason == speechsdk.ResultReason.Canceled:
    print(result.cancellation_details.error_details)

cfg.speech_synthesis_voice_name = "en-US-AvaMultilingualNeural"
synth = speechsdk.SpeechSynthesizer(speech_config=cfg)  # default speaker
synth.speak_ssml_async('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
                       '<voice name="en-US-AvaMultilingualNeural">Thanks! <break time="300ms"/>Anything else?</voice>'
                       '</speak>').get()`,
    },
    {
      title: "Speech translation to two languages",
      code: `import azure.cognitiveservices.speech as speechsdk

tcfg = speechsdk.translation.SpeechTranslationConfig(subscription=KEY, endpoint=SPEECH_ENDPOINT)
tcfg.speech_recognition_language = "en-US"   # full locale for the source
tcfg.add_target_language("fr")               # language code (not "fr-FR") for targets
tcfg.add_target_language("de")

recognizer = speechsdk.translation.TranslationRecognizer(translation_config=tcfg,
    audio_config=speechsdk.audio.AudioConfig(use_default_microphone=True))
r = recognizer.recognize_once_async().get()
if r.reason == speechsdk.ResultReason.TranslatedSpeech:
    print(r.text, r.translations["fr"], r.translations["de"])`,
    },
  ],
  gotchas: [
    "recognize_once handles ONE utterance; use continuous recognition for long audio.",
    "Phrase lists work for real-time, custom endpoints and fast transcription — not batch transcription.",
    "Source language is a locale (en-US); translation targets are language codes (fr, de, zh-Hans).",
    "Entra ID for Speech needs a custom domain; the token scope is https://cognitiveservices.azure.com/.default (different from the ai.azure.com scope used for models).",
    "Batch transcription has no Python SDK — submit it over REST with contentUrls or a container URL.",
  ],
};

const media = {
  id: "media", title: "Images, video & vision input", icon: "🖼️", domain: "vision",
  pkg: "openai (v1 endpoint)",
  install: "pip install openai azure-identity",
  summary: "Generate and edit images with GPT-image deployments, run asynchronous video jobs, and send images into multimodal models.",
  api: [
    { name: "images.generate(model, prompt, n, size, quality, output_format)", d: "Text → image. GPT-image models return base64 only: data[i].b64_json." },
    { name: "images.edit(model, image, mask, prompt, size)", d: "Edit an image; the PNG mask's transparent pixels mark the area to change." },
    { name: "videos.create(model, prompt, size, seconds) · videos.retrieve(id) · videos.download_content(id)", d: "Asynchronous video job: create → poll status → download (Sora-style API on /openai/v1)." },
    { name: "videos.remix(video_id, prompt)", d: "Edit an already generated video with a new prompt." },
    { name: '{"type": "input_image", "image_url": data_url, "detail": "high"}', d: "Responses API image input — image_url is a string, detail sits beside it." },
    { name: '{"type": "image_url", "image_url": {"url": data_url, "detail": "high"}}', d: "Chat Completions image input — image_url is an object." },
  ],
  snippets: [
    {
      title: "Generate, then mask-edit an image",
      code: `import base64

img = client.images.generate(model="gpt-image-1.5",          # your GPT-image deployment
    prompt="Product photo of a teal water bottle on a wooden desk, soft morning light",
    n=1, size="1024x1024", quality="high", output_format="png")
open("bottle.png", "wb").write(base64.b64decode(img.data[0].b64_json))

edit = client.images.edit(model="gpt-image-1.5",
    image=open("bottle.png", "rb"),
    mask=open("background-mask.png", "rb"),                  # same size; transparent = replace
    prompt="Same bottle on a beach at sunset", size="1024x1024")
open("bottle-beach.png", "wb").write(base64.b64decode(edit.data[0].b64_json))`,
      notes: ["Sizes for gpt-image-1.x: 1024x1024, 1024x1536, 1536x1024. output_format png or jpeg."],
    },
    {
      title: "Video generation job (create → poll → download → remix)",
      code: `import time

video = client.videos.create(model=VIDEO_DEPLOYMENT, prompt="A robot walking through a rainy neon city",
                             size="1280x720", seconds="8")
while video.status not in ("completed", "failed", "cancelled"):
    time.sleep(20)
    video = client.videos.retrieve(video.id)

if video.status == "completed":
    client.videos.download_content(video.id, variant="video").write_to_file("city.mp4")
    remix = client.videos.remix(video_id=video.id, prompt="Same scene, golden-hour light")`,
      notes: ["Check the Foundry model retirement schedule before building on a video model — the listed sora-2 versions are past their retirement dates."],
    },
    {
      title: "Ask a multimodal model about an image (both APIs)",
      code: `import base64

b64 = base64.b64encode(open("chart.png", "rb").read()).decode("utf-8")
data_url = f"data:image/png;base64,{b64}"

r = client.responses.create(model="gpt-4.1", input=[{"role": "user", "content": [
    {"type": "input_text", "text": "What trend does this chart show? Only use what is visible."},
    {"type": "input_image", "image_url": data_url, "detail": "high"}]}])
print(r.output_text)

c = client.chat.completions.create(model="gpt-4.1", messages=[{"role": "user", "content": [
    {"type": "text", "text": "Write alt text (one sentence) for this image."},
    {"type": "image_url", "image_url": {"url": data_url, "detail": "low"}}]}])
print(c.choices[0].message.content)`,
    },
  ],
  gotchas: [
    "GPT-image models return base64 (b64_json), not URLs.",
    "The mask must be a PNG with the same dimensions as the image; fully transparent pixels = area to edit.",
    "detail=\"low\" sends one 512×512 version (cheap); \"high\" adds tiles and costs more tokens.",
    "Image URLs must be publicly reachable by the service — otherwise send a base64 data URL.",
    "Video generation is asynchronous: never block a web request waiting for it; poll or use a background worker.",
    "Model retirements move fast here: gpt-image-1 retired Oct 23, 2026 and DALL-E 3 on Mar 4, 2026 — deploy a current GPT-image model.",
  ],
};

const evaluation = {
  id: "eval", title: "Evaluation & red teaming", icon: "📏", domain: "genai",
  pkg: "azure-ai-evaluation (local) · azure-ai-projects ≥ 2.x (cloud)",
  install: 'pip install azure-ai-evaluation "azure-ai-projects>=2.2.0"',
  summary: "Score quality, RAG grounding, safety and agent behavior. New Foundry docs recommend cloud evaluation through the project's OpenAI Evals API; local evaluate() is the classic path you'll still see in exam questions.",
  api: [
    { name: "AzureOpenAIModelConfiguration(azure_endpoint, azure_deployment, api_key | credential)", d: "The judge model for AI-assisted evaluators (groundedness, relevance, coherence, fluency, agent evaluators)." },
    { name: "GroundednessEvaluator(model_config)(query, response, context)", d: "Is the answer supported by the context? Score 1–5, default threshold 3; returns groundedness, groundedness_result (pass/fail), groundedness_reason." },
    { name: "RelevanceEvaluator / CoherenceEvaluator / FluencyEvaluator(model_config)", d: "Other quality evaluators, also 1–5 with a pass threshold." },
    { name: "ViolenceEvaluator(credential, azure_ai_project)", d: "Risk & safety evaluators (also Sexual, SelfHarm, HateUnfairness…) take NO model_config — they call the Foundry safety service. Severity 0–7." },
    { name: "IntentResolutionEvaluator / TaskAdherenceEvaluator / ToolCallAccuracyEvaluator(model_config)", d: "Agent evaluators. ToolCallAccuracy needs tool_definitions plus tool_calls (or response)." },
    { name: "evaluate(data, evaluators, evaluator_config, azure_ai_project, output_path)", d: "Local batch run over a JSONL file; column_mapping uses \"${data.col}\"; returns metrics + rows (+ studio_url when logged to a project)." },
    { name: "openai_client.evals.create(...) / evals.runs.create(...)", d: "Cloud evaluation from project_client.get_openai_client(): testing_criteria with evaluator_name=\"builtin.groundedness\" and data_mapping \"{{item.col}}\"." },
    { name: "RedTeam(azure_ai_project, credential, risk_categories, num_objectives).scan(target, attack_strategies)", d: "AI Red Teaming Agent (PyRIT). Async; reports Attack Success Rate (ASR) per risk category and attack strategy." },
  ],
  snippets: [
    {
      title: "Local evaluate(): quality + safety on a JSONL dataset",
      code: `import os
from azure.identity import DefaultAzureCredential
from azure.ai.evaluation import (AzureOpenAIModelConfiguration, GroundednessEvaluator,
    RelevanceEvaluator, ViolenceEvaluator, evaluate)

model_config = AzureOpenAIModelConfiguration(
    azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
    azure_deployment=os.environ["AZURE_OPENAI_DEPLOYMENT"],   # judge model deployment
    api_key=os.environ["AZURE_OPENAI_API_KEY"])               # or credential=DefaultAzureCredential()
project = os.environ["AZURE_AI_PROJECT"]  # https://<resource>.services.ai.azure.com/api/projects/<project>

result = evaluate(
    data="data.jsonl",                                        # JSONL only for local runs
    evaluators={
        "groundedness": GroundednessEvaluator(model_config),
        "relevance": RelevanceEvaluator(model_config),
        "violence": ViolenceEvaluator(credential=DefaultAzureCredential(), azure_ai_project=project),
    },
    evaluator_config={"groundedness": {"column_mapping": {
        "query": "\${data.query}", "context": "\${data.context}", "response": "\${data.response}"}}},
    azure_ai_project=project,                                 # optional: log the run to Foundry
    output_path="./eval-results.json")
print(result["metrics"])`,
      notes: ["Safety evaluators take credential + azure_ai_project, never model_config.", "Quality scores are 1–5 (pass ≥ 3 by default); safety severities are 0–7."],
    },
    {
      title: "Cloud evaluation (current Foundry docs)",
      code: `from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import TestingCriterionAzureAIEvaluator
from azure.identity import DefaultAzureCredential

project = AIProjectClient(endpoint=PROJECT_ENDPOINT, credential=DefaultAzureCredential())
client = project.get_openai_client()
data_id = project.datasets.upload_file(name="qa", version="1", file_path="data.jsonl").id

ev = client.evals.create(
    name="rag-quality",
    data_source_config={"type": "custom", "item_schema": {"type": "object", "properties": {
        "query": {"type": "string"}, "response": {"type": "string"}, "context": {"type": "string"}}}},
    testing_criteria=[TestingCriterionAzureAIEvaluator(
        type="azure_ai_evaluator", name="groundedness", evaluator_name="builtin.groundedness",
        initialization_parameters={"deployment_name": JUDGE_DEPLOYMENT},
        data_mapping={"query": "{{item.query}}", "context": "{{item.context}}", "response": "{{item.response}}"})])

run = client.evals.runs.create(eval_id=ev.id, name="run-1",
    data_source={"type": "jsonl", "source": {"type": "file_id", "id": data_id}})
# poll client.evals.runs.retrieve(run_id=run.id, eval_id=ev.id) until status == "completed"`,
      notes: ["Cloud runs need the Foundry User role on the project.", "Docs vary between initialization_parameters {\"deployment_name\": …} and {\"model\": …} for the judge."],
    },
    {
      title: "AI Red Teaming Agent scan (local)",
      code: `import asyncio
from azure.identity import DefaultAzureCredential
from azure.ai.evaluation.red_team import RedTeam, RiskCategory, AttackStrategy

red_team = RedTeam(azure_ai_project=PROJECT_ENDPOINT, credential=DefaultAzureCredential(),
    risk_categories=[RiskCategory.Violence, RiskCategory.HateUnfairness,
                     RiskCategory.Sexual, RiskCategory.SelfHarm],
    num_objectives=5)

def my_app(query: str) -> str:          # the system under test
    return call_my_chatbot(query)

asyncio.run(red_team.scan(target=my_app, scan_name="pre-release",
    attack_strategies=[AttackStrategy.EASY, AttackStrategy.MODERATE,
                       AttackStrategy.Compose([AttackStrategy.Base64, AttackStrategy.ROT13])],
    output_path="redteam.json"))       # scorecard with Attack Success Rate`,
      notes: ["pip install \"azure-ai-evaluation[redteam]\" (pulls in PyRIT).", "Local red teaming is single-turn, text-only and labeled 'classic'; cloud red teaming runs through the Evals API."],
    },
  ],
  gotchas: [
    "Two mapping syntaxes: local evaluate() uses \"${data.col}\" (or \"${outputs.x}\" for a target); cloud evaluation uses \"{{item.col}}\".",
    "Risk & safety evaluators take credential + azure_ai_project, not model_config. AI-assisted quality evaluators need model_config (a judge deployment).",
    "Local evaluate() accepts JSONL only; cloud evaluation accepts JSONL or CSV datasets uploaded to the project.",
    "ToolCallAccuracyEvaluator requires tool_definitions plus tool_calls or a response containing them.",
    "RedTeam.scan() is async. Default = 4 harm categories × 10 objectives; with no attack_strategies it sends only baseline direct prompts.",
    "Measure red teaming with Attack Success Rate (ASR) — lower is better.",
  ],
};

const tracing = {
  id: "tracing", title: "Tracing & observability", icon: "🔭", domain: "genai",
  pkg: "azure-monitor-opentelemetry · azure-ai-projects telemetry · opentelemetry-instrumentation-openai-v2",
  install: "pip install azure-ai-projects azure-monitor-opentelemetry opentelemetry-sdk azure-core-tracing-opentelemetry",
  summary: "OpenTelemetry spans for every model call, tool call and agent step, exported to the Application Insights resource connected to your Foundry project.",
  api: [
    { name: "project.telemetry.get_application_insights_connection_string()", d: "Reads the connection string of the App Insights resource connected to the project." },
    { name: "configure_azure_monitor(connection_string=...)", d: "Exports OpenTelemetry traces/metrics/logs to Application Insights (falls back to APPLICATIONINSIGHTS_CONNECTION_STRING)." },
    { name: "AIProjectInstrumentor().instrument()", d: "Auto-instruments Foundry SDK + Responses/agent calls (azure.ai.projects.telemetry). Requires AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING=true." },
    { name: "OpenAIInstrumentor().instrument()", d: "Instruments the plain openai client (package opentelemetry-instrumentation-openai-v2)." },
    { name: "AIAgentsInstrumentor().instrument()", d: "Instrumentation for classic agents (azure.ai.agents.telemetry)." },
    { name: "tracer.start_as_current_span(name) · span.set_attribute(k, v)", d: "Custom spans around your own steps (retrieval, tools, business logic)." },
    { name: "OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true", d: "Records prompt/response content in spans — OFF by default (privacy). Classic docs used AZURE_TRACING_GEN_AI_CONTENT_RECORDING_ENABLED." },
  ],
  snippets: [
    {
      title: "Trace a Foundry app to Application Insights",
      code: `import os
os.environ["AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING"] = "true"              # must be set BEFORE instrument()
os.environ["OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT"] = "true"   # optional, dev only

from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.telemetry import AIProjectInstrumentor
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace

project = AIProjectClient(endpoint=os.environ["FOUNDRY_PROJECT_ENDPOINT"], credential=DefaultAzureCredential())
configure_azure_monitor(connection_string=project.telemetry.get_application_insights_connection_string())
AIProjectInstrumentor().instrument()

tracer = trace.get_tracer(__name__)
with tracer.start_as_current_span("answer-question") as span:
    span.set_attribute("session.id", "user-123")
    client = project.get_openai_client()                                    # create AFTER instrumenting
    print(client.responses.create(model="gpt-4.1-mini", input="Hello").output_text)`,
      notes: ["Traces show up in the project's Tracing view after a few minutes.", "Viewing traces needs read access to the Log Analytics workspace behind App Insights."],
    },
  ],
  gotchas: [
    "Two separate switches: AZURE_EXPERIMENTAL_ENABLE_GENAI_TRACING turns tracing on; OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT records prompt/response text.",
    "Message content is NOT recorded by default — turning it on puts user data into telemetry, so treat traces as sensitive.",
    "Instrument first, then create the OpenAI/agent clients, or early calls won't be traced.",
    "No App Insights connected to the project = no connection string = nothing exported.",
  ],
};

const contentSafety = {
  id: "safety", title: "Content Safety", icon: "🛡️", domain: "plan",
  pkg: "azure-ai-contentsafety (1.0.0 stable; 1.1.0b1 preview adds shield_prompt)",
  install: "pip install azure-ai-contentsafety",
  summary: "Standalone moderation APIs behind Foundry guardrails: harm classification for text and images, blocklists, Prompt Shields and groundedness detection.",
  api: [
    { name: "ContentSafetyClient(endpoint, credential)", d: "AzureKeyCredential or DefaultAzureCredential (needs Cognitive Services User)." },
    { name: "analyze_text(AnalyzeTextOptions(text, categories, output_type, blocklist_names, halt_on_blocklist_hit))", d: "Returns categories_analysis[] with category + severity for Hate, SelfHarm, Sexual, Violence." },
    { name: "analyze_image(AnalyzeImageOptions(image=ImageData(content=bytes)))", d: "Same four harm categories for images." },
    { name: "BlocklistClient.create_or_update_text_blocklist / add_or_update_blocklist_items", d: "Manage custom term lists; matches come back in blocklists_match." },
    { name: "POST /contentsafety/text:shieldPrompt", d: "Prompt Shields: body userPrompt + documents[] → userPromptAnalysis.attackDetected / documentsAnalysis[].attackDetected. REST (SDK method only in preview)." },
    { name: "POST /contentsafety/text:detectGroundedness", d: "Groundedness detection (preview): ungroundedDetected + ungroundedPercentage. Retiring April 30, 2027 → use evaluators." },
  ],
  snippets: [
    {
      title: "Moderate text and image, with a blocklist",
      code: `from azure.core.credentials import AzureKeyCredential
from azure.ai.contentsafety import ContentSafetyClient, BlocklistClient
from azure.ai.contentsafety.models import (AnalyzeTextOptions, AnalyzeImageOptions, ImageData,
    TextCategory, TextBlocklist, AddOrUpdateTextBlocklistItemsOptions, TextBlocklistItem)

cred = AzureKeyCredential(KEY)
client = ContentSafetyClient(ENDPOINT, cred)

r = client.analyze_text(AnalyzeTextOptions(text=user_text, output_type="EightSeverityLevels"))
for c in r.categories_analysis:
    print(c.category, c.severity)                     # block if severity >= your threshold

with open("upload.jpg", "rb") as f:
    img = client.analyze_image(AnalyzeImageOptions(image=ImageData(content=f.read())))

bl = BlocklistClient(ENDPOINT, cred)
bl.create_or_update_text_blocklist(blocklist_name="brand", options=TextBlocklist(blocklist_name="brand"))
bl.add_or_update_blocklist_items(blocklist_name="brand",
    options=AddOrUpdateTextBlocklistItemsOptions(blocklist_items=[TextBlocklistItem(text="competitor-x")]))
r = client.analyze_text(AnalyzeTextOptions(text=user_text, blocklist_names=["brand"], halt_on_blocklist_hit=True))`,
      notes: ["Default output is four severity levels (0, 2, 4, 6); EightSeverityLevels returns 0–7.", "Blocklist edits can take a few minutes to apply."],
    },
    {
      title: "Prompt Shields (REST): jailbreak + indirect attack in one call",
      code: `import requests

resp = requests.post(
    f"{ENDPOINT}/contentsafety/text:shieldPrompt",
    params={"api-version": "2024-09-01"},
    headers={"Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/json"},
    json={"userPrompt": user_message,            # direct (jailbreak) check
          "documents": [retrieved_chunk, email_body]})   # indirect (XPIA) check
result = resp.json()
if result["userPromptAnalysis"]["attackDetected"] or any(d["attackDetected"] for d in result["documentsAnalysis"]):
    raise ValueError("Prompt attack detected — refuse or route to review")`,
      notes: ["userPrompt = user prompt attacks; documents = document (indirect) attacks."],
    },
  ],
  gotchas: [
    "Prompt Shields checks TWO things: userPrompt (direct jailbreak) and documents (indirect injection from RAG chunks, emails, tool output).",
    "Severity output defaults to FourSeverityLevels (0/2/4/6); ask for EightSeverityLevels to get 0–7.",
    "halt_on_blocklist_hit=True stops further harm analysis when a blocklist term matches.",
    "Groundedness detection is preview and retires April 30, 2027 — for new work measure grounding with Foundry evaluators.",
    "The stable SDK targets api-version 2023-10-01; Prompt Shields REST uses 2024-09-01.",
  ],
};

export default {
  desc: "Python patterns the exam expects you to read and complete: which package, which client, which method — and the parameters that trip people up. Copy a snippet, swap in your endpoint and deployment names.",
  lang: "Python",
  groups: [auth, project, responses, agents, classicAgents, searchQuery, searchIndex, docIntel, contentUnderstanding,
    language, speech, media, evaluation, tracing, contentSafety],
};
