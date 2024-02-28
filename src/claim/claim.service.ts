import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Claim} from "./models/claim.entity";

@Injectable()
export class ClaimService {
    constructor(
        @InjectRepository(Claim)
        private claimRepository: Repository<Claim>,
    ) {
    }

    public async checkUser(address: string, time: number): Promise<{ eligble: boolean }> {
        const timeUnixPerWeek = 60 * 60 * 24 * 7;
        const nowUnix = Math.floor(Date.now() / 1000)
        const item = await this.claimRepository.findOne({ address });

        if (!item && address && time) {
            await this.claimRepository.save({
                id: `${address}_${time}`,
                address,
                time
            });
            return { eligble: true }
        }

        const diff = nowUnix - item.time
        if (diff >= timeUnixPerWeek) return { eligble: true }


        return { eligble: false }
    }

}
