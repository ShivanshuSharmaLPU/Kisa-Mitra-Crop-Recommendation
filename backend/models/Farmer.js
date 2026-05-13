const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const farmerSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, required: true, unique: true },
  email:    { type: String, sparse: true, lowercase: true },
  password: { type: String, required: true },
  state:    { type: String, default: 'Punjab' },
  district: { type: String, default: 'Phagwara' },
  village:  { type: String },
  language: { type: String, default: 'en', enum: ['en','hi','pa','ta','te','mr','gu'] },
  landArea: { type: Number, default: 2 },   // acres
  soilType: { type: String, default: 'alluvial' },
  irrigation:{ type: String, default: 'canal' },
  cropHistory: [{ crop: String, season: String, year: Number, yield: Number }],
  avatar:   { type: String, default: '' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

farmerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

farmerSchema.methods.matchPassword = async function(entered) {
  return bcrypt.compare(entered, this.password);
};

farmerSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('Farmer', farmerSchema);
