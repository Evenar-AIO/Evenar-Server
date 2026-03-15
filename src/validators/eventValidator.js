const Joi = require('joi');

const ticketItemSchema = Joi.object({
  type: Joi.string().required(),
  price: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(0).required(),
});

const zoneSchema = Joi.object({
  name: Joi.string().required(),
  capacity: Joi.number().integer().min(0).required(),
  price: Joi.number().min(0).required(),
});

const baseEventSchema = {
  name: Joi.string().min(3).max(200).required(),
  description: Joi.string().allow('').max(5000).required(),
  date: Joi.date().iso().required(),
  location: Joi.string().min(2).max(255).required(),
  genre: Joi.string().min(2).max(100).required(),
  status: Joi.string().valid('draft', 'pending', 'upcoming', 'active', 'inactive', 'deleted').default('pending'),
  imageUrl: Joi.string().allow('').optional(),
  basePrice: Joi.number().min(0).required(),
  zones: Joi.array().items(zoneSchema).default([]),
  ticketInfo: Joi.array().items(ticketItemSchema).default([]),
};

const createEventSchema = Joi.object(baseEventSchema);
const updateEventSchema = Joi.object({
  name: Joi.string().min(3).max(200),
  description: Joi.string().allow('').max(5000),
  date: Joi.date().iso(),
  location: Joi.string().min(2).max(255),
  genre: Joi.string().min(2).max(100),
  status: Joi.string().valid('draft', 'pending', 'upcoming', 'active', 'inactive', 'deleted'),
  imageUrl: Joi.string().allow(''),
  basePrice: Joi.number().min(0),
  zones: Joi.array().items(zoneSchema),
  ticketInfo: Joi.array().items(ticketItemSchema),
}).min(1);

module.exports = {
  createEventSchema,
  updateEventSchema,
};
