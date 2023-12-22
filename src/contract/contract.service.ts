import {Injectable} from '@nestjs/common';
import {InjectRepository} from '@nestjs/typeorm';
import {Repository} from 'typeorm';
import {Contract} from "./models/contract.entity";

@Injectable()
export class ContractService {

    constructor(
        @InjectRepository(Contract)
        private contractRepository: Repository<Contract>,
    ) {
        this.getAllPayoutListeners()
    }


    public async getAllPayoutListeners(): Promise<Contract[]> {
        const queryBuilder = this.contractRepository.createQueryBuilder('contracts');

        queryBuilder.where('contracts.id = :id', {id: 'PayoutListener'});
        const data = await queryBuilder.getMany()
        console.log(data, 'data')
        return await queryBuilder.getMany();
    }

    public async getUsdPlusByChain(chain: string, token: string): Promise<Contract> {
        console.log(chain, token, 'getUsdPlusByChain')

        // For only DAI+|USDT+ tokens
        if (token !== 'usd+'){
          // Convert dai+ -> DAI
          token = token.toUpperCase().replace("+", '');

          // Convert optimism -> OPTIMISM_DAI
          chain = chain.toUpperCase() + "_" + token;
        }

        const queryBuilder = this.contractRepository.createQueryBuilder('contracts');
        queryBuilder.where('contracts.id = :id', {id: 'USD+'});
        queryBuilder.andWhere('contracts.chain = :chain', {chain: chain});

        return await queryBuilder.getOne();
    }

}
