-- CreateTable
CREATE TABLE "safety_meetings" (
    "id" SERIAL NOT NULL,
    "meeting_date" DATE NOT NULL,
    "location" TEXT,
    "speaker" TEXT,
    "participants" TEXT,
    "material" TEXT NOT NULL,
    "supervisors" JSONB NOT NULL DEFAULT '[]',
    "documentation_paths" JSONB NOT NULL DEFAULT '[]',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "safety_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "p5m_meetings" (
    "id" SERIAL NOT NULL,
    "activity_date" DATE NOT NULL,
    "start_time" TEXT NOT NULL DEFAULT '00:00',
    "end_time" TEXT,
    "location" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "speaker" TEXT,
    "participants" TEXT,
    "supervisors" JSONB NOT NULL DEFAULT '[]',
    "supervisor_name" TEXT NOT NULL DEFAULT '',
    "supervisor_sign_path" TEXT,
    "participant_names" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "documentation_paths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "p5m_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "safety_meetings_created_by_idx" ON "safety_meetings"("created_by");

-- CreateIndex
CREATE INDEX "safety_meetings_meeting_date_idx" ON "safety_meetings"("meeting_date");

-- CreateIndex
CREATE INDEX "p5m_meetings_activity_date_idx" ON "p5m_meetings"("activity_date");

-- CreateIndex
CREATE INDEX "p5m_meetings_supervisor_name_idx" ON "p5m_meetings"("supervisor_name");

-- CreateIndex
CREATE INDEX "p5m_meetings_created_by_idx" ON "p5m_meetings"("created_by");

-- AddForeignKey
ALTER TABLE "safety_meetings" ADD CONSTRAINT "safety_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "p5m_meetings" ADD CONSTRAINT "p5m_meetings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
