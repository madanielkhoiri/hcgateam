-- CreateTable
CREATE TABLE "pre_activity_checks" (
    "id" SERIAL NOT NULL,
    "job_name" TEXT NOT NULL,
    "activity_date" DATE NOT NULL,
    "work_location_text" TEXT,
    "heavy_equipment_name_text" TEXT,
    "unit_number_text" TEXT,
    "executor_team_text" TEXT,
    "hazard_potential_text" TEXT,
    "control_step_text" TEXT,
    "apd_check" BOOLEAN NOT NULL DEFAULT false,
    "tool_condition_check" BOOLEAN NOT NULL DEFAULT false,
    "work_area_check" BOOLEAN NOT NULL DEFAULT false,
    "tool_complete_check" BOOLEAN NOT NULL DEFAULT false,
    "work_permit_check" BOOLEAN NOT NULL DEFAULT false,
    "sop_check" BOOLEAN NOT NULL DEFAULT false,
    "jsa_check" BOOLEAN NOT NULL DEFAULT false,
    "lifting_plan_check" BOOLEAN NOT NULL DEFAULT false,
    "jsa_image" TEXT,
    "checklist_image" TEXT,
    "height_permit_image" TEXT,
    "health_check" TEXT,
    "health_check_status" TEXT,
    "socialization_photo" TEXT,
    "pic" TEXT NOT NULL,
    "executor_signature" TEXT,
    "supervisor_name" TEXT,
    "supervisor_signature" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pre_activity_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pre_activity_checks_activity_date_idx" ON "pre_activity_checks"("activity_date");

-- CreateIndex
CREATE INDEX "pre_activity_checks_created_by_idx" ON "pre_activity_checks"("created_by");

-- AddForeignKey
ALTER TABLE "pre_activity_checks" ADD CONSTRAINT "pre_activity_checks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
