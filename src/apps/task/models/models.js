const { Schema, model } = require('mongoose');

/**
 * Mongoose schema for Task model
 * 
 * Defines the structure and validation rules for task documents in MongoDB.
 * Supports task management with status tracking, user association, scheduling,
 * and remembering functionality for important tasks.
 * 
 * @type {mongoose.Schema<TaskDocument>}
 * 
 * @example
 * // Create a new task
 * const newTask = new Task({
 *   title: "Complete project documentation",
 *   detail: "Write comprehensive API documentation with examples",
 *   status: "to do",
 *   task_date: new Date("2024-03-25T10:00:00.000Z"),
 *   remember: true,
 *   user_id: "507f1f77bcf86cd799439011"
 * });
 * 
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Schema Guide}
 * @see {@link https://docs.mongodb.com/manual/reference/bson-types/#objectid|MongoDB ObjectId}
 */
const TaskSchema = new Schema(
    {
	"title": { type: String, required: true },
	"detail": { type: String, default: '' },
	"status": { type: String, enum: ['to do', 'in process', 'finished'], default: 'to do'},
	"task_date": { type: Date, required: true },
    "remember": {type: Boolean, default: false},
	"user_id": { type: Schema.Types.ObjectId, ref: 'User'}
    },
    { timestamps: true } // create createdAt and updatedAt fields automatically
)

module.exports = model('Task', TaskSchema)