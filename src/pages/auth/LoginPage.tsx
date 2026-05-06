import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuthContext } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const { signIn, userRole } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    const result = await signIn(data.email, data.password);
    
    if (result.success) {
      // Navigate will happen after role is fetched in useAuth
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua conta">
      <div className="mb-4">
        <Link to="/portal" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors">
          <ArrowLeft className="w-3 h-3" /> Voltar ao portal
        </Link>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-right">
            <Link
              to="/auth/forgot-password"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Esqueci minha senha
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#407b75] to-[#9b3515] hover:opacity-90 text-white font-semibold py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center space-y-2">
        <p className="text-white/60 text-sm">Não tem uma conta?</p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/auth/register/client"
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Cadastrar como Cliente
          </Link>
          <span className="text-white/30">|</span>
          <Link
            to="/auth/register/employee"
            className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
          >
            Cadastrar como Funcionário
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
