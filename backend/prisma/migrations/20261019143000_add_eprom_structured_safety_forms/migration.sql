ALTER TABLE `eprom_checklist_konstruksi`
  ADD COLUMN `form_data` JSON NULL;

ALTER TABLE `eprom_tta`
  ADD COLUMN `form_data` JSON NULL;

ALTER TABLE `eprom_kta`
  ADD COLUMN `form_data` JSON NULL;
