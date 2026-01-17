# Syncrup: AI-Powered Code Impact Analysis Platform

Syncrup is a sophisticated ecosystem designed to provide **cross-repository code impact analysis**. By leveraging Abstract Syntax Tree (AST) parsing, Graph Databases (Neo4j), and Large Language Models (LLMs), Syncrup predicts the "blast radius" of code changes in real-time across your entire microservices or multi-repo architecture.

## 🚀 Key Features

- **Cross-Repo Tracing**: Trace how a change in a backend service (e.g., an API endpoint signature) affects frontend consumers or other services.
- **AI-Enriched Analysis**: Uses LLMs (Groq/Gemini) to determine if a code change is breaking and provide semantic context.
- **Real-time Impact Alerts**: Integrates with GitHub Webhooks to provide instant feedback on Pull Requests and Pushes.
- **Interactive Graph Visualization**: Visualize your codebase as a living graph of files, functions, and dependencies.
- **Language Agnostic Parsing**: Supports TypeScript, JavaScript, and Python out-of-the-box using dedicated AST workers.

## 🏗️ System Architecture

Syncrup is composed of three primary components:

1.  **[Intelligence Engine (`ai_server`)](./ai_server/sample)**: Python/FastAPI service responsible for AST parsing, Neo4j graph management, and LLM-based impact analysis.
2.  **[Orchestration Server (`syncrup_server`)](./syncrup_server)**: Node.js/Express service that manages project meta-data, coordinates with the AI engine, and handles real-time socket communication.
3.  **[Dashboard & UI (`syncrup_web`)](./syncrup_web)**: A modern React-based dashboard for visualizing reports and exploring the code dependency graph.

### The Flow
1.  **Code Change**: A developer pushes code or opens a PR.
2.  **Orchestration**: `syncrup_server` receives a webhook and fetches the diff.
3.  **Analysis**: `ai_server` parses the diff, traverses the Neo4j graph, and consults an LLM to assess impact.
4.  **Feedback**: Results are streamed via Socket.io to the `syncrup_web` dashboard.

## 🛠️ Technology Stack

| Component | Stack |
| :--- | :--- |
| **Logic & AI** | Python 3.12, FastAPI, Groq (Llama 3), Gemini |
| **Backend** | Node.js, Express, TypeScript, Prisma (MySQL) |
| **Frontend** | React 19, Vite, TailwindCSS 4, Ant Design 6 |
| **Persistence** | Neo4j (Graph), MySQL (Relational) |

## 🏁 Getting Started

To get the entire system running, follow the setup instructions in each component directory:

1.  **[AI Server Setup](./ai_server/sample/README.md)**
2.  **[Syncrup Server Setup](./syncrup_server/README.md)**
3.  **[Web Dashboard Setup](./syncrup_web/frontend/README.md)**

## 📜 Documentation

- [System Context](./SYSTEM_CONTEXT.md) - Detailed technical overview.
- [Architecture](./syncrup_web/ARCHITECTURE.md) - Deep dive into design decisions.
