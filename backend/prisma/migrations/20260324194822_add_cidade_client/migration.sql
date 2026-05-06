-- CreateTable
CREATE TABLE "cidade_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image_url" TEXT,
    "drive_link" TEXT,
    "briefing_notes" TEXT,
    "niche" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cidade_clients_pkey" PRIMARY KEY ("id")
);
