// server/src/services/vnpayService.js

const crypto = require('crypto');
const querystring = require('querystring');

class VNPayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      console.warn('⚠️ VNPay credentials not configured. Payment will not work.');
    }
  }

  sortObject(obj) {
    const sorted = {};
    const keys = Object.keys(obj).sort();
    
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    
    return sorted;
  }

  createPaymentUrl(params) {
    console.log('🔐 VNPay createPaymentUrl called');

    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      throw new Error('VNPay is not configured. Please contact administrator.');
    }

    const {
      orderId,
      amount,
      orderInfo,
      orderType = 'other',
      ipAddr,
      returnUrl,
      locale = 'vn',
      bankCode = null
    } = params;
 
    if (!returnUrl) {
      throw new Error('returnUrl is required for VNPay payment');
    }

    // ✅ FIX: Get current GMT+7 time
    const date = new Date();
    const createDate = this.formatDate(date);

    console.log('⏰ Create Date:', createDate);

    // ✅ FIX: Remove vnp_ExpireDate (optional and may cause issues)
    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnp_TmnCode,
      vnp_Amount: Math.round(amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Locale: locale,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate
      // ❌ REMOVED: vnp_ExpireDate
    };

    if (bankCode !== null && bankCode !== '') {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    console.log('📦 VNPay Params:', vnp_Params);

    // Sort params
    vnp_Params = this.sortObject(vnp_Params);

    // ✅ Create signature WITHOUT URL encoding
    const signData = Object.keys(vnp_Params)
      .map(key => `${key}=${vnp_Params[key]}`)
      .join('&');
    
    console.log('🔐 Sign data:', signData);

    // ✅ Create HMAC-SHA512 signature (lowercase)
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    console.log('✅ Signature:', signed);

    vnp_Params['vnp_SecureHash'] = signed;

    // ✅ Build URL with encoding
    const paymentUrl = this.vnp_Url + '?' + querystring.stringify(vnp_Params);

    console.log('🌐 Payment URL:', paymentUrl);

    return paymentUrl;
  }

  verifyReturnUrl(vnpParams) {
    console.log('🔍 VNPay verifyReturnUrl called');

    const requiredFields = ['vnp_TxnRef', 'vnp_Amount', 'vnp_ResponseCode', 'vnp_SecureHash'];
  
    for (const field of requiredFields) {
      if (!vnpParams[field]) {
        console.error(`❌ Missing field: ${field}`);
        return false;
      }
    }

    const secureHash = vnpParams['vnp_SecureHash'];

    const params = { ...vnpParams };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    const sortedParams = this.sortObject(params);

    const signData = Object.keys(sortedParams)
      .map(key => `${key}=${sortedParams[key]}`)
      .join('&');
    
    console.log('🔍 Verify sign data:', signData);

    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    console.log('🔍 Expected:', signed);
    console.log('🔍 Received:', secureHash);

    return secureHash === signed;
  }

  formatDate(date) {
    const pad = (num) => num.toString().padStart(2, '0');
    
    const options = { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    const formatter = new Intl.DateTimeFormat('en-GB', options);
    const parts = formatter.formatToParts(date);
    
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    const hour = parts.find(p => p.type === 'hour').value;
    const minute = parts.find(p => p.type === 'minute').value;
    const second = parts.find(p => p.type === 'second').value;
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }
}

module.exports = new VNPayService();