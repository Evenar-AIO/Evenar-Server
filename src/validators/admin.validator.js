const Joi = require('joi');

exports.paginationSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    search: Joi.string().allow('', null),
    isLocked: Joi.boolean()
});

exports.idParamSchema = Joi.object({
    id: Joi.string().required()
});

exports.processRefundSchema = Joi.object({
    refundId: Joi.string().required(),
    status: Joi.string().valid('approved', 'rejected').required()
});

exports.getTransactionsSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

exports.getAuditLogsSchema = Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(10),
    action: Joi.string().valid('CREATE', 'UPDATE', 'DELETE', 'LOCK', 'UNLOCK', 'APPROVE', 'PROCESS_REFUND'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    adminID: Joi.string()
});

exports.exportStatsSchema = Joi.object({
    format: Joi.string().valid('csv', 'json').default('csv'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
});
