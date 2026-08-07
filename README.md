# 🏥 TelemedAI - Plataforma Avançada de Telemedicina com IA

[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash-orange.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](#licença)

Uma solução completa, moderna e autônoma de **Telemedicina integrada com Inteligência Artificial** (Google Gemini). A plataforma foi desenvolvida com arquitetura full-stack modular (React + Express + TypeScript), focada na conformidade com regulamentações de dados de saúde (LGPD / GDPR), alta performance e experiência do utilizador intuitiva.

---

## 🌟 Funcionalidades Principais

### 👦 Portal do Paciente
- **Triagem Inteligente de Sintomas (IA)**: Assistente conversacional em tempo real alimentado pelo Google Gemini para análise preliminar de sintomas.
- **Relatório Clínico de Pre-Anamnese**: Geração automática de laudos estruturados com estimativa de gravidade (*Baixo, Moderado, Alto, Urgente*) e sugestão de especialidade médica ideal.
- **Agendamento Inteligente**: Seleção de médicos credenciados, filtro por especialidades e simulação integrada de pagamentos e confirmação de consultas.
- **Analisador Leigo de Exames**: Upload e interpretação de laudos laboratoriais e exames de imagem traduzidos para linguagem acessível pelo modelo de IA.
- **Prontuário Pessoal & Histórico**: Monitorização contínua de sinais vitais, histórico de alergias, doenças crónicas e medicação ativa.

### 🩺 Portal do Médico (Co-Pilot Clínico)
- **Fila de Atendimento em Tempo Real**: Gestão centralizada de solicitações de consulta (aceitar, priorizar, remarcar e concluir).
- **Clinical Co-Pilot (Assistente de Anamnese IA)**: Módulo de IA que cruza os sintomas do paciente com o histórico médico para sugerir diagnósticos diferenciais e perguntas essenciais para a consulta.
- **Prescrição Eletrónica Criptografada**: Emissão de receitas médicas digitais com validação de posologia e simulação de assinatura digital.
- **Histórico e Prontuário Clínico**: Acesso rápido a consultas anteriores, evoluções médicas e relatórios de triagem pregressos.

### 🛡️ Painel de Administração & Analytics
- **Dashboard Analítico (Recharts)**: Indicadores de faturamento, distribuição por gravidade de casos, volume de consultas e especialidades mais procuradas.
- **Homologação e Gestão de Profissionais**: Fluxo de análise, aprovação e credenciamento de novos médicos.
- **Auditoria & Logs de Acesso LGPD**: Registo transparente de acessos e operações sensíveis para total conformidade regulatória.

### 📹 Módulo de Teleconsulta por Vídeo
- **Sala de Videoconferência Integrada**: Interface imersiva de videochamada baseada em WebRTC / streaming de mídia (`getUserMedia`).
- **Telemetria Cardíaca em Tempo Real**: Visualização simulada de traçado de ECG (Eletrocardiograma) via Canvas interativo.

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19**: Biblioteca UI para construção de interfaces reativas e modulares.
- **TypeScript**: Tipagem estática rigorosa em toda a aplicação.
- **Vite 6**: Tooling de build ultrarrápido para desenvolvimento frontend.
- **Tailwind CSS v4**: Estilização utilitária de alto desempenho e responsiva.
- **Motion (Framer Motion)**: Animações e transições fluídas de interface.
- **Recharts**: Biblioteca de gráficos interativos para dashboards analíticos.
- **Lucide React**: Conjunto moderno e limpo de ícones vetoriais.

### Backend & Serviços
- **Node.js & Express**: Servidor HTTP modular para gestão de rotas e proxy da API de IA.
- **Google GenAI SDK (@google/genai)**: Integração nativa com os modelos de IA Google Gemini (3.5 Flash).
- **Serviço de Persistência Modular**: Suporte duplo a servidor local sincronizado (`db.json`) e integração pronta para Supabase / PostgreSQL.

---

## 📂 Estrutura Modular do Projeto

```text
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
```

---

## ⚙️ Guia de Instalação e Execução Local

### 1. Pré-requisitos
Certifique-se de que tem instalado na sua máquina:
- **Node.js** v18.0.0 ou superior
- **NPM** v9.0.0 ou superior (ou Yarn / PNPM)

### 2. Clonar o Repositório
```bash
git clone https://github.com/SEU_USUARIO/telemedai.git
cd telemedai
```

### 3. Configurar Variáveis de Ambiente
Crie um ficheiro `.env` na raiz do projeto copiando o modelo `.env.example`:
```bash
cp .env.example .env
```
Edite o arquivo `.env` e insira a sua chave do Google Gemini (obtenha gratuitamente no [Google AI Studio](https://aistudio.google.com/)):
```env
GEMINI_API_KEY="sua_chave_do_gemini_aqui"
PORT=3000
```

### 4. Instalar Dependências
```bash
npm install
```

### 5. Iniciar o Ambiente de Desenvolvimento
```bash
npm run dev
```
Aceda à aplicação através do seu navegador em: `http://localhost:3000`

---

## 🚀 Como Fazer Deploy

### Deploy na Vercel (Recomendado)
O projeto está pré-configurado com o `vercel.json` para suportar Serverless Functions e roteamento de frontend SPA:
1. Importe o repositório no seu dashboard da [Vercel](https://vercel.com/new).
2. Adicione as variáveis de ambiente necessárias (`GEMINI_API_KEY`, etc.) no painel do projeto.
3. Clique em **Deploy**. O Vercel efetuará o build automaticamente!

### Deploy via Docker
Caso prefira executar via Docker:
```bash
# Construir a imagem Docker
docker build -t telemedai .

# Executar o container
docker run -d -p 3000:3000 --env-file .env telemedai
```

---

## 👤 Autor e Criador do Projeto

Este projeto foi concetualizado, arquitetado e totalmente desenvolvido por:

**Manuel C. M.**  
- **Email**: `mcmawm1996@gmail.com`  
- **GitHub**: [https://github.com/mcmawm1996](https://github.com/mcmawm1996)

*Desenvolvido como uma plataforma autónoma, moderna e pronta para produção.*

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE) - sinta-se à vontade para utilizar, estudar e aprimorar o código.
