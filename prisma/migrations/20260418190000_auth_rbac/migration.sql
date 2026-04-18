ALTER TABLE "User"
ADD COLUMN "refreshTokenHash" TEXT;

CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
