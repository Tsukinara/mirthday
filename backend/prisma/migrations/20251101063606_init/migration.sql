-- CreateTable
CREATE TABLE "Objective" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "totalPieces" INTEGER NOT NULL,
    "piecesFound" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "codename" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLAYER'
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objectiveId" INTEGER NOT NULL,
    "assigneeId" INTEGER NOT NULL,
    "contents" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Not yet hidden',
    "prefixText" TEXT NOT NULL DEFAULT 'Not yet hidden, contact admin if you see this message.',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "eventStarted" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "Objective_type_key" ON "Objective"("type");

-- CreateIndex
CREATE UNIQUE INDEX "User_codename_key" ON "User"("codename");
