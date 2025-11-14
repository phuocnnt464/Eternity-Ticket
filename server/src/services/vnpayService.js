// server/src/services/vnpayService.js
// UPDATE EXISTING FILE WITH MEMBERSHIP SUPPORT

const crypto = require('crypto');
const querystring = require('querystring');

class VNPayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnp_ReturnUrl = process.env.VNPAY_RETURN_URL;
  }

  /**
   * Sort object by key
   */
  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    
    return sorted;
  }

  /**
   * Create payment URL
   * @param {Object} params - Payment parameters
   * @returns {String} Payment URL
   */
  createPaymentUrl(params) {
    const {
      orderId,
      amount,
      orderInfo,
      orderType = 'other', // 'billpayment', 'fashion', 'other', 'membership'
      ipAddr,
      returnUrl,
      locale = 'vn'
    } = params;

    // Create date
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000)); // 15 minutes

    // Build VNPay params
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnp_TmnCode,
      vnp_Locale: locale,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: Math.round(amount * 100), // VNPay uses smallest currency unit
      vnp_ReturnUrl: returnUrl || this.vnp_ReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    // Sort params
    vnp_Params = this.sortObject(vnp_Params);

    // Create signature
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    vnp_Params['vnp_SecureHash'] = signed;

    // Build URL
    const paymentUrl = this.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });

    return paymentUrl;
  }

  /**
   * Verify return URL
   * @param {Object} vnpParams - VNPay return params
   * @returns {Boolean} Is valid
   */
  verifyReturnUrl(vnpParams) {
    const requiredFields = ['vnp_TxnRef', 'vnp_Amount', 'vnp_ResponseCode', 'vnp_SecureHash'];
  
    for (const field of requiredFields) {
      if (!vnpParams[field]) {
        console.error(`❌ VNPay missing required field: ${field}`);
        return false;
      }
    }

    const secureHash = vnpParams['vnp_SecureHash'];

    // Remove hash params
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    // Sort params
    const sortedParams = this.sortObject(vnpParams);

    // Create signature
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
  }

  /**
   * Format date for VNPay
   * @param {Date} date
   * @returns {String} Formatted date
   */
  formatDate(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    
    return date.getFullYear() +
           pad(date.getMonth() + 1) +
           pad(date.getDate()) +
           pad(date.getHours()) +
           pad(date.getMinutes()) +
           pad(date.getSeconds());
  }
}

module.exports = new VNPayService();