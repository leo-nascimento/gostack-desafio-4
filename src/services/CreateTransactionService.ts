import { getRepository, getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  categoryTitle: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    categoryTitle,
  }: Request): Promise<Transaction> {
    if (!['income', 'outcome'].includes(type)) {
      throw new AppError('The parameter type has sended invalid option.');
    }

    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();

      if (balance.total < value) {
        throw new AppError('The requested amount is greater than the total.');
      }
    }

    let category = await categoryRepository.findOne({
      where: { title: categoryTitle },
    });

    if (!category) {
      category = await categoryRepository.save({
        title: categoryTitle,
      });
    }

    const transation = await transactionRepository.save({
      title,
      value,
      type,
      category_id: category.id,
    });

    return transation;
  }
}

export default CreateTransactionService;
