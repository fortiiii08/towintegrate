-- AlterTable
ALTER TABLE "cidade_clients" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "cidade_client_milestones" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "assinatura_cliente" TIMESTAMP(3),
    "primeiro_pagamento" TIMESTAMP(3),
    "reuniao_briefing" TIMESTAMP(3),
    "material_drive" TIMESTAMP(3),
    "acesso_redes" TIMESTAMP(3),
    "entrega_roteiro" TIMESTAMP(3),
    "data_gravacao" TIMESTAMP(3),
    "edicao_fotos" TIMESTAMP(3),
    "edicao_videos" TIMESTAMP(3),
    "backup" TIMESTAMP(3),
    "analise_perfil" TIMESTAMP(3),
    "cronograma_mensal" TIMESTAMP(3),
    "google" TIMESTAMP(3),
    "landing_page" TIMESTAMP(3),
    "linkedin" TIMESTAMP(3),
    "trafego_pago" TIMESTAMP(3),
    "entrega_aprovacao_posts" TIMESTAMP(3),
    "solicitacoes_alteracoes" TIMESTAMP(3),
    "primeira_postagem_feed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cidade_client_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cidade_client_milestones_client_id_key" ON "cidade_client_milestones"("client_id");

-- AddForeignKey
ALTER TABLE "cidade_client_milestones" ADD CONSTRAINT "cidade_client_milestones_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "cidade_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
