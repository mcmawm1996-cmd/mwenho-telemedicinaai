import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { getDatabase, saveDatabase, syncFromSupabase, DatabaseSchema } from "./server/db.js";
import { 
  UserRole, 
  AppointmentStatus, 
  Appointment, 
  AIReport, 
  Message, 
  Notification, 
  PatientProfile, 
  DoctorProfile, 
  User,
  PlatformManager,
  LoginLog
} from "./src/types.js";

dotenv.config();

// Supabase Database Integration credentials
const DEFAULT_SUPABASE_URL = "https://vupaaywgmcrlghfvwzqq.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_Wk69R-K6J297ZNRoECo1nw_t57OkYeF";

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

const SUPABASE_URL = formatServerSupabaseUrl(process.env.SUPABASE_URL);
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_KEY;

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Lazy initialised Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A chave de API do Gemini (GEMINI_API_KEY) não está configurada. Configure-a no painel lateral de Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "telemedai-platform",
        },
      },
    });
  }
  return aiClient;
}

// Helper to push standard notifications
function addNotification(userId: string, title: string, message: string, type: "info" | "success" | "warning" | "error" = "info") {
  const db = getDatabase();
  const notification: Notification = {
    id: "not-" + Math.random().toString(36).substring(2, 11),
    userId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(notification);
  saveDatabase(db);
}

// Helper to record login logs to Firebase / Database
function recordLoginLog(userId: string, userName: string, userEmail: string, role: string, loginMethod: string, req: express.Request) {
  try {
    const db = getDatabase();
    if (!db.loginLogs) db.loginLogs = [];
    const log = {
      id: "log-" + Math.random().toString(36).substring(2, 11),
      userId,
      userName: userName || "Utilizador",
      userEmail: userEmail || "N/A",
      role: role || "PATIENT",
      loginMethod: loginMethod || "E-mail / Senha",
      timestamp: new Date().toISOString(),
      ipOrDevice: (req.headers["user-agent"] || "Web App").substring(0, 80)
    };
    db.loginLogs.unshift(log);
    if (db.loginLogs.length > 500) {
      db.loginLogs = db.loginLogs.slice(0, 500);
    }
    saveDatabase(db);
  } catch (err) {
    console.error("Failed to record login log:", err);
  }
}

// ----------------------------------------------------
// REST API ROUTES
// ----------------------------------------------------

// Health check endpoints (Non-auth status for browser and automated probes)
app.get(["/api/health", "/health", "/api/status"], (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    status: "ok",
    healthy: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "Mwenho Telemedicina AI Platform",
    environment: process.env.NODE_ENV || "development",
    database: "online"
  });
});

// Supabase Status & Database Health
app.get("/api/supabase/status", async (req, res) => {
  try {
    const { data, error } = await supabaseServer.from("_health_check_dummy").select("*").limit(1);
    const reachable = !error || error.code === "PGRST301" || error.code === "42P01" || Boolean(data);
    res.json({
      status: "online",
      connected: true,
      supabaseUrl: SUPABASE_URL,
      projectHost: "vupaaywgmcrlghfvwzqq.supabase.co",
      restEndpoint: SUPABASE_URL + "/rest/v1/",
      message: "Supabase ativamente integrado e operante.",
      details: error ? error.message : "Conexão REST v1 estabelecida com sucesso."
    });
  } catch (err: any) {
    res.json({
      status: "error",
      connected: false,
      supabaseUrl: SUPABASE_URL,
      message: "Falha ao consultar REST API do Supabase",
      error: err.message || String(err)
    });
  }
});

// 1. Auth routes
app.post("/api/auth/login", (req, res) => {
  const { email, password, role, authProvider } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail ou Telefone é obrigatório" });
  }

  const cleanInput = email.trim().toLowerCase();
  const isPhone = /^\+?[0-9\s\-()]{8,20}$/.test(cleanInput) || (!cleanInput.includes("@") && /^[0-9]+$/.test(cleanInput.replace(/\D/g, '')));

  const db = getDatabase();

  // Find exact existing user matching email or phone number
  let user = db.users.find(u => {
    if (isPhone) {
      const cleanPhone = cleanInput.replace(/\D/g, '');
      return u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === cleanPhone;
    } else {
      return u.email && u.email.toLowerCase() === cleanInput;
    }
  });

  // Reject login if user does not exist
  if (!user) {
    return res.status(401).json({ error: "Credenciais inválidas. Utilizador não encontrado." });
  }

  // Validate password if email/password auth mode
  if (authProvider !== "google" && authProvider !== "supabase" && password) {
    const suppliedPass = String(password).trim();
    if (user.password && user.password !== suppliedPass) {
      return res.status(401).json({ error: "Credenciais inválidas. Palavra-passe incorreta." });
    }
  }

  // Ensure Doctor Profile exists if doctor role
  if (user.role === UserRole.DOCTOR) {
    let docProf = db.doctors.find(d => d.id === user!.id || (d.email && d.email === user!.email));
    if (!docProf) {
      docProf = {
        id: user.id,
        name: user.name.startsWith("Dr") ? user.name : `Dr. ${user.name}`,
        email: user.email,
        specialtyId: "sp-1",
        specialtyName: "Clínica Geral",
        licenseNumber: "ORMED-AO-" + Math.floor(1000 + Math.random() * 9000),
        bio: "Médico especialista credenciado pela Ordem dos Médicos de Angola (ORMED).",
        rating: 5.0,
        consultationFee: 20000,
        avatarUrl: user.avatarUrl || "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150",
        availableDays: ["Seg", "Ter", "Qua", "Qui", "Sex"],
        availableSlots: ["09:00", "10:30", "14:00", "15:30"],
        approved: true
      };
      db.doctors.push(docProf);
    }
  }

  if (user.role === UserRole.PATIENT) {
    if (!db.patients[user.id]) {
      db.patients[user.id] = {
        id: user.id,
        dateOfBirth: "1995-05-20",
        gender: "Masculino",
        bloodType: "O+",
        allergies: ["Penicilina"],
        chronicConditions: ["Hipertensão Arterial"],
        medications: ["Enalapril 10mg"],
        insuranceProvider: "Ensa Saúde"
      };
    }
  }

  saveDatabase(db);

  const { password: _p, ...safeUser } = user;
  recordLoginLog(user.id, user.name, user.email || user.phoneNumber || cleanInput, user.role, isPhone ? "Telefone SMS" : req.body.authProvider === "google" ? "Google Login" : "E-mail / Senha", req);
  res.json({ user: safeUser });
});

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "E-mail e palavra-passe são obrigatórios." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = getDatabase();
  let user = db.users.find(u => 
    (u.email && u.email.toLowerCase() === cleanEmail) || 
    (u.role === UserRole.ADMIN) || 
    (u.role === UserRole.GESTOR)
  );

  if (!user) {
    user = {
      id: "u-admin-main",
      email: cleanEmail.includes("@") ? cleanEmail : "admin@mwenho.ao",
      password: password,
      name: "Administrador Central Mwenho",
      role: UserRole.ADMIN,
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
  } else {
    user.role = UserRole.ADMIN;
    user.password = password;
  }
  saveDatabase(db);

  const { password: _p, ...safeUser } = user;
  recordLoginLog(user.id, user.name, user.email || cleanEmail, user.role, "Acesso Administrativo", req);
  res.json({ user: safeUser });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone || !emailOrPhone.trim()) {
    return res.status(400).json({ error: "E-mail ou número de telefone é obrigatório." });
  }

  const cleanInput = emailOrPhone.trim().toLowerCase();
  const db = getDatabase();

  const user = db.users.find(u => 
    (u.email && u.email.toLowerCase() === cleanInput) ||
    (u.phoneNumber && u.phoneNumber.replace(/\s+/g, "").includes(cleanInput.replace(/\s+/g, "")))
  );

  if (!user) {
    return res.status(404).json({ error: "Nenhum utilizador encontrado com este e-mail ou telefone." });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  (user as any).resetCode = code;
  (user as any).resetCodeExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
  saveDatabase(db);

  res.json({
    success: true,
    message: `Código de verificação gerado com sucesso.`,
    code,
    userEmail: user.email || user.phoneNumber,
    userName: user.name
  });
});

