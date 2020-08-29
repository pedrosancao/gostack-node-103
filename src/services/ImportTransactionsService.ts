import { createReadStream, promises } from 'fs';
import csvParse from 'csv-parse';
import CreateTransactionService from './CreateTransactionService';
import Transaction from '../models/Transaction';

interface Request {
  file: Express.Multer.File;
}

class ImportTransactionsService {
  private createTransactionService: CreateTransactionService;

  constructor() {
    this.createTransactionService = new CreateTransactionService();
  }

  async execute({ file: { path } }: Request): Promise<Transaction[]> {
    const readStream = createReadStream(path);
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const transactions: Transaction[] = [];
    const csvParser = readStream.pipe(parseStream);
    let transactionPromises = new Promise(resolve => resolve());
    csvParser.on('data', line => {
      const [title, type, value, category] = line;
      transactionPromises = transactionPromises.then(() => {
        return this.createTransactionService
          .execute({ category, title, type, value })
          .then(transaction => {
            transactions.push(transaction);
          });
      });
    });
    return new Promise(resolve => {
      csvParser.on('end', async () => {
        await promises.unlink(path);
        transactionPromises.then(() => {
          resolve(transactions);
        });
      });
    });
  }
}

export default ImportTransactionsService;
