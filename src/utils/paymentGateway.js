exports.initVNPay = (config) => {
  // Mock initialization
  console.log('VNPay initialized');
};

exports.initPayOS = (config) => {
  // Mock initialization
  console.log('PayOS initialized');
};

exports.createPaymentLink = (amount, description) => {
  return `http://mock-payment-link.com?amount=${amount}&desc=${encodeURIComponent(description)}`;
};

exports.verifyTransaction = (transactionId) => {
  return { status: 'SUCCESS', transactionId };
};