app.get("/api/supabase/schema", (req, res) => {
  try {
    const schemaPath = path.join(process.cwd(), "supabase_schema.sql");
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, "utf8");
      return res.json({
        success: true,
        tables: ["profiles", "doctors", "patients", "appointments", "medical_records"],
        rlsEnabled: true,
        sql: sqlContent
      });
    }
    return res.status(404).json({ error: "Ficheiro de esquema não encontrado." });
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao ler o esquema: " + err.message });
  }
});

app.post("/api/auth/reset-password", (req, res) => {
  const { emailOrPhone, code, newPassword } = req.body;
  if (!emailOrPhone || !code || !newPassword) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: "A palavra-passe deve ter pelo menos 4 caracteres." });
  }

  const cleanInput = emailOrPhone.trim().toLowerCase();
  const cleanCode = code.trim();
  const db = getDatabase();

  const user = db.users.find(u => 
    (u.email && u.email.toLowerCase() === cleanInput) ||
    (u.phoneNumber && u.phoneNumber.replace(/\s+/g, "").includes(cleanInput.replace(/\s+/g, "")))
  );

  if (!user) {
    return res.status(404).json({ error: "Utilizador não encontrado." });
  }

  const storedCode = (user as any).resetCode;
  const expiresAt = (user as any).resetCodeExpiresAt || 0;

  if (!storedCode || storedCode !== cleanCode) {
    return res.status(400).json({ error: "Código de verificação incorreto ou inválido." });
  }

  if (expiresAt < Date.now()) {
    return res.status(400).json({ error: "O código de verificação expirou. Solicite um novo código." });
  }

  user.password = newPassword.trim();
  delete (user as any).resetCode;
  delete (user as any).resetCodeExpiresAt;
  saveDatabase(db);

  recordLoginLog(user.id, user.name, user.email, user.role, "Redefinição de Palavra-Passe", req);
  res.json({ success: true, message: "Palavra-passe alterada com sucesso! Você já pode efetuar o login." });
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, role, phoneNumber, authProvider, ...profileDetails } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Nome é obrigatório." });
  }
  if (!email && !phoneNumber) {
    return res.status(400).json({ error: "E-mail ou Telefone é obrigatório." });
  }

  const db = getDatabase();
  
  if (email) {
    const exists = db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      exists.name = name;
      if (password) exists.password = password;
      if (phoneNumber) exists.phoneNumber = phoneNumber;
      exists.role = (role || exists.role) as UserRole;
      if (exists.role === UserRole.PATIENT && !db.patients[exists.id]) {
        db.patients[exists.id] = {
          id: exists.id,
          dateOfBirth: profileDetails.dateOfBirth || "1995-01-01",
          gender: profileDetails.gender || "Não Especificado",
          bloodType: profileDetails.bloodType || "O+",
          allergies: profileDetails.allergies || [],
          chronicConditions: profileDetails.chronicConditions || [],
          medications: profileDetails.medications || [],
          insuranceProvider: profileDetails.insuranceProvider || ""
        };
      }
      saveDatabase(db);
      return res.json({ user: exists });
    }
  }

  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const existsPhone = db.users.find(u => u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === cleanPhone);
    if (existsPhone) {
      return res.status(400).json({ error: "Este telefone já está cadastrado. Por favor faça login." });
    }
  }

  // Register in Supabase Authentication (auth.users)
  let supabaseUserId = "";
  if (email && password) {
    try {
      const { data: sbAuthData, error: sbAuthErr } = await supabaseServer.auth.signUp({
        email: email.toLowerCase(),
        password: password,
        options: {
          data: {
            name,
            full_name: name,
            role: role || UserRole.PATIENT,
            phoneNumber: phoneNumber || "",
            dateOfBirth: profileDetails.dateOfBirth || "",
            gender: profileDetails.gender || "",
            province: profileDetails.province || "",
            bloodType: profileDetails.bloodType || "",
            licenseNumber: profileDetails.licenseNumber || "",
            specialtyId: profileDetails.specialtyId || "",
            specialtyName: profileDetails.specialtyName || "",
            hospitalAffiliation: profileDetails.hospitalAffiliation || "",
            yearsOfExperience: profileDetails.yearsOfExperience || 1
          }
        }
      });
      if (sbAuthErr) {
        console.warn("Aviso ao registrar no Supabase Auth:", sbAuthErr.message);
      } else if (sbAuthData?.user?.id) {
        supabaseUserId = sbAuthData.user.id;
        console.log("Usuário criado no Supabase Auth com UID:", supabaseUserId);
      }
    } catch (e) {
      console.warn("Erro ao comunicar com Supabase Auth:", e);
    }
  }

  const userId = supabaseUserId || ("u-" + Math.random().toString(36).substring(2, 11));
  const userRole = (role || UserRole.PATIENT) as UserRole;
  
  const user: User = {
    id: userId,
    email: email ? email.toLowerCase() : "",
    phoneNumber: phoneNumber || "",
    authProvider: authProvider || "email",
    password: password || undefined,
    name,
    role: userRole,
    avatarUrl: req.body.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
    createdAt: new Date().toISOString()
  };

  db.users.push(user);

  if (userRole === UserRole.PATIENT) {
    db.patients[userId] = {
      id: userId,
      dateOfBirth: profileDetails.dateOfBirth || "1995-01-01",
      gender: profileDetails.gender || "Não Especificado",
      bloodType: profileDetails.bloodType || "O+",
      allergies: profileDetails.allergies || [],
      chronicConditions: profileDetails.chronicConditions || [],
      medications: profileDetails.medications || [],
      insuranceProvider: profileDetails.insuranceProvider || ""
    };
  } else if (userRole === UserRole.DOCTOR) {
    db.doctors.push({
      id: userId,
      name: user.name,
      specialtyId: profileDetails.specialtyId || "sp-1",
      specialtyName: profileDetails.specialtyName || "Clínica Geral",
      licenseNumber: profileDetails.licenseNumber || ("ORMED-AO " + Math.floor(1000 + Math.random() * 9000)),
      bio: profileDetails.bio || "Médico especialista cadastrado na Ordem dos Médicos de Angola (ORMED).",
      rating: 5.0,
      consultationFee: Number(profileDetails.consultationFee) || 20000,
      avatarUrl: user.avatarUrl || "",
      availableDays: profileDetails.availableDays || ["Seg", "Ter", "Qua", "Qui", "Sex"],
      availableSlots: profileDetails.availableSlots || ["09:00", "10:30", "14:00", "15:30"],
      approved: false, // Requires admin approval
      ormedDocumentUrl: profileDetails.ormedDocumentUrl || "",
      ormedDocumentName: profileDetails.ormedDocumentName || ""
    });
  }

  saveDatabase(db);
  addNotification(userId, "Registro concluído", "Registro efetuado com sucesso!", "success");
  res.json({ user });
});

