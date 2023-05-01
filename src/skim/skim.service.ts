import {Injectable, Logger} from '@nestjs/common';
import {Cron, CronExpression} from '@nestjs/schedule';
import {Pool} from 'src/pool/models/entities/pool.entity';
import {PoolService} from '../pool/pool.service';
import {PlDashboard} from 'src/pool/models/entities/pldashboard.entity';
import {ChainType} from 'src/exchanger/models/inner/chain.type';
import {ethers} from "ethers";
import {ContractService} from "../contract/contract.service";
import GlobalPayoutListener from "./abi/GlobalPayoutListener.json";
import * as process from "process";
import {Operation, REWARD_WALLET, SkimDto, ZERO_ADDRESS} from "./dto/skim.dto";
import {AdaptersService} from "../adapters/adapters.service";
import {Contract} from "../contract/models/contract.entity";
import {DEX_SUPPORT_SKIM} from "../exchanger/models/inner/exchanger.type";
import {
    TransactionRequest,
    TransactionService,
    TransactionStatus
} from "@overnight-contracts/eth-utils/dist/module/transaction/transactionService"
import {
    TelegramService,
    TelegramServiceConfig
} from "@overnight-contracts/eth-utils/dist/module/telegram/telegramService";

@Injectable()
export class SkimService {
    private readonly logger = new Logger(SkimService.name);

    payoutListenerMap: Map<string, ethers.Contract> = new Map<string, ethers.Contract>();
    dexWhitelist: Set<string> = new Set;
    transactionService: TransactionService;
    wallet: ethers.Wallet;
    telegramService: TelegramService;

    constructor(private poolService: PoolService, private contractService: ContractService) {

        this.logger.log('==== Dex Support Skim ====')
        for (const exchangerType of DEX_SUPPORT_SKIM) {
            this.dexWhitelist.add(exchangerType);
            this.logger.log(`${exchangerType}`);
        }

        this.transactionService = new TransactionService();
        this.wallet = new ethers.Wallet(process.env['PRIVATE_KEY']);
        const config = new TelegramServiceConfig();
        config.name = 'Dex-Pool Service';
        config.polling = false;
        this.telegramService = new TelegramService(config);

        this.telegramService.sendMessage('DexPool service is running');
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async runScheduler(): Promise<void> {
        this.logger.log('Update skim pools...');
        await this.updatePools();
    }

    async loadPayoutListenerContracts() {
        const contracts = await this.contractService.getAllPayoutListeners();

        for (const contract of contracts) {
            this.logger.log(`Try to init PayoutListener: ${contract.chain}:${contract.address}`);

            const nameEnv = 'WEB3_RPC_' + contract.chain.toUpperCase();
            const rpc = process.env[nameEnv];
            if (rpc == undefined) {
                throw new Error(`${nameEnv} cannot be undefined`)
            }

            const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
            this.payoutListenerMap.set(contract.chain, new ethers.Contract(contract.address, GlobalPayoutListener, wallet));
        }

    }

    async updatePools(): Promise<void> {

        const pools = await this.getPools();

        const filterPools = pools.filter(value => this.dexWhitelist.has(value.platform));

        for (const pool of filterPools) {
            this.logger.log(`${pool.platform}:Pool: ${pool.name}:${pool.tvl}`);

            if (this.payoutListenerMap.has(pool.chain)) {

                const tokensInPool = AdaptersService.OVN_POOLS_NAMES.filter((str) =>
                    pool.name.toLowerCase().includes(str.toLowerCase()),
                );

                const pl = this.payoutListenerMap.get(pool.chain);

                const foundItems = await pl.findItemsByPool(pool.address);

                for (const token of tokensInPool) {
                    const tokenItem: Contract = await this.contractService.getUsdPlusByChain(pool.chain, token)
                    const isFound = foundItems.some(skimItem => skimItem.token.toLowerCase() === tokenItem.address.toLowerCase());

                    if (!isFound) {
                        this.logger.log(`${token} need to add to skim for pool: ${pool.platform}:${pool.name}`);

                        const request = new TransactionRequest();
                        request.to = pl.address;

                        const skimDto = new SkimDto();
                        skimDto.pool = pool.address;
                        skimDto.token = tokenItem.address;
                        skimDto.poolName = pool.name;
                        skimDto.bribe = ZERO_ADDRESS;
                        skimDto.operation = Operation.SKIM;
                        skimDto.to = REWARD_WALLET;
                        skimDto.dexName = pool.platform;
                        skimDto.feePercent = 0;
                        skimDto.feeReceiver = ZERO_ADDRESS;

                        request.data = pl.interface.encodeFunctionData('addItem', [skimDto]);

                        request.provider = pl.provider;
                        request.wallet = this.wallet;

                        const response = await this.transactionService.send(request);

                        if (response.status == TransactionStatus.OK) {
                            const message = `${pool.platform}:${pool.name}:${token} success added to skim: ` + response.hash;
                            this.logger.log(message);
                            this.telegramService.sendMessage(message);
                        } else {
                            const message = `${pool.platform}:${pool.name}:${token} error added to skim - msg:${response.error}, hash${response.hash}`;
                            this.logger.error(message);
                            this.telegramService.sendErrorMessage(message);
                        }
                    }
                }
            }
        }

    }


    async getPools(): Promise<Pool[]> {
        const foundPools: Pool[] = [];
        for (const chain in ChainType) {
            const pools: Pool[] = await this.poolService.getPoolsForSkim(chain);
            const skims: PlDashboard[] = await this.poolService.getSkims(chain);
            for (let i = 0; i < pools.length; i++) {
                const pool = pools[i];
                const check = skims.some(
                    (skim) =>
                        skim.pool_address.toLowerCase() === pool.address.toLowerCase(),
                );
                if (!check) {
                    foundPools.push(pool);
                }
            }
        }
        return foundPools;
    }
}
