import { Controller, Get, Param } from '@nestjs/common';
import { ClaimService } from './claim.service';
import { Claim } from './models/claim.entity';

@Controller('claim')
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  @Get('/:address/:time')
  async checkUser(@Param('address') address: string, @Param('time') time: number): Promise<{ eligble: boolean }> {
    return this.claimService.checkUser(address, time);
  }
}
