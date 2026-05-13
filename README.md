# 🌱 FarmQuest
### 🏆 Project 2030: MyAI Future Hackathon

*   **Track:** Track 1: Padi & Plates (Agrotech & Food Security)
*   **Goal:** Advancing the Nation by Building Solutions with Google AI
*   **Live Demo:** 🚀 [View Application](https://farmquest-frontend-429572655157.us-central1.run.app/)

#### 🎯 Target SDGs
![Goal 2](https://img.shields.io/badge/Goal%202-Zero%20Hunger-D80A24?style=for-the-badge) ![Goal 9](https://img.shields.io/badge/Goal%209-Innovation%20%26%20Infrastructure-FD6925?style=for-the-badge) ![Goal 12](https://img.shields.io/badge/Goal%2012-Responsible%20Consumption-BF8B2E?style=for-the-badge)

---
## 👥 The Team: FarmQuest Pioneers

We are a team of four passionate developers building FarmQuest — an AI-powered agrotech platform designed to transform how Malaysians grow their own food. By combining RAG-grounded planting plans, computer vision disease detection, and a decentralized peer-to-peer marketplace, we aim to help anyone — from urban home growers to smallholder farmers — reduce yield losses and break free from food import dependency. FarmQuest puts smart, gamified agriculture into the hands of everyone, from city balconies to rural backyards.

![FarmQuest](public/images/FarmQuest.png)
| Name | Role | Responsibilities |
| :--- | :--- | :--- |
| **Chun Yao Ting** | Team Lead & AI Architect | Overall system architecture, AI orchestration (Genkit), and Gemini/Vertex AI integration. |
| **Angela Ngu Xin Yi** | Frontend Engineer | Next.js 16 dashboard development, UI/UX design (Tailwind v4), and responsive user experience. |
| **Evelyn Ang** | Backend & Cloud Lead | Express.js API development, Firebase services (Firestore/Auth), and GCP infrastructure. |
| **Teoh Xin Yee** | AI Data Specialist | RAG grounding strategies, Vertex AI Search optimization, and botanical data management. |

---
## 📖 Overview

**FarmQuest** is a hybrid, decentralized agrotech platform designed to solve Malaysia’s multi-billion ringgit food import dependency and the 30-40% yield losses faced by local smallholders. By expanding food production beyond large-scale farms, FarmQuest enables **anyone**—regardless of their agricultural background—to grow their own food right at home. 

Moving from passive technology consumption to active creation, FarmQuest introduces "Technological Sovereignty" into the local agricultural ecosystem, directly aligning with the **Malaysia Madani framework**, **MyDIGITAL**, and the **New Industrial Master Plan (NIMP) 2030**.

### 🚜 The Core Modes
- **Self-Farming Mode**: Plant crops for personal use or hobbies using customized, step-by-step AI-guided farming plans.
- **Marketplace Mode**: A decentralized peer-to-peer ecosystem where users can post crop requests (demand) and accept planning tasks (supply), generating income.
- **Gamified Farming Experience**: Transforms complex agricultural practices into "Quests" with digital rewards, increasing motivation and long-term participation.

---

## 🏗️ Technical Architecture

![FarmQuest Technical Architecture](public/images/architecture.png)

FarmQuest is built on a modern, AI-first stack powered by **Google Cloud Platform** and **Firebase**. The architecture is organized into five specialized layers:

*   **Unified Frontend**: A high-performance **Next.js 16.2.4** and **React 19** interface providing a seamless experience across web and mobile.
*   **AI Orchestration Layer**: Powered by **Firebase Genkit**, this layer manages agentic workflows (Genkit Flows) for complex tasks like RAG-grounded planting plans and multi-modal disease diagnosis.
*   **Intelligent Data & Services**: Leverages **Vertex AI** for industry-leading LLM capabilities (Gemini 2.5 Flash), vector embeddings, and discovery engines.
*   **Scalable Infrastructure**: A robust serverless backend using **Cloud Run** and **Firebase Services** (Firestore, Auth, Storage) for real-time data and high availability.
*   **External Integrations**: Direct connections to **Open-Meteo** (weather), **Perenual** (botanical data), and **Google Calendar** (automated task scheduling) to bridge the digital-physical gap.

---

## 🌟 Key Features & AI Integration

FarmQuest leverages the **Google AI Ecosystem Stack** to power its logic and autonomy:

- **AI Plant Health Doctor (Gemini 2.5 Flash)**: An image-based diagnostic tool that instantly identifies crop diseases and provides step-by-step recovery timelines.
- **Precision RAG Marketplace**: A peer-to-peer trading hub. FarmQuest uses a custom Retrieval-Augmented Generation (RAG) system powered by **Vertex AI Embeddings (text-embedding-004)** to "read" local plant databases and price indices. The AI suggests fair market prices and local plant alternatives based on vector similarity.
- **Grounded Planting Plans**: High-precision planting schedules for soil, nutrition, and seed management. Plans are generated in *Budget*, *Balanced*, and *Premium* tiers, tailored to the farmer's specific budget and environmental conditions (via Open-Meteo GPS data).
- **Gamified Farmer Quests & Google Calendar Sync**: FarmQuest acts as an autonomous agent, turning best practices into actionable quests and pushing "Care Calendar" tasks directly into the user's Google Calendar.

---

## 🏢 Business Model

FarmQuest targets the market gap of **demand-first farming** and **decentralized participation** through a comprehensive four-pillar business model:

1. **C2C (Consumer-to-Consumer)**: A small 3–5% transaction fee on the Peer-to-Peer Marketplace where users trade seeds, plants, and produce.
2. **B2C (Business-to-Consumer)**: A freemium subscription model. Basic features are free, while premium users get advanced insights, predictive analytics, and enhanced AI guidance.
3. **B2B (Business-to-Business)**: Partnerships with seed suppliers, fertilizer companies, and food businesses. Revenue is generated via product sales commissions and service fees.
4. **B2G (Business-to-Government)**: Providing national crop data, demand trends, and food supply analytics to support policy-making and national food security planning.

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js v18.x or higher
- Google Cloud Platform (GCP) Account with Vertex AI enabled
- Firebase Project configuration

### 1. Installation

Clone the repository and install the necessary dependencies:

```bash
git clone https://github.com/yourusername/FarmQuest.git
cd FarmQuest
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory and add the necessary API keys and Firebase credentials:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=farmquest-86532
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Calendar API (OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Open-Meteo API endpoint (No Auth Required)
NEXT_PUBLIC_METEO_API_URL=https://api.open-meteo.com/v1/forecast

# Optional Vertex AI Search config for RAG grounding
GOOGLE_VERTEX_SEARCH_DATASTORE=your_datastore_id
GOOGLE_VERTEX_SEARCH_COLLECTION=default_collection
GOOGLE_VERTEX_SEARCH_SERVING_CONFIG=default_search
GOOGLE_VERTEX_SEARCH_LOCATION=global
```

### 3. Genkit Orchestration & Agentic Workflow
FarmQuest uses **Firebase Genkit** for its agentic backend to satisfy the project's agentic workflow criteria. This provides observability into AI sub-steps and tool execution.

**To run the Genkit-instrumented backend:**
1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies (including `genkit-cli`):
   ```bash
   npm install
   ```
3. Start the server with Genkit tracing enabled:
   ```bash
   npm run genkit:dev
   ```
4. Open the **Genkit Developer UI** at `http://localhost:4001` to inspect flows, tools, and traces.

### 4. Local Development
To run the full application locally, you need two terminals running simultaneously:

**Terminal 1: Backend Server**
```bash
cd server
npm run dev
```

**Terminal 2: Frontend Interface**
```bash
# In the root directory
npm run dev
```

Navigate to `http://localhost:3000` to access the FarmQuest dashboard.

### Vertex AI Search import files

If you want to import FarmQuest data into Vertex AI Search, generate JSONL files with:

```bash
npm run reshape:vertex-search
```

This writes:

- `server/data/vertex-search/plants.jsonl`
- `server/data/vertex-search/prices.jsonl`

The files contain flattened, document-id-based records that are easier to import into a structured Vertex AI Search data store.

---

## 🚀 Deployment to Google Cloud Run

To satisfy the hackathon's technical mandate, FarmQuest is fully containerized and deployable via Google Cloud Run.

1. **Build the Docker Image**:
   ```bash
   gcloud builds submit --tag gcr.io/farmquest-86532/farmquest-app
   ```

2. **Deploy to Cloud Run**:
   ```bash
   gcloud run deploy farmquest-app \
     --image gcr.io/farmquest-86532/farmquest-app \
     --platform managed \
     --region asia-southeast1 \
     --allow-unauthenticated
   ```

---



## 🤝 Contribution & License

FarmQuest is developed for the **Project 2030: MyAI Future Hackathon**. We strongly adhere to the hackathon's Code of Conduct and encourage open-source innovation under ethical AI principles.

**"Advance the Nation by Building Solutions with Google AI"**
