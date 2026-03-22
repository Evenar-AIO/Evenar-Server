const PayOSModule = require('@payos/node');
const PayOS = PayOSModule.PayOS || PayOSModule.default || PayOSModule;

let payosInstance;

exports.initPayOS = () => {
    payosInstance = new PayOS(
        process.env.PAYOS_CLIENT_ID || 'client-id-placeholder',
        process.env.PAYOS_API_KEY || 'api-key-placeholder',
        process.env.PAYOS_CHECKSUM_KEY || 'checksum-key-placeholder'
    );
    console.log('PayOS initialized');
};

exports.createPaymentLink = async (orderData) => {
    if (!payosInstance) this.initPayOS();
    try {
        const result = await payosInstance.paymentRequests.create(orderData);
        return result;
    } catch (error) {
        console.error('PayOS create error:', error.message);
        throw error;
    }
};

exports.verifyTransaction = async (transactionId) => {
    if (!payosInstance) this.initPayOS();
    return await payosInstance.paymentRequests.get(transactionId);
};
