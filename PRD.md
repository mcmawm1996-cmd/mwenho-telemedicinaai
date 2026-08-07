# PRD - Mwenho TelemedAI (Plataforma de Telemedicina & IA)
> **Documento de Requisitos do Produto (PRD) para Testes Automatizados, QA e Auditoria de Segurança**

---

## 1. Visão Geral do Produto
**Mwenho TelemedAI** é uma plataforma de telemedicina e gestão hospitalar inteligente desenvolvida para Angola e PALOP (Moeda: Kwanzas / AOA). A plataforma integra triagem médica orientada por Inteligência Artificial (Google Gemini), consultas por vídeo/chat em tempo real, gestão de prontuários eletrônicos, receitas digitais, autenticação via Supabase Auth/Firebase e um banco de dados relacional em nuvem com **Row Level Security (RLS)** no Supabase.

---

## 2. Arquitetura e Stack Tecnológico
* **Frontend:** React 18, Vite, Tailwind CSS, Recharts, Lucide Icons, Motion.
* **Backend:** Node.js / Express (TypeScript), REST APIs (`/api/*`).
* **Banco de Dados Relacional:** **Supabase PostgreSQL** (`vupaaywgmcrlghfvwzqq.supabase.co`) com 5 tabelas nativas protegidas por RLS.
* **Persistência Local & Sincronização:** Engine de persistência local (`db.json`) com sincronização bidirecional em tempo real para o Supabase Database e Firebase Firestore.
* **Autenticação e Auditoria:** Supabase Auth + Firebase Auth + RBAC nativo + Tabela de Auditoria de Logins (`loginLogs`) registrando IP/User-Agent.
* **Inteligência Artificial:** Google Gemini API (`@google/genai`) para triagem de sintomas e auxílio ao diagnóstico clínico.

---

## 3. Matriz de Perfis e Permissões (RBAC)

| Perfil | Escopo de Acesso | Operações Permitidas |
| :--- | :--- | :--- |
| **PATIENT (Paciente)** | Portal do Paciente | Agendar consultas, realizar triagem com IA, visualizar prescrições, atualizar prontuário pessoal, histórico de atendimentos. |
| **DOCTOR (Médico)** | Portal do Médico | Gerenciar slots de agenda, realizar atendimento de vídeo/chat, emitir receitas digitais, consultar prontuário do paciente, carregar cédula ORMED. |
| **GESTOR (Gestor)** | Painel de Gestão | Cadastrar especialidades, visualizar relatórios operacionais da unidade hospitalar. |
| **ADMIN (Administrador)** | Dashboard Global de Administração | Gestão total de usuários (expurgar perfis), zerar dados financeiros e analytics, visualizar logs de auditoria, gerenciar especialidades e médicos. |

---

## 4. Esquema do Banco de Dados Supabase & Row Level Security (RLS)

A base de dados relacional no Supabase é estruturada em 5 tabelas com políticas estritas de RLS:

### 4.1. Tabelas
1. `public.profiles` (id UUID PK references auth.users, email, name, role, phone_number, avatar_url)
2. `public.doctors` (id UUID PK references profiles, name, specialty_id, specialty_name, license_number, hospital_affiliation, years_of_experience, consultation_fee, rating, review_count, approved, bio, ormed_document_url)
3. `public.patients` (id UUID PK references profiles, date_of_birth, gender, province, blood_type, allergies, chronic_conditions, medications, subscription_tier)
4. `public.appointments` (id UUID PK DEFAULT gen_random_uuid(), patient_id UUID, doctor_id UUID, date, time, type, status, symptoms, notes, price, payment_status, meeting_link)
5. `public.medical_records` (id UUID PK DEFAULT gen_random_uuid(), patient_id UUID, doctor_id UUID, appointment_id UUID, title, description, diagnosis, prescription, attachments, record_type)

