-- Corrigir RLS da tabela profiles para permitir que funcionários vejam outros funcionários
-- Isso é necessário para atribuição de tarefas

-- Remover política antiga que só permite ver o próprio perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Criar nova política que permite usuários autenticados verem todos os perfis
-- Isso é seguro pois profiles só contém nome e email, não dados sensíveis
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Manter as políticas de insert e update apenas para o próprio usuário
-- (já existem e não precisam ser alteradas)