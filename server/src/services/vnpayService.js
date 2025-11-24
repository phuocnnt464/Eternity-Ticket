// server/src/services/vnpayService.js

const crypto = require('crypto');
const qs = require('qs');

class VNPayService {
  constructor() {
    this.vnp_TmnCode = process.env.VNPAY_TMN_CODE;
    this.vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
    this.vnp_Url = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      console.warn('⚠️ VNPay credentials not configured');
    }
  }

  /**
   * ✅ Sort object THEO CHUẨN VNPAY
   */
  sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) {
        str.push(encodeURIComponent(key));
      }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
      sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
  }

  createPaymentUrl(params) {
    console.log('🔐 VNPay createPaymentUrl called');

    if (!this.vnp_TmnCode || !this.vnp_HashSecret) {
      throw new Error('VNPay is not configured');
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
      throw new Error('returnUrl is required');
    }

    // ✅ Create date GMT+7
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    const date = new Date();
    const moment = require('moment');
    const createDate = moment(date).format('YYYYMMDDHHmmss');
    const expireDate = moment(date).add(15, 'minutes').format('YYYYMMDDHHmmss');

    console.log('⏰ Create Date:', createDate);
    console.log('⏰ Expire Date:', expireDate);

    // ✅ Build params
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

    if (bankCode !== null && bankCode !== '') {
      vnp_Params['vnp_BankCode'] = bankCode;
    }

    console.log('📦 VNPay Params (before sort):', vnp_Params);

    // ✅ Sort theo chuẩn VNPay (encode key & value)
    vnp_Params = this.sortObject(vnp_Params);

    console.log('📦 VNPay Params (after sort):', vnp_Params);

    // ✅ CRITICAL: Tạo signData từ sorted params đã encode
    // KHÔNG dùng qs.stringify() vì đã encode rồi!
    const signData = Object.keys(vnp_Params)
      .map(key => `${key}=${vnp_Params[key]}`)
      .join('&');

    console.log('🔐 Sign data:', signData);

    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    console.log('✅ Signature:', signed);

    vnp_Params['vnp_SecureHash'] = signed;

    // ✅ Build URL từ params đã encode
    const paymentUrl = this.vnp_Url + '?' + Object.keys(vnp_Params)
      .map(key => `${key}=${vnp_Params[key]}`)
      .join('&');

    console.log('🌐 Payment URL:', paymentUrl);

    return paymentUrl;
  }

  verifyReturnUrl(vnpParams) {
    console.log('🔍 VNPay verifyReturnUrl called');

    const secureHash = vnpParams['vnp_SecureHash'];

    let params = { ...vnpParams };
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // ✅ Sort theo chuẩn VNPay
    params = this.sortObject(params);

    // ✅ Tạo signData (không dùng qs.stringify)
    const signData = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join('&');

    console.log('🔍 Verify sign data:', signData);

    const hmac = crypto.createHmac('sha512', this.vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    console.log('🔍 Expected:', signed);
    console.log('🔍 Received:', secureHash);

    return secureHash === signed;
  }
}

module.exports = new VNPayService();