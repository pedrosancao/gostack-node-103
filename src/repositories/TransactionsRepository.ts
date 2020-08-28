import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
  transactions: Transaction[];
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find({ relations: ['category'] });
    const balance = transactions.reduce(
      ({ income, outcome, total }, { type, value }) => {
        const accumulator = { income, outcome, total };
        if (type === 'income') {
          accumulator.income += value;
          accumulator.total += value;
        } else if (type === 'outcome') {
          accumulator.outcome += value;
          accumulator.total -= value;
        }
        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
    return { ...balance, transactions };
  }
}

export default TransactionsRepository;
