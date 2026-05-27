import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Get admin dashboard KPIs' })
  @ApiResponse({ status: 200, description: 'Dashboard KPIs' })
  @ApiResponse({ status: 403, description: 'Admin only' })
  async getDashboard() {
    return this.adminService.getDashboardKpis();
  }
}
