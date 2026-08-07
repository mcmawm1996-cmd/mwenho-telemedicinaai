-- ====================================================================
-- ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE PARA MWENHO TELEMEDAI
-- Tabelas: profiles, doctors, patients, appointments, medical_records
-- Configuração de Row Level Security (RLS) para restrição por usuário
-- ====================================================================

-- 1. Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- TABELA 1: profiles
-- Armazena os dados básicos de conta vinculados ao auth.users do Supabase
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor', 'admin')),
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- TABELA 2: doctors
-- Informações profissionais de médicos registrados
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.doctors (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    specialty_id TEXT NOT NULL DEFAULT 'sp-1',
    specialty_name TEXT NOT NULL DEFAULT 'Clínica Geral',
    license_number TEXT NOT NULL,
    hospital_affiliation TEXT,
    years_of_experience INT DEFAULT 1,
    consultation_fee NUMERIC(10, 2) DEFAULT 20000,
    rating NUMERIC(3, 2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    approved BOOLEAN DEFAULT FALSE,
    bio TEXT,
    ormed_document_url TEXT,
    ormed_document_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- TABELA 3: patients
-- Informações clínicas e cadastro estendido dos pacientes
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    gender TEXT DEFAULT 'Masculino',
    province TEXT DEFAULT 'Luanda',
    blood_type TEXT DEFAULT 'O+',
    allergies TEXT[] DEFAULT '{}',
    chronic_conditions TEXT[] DEFAULT '{}',
    medications TEXT[] DEFAULT '{}',
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    subscription_tier TEXT DEFAULT 'free',
    subscription_status TEXT DEFAULT 'active',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- TABELA 4: appointments (Consultas)
-- Agendamentos de consultas médicas online ou presenciais
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    type TEXT DEFAULT 'video' CHECK (type IN ('video', 'chat', 'presencial')),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled')),
    symptoms TEXT,
    notes TEXT,
    price NUMERIC(10, 2) DEFAULT 20000,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    ai_report_id TEXT,
    meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- TABELA 5: medical_records (Prontuários e Histórico Clínico)
-- Registros clínicos, receitas digitais, exames e relatórios de triagem
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    diagnosis TEXT,
    prescription TEXT,
    attachments TEXT[] DEFAULT '{}',
    record_type TEXT DEFAULT 'consultation' CHECK (record_type IN ('consultation', 'lab_result', 'prescription', 'ai_triage', 'exam_analysis')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- CONFIGURAÇÃO DE ROW LEVEL SECURITY (RLS) - SEGURANÇA POR USUÁRIO
-- ====================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- POLÍTICAS RLS PARA 'profiles'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis próprios ou de médicos" ON public.profiles;
CREATE POLICY "Usuários autenticados podem ver perfis próprios ou de médicos"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR role = 'doctor' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem inserir seu próprio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- --------------------------------------------------------------------
-- POLÍTICAS RLS PARA 'doctors'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Qualquer usuário autenticado pode listar médicos" ON public.doctors;
CREATE POLICY "Qualquer usuário autenticado pode listar médicos"
    ON public.doctors FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Médicos podem atualizar seus próprios dados" ON public.doctors;
CREATE POLICY "Médicos podem atualizar seus próprios dados"
    ON public.doctors FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Médicos podem inserir seu próprio registro" ON public.doctors;
CREATE POLICY "Médicos podem inserir seu próprio registro"
    ON public.doctors FOR INSERT
    WITH CHECK (auth.uid() = id);

-- --------------------------------------------------------------------
-- POLÍTICAS RLS PARA 'patients'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Pacientes vêem seus próprios dados e médicos seus pacientes agendados" ON public.patients;
CREATE POLICY "Pacientes vêem seus próprios dados e médicos seus pacientes agendados"
    ON public.patients FOR SELECT
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.appointments 
            WHERE doctor_id = auth.uid() AND patient_id = public.patients.id
        )
    );

DROP POLICY IF EXISTS "Pacientes podem atualizar seus próprios dados" ON public.patients;
CREATE POLICY "Pacientes podem atualizar seus próprios dados"
    ON public.patients FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Pacientes podem inserir seu próprio registro" ON public.patients;
CREATE POLICY "Pacientes podem inserir seu próprio registro"
    ON public.patients FOR INSERT
    WITH CHECK (auth.uid() = id);

-- --------------------------------------------------------------------
-- POLÍTICAS RLS PARA 'appointments'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários acedem apenas consultas onde são paciente ou médico" ON public.appointments;
CREATE POLICY "Usuários acedem apenas consultas onde são paciente ou médico"
    ON public.appointments FOR SELECT
    USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Pacientes podem criar agendamentos de consulta" ON public.appointments;
CREATE POLICY "Pacientes podem criar agendamentos de consulta"
    ON public.appointments FOR INSERT
    WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "Participantes podem atualizar o status da consulta" ON public.appointments;
CREATE POLICY "Participantes podem atualizar o status da consulta"
    ON public.appointments FOR UPDATE
    USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- --------------------------------------------------------------------
-- POLÍTICAS RLS PARA 'medical_records'
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "Acesso restrito ao prontuário do paciente e médico assistente" ON public.medical_records;
CREATE POLICY "Acesso restrito ao prontuário do paciente e médico assistente"
    ON public.medical_records FOR SELECT
    USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Médicos e pacientes podem inserir prontuários" ON public.medical_records;
CREATE POLICY "Médicos e pacientes podem inserir prontuários"
    ON public.medical_records FOR INSERT
    WITH CHECK (auth.uid() = doctor_id OR auth.uid() = patient_id);

DROP POLICY IF EXISTS "Médicos e pacientes podem atualizar prontuários" ON public.medical_records;
CREATE POLICY "Médicos e pacientes podem atualizar prontuários"
    ON public.medical_records FOR UPDATE
    USING (auth.uid() = doctor_id OR auth.uid() = patient_id);

-- ====================================================================
-- TRIGGER AUTOMÁTICO PARA INTEGRAÇÃO COM SUPABASE AUTH (auth.users)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Inserir na tabela profiles
  INSERT INTO public.profiles (id, email, name, role, phone_number)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Usuário Mwenho'),
    COALESCE(new.raw_user_meta_data->>'role', 'patient'),
    COALESCE(new.raw_user_meta_data->>'phoneNumber', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();

  -- Se o papel for 'patient', criar entrada na tabela pacientes
  IF (new.raw_user_meta_data->>'role') = 'patient' OR (new.raw_user_meta_data->>'role') IS NULL THEN
    INSERT INTO public.patients (id, gender, province, blood_type)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'gender', 'Masculino'),
      COALESCE(new.raw_user_meta_data->>'province', 'Luanda'),
      COALESCE(new.raw_user_meta_data->>'bloodType', 'O+')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Se o papel for 'doctor', criar entrada na tabela médicos
  IF (new.raw_user_meta_data->>'role') = 'doctor' THEN
    INSERT INTO public.doctors (id, name, specialty_id, specialty_name, license_number, hospital_affiliation)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', 'Dr. Mwenho'),
      COALESCE(new.raw_user_meta_data->>'specialtyId', 'sp-1'),
      COALESCE(new.raw_user_meta_data->>'specialtyName', 'Clínica Geral'),
      COALESCE(new.raw_user_meta_data->>'licenseNumber', 'ORMED-AO'),
      COALESCE(new.raw_user_meta_data->>'hospitalAffiliation', 'Luanda')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativar Trigger de Autocadastro
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
