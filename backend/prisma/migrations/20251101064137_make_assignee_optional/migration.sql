-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objectiveId" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "contents" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Not yet hidden',
    "prefixText" TEXT NOT NULL DEFAULT 'Not yet hidden, contact admin if you see this message.',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "Objective" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("assigneeId", "code", "contents", "id", "location", "objectiveId", "prefixText", "status", "updatedAt") SELECT "assigneeId", "code", "contents", "id", "location", "objectiveId", "prefixText", "status", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
