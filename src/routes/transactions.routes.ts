import { Router } from 'express';
import { getCustomRepository } from 'typeorm';
import { promises } from 'fs';
import upload from '../config/upload';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepository = getCustomRepository(TransactionsRepository);
  const balance = await transactionsRepository.getBalance();
  const { transactions } = balance;
  delete balance.transactions;

  response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { category, title, type, value } = request.body;
  const createTransactionService = new CreateTransactionService();
  const transaction = await createTransactionService.execute({
    category,
    title,
    type,
    value,
  });

  response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  const deleteTransactionService = new DeleteTransactionService();
  await deleteTransactionService.execute({ id });

  response.status(204).send();
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const { file } = request;
    const importTransactionsService = new ImportTransactionsService();
    const transactions = await importTransactionsService.execute({ file });
    await promises.unlink(file.path);
    response.json(transactions);
  },
);

export default transactionsRouter;
