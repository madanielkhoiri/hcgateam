import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { existsSync, unlinkSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreActivityCheckDto } from './dto/create-pre-activity-check.dto';
import { UpdatePreActivityCheckDto } from './dto/update-pre-activity-check.dto';

type Actor = {
  id: number;
  username: string;
};

@Injectable()
export class PreActivityChecksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string, month?: number, year?: number) {
    const where: Prisma.PreActivityCheckWhereInput = {};

    if (search?.trim()) {
      const keyword = search.trim();

      where.OR = [
        {
          job_name: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          work_location_text: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          executor_team_text: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
        {
          pic: {
            contains: keyword,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (month && year) {
      where.activityDate = {
        gte: new Date(year, month - 1, 1),
        lt: new Date(year, month, 1),
      };
    } else if (year) {
      where.activityDate = {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      };
    }

    return this.prisma.preActivityCheck.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: [
        {
          activityDate: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const row = await this.prisma.preActivityCheck.findUnique({
      where: {
        id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (!row) {
      throw new NotFoundException('Data Pre-Activity Check tidak ditemukan');
    }

    return row;
  }

  async create(dto: CreatePreActivityCheckDto, actor: Actor) {
    return this.prisma.preActivityCheck.create({
      data: {
        job_name: dto.jobName.trim(),
        activityDate: new Date(dto.activityDate),

        work_location_text: dto.workLocationText?.trim() || null,

        heavy_equipment_name_text: dto.heavyEquipmentNameText?.trim() || null,

        unit_number_text: dto.unitNumberText?.trim() || null,

        executor_team_text: dto.executorTeamText?.trim() || null,

        hazard_potential_text: dto.hazardPotentialText?.trim() || null,

        control_step_text: dto.controlStepText?.trim() || null,

        apd_check: dto.apdCheck,
        tool_condition_check: dto.toolConditionCheck,
        work_area_check: dto.workAreaCheck,
        tool_complete_check: dto.toolCompleteCheck,

        work_permit_check: dto.workPermitCheck,
        sop_check: dto.sopCheck,
        jsa_check: dto.jsaCheck,
        lifting_plan_check: dto.liftingPlanCheck,

        jsa_image: dto.jsaImage?.trim() || null,
        checklist_image: dto.checklistImage?.trim() || null,
        height_permit_image: dto.heightPermitImage?.trim() || null,
        socialization_photo:
          this.serializeDocumentationPaths(
            dto.documentationPaths ?? dto.socializationPhoto,
          )?.trim() || null,

        health_check: dto.healthCheck?.trim() || null,
        health_check_status: dto.healthCheckStatus?.trim() || 'Aman',

        pic: dto.coordinatorName?.trim() || '',

        executor_signature:
          dto.executorSignaturePath?.trim() ||
          dto.coordinatorSignPath?.trim() ||
          null,

        supervisorName: dto.supervisorName?.trim() || null,

        supervisor_signature:
          dto.supervisorSignaturePath?.trim() ||
          dto.supervisorSignPath?.trim() ||
          null,

        createdBy: actor.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async update(id: number, dto: UpdatePreActivityCheckDto) {
    await this.findOne(id);

    return this.prisma.preActivityCheck.update({
      where: {
        id,
      },
      data: {
        ...(dto.jobName !== undefined
          ? {
              job_name: dto.jobName.trim(),
            }
          : {}),

        ...(dto.activityDate !== undefined
          ? {
              activityDate: new Date(dto.activityDate),
            }
          : {}),

        ...(dto.workLocationText !== undefined
          ? {
              work_location_text: dto.workLocationText.trim() || null,
            }
          : {}),

        ...(dto.heavyEquipmentNameText !== undefined
          ? {
              heavy_equipment_name_text:
                dto.heavyEquipmentNameText.trim() || null,
            }
          : {}),

        ...(dto.unitNumberText !== undefined
          ? {
              unit_number_text: dto.unitNumberText.trim() || null,
            }
          : {}),

        ...(dto.executorTeamText !== undefined
          ? {
              executor_team_text: dto.executorTeamText.trim() || null,
            }
          : {}),

        ...(dto.hazardPotentialText !== undefined
          ? {
              hazard_potential_text: dto.hazardPotentialText.trim() || null,
            }
          : {}),

        ...(dto.controlStepText !== undefined
          ? {
              control_step_text: dto.controlStepText.trim() || null,
            }
          : {}),

        ...(dto.apdCheck !== undefined
          ? {
              apd_check: dto.apdCheck,
            }
          : {}),

        ...(dto.toolConditionCheck !== undefined
          ? {
              tool_condition_check: dto.toolConditionCheck,
            }
          : {}),

        ...(dto.workAreaCheck !== undefined
          ? {
              work_area_check: dto.workAreaCheck,
            }
          : {}),

        ...(dto.toolCompleteCheck !== undefined
          ? {
              tool_complete_check: dto.toolCompleteCheck,
            }
          : {}),

        ...(dto.workPermitCheck !== undefined
          ? {
              work_permit_check: dto.workPermitCheck,
            }
          : {}),

        ...(dto.sopCheck !== undefined
          ? {
              sop_check: dto.sopCheck,
            }
          : {}),

        ...(dto.jsaCheck !== undefined
          ? {
              jsa_check: dto.jsaCheck,
            }
          : {}),

        ...(dto.liftingPlanCheck !== undefined
          ? {
              lifting_plan_check: dto.liftingPlanCheck,
            }
          : {}),

        ...(dto.jsaImage !== undefined
          ? {
              jsa_image: dto.jsaImage.trim() || null,
            }
          : {}),

        ...(dto.checklistImage !== undefined
          ? {
              checklist_image: dto.checklistImage.trim() || null,
            }
          : {}),

        ...(dto.heightPermitImage !== undefined
          ? {
              height_permit_image: dto.heightPermitImage.trim() || null,
            }
          : {}),

        ...(dto.socializationPhoto !== undefined
          ? {
              socialization_photo: this.serializeDocumentationPaths(
                dto.documentationPaths ?? dto.socializationPhoto,
              ),
            }
          : {}),

        ...(dto.healthCheck !== undefined
          ? {
              health_check: dto.healthCheck.trim() || null,
            }
          : {}),

        ...(dto.healthCheckStatus !== undefined
          ? {
              health_check_status: dto.healthCheckStatus.trim() || 'Aman',
            }
          : {}),

        ...(dto.coordinatorName !== undefined
          ? {
              pic: dto.coordinatorName.trim(),
            }
          : {}),

        ...(dto.executorSignaturePath !== undefined ||
        dto.coordinatorSignPath !== undefined
          ? {
              executor_signature:
                dto.executorSignaturePath?.trim() ||
                dto.coordinatorSignPath?.trim() ||
                null,
            }
          : {}),

        ...(dto.supervisorName !== undefined
          ? {
              supervisorName: dto.supervisorName.trim() || null,
            }
          : {}),

        ...(dto.supervisorSignaturePath !== undefined ||
        dto.supervisorSignPath !== undefined
          ? {
              supervisor_signature:
                dto.supervisorSignaturePath?.trim() ||
                dto.supervisorSignPath?.trim() ||
                null,
            }
          : {}),
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    const row = await this.findOne(id);

    await this.prisma.preActivityCheck.delete({
      where: {
        id,
      },
    });

    const files = [
      row.jsa_image,
      row.checklist_image,
      row.height_permit_image,
      row.socialization_photo,
      row.executor_signature,
      row.supervisor_signature,
    ];

    for (const file of files) {
      if (file) {
        this.deleteFile(file);
      }
    }

    return {
      message: 'Pre-Activity Check berhasil dihapus',
    };
  }

  private deleteFile(relativePath: string) {
    const cleanPath = normalize(relativePath)
      .replace(/^[/\\]+/, '')
      .replace(/^uploads[/\\]/, '');

    const absolutePath = join(process.cwd(), 'uploads', cleanPath);

    if (!existsSync(absolutePath)) {
      return;
    }

    try {
      unlinkSync(absolutePath);
    } catch {
      // Data tetap dihapus walaupun file fisik gagal.
    }
  }

  private serializeDocumentationPaths(
    value: string[] | string | null | undefined,
  ): string | null {
    if (Array.isArray(value)) {
      const paths = value.map((item) => String(item).trim()).filter(Boolean);

      return paths.length ? JSON.stringify(paths) : null;
    }

    if (typeof value === 'string' && value.trim()) {
      try {
        const parsed: unknown = JSON.parse(value);

        if (Array.isArray(parsed)) {
          const paths = parsed
            .map((item) => String(item).trim())
            .filter(Boolean);

          return paths.length ? JSON.stringify(paths) : null;
        }
      } catch {
        // Nilai lama berupa satu path tetap didukung.
      }

      return JSON.stringify([value.trim()]);
    }

    return null;
  }

  private parseDocumentationPaths(value: string | null | undefined): string[] {
    if (!value?.trim()) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Data lama berupa satu path.
    }

    return [value.trim()];
  }
  private withDocumentationPaths<
    T extends {
      socialization_photo?: string | null;
    },
  >(data: T) {
    return {
      ...data,
      documentationPaths: this.parseDocumentationPaths(
        data.socialization_photo,
      ),
    };
  }
}
