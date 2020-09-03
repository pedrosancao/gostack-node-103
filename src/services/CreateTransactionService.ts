import { Repository, getRepository, getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';

interface Request {
  category: string;
  title: string;
  type: 'income' | 'outcome';
  value: number;
}
class CreateTransactionService {
  private categoriesRepository: Repository<Category>;

  private transactionsRepository: TransactionsRepository;

  constructor() {
    this.categoriesRepository = getRepository(Category);
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
  }

  public async execute({
    category,
    title,
    type,
    value,
  }: Request): Promise<Transaction> {
    if (['income', 'outcome'].indexOf(type) < 0) {
      throw Error('Invalid transaction type');
    }
    if (type === 'outcome') {
      const { total } = await this.transactionsRepository.getBalance();
      if (value > total) {
        throw new AppError('Insuficient funds.');
      }
    }

    let existingCategory = await this.categoriesRepository.findOne({
      select: ['id'],
      where: { title: category },
    });

    if (!existingCategory) {
      existingCategory = this.categoriesRepository.create({ title: category });
      await this.categoriesRepository.save(existingCategory);
    }

    const transaction = this.transactionsRepository.create({
      category_id: existingCategory.id,
      title,
      type,
      value,
    });

    await this.transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