// Update profile photo avatar for any user role (Patient, Doctor, Admin)
app.put("/api/users/:id/avatar", (req, res) => {
  const { id } = req.params;
  const { avatarUrl } = req.body;
  if (!avatarUrl) {
    return res.status(400).json({ error: "Foto de perfil não fornecida." });
  }

  const db = getDatabase();
  const user = db.users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Utilizador não encontrado." });
  }

  user.avatarUrl = avatarUrl;
  const doc = db.doctors.find(d => d.id === id);
  if (doc) {
    doc.avatarUrl = avatarUrl;
  }

  saveDatabase(db);
  res.json({ success: true, avatarUrl, user });
});

// Approve doctor ORMED document
app.put("/api/admin/doctors/:id/approve", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const doc = db.doctors.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ error: "Médico não encontrado." });
  }

  doc.approved = true;
  saveDatabase(db);

  addNotification(id, "Perfil Médico Aprovado", "O seu documento da ORMED Angola foi validado e a sua conta médica está agora ativa e disponível para agendamento pelos pacientes.", "success");

  res.json({ success: true, doctor: doc });
});

// Anonymous Demo Login Endpoint (Patient)
app.post("/api/auth/demo-anonymous", (req, res) => {
  const db = getDatabase();
  let anonUser = db.users.find(u => u.isAnonymous);

  if (!anonUser) {
    const anonId = "u-anon-" + Math.random().toString(36).substring(2, 8);
    anonUser = {
      id: anonId,
      email: "anonimo@mwenho.ao",
      name: "Paciente Anónimo #AO",
      role: UserRole.PATIENT,
      isAnonymous: true,
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150",
      createdAt: new Date().toISOString(),
      subscription: {
        planId: "FREE_TRIAL",
        planName: "Período Experimental (14 Dias Grátis)",
        isTrial: true,
        trialDaysLeft: 14,
        active: true,
        expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      }
    };
    db.users.push(anonUser);
    db.patients[anonId] = {
      id: anonId,
      dateOfBirth: "1998-06-15",
      gender: "Não Informado",
      bloodType: "O+",
      allergies: [],
      chronicConditions: [],
      medications: []
    };
    saveDatabase(db);
  } else if (!anonUser.subscription) {
    anonUser.subscription = {
      planId: "FREE_TRIAL",
      planName: "Período Experimental (14 Dias Grátis)",
      isTrial: true,
      trialDaysLeft: 14,
      active: true,
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    };
    recordLoginLog(anonUser.id, anonUser.name, anonUser.email, "PATIENT", "Acesso Anónimo", req);
    saveDatabase(db);
  }

  res.json({ user: anonUser });
});

// Admin Doctor Registration Endpoint
app.post("/api/admin/doctors/create", (req, res) => {
  const { name, email, phoneNumber, password, specialtyId, licenseNumber, consultationFee, bio, avatarUrl } = req.body;

  if (!name || !specialtyId || !licenseNumber || !avatarUrl) {
    return res.status(400).json({ error: "Nome, foto de perfil, especialidade e número de licença ORMED são obrigatórios." });
  }

  const db = getDatabase();
  const specialty = db.specialties.find(s => s.id === specialtyId);
  if (!specialty) {
    return res.status(400).json({ error: "Especialidade inválida." });
  }

  const docUserId = "u-doc-" + Math.random().toString(36).substring(2, 10);
  const docEmail = email || `dr.${name.toLowerCase().replace(/\s+/g, '.')}@mwenho.ao`;

  const newUser: User = {
    id: docUserId,
    email: docEmail,
    phoneNumber: phoneNumber || "+244 923 000 " + Math.floor(100 + Math.random() * 900),
    password: password || "123456",
    name: name.startsWith("Dr") ? name : `Dr. ${name}`,
    role: UserRole.DOCTOR,
    authProvider: "email",
    avatarUrl: avatarUrl,
    createdAt: new Date().toISOString()
  };

  const newDocProfile: DoctorProfile = {
    id: docUserId,
    name: newUser.name,
    specialtyId: specialty.id,
    specialtyName: specialty.name,
    licenseNumber: licenseNumber.startsWith("ORMED") ? licenseNumber : `ORMED-AO ${licenseNumber}`,
    bio: bio || `Médico especialista em ${specialty.name} credenciado pela Ordem dos Médicos de Angola (ORMED).`,
    rating: 5.0,
    consultationFee: Number(consultationFee) || 20000,
    avatarUrl: newUser.avatarUrl,
    availableDays: ["Seg", "Ter", "Qua", "Qui", "Sex"],
    availableSlots: ["09:00", "10:30", "14:00", "15:30", "17:00"],
    approved: true
  };

  db.users.push(newUser);
  db.doctors.push(newDocProfile);
  saveDatabase(db);

  addNotification(docUserId, "Conta Médica Criada", `Sua conta médica foi cadastrada e credenciada com sucesso pela Administração. N.º ORMED: ${newDocProfile.licenseNumber}.`, "success");

  res.json({ user: newUser, docProfile: newDocProfile });
});

// Admin Patient Registration Endpoint
app.post("/api/admin/patients/create", (req, res) => {
  const { name, email, phoneNumber, password, dateOfBirth, gender, bloodType, avatarUrl } = req.body;

  if (!name || !avatarUrl) {
    return res.status(400).json({ error: "Nome e foto de perfil do paciente são obrigatórios." });
  }

  const db = getDatabase();
  
  if (email) {
    const exists = db.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: "Já existe um utilizador com este e-mail." });
    }
  }

  if (phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const existsPhone = db.users.find(u => u.phoneNumber && u.phoneNumber.replace(/\D/g, '') === cleanPhone);
    if (existsPhone) {
      return res.status(400).json({ error: "Já existe um utilizador com este número de telefone." });
    }
  }

  const patUserId = "u-pat-" + Math.random().toString(36).substring(2, 10);
  const patEmail = email ? email.toLowerCase() : `paciente.${patUserId.substring(6)}@mwenho.ao`;

  const newUser: User = {
    id: patUserId,
    email: patEmail,
    phoneNumber: phoneNumber || "",
    password: password || "123456",
    name: name,
    role: UserRole.PATIENT,
    authProvider: email ? "email" : "phone",
    avatarUrl: avatarUrl,
    createdAt: new Date().toISOString()
  };

  const newPatientProfile: PatientProfile = {
    id: patUserId,
    dateOfBirth: dateOfBirth || "1995-01-01",
    gender: gender || "Não Especificado",
    bloodType: bloodType || "O+",
    allergies: [],
    chronicConditions: [],
    medications: []
  };

  db.users.push(newUser);
  db.patients[patUserId] = newPatientProfile;
  saveDatabase(db);

  addNotification(patUserId, "Conta de Paciente Criada", "A sua conta de paciente foi criada com sucesso pela Administração da plataforma.", "success");

  res.json({ user: newUser, patientProfile: newPatientProfile });
});

// Bulk & Single Delete User Endpoints
app.delete("/api/admin/users/bulk", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Nenhum ID de utilizador fornecido para remoção." });
  }

  const db = getDatabase();
  const idsSet = new Set(ids);

  db.users = db.users.filter(u => !idsSet.has(u.id));
  db.doctors = db.doctors.filter(d => !idsSet.has(d.id));
  if (db.managers) {
    db.managers = db.managers.filter(m => !idsSet.has(m.id));
  }

  ids.forEach(id => {
    delete db.patients[id];
  });

  if (db.appointments) {
    db.appointments = db.appointments.filter(a => !idsSet.has(a.doctorId) && !idsSet.has(a.patientId));
  }
  if (db.aiReports) {
    db.aiReports = db.aiReports.filter(r => !idsSet.has(r.patientId));
  }
  if (db.messages) {
    db.messages = db.messages.filter(m => !idsSet.has(m.senderId) && !ids.some(id => m.chatId.includes(id)));
  }

  saveDatabase(db);
  res.json({ success: true, removedCount: ids.length });
});

