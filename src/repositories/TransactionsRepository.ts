import { EntityRepository, Repository } from 'typeorm';
import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    const balance = transactions.reduce(
      (previous, current) => {
        const obj = previous;
        if (current.type === 'income') {
          obj.income += current.value;
        } else {
          obj.outcome += current.value;
        }

        return obj;
      },
      {
        income: 0,
        outcome: 0,
      },
    );

    return {
      income: balance.income,
      outcome: balance.outcome,
      total: balance.income - balance.outcome,
    };
  }
}

export default TransactionsRepository;
