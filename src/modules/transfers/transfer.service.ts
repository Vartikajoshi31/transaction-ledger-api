import { CreateTransferDTO, TransferResponse } from './transfer.types.js';
import { transferRepository, TransferRepository } from './transfer.repository.js';

export class TransferService {
  constructor(private repo: TransferRepository = transferRepository) {}

  executeTransfer(dto: CreateTransferDTO): TransferResponse {
    return this.repo.transferAtomic(dto);
  }
}

export const transferService = new TransferService();