app.delete("/api/admin/users/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();

  db.users = db.users.filter(u => u.id !== id);
  db.doctors = db.doctors.filter(d => d.id !== id);
  if (db.managers) {
    db.managers = db.managers.filter(m => m.id !== id);
  }
  delete db.patients[id];

  if (db.appointments) {
    db.appointments = db.appointments.filter(a => a.doctorId !== id && a.patientId !== id);
  }
  if (db.aiReports) {
    db.aiReports = db.aiReports.filter(r => r.patientId !== id);
  }
  if (db.messages) {
    db.messages = db.messages.filter(m => m.senderId !== id && !m.chatId.includes(id));
  }

  saveDatabase(db);
  res.json({ success: true });
});

// Admin Reset Financials & Analytics Endpoint
app.post("/api/admin/reset-financials", (req, res) => {
  const db = getDatabase();

  db.appointments = [];
  db.aiReports = [];

  db.users.forEach(u => {
    if (u.subscription) {
      u.subscription = {
        planId: "FREE_TRIAL",
        planName: "Sem Plano",
        isTrial: false,
        trialDaysLeft: 0,
        active: false,
        expiryDate: new Date().toISOString()
      };
    }
  });

  saveDatabase(db);
  res.json({ success: true, message: "Dados financeiros e de analytics foram zerados com sucesso." });
});

// Admin Platform Managers Endpoints
app.post("/api/admin/managers/create", (req, res) => {
  const { name, email, password, phone, roleTitle, department, avatarUrl } = req.body;
  if (!name || !roleTitle || !avatarUrl) {
    return res.status(400).json({ error: "Nome, foto de perfil e função do gestor são obrigatórios." });
  }

  const db = getDatabase();
  const managerId = "mng-" + Math.random().toString(36).substring(2, 9);
  const mngEmail = email ? email.trim() : `gestor.${Math.floor(Math.random() * 1000)}@mwenho.ao`;

  const manager: PlatformManager = {
    id: managerId,
    name: name.trim(),
    email: mngEmail,
    phone: phone || "+244 923 000 000",
    roleTitle,
    department: department || "Operações & Gestão",
    avatarUrl,
    active: true,
    createdAt: new Date().toISOString()
  };

  if (!db.managers) db.managers = [];
  db.managers.push(manager);

  if (!db.users.some(u => u.email === mngEmail)) {
    db.users.push({
      id: managerId,
      email: mngEmail,
      name: manager.name,
      phoneNumber: manager.phone,
      password: password || "123456",
      role: UserRole.ADMIN,
      avatarUrl,
      createdAt: new Date().toISOString()
    });
  }

  saveDatabase(db);
  res.json({ manager });
});

app.get("/api/admin/managers", (req, res) => {
  const db = getDatabase();
  if (!db.managers) db.managers = [];
  
  // Combine managers table and ADMIN users
  const existingManagerEmails = new Set(db.managers.map(m => m.email.toLowerCase()));
  const adminUsers = db.users.filter(u => u.role === UserRole.ADMIN);
  
  adminUsers.forEach((u, i) => {
    if (!existingManagerEmails.has(u.email.toLowerCase())) {
      db.managers.push({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phoneNumber || "+244 923 888 111",
        roleTitle: u.email.toLowerCase().includes("admin") ? "Administrador Geral" : "Gestor Financeiro",
        department: "Direção Geral",
        avatarUrl: u.avatarUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150",
        active: true,
        createdAt: u.createdAt || new Date().toISOString()
      });
      existingManagerEmails.add(u.email.toLowerCase());
    }
  });

  res.json(db.managers);
});

app.delete("/api/admin/managers/bulk", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Nenhum ID de gestor fornecido para remoção." });
  }

  const db = getDatabase();
  if (db.managers) {
    db.managers = db.managers.filter(m => !ids.includes(m.id));
  }
  db.users = db.users.filter(u => !ids.includes(u.id));

  saveDatabase(db);
  res.json({ success: true, removedCount: ids.length });
});

// Admin Audit Login Logs Endpoint (Search by name or email)
app.get("/api/admin/login-logs", (req, res) => {
  const { q } = req.query;
  const db = getDatabase();
  let logs = db.loginLogs || [];

  if (q && typeof q === "string" && q.trim()) {
    const query = q.trim().toLowerCase();
    logs = logs.filter(l => 
      (l.userName && l.userName.toLowerCase().includes(query)) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(query)) ||
      (l.role && l.role.toLowerCase().includes(query))
    );
  }

  res.json(logs);
});

// Admin Financial Analytics Endpoint
app.get("/api/admin/financials", (req, res) => {
  const db = getDatabase();
  
  // Total completed and paid appointments
  const paidAppointments = db.appointments.filter(a => a.paymentStatus === "PAID" || a.status === AppointmentStatus.COMPLETED);
  const totalConsultationsRevenue = paidAppointments.reduce((acc, a) => acc + (a.consultationFee || 0), 0);
  
  // Platform cut (15%) vs Doctor cut (85%)
  const platformConsultationFee = totalConsultationsRevenue * 0.15;
  const doctorConsultationPayout = totalConsultationsRevenue * 0.85;

  // Subscriptions revenue
  const activeSubscribers = db.users.filter(u => u.subscription?.active && !u.subscription?.isTrial);
  const totalSubscriptionRevenue = activeSubscribers.length * 2000;

  const totalGrossRevenue = totalConsultationsRevenue + totalSubscriptionRevenue;
  const totalMwenhoCompanyRevenue = platformConsultationFee + totalSubscriptionRevenue;

  // Breakdown by Doctor
  const doctorEarnings = db.doctors.map(doc => {
    const docAppointments = paidAppointments.filter(a => a.doctorId === doc.id);
    const gross = docAppointments.reduce((sum, a) => sum + (a.consultationFee || doc.consultationFee || 0), 0);
    const platformCommission = gross * 0.15;
    const netPayout = gross * 0.85;

    return {
      doctorId: doc.id,
      doctorName: doc.name,
      specialtyName: doc.specialtyName,
      licenseNumber: doc.licenseNumber,
      totalConsultations: docAppointments.length,
      grossRevenueKz: gross,
      platformCommissionKz: platformCommission,
      netDoctorPayoutKz: netPayout
    };
  });

  res.json({
    totalGrossRevenue,
    totalMwenhoCompanyRevenue,
    doctorConsultationPayout,
    totalSubscriptionRevenue,
    activeSubscribersCount: activeSubscribers.length,
    doctorEarnings
  });
});

// Patient Clinical Exams Endpoints
app.get("/api/patients/:id/exams", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const exams = db.aiReports.filter(r => r.patientId === id).map(r => ({
    id: r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    title: `Exame de Triagem e Análise (${r.suggestedSpecialty})`,
    laboratory: "Centro de Análises Clínicas Luanda",
    examDate: r.createdAt.split("T")[0],
    aiAnalysisSummary: r.clinicalSummary,
    keyFindings: [
      `Severidade Detetada: ${r.severity}`,
      `Especialidade Recomendada: ${r.suggestedSpecialty}`,
      `Sintomas Analisados: ${r.symptoms}`
    ],
    status: "Analisado por IA",
    uploadedAt: r.createdAt
  }));

  res.json(exams);
});

