import { getCustomRepository } from 'typeorm';
import { validate } from 'uuid';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  id: string;
}

class DeleteTransactionService {
  private transactionsRepository: TransactionsRepository;

  constructor() {
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
  }

  private notFound(): void {
    throw new AppError('Transaction not found.');
  }

  public async execute({ id }: Request): Promise<void> {
    if (!validate(id)) {
      this.notFound();
    }
    const transaction = await this.transactionsRepository.findOne(id, {
      select: ['id'],
    });
    if (!transaction) {
      this.notFound();
    }
    await this.transactionsRepository.delete(id);
  }
}

export default DeleteTransactionService;
