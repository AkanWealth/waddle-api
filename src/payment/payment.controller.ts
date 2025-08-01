import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import {
  UpdatePaymentStatusDto,
  QueryPaymentDto,
  RevenueQueryDto,
} from './dto';
import { JwtGuard } from '../auth/guard/auth.guard';
import { RolesGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorator/role-decorator';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { PaymentStatus, Role } from '@prisma/client';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
@UseGuards(JwtGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get my payments' })
  @ApiOkResponse({ description: 'List of user payments' })
  async getMyPayments(
    @GetUser('id') userId: string,
    @Query() query: QueryPaymentDto,
  ) {
    return this.paymentService.getPayments({ ...query, userId });
  }

  @Get('revenue/admin')
  @ApiOperation({ summary: 'Get revenue data' })
  @ApiOkResponse({ description: 'Revenue data' })
  async getRevenue(@Query() query: RevenueQueryDto) {
    return this.paymentService.getRevenue(
      query.period,
      query.status as PaymentStatus,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all payments (admin)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOkResponse({ description: 'List of all payments' })
  async getPayments(@Query() query: QueryPaymentDto) {
    return this.paymentService.getPayments(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiOkResponse({ description: 'Payment details' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async getPaymentById(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment status (admin only)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiBody({ type: UpdatePaymentStatusDto })
  @ApiOkResponse({ description: 'Payment status updated' })
  @ApiForbiddenResponse({ description: 'Cannot update a refunded payment' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentService.updatePaymentStatus(id, dto);
  }

  @Patch(':id/refund')
  @ApiOperation({ summary: 'Refund a payment (admin only)' })
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiOkResponse({ description: 'Payment refunded' })
  @ApiForbiddenResponse({ description: 'Cannot refund a refunded payment' })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async refundPayment(@Param('id') id: string) {
    return this.paymentService.refundPayment(id);
  }
}