### 4.2. Políticas de Segurança (RLS)
* **`profiles`**: Usuários lêem seu próprio perfil e perfis de médicos. Edição permitida apenas para o dono do registro (`auth.uid() = id`).
* **`doctors`**: Leitura pública para usuários autenticados. Atualização restrita ao próprio médico.
* **`patients`**: Acesso de leitura restrito ao próprio paciente e médicos com consultas agendadas.
* **`appointments`**: Acesso estritamente restrito aos dois participantes da consulta (`auth.uid() = patient_id OR auth.uid() = doctor_id`).
* **`medical_records`**: Leitura e escrita restritas ao paciente titular do prontuário e ao médico assistente.

---

## 5. Requisitos Funcionais por Módulo

### 5.1. Autenticação, Cadastro e Validação ORMED
* **RF01 - Cadastro Estendido de Pacientes:** Inclusão de grupo sanguíneo (A+, O+, etc.), província de residência, alergias e data de nascimento na ficha clínica inicial.
* **RF02 - Validação de Médicos (ORMED Angola):** Coleta de número da Cédula Profissional ORMED, especialidade e upload de documento comprovativo em PDF/imagem.
* **RF03 - Autenticação Dupla (Supabase Auth & Direta):** Suporte a login social Google e e-mail/senha com integração Supabase Auth UI.
* **RF04 - Auditoria de Acesso (Login Logs):** Registro de IP/User-Agent, e-mail, perfil e carimbo de data/hora a cada tentativa de login.

### 5.2. Triagem Sintomática com IA (Symptom Checker / Gemini)
* **RF05 - Análise Inteligente de Sintomas:** Avaliação de gravidade (`LEVE`, `MODERADA`, `ALTA`, `EMERGÊNCIA`), recomendações de especialidade e direcionamento para teleconsulta.
* **RF06 - Isenção Médica:** Prompt de segurança ressaltando o caráter informativo prévio da IA.

### 5.3. Agendamento e Telemedicina
* **RF07 - Agendamento e Sala Virtual:** Atendimento online por vídeo/chat com gravação de prontuário eletrônico.
* **RF08 - Prescrição Médica Digital:** Emissão de receitas médicas formatadas para impressão/download pelo paciente.

### 5.4. Gestão e Administração
* **RF09 - Sigilo Médico & Privacidade:** Restrição de vazamento de dados brutos de pacientes no frontend. Auditoria avançada via console do Supabase.
* **RF10 - Gestão Financeira em AOA (Kwanzas):** Relatórios em AOA e opção de redefinição de analytics financeiro sem corrupção de dados.

---

## 6. Endpoints Principais para Testes e Integrações

| Método | Endpoint | Função / Descrição | Autenticação |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Verificação do servidor e base de dados | Não |
| `POST` | `/api/auth/login` | Login no sistema com log de auditoria | Não |
| `POST` | `/api/auth/register` | Registro de paciente ou médico | Não |
| `GET` | `/api/supabase/schema` | Retorna o script SQL DDL com RLS | Não |
| `GET` | `/api/admin/stats` | Métricas operacionais do hospital em AOA | Sim (`ADMIN`) |
| `GET` | `/api/admin/users` | Gestão de contas e perfis | Sim (`ADMIN`) |
| `DELETE` | `/api/admin/users/:id` | Deleção em cascata de perfil | Sim (`ADMIN`) |
| `POST` | `/api/ai/symptom-checker` | Triagem com IA Google Gemini | Sim |
| `GET` | `/api/appointments` | Consultas agendadas do usuário | Sim |

---

## 7. Critérios de Aceite Globais
1. **Compilação e Linting:** Zero erros TypeScript (`tsc --noEmit`) ou warnings de chave React.
2. **Segurança RLS:** Todas as 5 tabelas no Supabase com RLS ativo garantindo privacidade de dados.
3. **Resiliência a Falhas:** Fallback gracioso para banco de dados local caso a conexão remota oscile.

