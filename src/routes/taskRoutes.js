const express = require('express');
const { createTask, getUserTasks, getTasksByDate, getTodayTasks, edit, getTaskById, deleteTask} = require('../apps/task/controllers/controllers');
//const authMiddleware = require('../apps/task/middlewares/middlewares');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /tasks
 * @group Tasks - Task management operations  
 * @summary Get user's tasks (optimized ≤ 500ms)
 * @description Retrieves tasks for authenticated user with filtering and pagination
 * @security JWT
 */
router.get('/', authenticateToken, getUserTasks);

/**
 * @route POST /tasks/new
 * @group Tasks - Task management operations
 * @summary Create a new task
 * @security JWT
 */
router.post('/new', authenticateToken, createTask);

/**
 * @route POST /tasks/by-date
 * @group Tasks - Task management operations
 * @summary Get tasks by specific date
 * @description Retrieves all tasks for the authenticated user scheduled on a given date.
 * @security JWT
 */
router.post('/by-date', authenticateToken, getTasksByDate);

/**
 * @route POST /tasks/today
 * @group Tasks - Task management operations
 * @summary Get today's tasks
 * @description Retrieves all tasks for the authenticated user that are scheduled for today.
 * @security JWT
 */
router.post('/today', authenticateToken, getTodayTasks);

/**
 * @route PUT /tasks/update
 * @group Tasks - Task management operations
 * @summary Update a task
 * @security JWT
 */
router.put('/edit/:id', authenticateToken, edit);

/**
 * @route PUT /tasks/edit/{id}
 * @group Tasks - Task management operations
 * @summary Edit an existing task
 * @security JWT
 */
router.get('/get-task/:id',authenticateToken, getTaskById);

/**
 * @route DELETE /tasks/delete/{id}
 * @group Tasks - Task management operations
 * @summary Delete a task
 * @security JWT
 */
router.delete('/delete/:id', authenticateToken, deleteTask);

module.exports = router;
