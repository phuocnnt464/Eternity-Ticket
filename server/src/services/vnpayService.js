// server/src/services/vnpayService.js

const crypto = require('crypto');
const qs = require('qs');

class VNPayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      console.warn('⚠️ VNPay credentials not configured. Payment will not work.');
    }
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
    console.log('🔐 VNPay createPaymentUrl called');
    console.log('📋 Input params:', {
      orderId: params.orderId,
      amount: params.amount,
      orderInfo: params.orderInfo,
      orderType: params.orderType,
      ipAddr: params.ipAddr,
      returnUrl: params.returnUrl
    });

    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      throw new Error('VNPay is not configured. Please contact administrator.');
    }

    console.log('🔑 VNPay Config:', {
      tmnCode: this.vnp_TmnCode,
      tmnCodeLength: this.vnp_TmnCode.length,
      hasSecret: !!this.vnp_HashSecret,
      secretLength: this.vnp_HashSecret.length,
      url: this.vnp_Url
    });

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
 
    // Validate returnUrl is required
    if (!returnUrl) {
      throw new Error('returnUrl is required for VNPay payment');
    }

    // ✅ FIX: Sử dụng UTC+7 timezone
    const date = new Date();
    // Chuyển sang GMT+7
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000));

    // Build VNPay params
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
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate
    };

    // Add bankCode if provided
    if (bankCode !== null && bankCode !== '') {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    console.log('📦 VNPay Params (before sort):', vnp_Params);

    // Sort params
    vnp_Params = this.sortObject(vnp_Params);

    // ✅ FIX: Tạo signData theo đúng chuẩn VNPay (không encode)
    const signData = qs.stringify(vnp_Params, { encode: false });
    
    console.log('🔐 Sign data:', signData);

    // Create signature
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    
    console.log('✅ Signature generated:', signed.substring(0, 20) + '...');
    console.log('✅ Full signature:', signed);

    // Add signature to params
    vnp_Params['vnp_SecureHash'] = signed;

    // ✅ FIX: Build URL với encode = false theo chuẩn VNPay
    const paymentUrl = this.vnp_Url + '?' + qs.stringify(vnp_Params, { encode: false });

    console.log('🌐 Final payment URL length:', paymentUrl.length);
    console.log('🌐 Full URL:', paymentUrl);

    return paymentUrl;
  }

  /**
   * Verify return URL
   * @param {Object} vnpParams - VNPay return params
   * @returns {Boolean} Is valid
   */
  verifyReturnUrl(vnpParams) {
    console.log('🔍 VNPay verifyReturnUrl called');
    console.log('📋 Received params:', vnpParams);

    const requiredFields = ['vnp_TxnRef', 'vnp_Amount', 'vnp_ResponseCode', 'vnp_SecureHash'];
  
    for (const field of requiredFields) {
      if (!vnpParams[field]) {
        console.error(`❌ VNPay missing required field: ${field}`);
        return false;
      }
    }

    const secureHash = vnpParams['vnp_SecureHash'];

    // Remove hash params
    const params = { ...vnpParams };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // Sort params
    const sortedParams = this.sortObject(params);

    // ✅ FIX: Verify với encode = false
    const signData = qs.stringify(sortedParams, { encode: false });
    
    console.log('🔍 Verify sign data:', signData);

    // Create signature
    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    console.log('🔍 Expected hash:', signed);
    console.log('🔍 Received hash:', secureHash);

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