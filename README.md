Sistema de Telemedicina AI (Mwenho TelemedAI)
Descrição: O Mwenho TelemedAI é uma plataforma de telemedicina integrada com Inteligência Artificial (Google Gemini), desenvolvida para automatizar a triagem de pacientes, auxiliar profissionais de saúde no diagnóstico, gerenciar consultas por vídeo em tempo real e emitir prescrições digitais, em conformidade com as diretrizes da LGPD (Lei Geral de Proteção de Dados).

Principais Módulos do Sistema
Portal do Paciente: Triagem conversacional via Inteligência Artificial, geração de laudos de pré-anamnese com classificação de risco (Baixo, Moderado, Alto, Urgente), interpretação em linguagem acessível de exames laboratoriais e de imagem, agendamento de consultas e gerenciamento do prontuário pessoal.
Portal do Médico (Co-Pilot Clínico): Gestão centralizada da fila de atendimento, assistente de IA para suporte em diagnósticos diferenciais e anamnese, emissão de prescrições eletrônicas criptografadas e acesso unificado ao histórico clínico do paciente.
Módulo de Teleconsulta e Telemetria: Ambiente integrado para videoconferências (WebRTC) e simulação visual de traçado eletrocardiográfico (ECG) via canvas interativo.
Painel de Administração e Analytics: Dashboards analíticos para acompanhamento de indicadores operacionais e financeiros, fluxo de homologação de profissionais e registros de auditoria para conformidade regulatória.
Arquitetura e Tecnologias
Frontend: Construído em React 19 com TypeScript, Vite 6, Tailwind CSS v4, Motion (Framer Motion), Recharts e biblioteca de ícones Lucide React.
Backend e IA: Servidor Node.js com Express, integração nativa com o modelo Google Gemini via SDK @google/genai e camada de persistência com suporte a db.json local ou integração com Supabase/PostgreSQL.

---

📂 Estrutura Modular do Projeto
telemedai/
├── api/                      # Vercel Serverless Function entrypoint (api/index.ts)
├── server.ts                 # Servidor HTTP Express principal (Proxy API & Middlewares)
├── server/
│   └── db.ts                 # Gestão de persistência e seeds de dados
├── src/
│   ├── main.tsx              # Ponto de entrada do React
│   ├── App.tsx               # Orquestrador de estado global e navegação
│   ├── types.ts              # Definições de interfaces e enums TypeScript
│   ├── index.css             # Estilos globais e importações Tailwind CSS
│   ├── lib/
│   │   ├── supabase.ts       # Cliente e contexto de integração Supabase / Auth
│   │   └── utils.ts          # Utilitários e helpers de formatação de dados
│   └── components/
│       ├── Header.tsx        # Navegação superior, notificações e seletor de perfil
│       ├── LoginScreen.tsx   # Tela de autenticação e seleção de perfis de demonstração
│       ├── PatientDashboard.tsx # Painel completo do paciente (Triagem, Consultas, Exames)
│       ├── DoctorDashboard.tsx  # Painel médico (Atendimento, Co-pilot IA, Prescrição)
│       ├── AdminDashboard.tsx   # Painel administrativo, Analytics e Auditoria LGPD
│       └── VideoConsultation.tsx # Interface de sala virtual de teleconsulta com ECG
├── .env.example              # Modelo seguro de variáveis de ambiente
├── vercel.json               # Configuração de rotas e build para deploy na Vercel
├── tsconfig.json             # Configurações do compilador TypeScript
├── package.json              # Dependências do ecossistema e scripts npm
└── README.md                 # Documentação técnica do projeto

---

## Contribuição 

Contribuições de todos os níveis são bem-vindas no **TelemedAI**.

### Fluxo de Trabalho

1. **Fork:** Crie uma cópia do repositório no seu GitHub.
2. **Branch:** Crie uma branch com o padrão `feature/nome` ou `fix/nome`.
3. **Ambiente:** Execute `npm install`, copie `.env.example` para `.env` e adicione sua `GEMINI_API_KEY`.
4. **Commits:** Siga a convenção Conventional Commits (ex: `feat: adiciona funcionalidade`).
5. **Push & PR:** Suba a branch para o seu fork e abra um *Pull Request* detalhando as mudanças.

---

## Áreas Principais

* **Frontend:** Componentes em React + Tailwind CSS e gráficos em Recharts.
* **Backend & IA:** Rotas Express e engenharia de prompts com Google GenAI SDK.
* **DevOps:** Otimização de Docker e fluxos de CI/CD.
* **Qualidade:** Testes automatizados e documentação. 
