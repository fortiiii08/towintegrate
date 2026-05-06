import { ReactNode } from 'react';
import digitownLogo from '@/assets/digitown-logo.webp';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#407b75] via-black to-[#9b3515] flex flex-col items-center justify-center p-4 font-lufga">
      {/* Logo + title */}
      <div className="mb-8 text-center flex flex-col items-center gap-3">
        <img
          src={digitownLogo}
          alt="DigiTown Logo"
          className="h-16 md:h-20 object-contain"
        />
        <h1
          className="font-lufga font-black uppercase tracking-[0.4em] text-4xl md:text-5xl"
          style={{
            background: 'linear-gradient(90deg, #5bbfb5 0%, #ffffff 45%, #e07a45 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 14px rgba(91,191,181,0.4)) drop-shadow(0 0 30px rgba(224,122,69,0.25))',
            letterSpacing: '0.4em',
          }}
        >
          TOWN
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-black/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-white mb-2">{title}</h2>
          {subtitle && <p className="text-white/60 text-sm">{subtitle}</p>}
        </div>
        {children}
      </div>

      {/* Footer */}
      <p className="mt-8 text-sm text-white/50">
        © 2025 DigiTown - Todos os direitos reservados
      </p>
    </div>
  );
};
