const OrganizerRequest = require('../models/OrganizerRequest');
const User = require('../models/User');
const { logAuditAction } = require('../utils/auditUtil');

exports.submitRequest = async (req, res) => {
    try {
        const userId = req.user.sub || req.user.id || req.user._id;

        // Check if user already has a pending or approved request
        const existingRequest = await OrganizerRequest.findOne({ 
            userId, 
            status: { $in: ['pending', 'approved'] } 
        });

        if (existingRequest) {
            return res.status(400).json({ 
                success: false, 
                message: existingRequest.status === 'approved' 
                    ? 'You are already an organizer.' 
                    : 'Your request is already pending approval.' 
            });
        }

        const requestData = {
            userId,
            ...req.body,
            status: 'pending'
        };

        const request = await OrganizerRequest.create(requestData);

        res.status(201).json({
            success: true,
            message: 'Your request has been submitted and is pending approval.',
            data: request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getMyRequest = async (req, res) => {
    try {
        const userId = req.user.sub || req.user.id || req.user._id;
        const request = await OrganizerRequest.findOne({ userId }).sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            data: request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllRequests = async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};
        
        const requests = await OrganizerRequest.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 });
        
        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const { sendOrganizerApprovalEmail, sendOrganizerRejectionEmail } = require('../utils/emailUtil');

exports.processRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status, rejectionReason } = req.body;
        const adminId = req.user.sub || req.user.id || req.user._id;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // Find request and populate user info for email
        const request = await OrganizerRequest.findById(requestId).populate('userId', 'username email');
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Request has already been processed' });
        }

        request.status = status;
        request.rejectionReason = rejectionReason;
        request.adminId = adminId;
        request.processedAt = new Date();
        await request.save();

        const applicant = request.userId;

        if (status === 'approved') {
            // Update user role
            await User.findOneAndUpdate(
                { $or: [{ _id: applicant._id }, { legacyId: applicant._id }] },
                { $set: { role: 'organizer' } }
            );

            await logAuditAction(req, 'APPROVE_ORGANIZER', 'Users', applicant._id, { role: 'customer' }, { role: 'organizer' });
            
            // Send Approval Email
            if (applicant && applicant.email) {
                try {
                    await sendOrganizerApprovalEmail(applicant.email, applicant.username, request.organizationName);
                } catch (err) {
                    console.error('Failed to send approval email:', err.message);
                }
            }
        } else {
            await logAuditAction(req, 'REJECT_ORGANIZER', 'OrganizerRequests', request._id, { status: 'pending' }, { status: 'rejected', reason: rejectionReason });
            
            // Send Rejection Email
            if (applicant && applicant.email) {
                try {
                    await sendOrganizerRejectionEmail(applicant.email, applicant.username, request.organizationName, rejectionReason);
                } catch (err) {
                    console.error('Failed to send rejection email:', err.message);
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `Request ${status} successfully`,
            data: request
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
