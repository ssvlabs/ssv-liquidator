
import { ConfService } from 'shared/services/conf.service';
import { MetricsService } from 'modules/webapp/metrics/services/metrics.service';
import { ClusterService } from 'modules/clusters/cluster.service';
import { SystemService } from 'modules/system/system.service';
import { Web3Provider } from 'shared/services/web3.provider';
import { LiquidationTask } from 'services/worker/tasks/liquidation.task';
import {Test, TestingModule} from '@nestjs/testing';

// import {LiquidationTask} from "./liquidation.task";
// import {ConfService} from "../../../shared/services/conf.service";
// import {MetricsService} from "../../../modules/webapp/metrics/services/metrics.service";
// import {ClusterService} from "../../../modules/clusters/cluster.service";
// import {SystemService} from "../../../modules/system/system.service";
// import {Web3Provider} from "../../../shared/services/web3.provider";
//
describe('LiquidationTask', () => {
  let liquidationService: LiquidationTask;

  let confServiceMock: ConfService;
  let metricsServiceMock: MetricsService;
  let clusterServiceMock: ClusterService;
  let systemServiceMock: SystemService;
  let web3ServiceMock: Web3Provider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiquidationTask,
        // Provide the mock instance instead of the real Service
        { provide: ConfService, useValue: { getSomeValue: jest.fn() } },
        { provide: MetricsService, useValue: { getSomeValue: jest.fn() } },
        { provide: ClusterService, useValue: { getSomeValue: jest.fn() } },
        { provide: SystemService, useValue: { getSomeValue: jest.fn() } },
        { provide: Web3Provider, useValue: { getSomeValue: jest.fn() } },
      ],
    }).compile();

    // Inject the service and its dependencies
    liquidationService = module.get<LiquidationTask>(LiquidationTask);
    confServiceMock = module.get<ConfService>(ConfService);
    metricsServiceMock = module.get<MetricsService>(MetricsService);
    clusterServiceMock = module.get<ClusterService>(ClusterService);
    systemServiceMock = module.get<SystemService>(SystemService);
    web3ServiceMock = module.get<Web3Provider>(Web3Provider);
  });

  /**
   * Testing the acquireLock function
   */
  describe('acquireLock', () => {

    it('Should be able to acquire the lock', () => {
      let isLockAcquired: boolean = liquidationService.acquireLock()
      expect(isLockAcquired).toBe(true);
    });


    // Add more test cases as needed
  });

});


// test('adds 1 + 2 to equal 3', () => {
//   expect(1).toBe(1);
// });
