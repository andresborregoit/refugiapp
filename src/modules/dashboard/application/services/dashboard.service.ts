import { Inject, Injectable } from '@nestjs/common';
import {
  DASHBOARD_REPOSITORY,
  DashboardOverview,
  DashboardRepository,
} from '../../domain/repositories/dashboard.repository';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepository,
  ) {}

  async getOverview(): Promise<DashboardOverview> {
    return this.dashboardRepository.getOverview();
  }
}