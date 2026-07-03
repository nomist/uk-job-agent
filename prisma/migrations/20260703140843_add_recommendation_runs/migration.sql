-- CreateTable
CREATE TABLE "RecommendationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "searchFilters" TEXT NOT NULL,
    "rawResultCount" INTEGER NOT NULL,
    "candidateCount" INTEGER NOT NULL,
    "selectedForScoringCount" INTEGER NOT NULL,
    "scoredCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    CONSTRAINT "RecommendationRun_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecommendationRun_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "scoredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "missingSkills" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "RecommendationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RecommendationRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecommendationItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecommendationRun_profileId_createdAt_idx" ON "RecommendationRun"("profileId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationItem_runId_idx" ON "RecommendationItem"("runId");

-- CreateIndex
CREATE INDEX "RecommendationItem_profileId_resumeId_jobId_scoredAt_idx" ON "RecommendationItem"("profileId", "resumeId", "jobId", "scoredAt");
