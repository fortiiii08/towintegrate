-- CreateEnum
CREATE TYPE "CidadeClientPackage" AS ENUM ('acelerador', 'start_line');

-- AlterTable
ALTER TABLE "cidade_clients" ADD COLUMN     "package" "CidadeClientPackage";
