import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { 
  User, 
  UserRole, 
  MedicalSpecialty, 
  DoctorProfile, 
  PatientProfile, 
  Appointment, 
  AIReport, 
  Message, 
  Notification,
  LoginLog,
  PlatformManager
} from "../src/types.js";

const DB_PATH = path.join(process.cwd(), "src", "db.json");

// Supabase Database Integration Credentials
const DEFAULT_SUPABASE_URL = "https://vupaaywgmcrlghfvwzqq.supabase.co";
const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cGFheXdnbWNybGdoZnZ3enFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxODE0ODgsImV4cCI6MjEwMDc1NzQ4OH0.C2v7APWCTb74aDIi23CvQ8ClZXTYm6Obs8Gipr-DQXQ";
const DEFAULT_SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cGFheXdnbWNybGdoZnZ3enFxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE4MTQ4OCwiZXhwIjoyMTAwNzU3NDg4fQ.GKllNlFuW-LtECwyoldOYeb0s6STtOOFa8RDh-xS4g8";

function formatServerSupabaseUrl(inputUrl?: string): string {
  let url = inputUrl?.trim();
  if (!url) return DEFAULT_SUPABASE_URL;
  url = url.replace(/\/rest\/v1\/?$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  url = url.replace(/\/+$/, "");
  return /^https?:\/\/.+/i.test(url) ? url : DEFAULT_SUPABASE_URL;
}

export const SUPABASE_URL = formatServerSupabaseUrl(process.env.SUPABASE_URL);
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || DEFAULT_SUPABASE_SERVICE_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);

export interface DatabaseSchema {
  users: User[];
  specialties: MedicalSpecialty[];
  doctors: DoctorProfile[];
  patients: Record<string, PatientProfile>;
  appointments: Appointment[];
  aiReports: AIReport[];
  messages: Message[];
  notifications: Notification[];
  loginLogs: LoginLog[];
  managers: PlatformManager[];
}

const DEFAULT_SPECIALTIES: MedicalSpecialty[] = [
  { id: "sp-1", name: "Clínica Geral", description: "Atendimento inicial, prevenção, diagnóstico de sintomas gerais e encaminhamento.", icon: "Activity" },
  { id: "sp-2", name: "Cardiologia", description: "Diagnóstico e tratamento de doenças do coração e do sistema cardiovascular.", icon: "Heart" },
  { id: "sp-3", name: "Pediatria", description: "Assistência médica especializada para bebês, crianças e adolescentes.", icon: "Baby" },
  { id: "sp-4", name: "Psiquiatria", description: "Prevenção, diagnóstico, tratamento e reabilitação dos distúrbios mentais e emocionais.", icon: "Brain" },
  { id: "sp-5", name: "Dermatologia", description: "Diagnóstico, tratamento e prevenção de doenças da pele, pelos, cabelos, unhas e mucosas.", icon: "Sparkles" },
  { id: "sp-6", name: "Ortopedia", description: "Cuidados com os ossos, músculos, articulações, ligamentos e tendões.", icon: "Bone" }
];

const DEFAULT_ADMIN: User = {
  id: "u-admin-1",
  email: "admin@mwenho.ao",
  password: "admin123",
  name: "Administrador Central Mwenho",
  role: UserRole.ADMIN,
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
  createdAt: "2026-07-25T23:24:27.934Z",
  authProvider: "email"
};

const DEFAULT_USERS: User[] = [DEFAULT_ADMIN];

let inMemoryDbCache: DatabaseSchema | null = null;

function saveDatabaseToFile(db: DatabaseSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to db.json", error);
  }
}

function getDatabaseFromFile(): DatabaseSchema {
  if (inMemoryDbCache) return inMemoryDbCache;

  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDb: DatabaseSchema = {
        users: DEFAULT_USERS,
        specialties: DEFAULT_SPECIALTIES,
        doctors: [],
        patients: {},
        appointments: [],
        aiReports: [],
        messages: [],
        notifications: [],
        loginLogs: [],
        managers: []
      };
      saveDatabaseToFile(initialDb);
      inMemoryDbCache = initialDb;
      return initialDb;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.users || !parsed.users.some((u: any) => u.role === UserRole.ADMIN)) {
      if (!parsed.users) parsed.users = [];
      parsed.users.push(DEFAULT_ADMIN);
    }
    if (!parsed.specialties || parsed.specialties.length === 0) parsed.specialties = DEFAULT_SPECIALTIES;
    if (!parsed.doctors) parsed.doctors = [];
    if (!parsed.patients) parsed.patients = {};
    if (!parsed.appointments) parsed.appointments = [];
    if (!parsed.aiReports) parsed.aiReports = [];
    if (!parsed.messages) parsed.messages = [];
    if (!parsed.notifications) parsed.notifications = [];
    if (!parsed.loginLogs) parsed.loginLogs = [];
    if (!parsed.managers) parsed.managers = [];

    inMemoryDbCache = parsed;
    return parsed;
  } catch (error) {
    console.error("Error reading db.json, returning defaults", error);
    const defaults: DatabaseSchema = {
      users: DEFAULT_USERS,
      specialties: DEFAULT_SPECIALTIES,
      doctors: [],
      patients: {},
      appointments: [],
      aiReports: [],
      messages: [],
      notifications: [],
      loginLogs: [],
      managers: []
    };
    inMemoryDbCache = defaults;
    return defaults;
  }
}

