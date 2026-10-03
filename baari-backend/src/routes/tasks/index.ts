import { Router } from 'express';
import { crudRouter } from './crud.js';
import { occurrencesRouter } from './occurrences.js';
import { rotationRouter } from './rotation.js';
import { computeNextOccurrenceDate } from '../../utils/index.js';

export const tasksRouter = Router();

tasksRouter.use('/', crudRouter);
tasksRouter.use('/', occurrencesRouter);
tasksRouter.use('/', rotationRouter);

export { computeNextOccurrenceDate };
