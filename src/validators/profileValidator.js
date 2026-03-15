const Joi = require('joi');

const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().allow('', null).max(20),
  avatar: Joi.string().allow('', null),
  birthday: Joi.date().iso().allow('', null),
  email: Joi.string().email().required(),
});

const ownerProfileUpdateSchema = profileUpdateSchema.keys({
  companyName: Joi.string().min(2).max(150).required(),
  description: Joi.string().allow('', null).max(1000),
  contactInfo: Joi.string().allow('', null).max(255),
});

module.exports = {
  profileUpdateSchema,
  ownerProfileUpdateSchema,
};
