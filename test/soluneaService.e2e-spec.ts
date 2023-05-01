import {Test, TestingModule} from '@nestjs/testing';
import {AdaptersModule} from "../src/adapters/adapters.module";
import {SoluneaService} from "../src/adapters/exchangers/solunea.service";
import {ExchangerModule} from "../src/exchanger/exchanger.module";

describe('SoluneaService (e2e)', () => {

    let soluneaService: SoluneaService;
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [SoluneaService]
        }).compile();

        soluneaService = await moduleFixture.resolve(SoluneaService)
    });

    it('[getPoolsData] must be not zero', async () => {

        const poolData = await soluneaService.getPoolsData();
        expect(poolData.length > 0);

    });
});
