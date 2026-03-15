const Joi = require('joi');

exports.validateSearch = (req, res, next) => {
  const schema = Joi.object({
    q: Joi.string().allow('').optional(),
    category: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).default(10),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional()
  });

  const { error } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};