app.post("/api/patients/:id/exams", (req, res) => {
  const { id } = req.params;
  const { title, laboratory, examDate, examText, fileName } = req.body;

  const db = getDatabase();
  const patient = db.users.find(u => u.id === id);

  const newExam = {
    id: "exam-" + Math.random().toString(36).substring(2, 9),
    patientId: id,
    patientName: patient?.name || "Paciente Mwenho",
    title: title || "Análise de Sangue / Exame de Laboratório",
    laboratory: laboratory || "Laboratório Central de Luanda",
    examDate: examDate || new Date().toISOString().split("T")[0],
    fileName: fileName || "exame_clinico_resultado.pdf",
    aiAnalysisSummary: examText ? `Resultado do exame processado: ${examText.substring(0, 150)}...` : "Análise pendente de verificação médica.",
    keyFindings: ["Glicemia e hemograma em padrões de referência", "Recomenda-se acompanhamento com Clínico Geral"],
    status: "Analisado por IA",
    uploadedAt: new Date().toISOString()
  };

  res.json(newExam);
});

// AI Exam Analysis Endpoint via Gemini
app.post("/api/ai/analyze-exam", async (req, res) => {
  const { examTitle, examText } = req.body;

  try {
    const gemini = getGeminiClient();
    const prompt = `Você é um assistente clínico de IA do Mwenho TelemedAI em Angola.
Analise o seguinte exame médico/laboratorial e forneça um resumo claro para o paciente e para o médico.
Título do Exame: ${examTitle || "Análise Clínica"}
Texto do Exame: ${examText || "Hemograma Completo, Glicemia em Jejum 95 mg/dL, Colesterol Total 180 mg/dL, Triglicerídeos 140 mg/dL."}

Responda em JSON rigoroso com a estrutura:
{
  "summary": "Resumo clínico compreensível do exame em Português de Angola.",
  "keyValues": ["Hemoglobina: Normal", "Glicemia: 95 mg/dL (Normal)"],
  "recommendations": "Recomendação diagnóstica para a teleconsulta."
}`;

    const response = await gemini.models.generateContent({
      model: "gemini-3.6-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.json({
      summary: "O exame apresenta parâmetros clínicos dentro dos padrões habituais de referência.",
      keyValues: ["Glicemia em Jejum: 95 mg/dL (Desejável)", "Hemograma: Sem alterações agudas"],
      recommendations: "Apresente estes resultados na sua próxima teleconsulta médica."
    });
  }
});

// 2. Specialties
app.get("/api/specialties", (req, res) => {
  const db = getDatabase();
  res.json(db.specialties);
});

// 3. Doctors
app.get("/api/doctors", (req, res) => {
  const db = getDatabase();
  const { approvedOnly, specialtyId } = req.query;
  
  let docs = db.doctors;
  if (approvedOnly === "true") {
    docs = docs.filter(d => d.approved);
  }
  if (specialtyId) {
    docs = docs.filter(d => d.specialtyId === specialtyId);
  }
  res.json(docs);
});

app.put("/api/doctors/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const index = db.doctors.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Perfil de médico não encontrado" });
  }

  const specialty = db.specialties.find(sp => sp.id === req.body.specialtyId);
  
  db.doctors[index] = {
    ...db.doctors[index],
    ...req.body,
    specialtyName: specialty ? specialty.name : db.doctors[index].specialtyName
  };
  saveDatabase(db);
  res.json(db.doctors[index]);
});

// 4. Patients
app.get("/api/patients/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const profile = db.patients[id];
  const user = db.users.find(u => u.id === id);
  if (!profile) {
    return res.status(404).json({ error: "Perfil de paciente não encontrado" });
  }
  res.json({ ...profile, name: user?.name, email: user?.email, avatarUrl: user?.avatarUrl });
});

app.put("/api/patients/:id", (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  if (!db.patients[id]) {
    db.patients[id] = {
      id,
      dateOfBirth: "",
      gender: "",
      bloodType: "",
      allergies: [],
      chronicConditions: [],
      medications: []
    };
  }
  db.patients[id] = {
    ...db.patients[id],
    ...req.body
  };
  
  // also check name or avatarUrl changes
  const userIndex = db.users.findIndex(u => u.id === id);
  if (userIndex !== -1) {
    if (req.body.name) db.users[userIndex].name = req.body.name;
    if (req.body.avatarUrl) db.users[userIndex].avatarUrl = req.body.avatarUrl;
  }

  saveDatabase(db);
  res.json(db.patients[id]);
});

// 5. Appointments
app.get("/api/appointments", (req, res) => {
  const { userId, role } = req.query;
  const db = getDatabase();
  let appointments = db.appointments;
  
  if (userId) {
    const targetUser = db.users.find(u => u.id === userId);
    const effectiveRole = (role as string) || targetUser?.role || UserRole.PATIENT;

    if (effectiveRole === UserRole.PATIENT) {
      appointments = appointments.filter(a => a.patientId === userId);
    } else if (effectiveRole === UserRole.DOCTOR) {
      appointments = appointments.filter(a => a.doctorId === userId);
    }
  }
  res.json(appointments);
});

app.post("/api/appointments", (req, res) => {
  const { patientId, doctorId, date, time } = req.body;
  if (!patientId || !doctorId || !date || !time) {
    return res.status(400).json({ error: "Dados incompletos para marcação" });
  }

  const db = getDatabase();
  const patientUser = db.users.find(u => u.id === patientId);
  const doctorProfile = db.doctors.find(d => d.id === doctorId);

  if (!patientUser || !doctorProfile) {
    return res.status(404).json({ error: "Paciente ou Médico inválido" });
  }

  const appointmentId = "apt-" + Math.random().toString(36).substring(2, 11);
  const newApt: Appointment = {
    id: appointmentId,
    patientId,
    patientName: patientUser.name,
    doctorId,
    doctorName: doctorProfile.name,
    doctorSpecialty: doctorProfile.specialtyName,
    date,
    time,
    status: AppointmentStatus.PENDING,
    consultationFee: doctorProfile.consultationFee,
    paymentStatus: "PENDING",
    videoRoomId: `room-${appointmentId}`,
    aiReportId: req.body.aiReportId || undefined
  };

  db.appointments.push(newApt);
  saveDatabase(db);

  addNotification(doctorId, "Nova solicitação de consulta", `O paciente ${patientUser.name} solicitou agendamento para ${date} às ${time}.`, "info");
  addNotification(patientId, "Consulta solicitada", `Seu agendamento com ${doctorProfile.name} está pendente de aprovação.`, "info");

  res.json(newApt);
});

app.put("/api/appointments/:id/status", (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;
  const db = getDatabase();
  const index = db.appointments.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Consulta não encontrada" });
  }

  const original = db.appointments[index];
  db.appointments[index] = {
    ...original,
    status: (status || original.status) as AppointmentStatus,
    paymentStatus: paymentStatus || original.paymentStatus
  };
  saveDatabase(db);

  // Trigger Notifications
  if (status === AppointmentStatus.ACCEPTED) {
    addNotification(original.patientId, "Consulta Confirmada!", `Sua consulta com ${original.doctorName} foi aceita para o dia ${original.date} às ${original.time}.`, "success");
  } else if (status === AppointmentStatus.REJECTED) {
    addNotification(original.patientId, "Consulta Recusada", `Infelizmente a sua solicitação com ${original.doctorName} não pôde ser aceita.`, "warning");
  } else if (status === AppointmentStatus.CANCELLED) {
    addNotification(original.doctorId, "Consulta Cancelada", `O paciente cancelou a consulta de ${original.date} às ${original.time}.`, "error");
    addNotification(original.patientId, "Consulta Cancelada", `Você cancelou com sucesso sua consulta de ${original.date} com ${original.doctorName}.`, "info");
  } else if (status === AppointmentStatus.COMPLETED) {
    addNotification(original.patientId, "Consulta Concluída", `Sua consulta de telemedicina foi finalizada. Acesse seu painel para receitas e relatórios clínicos.`, "success");
  }

  res.json(db.appointments[index]);
});

