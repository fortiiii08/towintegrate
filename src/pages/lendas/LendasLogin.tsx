import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import lendasLogo from '@/assets/lendas-logo.png';
import lendasBg from '@/assets/lendas-bg.png';

const GOLD = '#C9A84C';
const GOLD_LIGHT = '#e8c86a';
const GOLD_DARK = '#8b6914';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

const LendasLogin = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthContext();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    const result = await signIn(data.email, data.password);
    if (result.success) navigate('/lendas/home');
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">

      {/* BG */}
      <div className="absolute inset-0 z-0"
        style={{ backgroundImage: `url(${lendasBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="absolute inset-0 z-0"
        style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(10,6,2,0.75) 50%, rgba(0,0,0,0.88) 100%)' }} />

      {/* Back to portal */}
      <Link to="/portal"
        className="absolute top-6 left-6 z-20 flex items-center gap-1.5 text-xs transition-colors font-lufga"
        style={{ color: `${GOLD}99` }}
        onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
        onMouseLeave={e => (e.currentTarget.style.color = `${GOLD}99`)}>
        <ArrowLeft className="w-3 h-3" /> Voltar ao portal
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(10,6,2,0.97) 0%, rgba(20,14,4,0.95) 100%)',
          border: `1px solid ${GOLD}33`,
          boxShadow: `0 0 60px rgba(201,168,76,0.12), 0 20px 60px rgba(0,0,0,0.6)`,
        }}>

        {/* Gold top line */}
        <div className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />

        <div className="px-8 py-10 space-y-7">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <img src={lendasLogo} alt="Lendas Milionárias"
              className="h-20 object-contain"
              style={{ filter: `drop-shadow(0 0 14px ${GOLD}66)` }} />
            <div className="text-center">
              <p className="font-lufga font-semibold text-2xl tracking-widest"
                style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Lendas Milionárias
              </p>
              <p className="font-lufga text-xs tracking-[0.25em] mt-1" style={{ color: `${GOLD}66` }}>
                ACESSE SUA CONTA
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}22, transparent)` }} />

          {/* Form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="font-lufga text-xs tracking-widest uppercase" style={{ color: `${GOLD}99` }}>
                Email
              </label>
              <input
                type="email"
                placeholder="seu@email.com"
                {...form.register('email')}
                className="w-full rounded-lg px-4 py-3 text-sm font-lufga outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${GOLD}22`,
                  color: '#fff',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = `${GOLD}66`)}
                onBlur={e => (e.currentTarget.style.borderColor = `${GOLD}22`)}
              />
              {form.formState.errors.email && (
                <p className="text-xs font-lufga" style={{ color: '#e55' }}>
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="font-lufga text-xs tracking-widest uppercase" style={{ color: `${GOLD}99` }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...form.register('password')}
                  className="w-full rounded-lg px-4 py-3 pr-10 text-sm font-lufga outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${GOLD}22`,
                    color: '#fff',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = `${GOLD}66`)}
                  onBlur={e => (e.currentTarget.style.borderColor = `${GOLD}22`)}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: `${GOLD}66` }}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs font-lufga" style={{ color: '#e55' }}>
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="text-right">
              <Link to="/lendas/forgot-password"
                className="font-lufga text-xs transition-colors"
                style={{ color: `${GOLD}66` }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = `${GOLD}66`)}>
                Esqueci minha senha
              </Link>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-lg font-lufga font-semibold text-sm tracking-widest uppercase transition-all"
              style={{
                background: loading ? `${GOLD}66` : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, ${GOLD_DARK} 100%)`,
                color: '#0a0603',
                boxShadow: loading ? 'none' : `0 4px 20px ${GOLD}40`,
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                </span>
              ) : 'Entrar'}
            </button>
          </form>

          {/* Register links */}
          <div className="text-center space-y-3 pt-1">
            <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}18, transparent)` }} />
            <p className="font-lufga text-xs" style={{ color: `${GOLD}55` }}>Não tem uma conta?</p>
            <div className="flex gap-4 justify-center">
              <Link to="/lendas/register/member"
                className="font-lufga text-xs tracking-wider transition-colors"
                style={{ color: `${GOLD}88` }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = `${GOLD}88`)}>
                Cadastrar como Membro
              </Link>
              <span style={{ color: `${GOLD}33` }}>|</span>
              <Link to="/lendas/register/employee"
                className="font-lufga text-xs tracking-wider transition-colors"
                style={{ color: `${GOLD}88` }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = `${GOLD}88`)}>
                Cadastrar como Equipe
              </Link>
            </div>
          </div>

        </div>

        {/* Gold bottom line */}
        <div className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}44, transparent)` }} />
      </div>
    </div>
  );
};

export default LendasLogin;
