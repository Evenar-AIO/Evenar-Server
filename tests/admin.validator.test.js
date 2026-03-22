const {
    paginationSchema,
    idParamSchema,
    processRefundSchema,
    getTransactionsSchema,
    getAuditLogsSchema,
    exportStatsSchema
} = require('../../src/validators/adminValidator');

describe('Admin Validators', () => {
    describe('paginationSchema', () => {
        it('should pass with valid pagination parameters', () => {
            const data = { page: 2, limit: 20, search: 'test', isLocked: true };
            const { error, value } = paginationSchema.validate(data);
            expect(error).toBeUndefined();
            expect(value).toEqual(data);
        });

        it('should set default values for page and limit', () => {
            const { error, value } = paginationSchema.validate({});
            expect(error).toBeUndefined();
            expect(value.page).toBe(1);
            expect(value.limit).toBe(10);
        });

        it('should fail if page is less than 1', () => {
            const { error } = paginationSchema.validate({ page: 0 });
            expect(error).toBeDefined();
        });
    });

    describe('idParamSchema', () => {
        it('should pass with valid id string', () => {
            const { error } = idParamSchema.validate({ id: 'valid_id_string' });
            expect(error).toBeUndefined();
        });

        it('should fail if id is missing', () => {
            const { error } = idParamSchema.validate({});
            expect(error).toBeDefined();
        });
    });

    describe('processRefundSchema', () => {
        it('should pass with valid params (approved)', () => {
            const { error } = processRefundSchema.validate({ refundId: '123', status: 'approved' });
            expect(error).toBeUndefined();
        });

        it('should pass with valid params (rejected)', () => {
            const { error } = processRefundSchema.validate({ refundId: '123', status: 'rejected' });
            expect(error).toBeUndefined();
        });

        it('should fail if status is invalid', () => {
            const { error } = processRefundSchema.validate({ refundId: '123', status: 'invalid' });
            expect(error).toBeDefined();
        });
    });

    describe('getTransactionsSchema', () => {
        it('should pass with valid parameters', () => {
            const { error } = getTransactionsSchema.validate({
                page: 1, limit: 10, status: 'confirmed', startDate: '2023-01-01', endDate: '2023-12-31'
            });
            expect(error).toBeUndefined();
        });

        it('should fail if endDate is before startDate', () => {
            const { error } = getTransactionsSchema.validate({
                startDate: '2023-12-31', endDate: '2023-01-01'
            });
            expect(error).toBeDefined();
        });
    });

    describe('getAuditLogsSchema', () => {
        it('should pass with valid parameters', () => {
            const { error } = getAuditLogsSchema.validate({ action: 'CREATE' });
            expect(error).toBeUndefined();
        });

        it('should fail if action is invalid', () => {
            const { error } = getAuditLogsSchema.validate({ action: 'INVALID_ACTION' });
            expect(error).toBeDefined();
        });
    });

    describe('exportStatsSchema', () => {
        it('should pass with valid format', () => {
            const { error } = exportStatsSchema.validate({ format: 'json' });
            expect(error).toBeUndefined();
        });

        it('should set default format to csv', () => {
            const { value } = exportStatsSchema.validate({});
            expect(value.format).toBe('csv');
        });
    });
});
