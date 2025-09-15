const { Schema, model } = require('mongoose');

/**
 * Mongoose schema for User model
 * 
 * Defines the structure and validations for user documents in MongoDB.
 * Includes fields for authentication, personal information, and password reset management.
 * 
 * @type {mongoose.Schema<UserDocument>}
 * 
 * @example
 * // Create a new user
 * const newUser = new User({
 *   email: 'user@example.com',
 *   password: 'hashedPassword123',
 *   name: 'John Doe',
 *   age: 25
 * });
 * 
 * @see {@link https://mongoosejs.com/docs/guide.html|Mongoose Schema Guide}
 */

const UserSchema = new Schema(
    {
	"email": { type: String, required: true},
	"password": { type: String, required: true},
	"name": { type: String, required: true},
    "age": { type: Number, required: true},
    "isBlocked": {type: Boolean, default: false},
    "resetPasswordToken": { type: String },
    "resetPasswordExpires": { type: Date },
    "resetPasswordUsed": { type: Boolean, default: false }
    },
    { timestamps: true } // create createdAt and updatedAt fields automatically
)

module.exports = model('User', UserSchema)