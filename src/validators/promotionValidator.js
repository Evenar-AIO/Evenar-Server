const Joi = require('joi');

exports.validatePromotionRequest = (req, res, next) => {
  const schema = Joi.object({
    code: Joi.string().required(),
    eventId: Joi.string().required(),
    totalAmount: Joi.number().min(0).required()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
