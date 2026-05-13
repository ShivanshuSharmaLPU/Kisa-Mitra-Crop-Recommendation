const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  farmer:   { type: mongoose.Schema.Types.ObjectId, ref: 'Farmer' },
  rating:   { type: Number, min: 1, max: 5, required: true },
  feature:  { type: String },
  comment:  { type: String, maxlength: 1000 },
  phone:    { type: String },
  helpful:  { type: Boolean },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