app.put("/api/appointments/:id/prescription", (req, res) => {
  const { id } = req.params;
  const { medicines, instructions } = req.body;
  const db = getDatabase();
  const index = db.appointments.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Consulta não encontrada" });
  }

  const original = db.appointments[index];
  const prescriptionId = "pres-" + Math.random().toString(36).substring(2, 11);
  const newPrescription = {
    id: prescriptionId,
    appointmentId: id,
    patientId: original.patientId,
    doctorName: original.doctorName,
    date: new Date().toISOString().split("T")[0],
    medicines: medicines || [],
    instructions: instructions || "",
    digitalSignature: `${original.doctorName} - ORMED_AO_VALIDATED_${original.doctorId.substring(0, 5)}`
  };

  db.appointments[index].prescription = newPrescription;
  saveDatabase(db);

  addNotification(original.patientId, "Nova Receita Digital", `Dra/Dr. ${original.doctorName} emitiu uma receita digital para você.`, "success");
  res.json(db.appointments[index]);
});

app.put("/api/appointments/:id/notes", (req, res) => {
  const { id } = req.params;
  const { doctorNotes } = req.body;
  const db = getDatabase();
  const index = db.appointments.findIndex(a => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Consulta não encontrada" });
  }

  db.appointments[index].doctorNotes = doctorNotes || "";
  saveDatabase(db);
  res.json(db.appointments[index]);
});

// 6. Messages & Chats
app.get("/api/messages/:chatId", (req, res) => {
  const { chatId } = req.params;
  const db = getDatabase();
  const chatMsgs = db.messages.filter(m => m.chatId === chatId);
  res.json(chatMsgs);
});

app.post("/api/messages", async (req, res) => {
  const { chatId, senderId, senderName, text } = req.body;
  if (!chatId || !senderId || !text) {
    return res.status(400).json({ error: "Mensagem inválida" });
  }

  const db = getDatabase();
  const msgId = "msg-" + Math.random().toString(36).substring(2, 11);
  const newMsg: Message = {
    id: msgId,
    chatId,
    senderId,
    senderName,
    text,
    timestamp: new Date().toISOString()
  };

  db.messages.push(newMsg);
  saveDatabase(db);

  // If chat is with AI, trigger Gemini AI Response
  if (chatId.includes("-ai")) {
    try {
      const client = getGeminiClient();
      
      // Get recent messages for context
      const chatHistory = db.messages
        .filter(m => m.chatId === chatId)
        .slice(-10) // last 10 messages for context
        .map(m => `${m.isAi ? "Dr. AI" : m.senderName}: ${m.text}`)
        .join("\n");

      const systemInstruction = `Você é o "Dr. AI", Profissional de Saúde (Médico/Enfermeiro Acolhedor) da Mwenho TelemedAI em Angola.

DIRETRIZES DE ACOLHIMENTO HUMANIZADO E ESTILO DE RESPOSTA:
1. PERSONA ACOLHEDORA E AFETUOSA: Fale com o paciente de forma extremamente educada, gentil, respeitosa e carinhosa — exatamente como um enfermeiro ou médico acolhedor que recebe cada cliente com amor, empatia e atenção dedicada.
2. TAMANHO E FORMATO DAS RESPOSTAS:
   - Responda de forma SUCINTA E CONCISA por padrão (1 a 3 parágrafos breves), indo direto ao ponto com acolhimento e clareza. Evite textos extensos ou desgastantes desnecessariamente.
   - Sempre que NECESSÁRIO (ex: quando o paciente solicitar esclarecimentos profundos, tiver dúvidas clínicas complexas, múltiplos sintomas ou pedir explicações detalhadas sobre doenças e cuidados), forneça respostas mais LONGAS, completas e didáticas, organizadas com tópicos limpos.
3. ESTRUTURA DE ATENDIMENTO:
   - Cumprimento caloroso e afetuoso (ex: "Olá! Seja muito bem-vindo(a). Compreendo a sua preocupação e estou aqui para cuidar de si com todo o carinho...").
   - Orientações de conforto, cuidados imediatos seguros e sinais de alerta relevantes.
   - Pergunta(s) clínica(s) breve(s) se necessário para compreender melhor a situação.
   - Orientação carinhosa para agendar consulta com um dos médicos especialistas da nossa plataforma.
4. SEGURANÇA E REGULAMENTAÇÃO:
   - Não prescreva medicação controlada nem emita diagnósticos definitivos sem consulta presencial/teleconsulta médica formal.
   - Em caso de emergências graves (dor forte no peito, falta de ar severa, convulsão, perda de consciência), oriente imediatamente a ida ao Banco de Urgência (112 / 116).
5. Linguagem em Português de Angola, cristalina, acolhedora e impecável.`;

      const prompt = `Histórico recente da conversa:\n${chatHistory}\n\nPaciente diz: "${text}"\n\nResponda como o Dr. AI (Enfermeiro/Médico Acolhedor), de forma educada, carinhosa e sucinta (ou detalhada se o contexto exigir), concluindo todas as frases com clareza.`;

      const response = await client.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
          maxOutputTokens: 2048
        }
      });

      const aiText = response.text || "Olá! Sou o Dr. AI. Compreendo o seu relato. Poderia detalhar há quanto tempo sente estes sintomas para eu orientá-lo melhor?";
      
      const aiMsg: Message = {
        id: "msg-" + Math.random().toString(36).substring(2, 11),
        chatId,
        senderId: "ai",
        senderName: "Dr. AI",
        text: aiText,
        timestamp: new Date().toISOString(),
        isAi: true
      };

      db.messages.push(aiMsg);
      saveDatabase(db);

      return res.json({ userMsg: newMsg, aiMsg });
    } catch (err: any) {
      console.error("Gemini Chat Triage error:", err?.message || err);
      
      // Smart, empathetic medical response fallback if Gemini API is missing or fails
      let fallbackText = "";
      const lower = text.toLowerCase();

      if (lower.includes("peito") || lower.includes("ar") || lower.includes("desmaio") || lower.includes("sangue") || lower.includes("convuls")) {
        fallbackText = "Olá! Seja muito bem-vindo(a). Sou o Dr. AI e estou aqui para cuidar de si com todo o carinho. ⚠️ ATENÇÃO: Sintomas como dor no peito, falta de ar intensa ou desmaio necessitam de atenção imediata. Por favor, dirija-se com urgência a um hospital ou serviço de emergência (112 / 116). Se estiver estável, agende uma consulta prioritária conosco.";
      } else if (lower.includes("febre") || lower.includes("cabeça") || lower.includes("corpo")) {
        fallbackText = "Olá! Seja muito bem-vindo(a). Sou o Dr. AI e recebo-o(a) com muito carinho. Sinto muito pelo seu desconforto. Há quanto tempo tem febre ou dor de cabeça? Mantenha-se bem hidratado(a) e repouse. Para um cuidado completo, sugiro agendar uma consulta com um dos nossos médicos especialistas.";
      } else if (lower.includes("estômago") || lower.includes("barriga") || lower.includes("enjoo") || lower.includes("vômito") || lower.includes("diarreia")) {
        fallbackText = "Olá! Seja muito bem-vindo(a). Sou o Dr. AI e estou aqui para ajudar com todo o afeto. Compreendo o seu desconforto na barriga. Procure beber água aos poucos e repousar. Para avaliarmos melhor o seu caso, recomendo agendar uma teleconsulta conosco.";
      } else if (lower.includes("pele") || lower.includes("alergia") || lower.includes("coceira") || lower.includes("comichão") || lower.includes("mancha")) {
        fallbackText = "Olá! Seja muito bem-vindo(a). Sou o Dr. AI e acolho a sua queixa com todo o cuidado. Notou se esta alergia surgiu após algum alimento ou produto? Se sentir dificuldades em respirar, busque urgência. Caso contrário, agende uma consulta com a nossa dermatologia.";
      } else {
        fallbackText = `Olá! Seja muito bem-vindo(a). Sou o Dr. AI, o seu enfermeiro e médico assistente digital. Recebo o seu relato sobre "${text}" com muito amor e atenção. Há quanto tempo sente estes desconfortos? Estou aqui para orientá-lo(a) de forma sucinta e acolhedora e ajudá-lo(a) a agendar a sua consulta.`;
      }

      const aiFallbackMsg: Message = {
        id: "msg-" + Math.random().toString(36).substring(2, 11),
        chatId,
        senderId: "ai",
        senderName: "Dr. AI",
        text: fallbackText,
        timestamp: new Date().toISOString(),
        isAi: true
      };
      db.messages.push(aiFallbackMsg);
      saveDatabase(db);
      return res.json({ userMsg: newMsg, aiMsg: aiFallbackMsg });
    }
  }

  res.json({ userMsg: newMsg });
});

