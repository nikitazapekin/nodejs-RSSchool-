-- CreateTable
CREATE TABLE "RagConversation" (
    "id" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RagConversation_updatedAt_idx" ON "RagConversation"("updatedAt");
