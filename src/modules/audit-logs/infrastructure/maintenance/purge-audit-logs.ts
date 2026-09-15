import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../../app.module';
import { AuditLogsService } from '../../application/services/audit-logs.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const auditLogsService = app.get(AuditLogsService);
    const purged = await auditLogsService.purgeExpired();

    console.info(`Purged ${purged} audit log entries older than the retention period.`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown purge error.';
    console.error(message);
    process.exitCode = 1;
  });
}