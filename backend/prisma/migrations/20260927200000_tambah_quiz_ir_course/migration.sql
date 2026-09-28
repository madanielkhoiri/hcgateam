CREATE TABLE "ir_course_quiz" (
  "id" SERIAL NOT NULL,
  "video_id" INTEGER NOT NULL,
  "pertanyaan" TEXT NOT NULL,
  "pilihan" JSONB NOT NULL,
  "jawaban_benar" INTEGER NOT NULL,
  "urutan" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "ir_course_quiz_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ir_course_quiz_jawaban" (
  "id" SERIAL NOT NULL,
  "quiz_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "pilihan" INTEGER NOT NULL,
  "benar" BOOLEAN NOT NULL,
  "dijawab_pada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ir_course_quiz_jawaban_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ir_course_quiz_jawaban_quiz_id_user_id_key" ON "ir_course_quiz_jawaban"("quiz_id", "user_id");
CREATE INDEX "ir_course_quiz_video_id_idx" ON "ir_course_quiz"("video_id");
CREATE INDEX "ir_course_quiz_jawaban_user_id_idx" ON "ir_course_quiz_jawaban"("user_id");
ALTER TABLE "ir_course_quiz" ADD CONSTRAINT "ir_course_quiz_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "ir_course_video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ir_course_quiz_jawaban" ADD CONSTRAINT "ir_course_quiz_jawaban_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "ir_course_quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ir_course_quiz_jawaban" ADD CONSTRAINT "ir_course_quiz_jawaban_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
