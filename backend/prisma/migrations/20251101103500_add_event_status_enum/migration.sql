-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EventStatus" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED'
);
-- Migrate existing data
INSERT INTO "new_EventStatus" ("id", "status")
SELECT "id", 
    CASE 
        WHEN "eventStarted" = 1 THEN 'IN_PROGRESS'
        ELSE 'NOT_STARTED'
    END
FROM "EventStatus";
DROP TABLE "EventStatus";
ALTER TABLE "new_EventStatus" RENAME TO "EventStatus";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