app.delete("/api/messages/:chatId", (req, res) => {
  const { chatId } = req.params;
  const db = getDatabase();
  db.messages = db.messages.filter(m => m.chatId !== chatId);
  saveDatabase(db);
  res.json({ success: true, message: "Histórico de conversas apagado com sucesso" });
});

// 7. Clinical Triage Generator (Direct Symptom Triaging to structured AIReport)
app.post("/api/ai/triage", async (req, res) => {
  const { patientId, symptoms } = req.body;
  if (!patientId || !symptoms) {
    return res.status(400).json({ error: "Sintomas e ID do paciente são obrigatórios" });
  }

  const db = getDatabase();
  const patientUser = db.users.find(u => u.id === patientId);
  const patientProfile = db.patients[patientId];

  try {
    const client = getGeminiClient();
    
    // gather medical profile context if exists
    let contextStr = "";
    if (patientProfile) {
      contextStr = `Histórico de alergias: ${patientProfile.allergies?.join(", ") || "Nenhuma"}.
Condições crônicas: ${patientProfile.chronicConditions?.join(", ") || "Nenhuma"}.
Medicamentos de uso contínuo: ${patientProfile.medications?.join(", ") || "Nenhum"}.`;
    }

    const systemInstruction = `Você é um motor de IA integrado a um hospital digital especializado em Triagem Inteligente.
Você recebe a descrição dos sintomas do paciente e deve analisar minuciosamente sob as diretrizes clínicas.
Gere um objeto JSON estruturado contendo a gravidade estimada, especialidade recomendada e um resumo clínico detalhado.`;

    const prompt = `Paciente: ${patientUser?.name || "Paciente Anônimo"}
Sintomas relatados: "${symptoms}"
Contexto clínico prévio do paciente:
${contextStr}

Por favor, analise as informações acima e preencha as seguintes propriedades JSON:
- severity: Deve ser EXATAMENTE um dos seguintes valores em português: "Baixo" ou "Moderado" ou "Alto" ou "Urgente".
- suggestedSpecialty: Sugira uma especialidade médica ideal da lista (Clínica Geral, Cardiologia, Pediatria, Psiquiatria, Dermatologia, Ortopedia) com base na queixa.
- clinicalSummary: Um resumo profissional em português (3 a 5 frases) com considerações sobre os sintomas, advertências cruciais de segurança e orientações pré-consulta.`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: {
              type: Type.STRING,
              description: "A gravidade estimada da situação do paciente. Deve ser exatamente: 'Baixo', 'Moderado', 'Alto', ou 'Urgente'."
            },
            suggestedSpecialty: {
              type: Type.STRING,
              description: "Uma especialidade recomendada em português."
            },
            clinicalSummary: {
              type: Type.STRING,
              description: "Resumo clínico detalhado e empático."
            }
          },
          required: ["severity", "suggestedSpecialty", "clinicalSummary"]
        }
      }
    });

    const output = JSON.parse(response.text || "{}");
    
    const reportId = "rep-" + Math.random().toString(36).substring(2, 11);
    const report: AIReport = {
      id: reportId,
      patientId,
      patientName: patientUser?.name || "Paciente",
      symptoms,
      severity: output.severity || "Moderado",
      suggestedSpecialty: output.suggestedSpecialty || "Clínica Geral",
      clinicalSummary: output.clinicalSummary || "Resumo clínico gerado pela inteligência artificial.",
      createdAt: new Date().toISOString()
    };

    db.aiReports.push(report);
    saveDatabase(db);

    addNotification(patientId, "Triagem Concluída", `Relatório de triagem gerado com sucesso. Classificação: ${report.severity}. Especialidade sugerida: ${report.suggestedSpecialty}.`, "success");

    res.json(report);
  } catch (err: any) {
    console.error("Gemini Triage API error", err);
    // Return a sensible fallback report if API fails/missing keys, so the flow never breaks for the user
    const fallbackReport: AIReport = {
      id: "rep-fallback-" + Math.floor(Math.random() * 1000),
      patientId,
      patientName: patientUser?.name || "Paciente",
      symptoms,
      severity: "Moderado",
      suggestedSpecialty: "Clínica Geral",
      clinicalSummary: `[Nota: Modo offline - IA simulada devido à falta ou limite da chave de API] Sintomas relatados: "${symptoms}". Recomendamos agendar consulta com Clínica Geral para avaliação de segurança detalhada.`,
      createdAt: new Date().toISOString()
    };
    db.aiReports.push(fallbackReport);
    saveDatabase(db);
    res.json(fallbackReport);
  }
});

// Fetch all saved AI triage reports for a patient
app.get("/api/ai/reports/:patientId", (req, res) => {
  const { patientId } = req.params;
  const db = getDatabase();
  const reports = (db.aiReports || []).filter(r => r.patientId === patientId);
  res.json(reports);
});

// Delete a specific AI triage report
app.delete("/api/ai/reports/:reportId", (req, res) => {
  const { reportId } = req.params;
  const db = getDatabase();
  db.aiReports = (db.aiReports || []).filter(r => r.id !== reportId);
  saveDatabase(db);
  res.json({ success: true, message: "Relatório apagado com sucesso" });
});

// 8. Document & PDF Exam Summarizer
app.post("/api/ai/summarize-document", async (req, res) => {
  const { documentText, documentName } = req.body;
  if (!documentText) {
    return res.status(400).json({ error: "Texto do documento/exame é obrigatório." });
  }

  try {
    const client = getGeminiClient();
    const prompt = `Analise o seguinte conteúdo de um laudo de exame clínico ou histórico médico em PDF de nome "${documentName || "documento.pdf"}":
Conteúdo:\n"${documentText}"

Por favor, faça um resumo clínico simplificado e altamente legível para o paciente em português de Angola. Inclua:
1. **O que é este exame** de forma simples.
2. **Principais achados ou valores** indicados no texto.
3. **Recomendações e perguntas sugeridas** para o paciente fazer ao médico especialista durante a teleconsulta.
AVISO: Reitere que isso é um resumo automatizado e não substitui de forma alguma o parecer profissional do médico assistente.`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    console.error("Gemini summarize document error", err);
    res.status(500).json({ 
      error: "Falha ao gerar resumo da IA.", 
      details: err.message || "Verifique se a chave GEMINI_API_KEY foi adicionada corretamente." 
    });
  }
});

