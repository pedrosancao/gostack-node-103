import { createReadStream } from 'fs';
import { getCustomRepository, getRepository, Repository, In } from 'typeorm';
import csvParse from 'csv-parse';
import { Dictionary, keyBy, map, uniq } from 'lodash';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';
import Category from '../models/Category';

interface Request {
  file: Express.Multer.File;
}

interface TransactionData {
  category: string;
  title: string;
  type: 'income' | 'outcome';
  value: number;
}

class ImportTransactionsService {
  private categoriesRepository: Repository<Category>;

  private transactionsRepository: TransactionsRepository;

  constructor() {
    this.categoriesRepository = getRepository(Category);
    this.transactionsRepository = getCustomRepository(TransactionsRepository);
  }

  private readFile(path: string): Promise<TransactionData[]> {
    return new Promise(resolve => {
      const transactionsData: TransactionData[] = [];
      createReadStream(path)
        .pipe(csvParse({ from_line: 2, ltrim: true, rtrim: true }))
        .on('data', row => {
          const [title, type, value, category] = row;
          transactionsData.push({ category, title, type, value });
        })
        .on('end', async () => {
          resolve(transactionsData);
        });
    });
  }

  private async getCategoriesByTitle(
    transactionsData: TransactionData[],
  ): Promise<Dictionary<Category>> {
    const categoryTitles = uniq(map(transactionsData, 'category'));
    const categories = keyBy(
      await this.categoriesRepository.find({
        select: ['id', 'title'],
        where: { title: In(categoryTitles) },
      }),
      'title',
    );
    await Promise.all(
      categoryTitles.map(async title => {
        if (!categories[title]) {
          categories[title] = await this.categoriesRepository.save(
            this.categoriesRepository.create({ title }),
          );
        }
        return categories[title];
      }),
    );
    return categories;
  }

  async execute({ file: { path } }: Request): Promise<Transaction[]> {
    const transactionsData = await this.readFile(path);
    const importTotal = transactionsData.reduce((total, { type, value }) => {
      if (['income', 'outcome'].indexOf(type) < 0) {
        throw Error('Invalid transaction type');
      }
      return total + value * (type === 'income' ? 1 : -1);
    }, 0);
    const { total } = await this.transactionsRepository.getBalance();
    if (total + importTotal < 0) {
      throw new AppError('Insuficient funds.');
    }

    const categories = await this.getCategoriesByTitle(transactionsData);
    return this.transactionsRepository.save(
      transactionsData.map(categoryData => {
        const { category, title, type, value } = categoryData;
        return this.transactionsRepository.create({
          category_id: categories[category].id,
          title,
          type,
          value,
        });
      }),
    );
  }
}

export default ImportTransactionsService;
