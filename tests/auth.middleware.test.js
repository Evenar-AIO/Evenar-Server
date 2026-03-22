const { verifyToken, verifyAdmin } = require('../../src/middleware/authMiddleware');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn()
}));

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = {
            headers: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
        process.env.NODE_ENV = 'test';
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('verifyToken', () => {
        it('should return 401 if no authorization header is provided', () => {
            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized: No token provided' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 401 if authorization header does not start with Bearer', () => {
            mockReq.headers.authorization = 'Basic token';

            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized: No token provided' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should bypass auth in development with x-mock-role header', () => {
            process.env.NODE_ENV = 'development';
            mockReq.headers['x-mock-role'] = 'admin';

            verifyToken(mockReq, mockRes, mockNext);

            expect(mockReq.user).toEqual({ id: 'mock_id', role: 'admin' });
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });

        it('should verify token and set req.user if valid', () => {
            const token = 'valid-token';
            mockReq.headers.authorization = `Bearer ${token}`;
            const decoded = { id: 'user_id', role: 'customer' };
            jwt.verify.mockReturnValue(decoded);

            verifyToken(mockReq, mockRes, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
            expect(mockReq.user).toEqual(decoded);
            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });

        it('should return 403 if token is invalid or expired', () => {
            mockReq.headers.authorization = 'Bearer invalid-token';
            jwt.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            verifyToken(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden: Invalid or expired token' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('verifyAdmin', () => {
        it('should return 401 if req.user is not set', () => {
            verifyAdmin(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Unauthorized: No user information' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 403 if req.user.role is not admin', () => {
            mockReq.user = { id: 'user_id', role: 'customer' };

            verifyAdmin(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ success: false, message: 'Forbidden: Admin access required' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next if req.user.role is admin', () => {
            mockReq.user = { id: 'admin_id', role: 'admin' };

            verifyAdmin(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
            expect(mockRes.json).not.toHaveBeenCalled();
        });
    });
});
