import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult } from 'typeorm';

import { Validator } from './validator.entity';
@Injectable()
export class ValidatorService {
  constructor(@InjectRepository(Validator) private _validatorRepository: Repository<Validator>) {}

  async findAll(): Promise<Validator[]> {
    return await this._validatorRepository.find();
  }

  async findBy(filters): Promise<Validator[]> {
    return await this._validatorRepository.find(filters);
  }

  async create(validator: Validator): Promise<Validator> {
    return await this._validatorRepository.save(validator);
  }

  async update(validator: Validator): Promise<UpdateResult> {
    return await this._validatorRepository.update(validator.id, validator);
  }

  async delete(id): Promise<DeleteResult> {
    return await this._validatorRepository.delete(id);
  }
}
