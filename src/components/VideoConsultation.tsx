import React, { useEffect, useRef, useState } from "react";
import { Appointment } from "../types.js";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Sparkles, AlertCircle, Heart } from "lucide-react";

interface VideoConsultationProps {
  appointment: Appointment;
  onHangUp: () => void;
  userRole: string;
}

export default function VideoConsultation({ appointment, onHangUp, userRole }: VideoConsultationProps) {
  const [localVideoOn, setLocalVideoOn] = useState(true);
  const [localMicOn, setLocalMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [timerText, setTimerText] = useState("00:00");
  const [errorText, setErrorText] = useState("");

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Active Timer counting session length
  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
      const secs = (seconds % 60).toString().padStart(2, "0");
      setTimerText(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set up local video camera capture
  useEffect(() => {
    if (localVideoOn) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((stream) => {
          streamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.warn("Camera not available or blocked in iframe", err);
          setErrorText("Acesso à câmera bloqueado ou indisponível. Exibindo simulador médico.");
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [localVideoOn]);

  // Draw simulated medical pulse monitor on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let x = 0;
    const width = canvas.width;
    const height = canvas.height;
    ctx.strokeStyle = "#0d9488";
    ctx.lineWidth = 2.5;

    const drawPulse = () => {
      ctx.fillStyle = "rgba(15, 23, 42, 0.05)"; // dark fade effect
      ctx.fillRect(0, 0, width, height);

      ctx.beginPath();
      ctx.moveTo(x, height / 2);

      // simulate ECG wave
      let y = height / 2;
      const cycle = x % 120;
      if (cycle > 50 && cycle < 58) {
        y = (height / 2) - 40; // R-peak
      } else if (cycle >= 58 && cycle < 64) {
        y = (height / 2) + 20; // S-drop
      } else if (cycle >= 75 && cycle < 85) {
        y = (height / 2) - 10; // T-wave
      }

      ctx.lineTo(x + 2, y);
      ctx.stroke();

      x = (x + 2) % width;
      animationId = requestAnimationFrame(drawPulse);
    };

    drawPulse();
    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* Top HUD bar */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold font-sans">Consulta Virtual Ao Vivo</h3>
            <span className="text-[10px] text-slate-400">Sala ID: {appointment.videoRoomId}</span>
          </div>
        </div>

        {/* Timer count */}
        <div className="rounded-full bg-slate-800 px-4 py-1 text-xs font-mono font-bold tracking-widest text-teal-400">
          {timerText}
        </div>

        {/* Roles information */}
        <div className="text-xs text-slate-400">
          Conectado com: <span className="text-white font-semibold">{userRole === "PATIENT" ? appointment.doctorName : appointment.patientName}</span>
        </div>
      </div>

      {/* Video consultation stages area */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        
        {/* Main large stream simulation */}
        <div className="relative w-full max-w-4xl h-full max-h-[500px] rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
          
          {/* Heart beat telemetry overlay */}
          <div className="absolute top-4 left-4 z-10 rounded-xl bg-slate-950/80 backdrop-blur px-3 py-1.5 border border-slate-800 flex items-center gap-2">
            <Heart className="h-4.5 w-4.5 text-red-500 animate-bounce" />
            <div>
              <span className="text-[9px] text-slate-400 block font-bold uppercase">Batimento Cardíaco</span>
              <span className="text-xs font-bold font-mono text-teal-400">76 BPM</span>
            </div>
          </div>

          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />

          {/* Dummy avatar representation if actual peer streams are mocked */}
          <div className="z-10 text-center space-y-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-800 border-2 border-slate-700 text-3xl font-bold font-sans">
              {(userRole === "PATIENT" ? appointment.doctorName : appointment.patientName).substring(0, 2)}
            </div>
            <div>
              <h4 className="text-sm font-bold">{userRole === "PATIENT" ? appointment.doctorName : appointment.patientName}</h4>
              <p className="text-xs text-slate-400 mt-1">{userRole === "PATIENT" ? appointment.doctorSpecialty : "Paciente Integrado"}</p>
            </div>
          </div>

          {/* floating bubbles warnings inside iframe */}
          {errorText && (
            <div className="absolute bottom-4 left-4 right-4 z-10 rounded-xl bg-amber-500/15 border border-amber-500/30 backdrop-blur p-3 text-[11px] text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{errorText}</span>
            </div>
          )}
        </div>

        {/* Float bubble showing own camera */}
        <div className="absolute bottom-10 right-10 z-20 h-36 w-48 rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden shadow-2xl">
          {localVideoOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-slate-500 font-bold bg-slate-800">
              Vídeo Desligado
            </div>
          )}
          <span className="absolute bottom-1.5 right-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[9px] font-bold">
            Você (Self)
          </span>
        </div>
      </div>

      {/* Bottom control triggers */}
      <div className="h-24 bg-slate-900/90 backdrop-blur border-t border-slate-800 flex items-center justify-center gap-4 px-6">
        
        {/* Toggle video */}
        <button
          onClick={() => setLocalVideoOn(!localVideoOn)}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            localVideoOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
          }`}
          title={localVideoOn ? "Desativar Vídeo" : "Ativar Vídeo"}
        >
          {localVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>

        {/* Toggle microphone */}
        <button
          onClick={() => setLocalMicOn(!localMicOn)}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            localMicOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"
          }`}
          title={localMicOn ? "Mutar Microfone" : "Ativar Microfone"}
        >
          {localMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        {/* Toggle screen-share */}
        <button
          onClick={() => setScreenSharing(!screenSharing)}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            screenSharing ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"
          }`}
          title="Compartilhar Tela"
        >
          <Monitor className="h-5 w-5" />
        </button>

        {/* HANG UP button - closes room */}
        <button
          onClick={onHangUp}
          className="flex h-12 w-28 items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-lg shadow-red-900/30 transition-all ml-4"
        >
          <PhoneOff className="h-4.5 w-4.5" />
          Encerrar
        </button>
      </div>
    </div>
  );
}