export async function syncFromSupabase(): Promise<DatabaseSchema> {
  const localDb = getDatabaseFromFile();
  try {
    const { data: remoteProfiles, error } = await supabaseClient
      .from("profiles")
      .select("*");

    if (!error && remoteProfiles && remoteProfiles.length > 0) {
      remoteProfiles.forEach((p: any) => {
        const existingIdx = localDb.users.findIndex(u => u.id === p.id || u.email === p.email);
        const mappedUser: User = {
          id: p.id || "u-" + Math.random().toString(36).substring(2, 9),
          email: p.email || p.user_email || "",
          name: p.name || p.full_name || p.email?.split("@")[0] || "Usuário",
          role: (p.role as UserRole) || UserRole.PATIENT,
          phoneNumber: p.phone_number || p.phone || "",
          avatarUrl: p.avatar_url || "",
          password: p.password || "123456",
          createdAt: p.created_at || new Date().toISOString()
        };

        if (existingIdx >= 0) {
          localDb.users[existingIdx] = { ...localDb.users[existingIdx], ...mappedUser };
        } else {
          localDb.users.push(mappedUser);
        }
      });
    }

    // Ensure Admin user always exists
    if (!localDb.users.some(u => u.role === UserRole.ADMIN || u.email === "admin@mwenho.ao")) {
      localDb.users.push(DEFAULT_ADMIN);
    }

    inMemoryDbCache = localDb;
    saveDatabaseToFile(localDb);
    return localDb;
  } catch (_err) {
    return localDb;
  }
}

export async function syncAllToSupabase(db: DatabaseSchema) {
  try {
    // 1. Sync registered profiles / users to Supabase 'profiles' table
    if (db.users && db.users.length > 0) {
      const profilesToUpsert = db.users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        phone_number: u.phoneNumber || "",
        avatar_url: u.avatarUrl || "",
        updated_at: new Date().toISOString()
      }));

      try {
        await supabaseClient
          .from("profiles")
          .upsert(profilesToUpsert, { onConflict: "id" });
      } catch (_upsertErr) {
        // Silently preserve local storage
      }
    }

    // 2. Sync patients to Supabase 'patients' table
    if (db.patients && Object.keys(db.patients).length > 0) {
      try {
        const patientsToUpsert = Object.values(db.patients).map(p => ({
          id: p.id,
          date_of_birth: p.dateOfBirth,
          gender: p.gender,
          blood_type: p.bloodType,
          allergies: p.allergies || [],
          chronic_conditions: p.chronicConditions || [],
          medications: p.medications || [],
          updated_at: new Date().toISOString()
        }));
        await supabaseClient.from("patients").upsert(patientsToUpsert, { onConflict: "id" });
      } catch (_pErr) {
        // Silently preserve local storage
      }
    }

    // 3. Sync doctors to Supabase 'doctors' table
    if (db.doctors && db.doctors.length > 0) {
      try {
        const doctorsToUpsert = db.doctors.map(d => ({
          id: d.id,
          name: d.name,
          specialty_id: d.specialtyId,
          specialty_name: d.specialtyName,
          license_number: d.licenseNumber,
          consultation_fee: d.consultationFee,
          approved: d.approved,
          bio: d.bio || "",
          updated_at: new Date().toISOString()
        }));
        await supabaseClient.from("doctors").upsert(doctorsToUpsert, { onConflict: "id" });
      } catch (_dErr) {
        // Silently preserve local storage
      }
    }

    // 4. Sync appointments to Supabase 'appointments' table
    if (db.appointments && db.appointments.length > 0) {
      try {
        const appointmentsToUpsert = db.appointments.map(a => ({
          patient_id: a.patientId,
          doctor_id: a.doctorId,
          date: a.date,
          time: a.time,
          type: 'video',
          status: (a.status || 'PENDING').toLowerCase(),
          notes: a.doctorNotes || '',
          price: a.consultationFee || 20000,
          payment_status: (a.paymentStatus || 'PENDING').toLowerCase(),
          ai_report_id: a.aiReportId || null,
          meeting_link: a.videoRoomId || '',
          updated_at: new Date().toISOString()
        }));
        await supabaseClient.from("appointments").upsert(appointmentsToUpsert, { ignoreDuplicates: false });
      } catch (_aErr) {
        // Silently preserve local storage
      }
    }

    // 5. Sync medical reports/records to Supabase 'medical_records' table
    if (db.aiReports && db.aiReports.length > 0) {
      try {
        const reportsToUpsert = db.aiReports.map(r => ({
          patient_id: r.patientId,
          title: `Relatório de Triagem - ${r.suggestedSpecialty || 'Clínica Geral'}`,
          description: r.symptoms || '',
          diagnosis: r.severity || 'Normal',
          prescription: r.clinicalSummary || '',
          record_type: 'ai_triage',
          updated_at: new Date().toISOString()
        }));
        await supabaseClient.from("medical_records").upsert(reportsToUpsert, { ignoreDuplicates: false });
      } catch (_mrErr) {
        // Silently preserve local storage
      }
    }

    // 6. Full backup sync to 'mwenho_store' table
    try {
      await supabaseClient
        .from("mwenho_store")
        .upsert({
          key: "platform_database_state",
          data: db,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });
    } catch (_storeErr) {
      // Silently preserve local storage
    }

  } catch (_e) {
    // Silently preserve local storage
  }
}

export function getDatabase(): DatabaseSchema {
  return getDatabaseFromFile();
}

export function saveDatabase(db: DatabaseSchema): void {
  // Always ensure Admin exists
  if (!db.users.some(u => u.role === UserRole.ADMIN || u.email === "admin@mwenho.ao")) {
    db.users.push(DEFAULT_ADMIN);
  }
  inMemoryDbCache = db;
  saveDatabaseToFile(db);
  
  // Async background push to Supabase
  syncAllToSupabase(db).catch(err => {
    console.error("Background Supabase sync error:", err);
  });
}
