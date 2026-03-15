const Joi = require('joi');

exports.validatePayment = (req, res, next) => {
  const schema = Joi.object({
    orderId: Joi.string().required(),
    amount: Joi.number().min(0).required(),
    method: Joi.string().valid('VNPAY', 'PAYOS').required(),
    paymentToken: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
