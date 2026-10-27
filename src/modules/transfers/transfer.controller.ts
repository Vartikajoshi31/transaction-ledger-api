import { Request, Response, NextFunction } from 'express';
import { transferService, TransferService } from './transfer.service.js';

export class TransferController {
  constructor(private service: TransferService = transferService) {}

  transfer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = this.service.executeTransfer(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}

export const transferController = new TransferController();