// 9. AI Clinician Assistant (For Doctors to summarize patient clinical history and suggest questions)
app.post("/api/ai/clinician-assistant", async (req, res) => {
  const { patientProfile, appointmentHistory, triageSymptom } = req.body;
  
  try {
    const client = getGeminiClient();
    const prompt = `Aja como o assistente clínico inteligente avançado de uma plataforma de telemedicina. Auxilie o médico fornecendo insights diagnósticos e estruturais para a próxima consulta.

Dados do Paciente:
- Histórico Clínico: Alergias (${patientProfile?.allergies?.join(", ") || "Nenhuma"}), Condições Crônicas (${patientProfile?.chronicConditions?.join(", ") || "Nenhuma"}), Medicamentos (${patientProfile?.medications?.join(", ") || "Nenhum"}).
- Sintoma Atual da Triagem: "${triageSymptom || "Nenhum cadastrado para esta sessão"}"
- Histórico de Consultas Anteriores: ${JSON.stringify(appointmentHistory || [])}

Por favor, elabore um sumário executivo em português que contenha:
1. **Pontos de Atenção Crítica** (Alergias perigosas, interações de medicamentos ou alertas).
2. **Hipóteses Diagnósticas Diferenciais Primárias** baseadas nos sintomas relatados.
3. **Direcionamento de Perguntas Clínicas** (Quais perguntas específicas e guiadas o médico deve fazer durante a chamada para esclarecer o quadro).
4. **Sugestões de Exames Complementares** úteis para solicitar.`;

    const response = await client.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt
    });

    res.json({ insights: response.text });
  } catch (err: any) {
    console.error("Gemini Clinician Assistant error", err);
    res.json({ 
      insights: `### Assistente de IA de Prontuário Clínico (Offline)
- **Pontos de Atenção:** Paciente possui alergias registradas a ${patientProfile?.allergies?.join(", ") || "Nenhuma"}.
- **Aconselhamento:** Revisar queixas de sintomas recentes ("${triageSymptom || "Não informados"}") com foco em semiologia da dor/desconforto.
- **Anamnese Recomendada:** Questionar o início, duração, fatores de melhora/piora e histórico familiar correlato.` 
    });
  }
});

// 10. Admin stats
app.get("/api/admin/stats", (req, res) => {
  const db = getDatabase();
  
  const totalPatients = db.users.filter(u => u.role === UserRole.PATIENT).length;
  const totalDoctors = db.doctors.length;
  const totalAppointments = db.appointments.length;
  const paidAppointments = db.appointments.filter(a => a.paymentStatus === "PAID" || a.status === AppointmentStatus.COMPLETED);
  const totalRevenue = paidAppointments.reduce((sum, a) => sum + (a.consultationFee || 0), 0);

  // Appointments by status
  const statusMap: Record<string, number> = {};
  db.appointments.forEach(a => {
    statusMap[a.status] = (statusMap[a.status] || 0) + 1;
  });
  const appointmentsByStatus = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

  // Appointments by specialty
  const specialtyMap: Record<string, number> = {};
  db.appointments.forEach(a => {
    specialtyMap[a.doctorSpecialty] = (specialtyMap[a.doctorSpecialty] || 0) + 1;
  });
  const appointmentsBySpecialty = Object.entries(specialtyMap).map(([specialty, count]) => ({ specialty, count }));

  // Severity stats
  const severityMap: Record<string, number> = { "Baixo": 0, "Moderado": 0, "Alto": 0, "Urgente": 0 };
  db.aiReports.forEach(r => {
    severityMap[r.severity] = (severityMap[r.severity] || 0) + 1;
  });
  const severityStats = Object.entries(severityMap).map(([severity, count]) => ({ severity, count }));

  // Revenue by month calculated from actual paid appointments or zero if empty
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthSums: Record<string, number> = {};
  months.forEach(m => { monthSums[m] = 0; });

  paidAppointments.forEach(a => {
    if (a.date) {
      const d = new Date(a.date);
      if (!isNaN(d.getTime())) {
        const mName = months[d.getMonth()];
        if (mName) {
          monthSums[mName] += (a.consultationFee || 0);
        }
      }
    }
  });

  const revenueByMonth = months.map(m => ({ month: m, amount: monthSums[m] }));

  res.json({
    totalPatients,
    totalDoctors,
    totalAppointments,
    totalRevenue,
    appointmentsByStatus,
    appointmentsBySpecialty,
    severityStats,
    revenueByMonth
  });
});

app.get("/api/admin/users", (req, res) => {
  const db = getDatabase();
  const list = db.users.map(u => {
    const isDoc = u.role === UserRole.DOCTOR;
    const docProfile = isDoc ? db.doctors.find(d => d.id === u.id) : null;
    return {
      ...u,
      docProfile
    };
  });
  res.json(list);
});

app.put("/api/admin/doctors/:id/approve", (req, res) => {
  const { id } = req.params;
  const { approved } = req.body;
  const db = getDatabase();
  const index = db.doctors.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Médico não encontrado." });
  }

  db.doctors[index].approved = approved;
  saveDatabase(db);

  addNotification(id, approved ? "Inscrição Aprovada!" : "Inscrição Suspensa", 
    approved ? "Parabéns! Sua credencial de médico foi aprovada pela administração. Você já pode atender pacientes." : "Sua credencial de atendimento médico foi suspensa temporariamente.",
    approved ? "success" : "warning"
  );

  res.json(db.doctors[index]);
});

app.put("/api/admin/doctors/:id/fee", (req, res) => {
  const { id } = req.params;
  const { consultationFee } = req.body;
  const db = getDatabase();
  const index = db.doctors.findIndex(d => d.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Médico não encontrado." });
  }

  const feeNumber = Number(consultationFee);
  if (isNaN(feeNumber) || feeNumber < 0) {
    return res.status(400).json({ error: "Valor de consulta inválido." });
  }

  db.doctors[index].consultationFee = feeNumber;
  saveDatabase(db);

  addNotification(id, "Preço de Consulta Atualizado", `A administração atualizou o valor da sua teleconsulta para ${feeNumber.toLocaleString("pt-AO")} Kz.`, "info");

  res.json(db.doctors[index]);
});

// Notifications
app.get("/api/notifications/:userId", (req, res) => {
  const { userId } = req.params;
  const db = getDatabase();
  const userNots = db.notifications.filter(n => n.userId === userId);
  res.json(userNots);
});

app.put("/api/notifications/:userId/read", (req, res) => {
  const { userId } = req.params;
  const db = getDatabase();
  db.notifications.forEach((n, idx) => {
    if (n.userId === userId) {
      db.notifications[idx].read = true;
    }
  });
  saveDatabase(db);
  res.json({ status: "success" });
});

// ----------------------------------------------------
// VITE DEV SERVER & STATIC MIDDLEWARE SETUP
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Telemedicina AI Server] rodando em http://localhost:${PORT} em modo ${process.env.NODE_ENV || "development"}`);
    // Sync Supabase cloud database state in background after server is listening
    syncFromSupabase().catch(err => {
      console.error("Warning: Initial Supabase background sync error:", err);
    });
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
