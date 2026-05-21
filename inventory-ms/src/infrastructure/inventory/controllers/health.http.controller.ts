/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller()
export class HealthHttpController {
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Verifica que el servicio esté corriendo correctamente.',
  })
  @ApiOkResponse({
    description: 'Estado del servicio',
    schema: {
      example: { service: 'inventory-ms', status: 'ok', timestamp: '2025-01-01T00:00:00.000Z' },
    },
  })
  getHealth() {
    return { service: 'inventory-ms', status: 'ok', timestamp: new Date() };
  }
}
