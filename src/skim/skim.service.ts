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


/**
 * SkimService
 *
 * What is it doing?
 *
 * Monitoring available pools from database and adding are new pools to skim list
 */

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

        const privateKey = process.env['PRIVATE_KEY'];

        if (privateKey){

            this.transactionService = new TransactionService();
            this.wallet = new ethers.Wallet(privateKey);
            const config = new TelegramServiceConfig();
            config.name = 'Dex-Pool Service';
            config.polling = false;
            this.telegramService = new TelegramService(config);

            this.telegramService.sendMessage('DexPool service is running');
        }else {
            this.logger.error('PRIVATE_KEY is not defined -> skim service cannot send transaction');
        }
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async runScheduler(): Promise<void> {
        this.logger.log('Update skim pools...');
        await this.updateSkims();
    }

    /**
     * Init PayoutListener contract for all support chains.
     *
     * 1) Get contract addresses from database
     * 2) Get RPC for chains from env
     * 3) Create PayoutListener contract and put in map by ID Chain
     */

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
            this.payoutListenerMap.set(contract.chain, new ethers.Contract(contract.address, GlobalPayoutListener, provider));
        }

    }

    /**
     * How to update skim list?
     *
     * 1) Get filter pools by getPools()
     * 2) Get PayoutListener contract by Chain ID
     * 3) Check: PayoutListener contains this pool and token (USD+|DAI+) for skim
     * 4) If not contains then create transaction to adding in skim list
     */

    async updateSkims(): Promise<void> {

        const pools = await this.getPools();

        for (const pool of pools) {
            this.logger.log(`${pool.platform}:Pool: ${pool.name}:${pool.tvl}`);

            if (this.payoutListenerMap.has(pool.chain)) {

                const tokensInPool = AdaptersService.OVN_POOLS_NAMES.filter((str) =>
                    pool.name.toLowerCase().includes(str.toLowerCase()),
                );

                const pl = this.payoutListenerMap.get(pool.chain);

                const foundItems = await pl.findItemsByPool(pool.address);

                for (const tokenName of tokensInPool) {
                    const tokenContract: Contract = await this.contractService.getUsdPlusByChain(pool.chain, tokenName)
                    const isFound = foundItems.some(skimItem => skimItem.token.toLowerCase() === tokenContract.address.toLowerCase());
                    if (!isFound) {
                        await this.createSkimAndSendTransaction(pool, pl, tokenName, tokenContract);
                    }
                }
            }
        }

    }

    /**
     * Create transaction for PayoutListener and execute it.
     * @param pool - skim pool
     * @param pl - contract PayoutListener
     * @param tokenName - symbol or name of token for Skim
     * @param token - token contract
     */

    async createSkimAndSendTransaction(pool: Pool, pl: ethers.Contract, tokenName: string, token: Contract) {

        this.logger.log(`${tokenName} need to add to skim for pool: ${pool.platform}:${pool.name}`);

        const request = new TransactionRequest();
        request.to = pl.address;

        const skimDto = new SkimDto();
        skimDto.pool = pool.address;
        skimDto.token = token.address;
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


        if (this.wallet === undefined){
            this.logger.error('Wallet is undefined -> skim service cannot send transaction');
            return;
        }

        const response = await this.transactionService.send(request);

        if (response.status == TransactionStatus.OK) {
            const message = `${pool.platform}:${pool.name}:${tokenName} success added to skim: ` + response.hash;
            this.logger.log(message);
            this.telegramService.sendMessage(message);
        } else {
            const message = `${pool.platform}:${pool.name}:${tokenName} error added to skim - msg:${response.error}, hash${response.hash}`;
            this.logger.error(message);
            this.telegramService.sendErrorMessage(message);
        }
    }

    /**
     * Get available pools for adding to skim list.
     *
     * How to filter pools?
     *
     * 1) Get pools from database in search filter by TVL > 10k
     * 2) If PlDashboard contains record then not needed to include this pool
     * 3) Filter by whitelist dex (this list support skim operations)
     */

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

        return foundPools.filter(value => this.dexWhitelist.has(value.platform));
    }
}
