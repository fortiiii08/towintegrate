import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { sendMilestoneEmail } from "../lib/email.js";

const ALWAYS_CC_FALLBACK = "criativo@digitownmkt.com";

const router = Router();
router.use(authenticate);

const mapaCidadeSchema = z.object({
  clientId: z.string().uuid(),
  clientEmail: z.string().email().optional().nullable(),
  partnerEmail: z.string().email().optional().nullable(),
  assinatura_cliente: z.string().optional().nullable(),
  primeiro_pagamento: z.string().optional().nullable(),
  reuniao_briefing: z.string().optional().nullable(),
  material_drive: z.string().optional().nullable(),
  acesso_redes: z.string().optional().nullable(),
  entrega_roteiro: z.string().optional().nullable(),
  data_gravacao: z.string().optional().nullable(),
  primeira_postagem_feed: z.string().optional().nullable(),
  linkedin: z.string().optional().nullable(),
  trafego_pago: z.string().optional().nullable(),
  analise_perfil: z.string().optional().nullable(),
  cronograma_mensal: z.string().optional().nullable(),
  google: z.string().optional().nullable(),
  landing_page: z.string().optional().nullable(),
});

function toDateOrNull(val?: string | null): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// Save or update mapa da cidade
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const data = mapaCidadeSchema.parse(req.body);

    // Upsert milestone
    const milestone = await prisma.clientMilestone.upsert({
      where: { clientId: data.clientId },
      update: {
        clientEmail: data.clientEmail || null,
        partnerEmail: data.partnerEmail || null,
        assinaturaCliente: toDateOrNull(data.assinatura_cliente),
        primeiroPagamento: toDateOrNull(data.primeiro_pagamento),
        reuniaoBriefing: toDateOrNull(data.reuniao_briefing),
        materialDrive: toDateOrNull(data.material_drive),
        acessoRedes: toDateOrNull(data.acesso_redes),
        entregaRoteiro: toDateOrNull(data.entrega_roteiro),
        dataGravacao: toDateOrNull(data.data_gravacao),
        primeiraPostagemFeed: toDateOrNull(data.primeira_postagem_feed),
        linkedin: toDateOrNull(data.linkedin),
        trafegoPago: toDateOrNull(data.trafego_pago),
        analisePerfil: toDateOrNull(data.analise_perfil),
        cronogramaMensal: toDateOrNull(data.cronograma_mensal),
        google: toDateOrNull(data.google),
        landingPage: toDateOrNull(data.landing_page),
      },
      create: {
        clientId: data.clientId,
        clientEmail: data.clientEmail || null,
        partnerEmail: data.partnerEmail || null,
        assinaturaCliente: toDateOrNull(data.assinatura_cliente),
        primeiroPagamento: toDateOrNull(data.primeiro_pagamento),
        reuniaoBriefing: toDateOrNull(data.reuniao_briefing),
        materialDrive: toDateOrNull(data.material_drive),
        acessoRedes: toDateOrNull(data.acesso_redes),
        entregaRoteiro: toDateOrNull(data.entrega_roteiro),
        dataGravacao: toDateOrNull(data.data_gravacao),
        primeiraPostagemFeed: toDateOrNull(data.primeira_postagem_feed),
        linkedin: toDateOrNull(data.linkedin),
        trafegoPago: toDateOrNull(data.trafego_pago),
        analisePerfil: toDateOrNull(data.analise_perfil),
        cronogramaMensal: toDateOrNull(data.cronograma_mensal),
        google: toDateOrNull(data.google),
        landingPage: toDateOrNull(data.landing_page),
      },
    });

    // Update client's lastRecordingDate if data_gravacao was set
    if (data.data_gravacao) {
      await prisma.client.update({
        where: { id: data.clientId },
        data: { lastRecordingDate: toDateOrNull(data.data_gravacao) },
      });
    }

    // Get client name for email
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: {
        id: true,
        name: true,
      },
    });

    // Send email via Resend (always includes criativo@digitownmkt.com)
    const clientEmail = data.clientEmail?.trim() || "";
    const extraRecipients = data.partnerEmail?.trim()
      ? [data.partnerEmail.trim()]
      : [];

    // Need at least one real recipient — ALWAYS_CC is added inside sendMilestoneEmail
    const primaryEmail = clientEmail || ALWAYS_CC_FALLBACK;

    try {
      await sendMilestoneEmail({
        clientName: client?.name || "",
        clientEmail: primaryEmail,
        extraRecipients,
        assinaturaCliente: toDateOrNull(data.assinatura_cliente),
        primeiroPagamento: toDateOrNull(data.primeiro_pagamento),
        reuniaoBriefing: toDateOrNull(data.reuniao_briefing),
        materialDrive: toDateOrNull(data.material_drive),
        acessoRedes: toDateOrNull(data.acesso_redes),
        entregaRoteiro: toDateOrNull(data.entrega_roteiro),
        dataGravacao: toDateOrNull(data.data_gravacao),
        primeiraPostagemFeed: toDateOrNull(data.primeira_postagem_feed),
        linkedin: toDateOrNull(data.linkedin),
        trafegoPago: toDateOrNull(data.trafego_pago),
        analisePerfil: toDateOrNull(data.analise_perfil),
        cronogramaMensal: toDateOrNull(data.cronograma_mensal),
        google: toDateOrNull(data.google),
        landingPage: toDateOrNull(data.landing_page),
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail do Mapa da Cidade:", emailError);
      // Não falha a requisição se o e-mail falhar
    }

    res.json({ success: true, milestone });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }

    console.error("Save mapa-cidade error:", error);
    res.status(500).json({ error: "Erro ao salvar mapa da cidade" });
  }
});

// Get mapa da cidade for a client
router.get("/:clientId", async (req: AuthRequest, res: Response) => {
  try {
    const milestone = await prisma.clientMilestone.findUnique({
      where: { clientId: req.params.clientId },
    });

    res.json(milestone || null);
  } catch (error) {
    console.error("Get mapa-cidade error:", error);
    res.status(500).json({ error: "Erro ao buscar mapa da cidade" });
  }
});

export default router;