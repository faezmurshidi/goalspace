# Application Flow Diagram

This diagram represents the high-level flow of the GoalSpace application, showing how different components interact with each other.

```mermaid
graph TB
    %% Frontend Components
    subgraph Frontend[Frontend - Next.js]
        LP[Landing Page]
        DB[Dashboard]
        SP[Space Page]
        KP[Knowledge Base]
        ST[Settings]
    end

    %% Authentication
    subgraph Auth[Authentication]
        SU[Sign Up]
        SI[Sign In]
        Auth_DB[(Supabase Auth)]
    end

    %% Backend API Routes
    subgraph API[API Routes]
        GEN[/api/generate]
        CHAT[/api/chat-with-mentor]
        PLAN[/api/generate-plan]
        MOD[/api/generate-modules]
        CONT[/api/generate-module-content]
        MIND[/api/generate-mindmap]
        EMB[/api/embeddings]
        TASK[/api/tasks]
    end

    %% AI Services
    subgraph AI[AI Services]
        CL[Claude API]
        GPT[OpenAI API]
        PPL[Perplexity API]
    end

    %% Database
    subgraph DB_Layer[Database Layer]
        SUP[(Supabase DB)]
        VEC[(Vector Store)]
    end

    %% Flow Connections
    LP --> SU
    LP --> SI
    SU & SI --> Auth_DB
    Auth_DB --> DB

    DB --> SP
    DB --> KP
    DB --> ST

    SP --> GEN
    SP --> CHAT
    SP --> PLAN
    SP --> MOD
    SP --> CONT
    SP --> MIND
    SP --> TASK

    KP --> EMB
    EMB --> VEC

    GEN & CHAT & PLAN & MOD & CONT & MIND --> CL
    GEN & CHAT & PLAN --> GPT
    GEN & PLAN --> PPL

    TASK & EMB --> SUP

    %% Styling
    classDef frontend fill:#d4f1f4
    classDef auth fill:#e1f7d5
    classDef api fill:#ffbdbd
    classDef ai fill:#ffe9d6
    classDef db fill:#c9c9ff

    class Frontend,LP,DB,SP,KP,ST frontend
    class Auth,SU,SI,Auth_DB auth
    class API,GEN,CHAT,PLAN,MOD,CONT,MIND,EMB,TASK api
    class AI,CL,GPT,PPL ai
    class DB_Layer,SUP,VEC db
```

## Diagram Explanation

1. **Frontend Layer**
   - Landing Page serves as the entry point
   - Dashboard shows overview of user's spaces
   - Space Page contains the main interaction area
   - Knowledge Base stores and retrieves information
   - Settings for user preferences

2. **Authentication**
   - Sign Up and Sign In handled through Supabase Auth
   - Secure session management

3. **API Routes**
   - Various endpoints handle different functionalities
   - Generate routes for AI-powered content creation
   - Chat endpoints for mentor interactions
   - Task management and embeddings for knowledge base

4. **AI Services**
   - Multiple AI providers (Claude, GPT, Perplexity)
   - Used for different types of content generation
   - Specialized responses based on use case

5. **Database Layer**
   - Supabase DB for structured data
   - Vector Store for semantic search
   - Secure data management with RLS 