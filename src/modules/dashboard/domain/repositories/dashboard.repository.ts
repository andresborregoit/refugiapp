import { AnimalStatus } from '../../../animals/domain/enums/animal-status.enum';
import { DashboardAnimal } from '../entities/dashboard-animal.entity';

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export const DASHBOARD_RECENT_ANIMALS_LIMIT = 5;

export interface DashboardTotals {
  animals: number;
  byStatus: Record<AnimalStatus, number>;
}

export interface DashboardOverview {
  totals: DashboardTotals;
  recentAnimals: DashboardAnimal[];
}

export interface DashboardRepository {
  getOverview(): Promise<DashboardOverview>;
}