import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
    });

    const parseCSV = readCSVStream.pipe(parseStream);
    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value || !category) return;

      transactions.push({ title, type, value, category });
      categories.push(category);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const categoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const forAddCategories = categories
      .filter(category => !categoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = await categoriesRepository.create(
      forAddCategories.map(category => ({
        title: category,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const newTransactions = await transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    transactionsRepository.save(newTransactions);

    await fs.promises.unlink(filePath);

    return newTransactions;
  }
}

export default ImportTransactionsService;
