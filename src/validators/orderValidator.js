const Joi = require('joi');

exports.validateCreateOrder = (req, res, next) => {
  const schema = Joi.object({
    eventId: Joi.string().required(),
    tickets: Joi.array().items(
      Joi.object({
        ticketInfoId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        quantity: Joi.number().integer().min(1).required(),
        seatIds: Joi.array().items(Joi.string()).optional()
      })
    ).min(1).required(),
    promotionCode: Joi.string().allow('', null).optional(),
    paymentMethod: Joi.string().valid('VNPAY', 'PAYOS').optional()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
