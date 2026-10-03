import { Router } from 'express';
import { balancesRouter } from './balances.js';
import { crudRouter, createNextRecurringInstance } from './crud.js';
import { settlementsRouter } from './settlements.js';
import { commentsRouter } from './comments.js';

export const expensesRouter = Router();

expensesRouter.use('/', balancesRouter);
expensesRouter.use('/', settlementsRouter);
expensesRouter.use('/', commentsRouter);
expensesRouter.use('/', crudRouter);

export { createNextRecurringInstance };
