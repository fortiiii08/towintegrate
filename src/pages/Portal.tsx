import { useState } from "react";
import { useNavigate } from "react-router-dom";
import digitownLogo from "@/assets/digitown-logo.webp";
import lendasLogo from "@/assets/lendas-logo.png";
import portalBg from "@/assets/portal-bg.jpeg";

const Portal = () => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<"town" | "lendas" | null>(null);

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">

      {/* Background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${portalBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Dark overlay with blue-toned gradient */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(135deg, rgba(6,15,30,0.82) 0%, rgba(10,20,45,0.78) 50%, rgba(6,10,20,0.88) 100%)",
        }}
      />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl z-0"
        style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-15 blur-3xl z-0"
        style={{ background: "radial-gradient(circle, #b8860b 0%, transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-6 w-full max-w-5xl">

        {/* Header label */}
        <div className="text-center">
          <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-2">Selecione sua plataforma</p>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto" />
        </div>

        {/* Cards */}
        <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">

          {/* ── Town card ── */}
          <button
            onMouseEnter={() => setHovered("town")}
            onMouseLeave={() => setHovered(null)}
            onClick={() => navigate("/auth/login")}
            className="group relative flex flex-col items-center justify-center gap-6 p-10 rounded-2xl cursor-pointer transition-all duration-300 w-full sm:w-80 h-72 overflow-hidden"
            style={{
              background: hovered === "town"
                ? "linear-gradient(135deg, rgba(64,123,117,0.35) 0%, rgba(0,0,0,0.92) 50%, rgba(155,53,21,0.25) 100%)"
                : "linear-gradient(135deg, rgba(64,123,117,0.18) 0%, rgba(0,0,0,0.85) 50%, rgba(155,53,21,0.12) 100%)",
              border: hovered === "town"
                ? "1.5px solid rgba(91,191,181,0.55)"
                : "1.5px solid rgba(64,123,117,0.25)",
              boxShadow: hovered === "town"
                ? "0 0 40px rgba(64,123,117,0.25), 0 0 20px rgba(155,53,21,0.15), inset 0 1px 0 rgba(91,191,181,0.08)"
                : "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(64,123,117,0.06)",
              transform: hovered === "town" ? "translateY(-4px) scale(1.01)" : "none",
            }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(64,123,117,0.18) 0%, transparent 65%)" }} />

            <img
              src={digitownLogo}
              alt="DigiTown"
              className="h-16 object-contain relative z-10 drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
            />

            <div className="text-center relative z-10">
              <p className="font-lufga text-white font-semibold text-3xl tracking-widest">Town</p>
              <p className="font-lufga text-white/40 text-sm mt-1 tracking-wider">Gestão digital</p>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300"
              style={{
                background: "linear-gradient(90deg, transparent, #407b75, #9b3515, transparent)",
                opacity: hovered === "town" ? 1 : 0,
              }}
            />
          </button>

          {/* Divider */}
          <div className="hidden sm:flex flex-col items-center justify-center gap-2 text-white/20">
            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <span className="text-xs tracking-widest">ou</span>
            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          </div>

          {/* ── Lendas card ── */}
          <button
            onMouseEnter={() => setHovered("lendas")}
            onMouseLeave={() => setHovered(null)}
            onClick={() => navigate("/lendas/login")}
            className="group relative flex flex-col items-center justify-center gap-6 p-10 rounded-2xl cursor-pointer transition-all duration-300 w-full sm:w-80 h-72 overflow-hidden"
            style={{
              background: hovered === "lendas"
                ? "linear-gradient(135deg, rgba(101,67,33,0.35) 0%, rgba(6,4,2,0.97) 100%)"
                : "linear-gradient(135deg, rgba(80,50,20,0.20) 0%, rgba(6,4,2,0.90) 100%)",
              border: hovered === "lendas"
                ? "1.5px solid rgba(212,175,55,0.7)"
                : "1.5px solid rgba(180,140,30,0.2)",
              boxShadow: hovered === "lendas"
                ? "0 0 50px rgba(184,134,11,0.25), 0 0 20px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,215,0,0.08)"
                : "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,215,0,0.04)",
              transform: hovered === "lendas" ? "translateY(-4px) scale(1.01)" : "none",
            }}
          >
            {/* Background glow */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "radial-gradient(circle at 50% 40%, rgba(184,134,11,0.12) 0%, transparent 65%)" }} />

            <img
              src={lendasLogo}
              alt="Lendas Milionárias"
              className="h-20 object-contain relative z-10 transition-transform duration-300 group-hover:scale-105"
              style={{ filter: "drop-shadow(0 0 12px rgba(212,175,55,0.4))" }}
            />

            <div className="text-center relative z-10">
              <p className="font-lufga font-semibold text-3xl tracking-widest"
                style={{
                  background: "linear-gradient(135deg, #f5c842 0%, #d4a017 50%, #8b6914 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                Lendas
              </p>
              <p className="font-lufga text-white/30 text-sm mt-1 tracking-wider">Milionárias</p>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300"
              style={{
                background: "linear-gradient(90deg, transparent, #d4a017, transparent)",
                opacity: hovered === "lendas" ? 1 : 0,
              }}
            />
          </button>
        </div>

        {/* Footer */}
        <p className="text-white/20 text-xs tracking-widest">
          © 2025 DigiTown
        </p>
      </div>
    </div>
  );
};

export default Portal;
