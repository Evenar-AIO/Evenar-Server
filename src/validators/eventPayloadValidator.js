const Joi = require('joi');

const ticketInfoSchema = Joi.object({
  type: Joi.string().required(),
  price: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(0).required(),
  description: Joi.string().allow('', null).optional()
}).unknown(true);

const zoneSchema = Joi.object({
  name: Joi.string().required(),
  totalSeats: Joi.number().integer().min(0).optional(),
  ticketPrice: Joi.number().min(0).optional(),
  x: Joi.number().optional(),
  y: Joi.number().optional(),
  width: Joi.number().optional(),
  height: Joi.number().optional(),
  rotation: Joi.number().optional(),
  color: Joi.string().optional(),
  seats: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    row: Joi.string().optional(),
    number: Joi.string().required(),
    x: Joi.number().optional(),
    y: Joi.number().optional(),
    rotation: Joi.number().optional(),
    status: Joi.string().valid('available', 'booked', 'broken').optional()
  }).unknown(true)).optional()
}).unknown(true);

exports.validateCreateEventPayload = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    description: Joi.string().allow('', null).optional(),
    date: Joi.string().optional(),
    startTime: Joi.string().optional(),
    endTime: Joi.string().optional(),
    location: Joi.string().optional(),
    physicalLocation: Joi.string().optional(),
    genre: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    genreId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'active', 'draft', 'cancelled', 'live', 'ended', 'editing').optional(),
    image: Joi.string().allow('', null).optional(),
    imageURL: Joi.string().allow('', null).optional(),
    venueMap: Joi.string().allow('', null).optional(),
    layout: Joi.any().optional(),
    basePrice: Joi.number().min(0).optional(),
    totalTicketCount: Joi.number().integer().min(0).optional(),
    ticketInfo: Joi.array().items(ticketInfoSchema).optional(),
    zones: Joi.array().items(zoneSchema).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    console.log(error.details[0].message); // Added console.log as per instruction
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

exports.validateUpdateEventPayload = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().allow('', null).optional(),
    date: Joi.string().optional(),
    startTime: Joi.string().optional(),
    endTime: Joi.string().optional(),
    location: Joi.string().allow('', null).optional(),
    physicalLocation: Joi.string().allow('', null).optional(),
    genre: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    genreId: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'active', 'draft', 'cancelled', 'live', 'ended', 'editing').optional(),
    image: Joi.string().allow('', null).optional(),
    imageURL: Joi.string().allow('', null).optional(),
    venueMap: Joi.string().allow('', null).optional(),
    layout: Joi.any().optional(),
    basePrice: Joi.number().min(0).optional(),
    totalTicketCount: Joi.number().integer().min(0).optional(),
    ticketInfo: Joi.array().items(ticketInfoSchema).optional(),
    zones: Joi.array().items(zoneSchema).optional(),
    organizerName: Joi.string().optional(),
    ageLimit: Joi.number().integer().min(0).optional(),
    dressCode: Joi.string().allow('', null).optional()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    console.error('Validation Error (Update):', error.details[0].message);
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};
