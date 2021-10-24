import { Controller } from '@nestjs/common';
import { QueueService } from '../../queues/queue.service';
import { ValidatorService } from './validator.service';

@Controller('validators')
export class ValidatorController {
  constructor(private _validatorService: ValidatorService, private _queuesService: QueueService) {}
}
