const Joi = require('joi');

exports.validatePayment = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().min(0).optional(),
    method: Joi.string().valid('VNPAY', 'PAYOS').required(),
    paymentToken: Joi.string().optional(),
    returnUrl: Joi.string().uri().optional(),
    cancelUrl: Joi.string().uri().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
