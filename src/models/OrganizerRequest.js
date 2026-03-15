const mongoose = require('mongoose');

const organizerRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.Mixed, ref: 'User', required: true },
    organizationName: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    identityNumber: { type: String, required: true }, // CMND/CCCD
    taxCode: { type: String }, // Mã số thuế (optional for individuals)
    address: { type: String, required: true },
    description: { type: String },
    identityCardFront: { type: String }, // Link to CCCD mặt trước
    identityCardBack: { type: String },  // Link to CCCD mặt sau
    attachmentURL: { type: String }, // Link to other document images
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    rejectionReason: { type: String },
    adminId: { type: mongoose.Schema.Types.Mixed, ref: 'User' },
    processedAt: { type: Date }
}, {
    timestamps: true
});

module.exports = mongoose.model('OrganizerRequest', organizerRequestSchema);
