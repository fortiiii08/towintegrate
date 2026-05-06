-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "cidade_client_id" TEXT;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_cidade_client_id_fkey" FOREIGN KEY ("cidade_client_id") REFERENCES "cidade_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
