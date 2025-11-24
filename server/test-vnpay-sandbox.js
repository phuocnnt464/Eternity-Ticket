require('dotenv').config();
const crypto = require('crypto');
const querystring = require('querystring');

console.log('🔍 VNPay Final Test (Without ExpireDate)\n');

const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
const vnp_HashSecret = process.env.VNPAY_HASH_SECRET?.trim();

console.log('Config:');
console.log(`TMN Code: ${vnp_TmnCode}`);
console.log(`Hash Secret: ${vnp_HashSecret?.substring(0, 8)}...`);
console.log();

// ✅ Get CURRENT time in GMT+7
const now = new Date();
const gmt7 = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

const pad = (num) => num.toString().padStart(2, '0');
const formatDate = (date) => {
  return date.getFullYear() +
         pad(date.getMonth() + 1) +
         pad(date.getDate()) +
         pad(date.getHours()) +
         pad(date.getMinutes()) +
         pad(date.getSeconds());
};

const createDate = formatDate(gmt7);

console.log('⏰ Timestamps:');
console.log(`Current (GMT+7): ${gmt7.toISOString()}`);
console.log(`Create Date: ${createDate}`);
console.log();

// ✅ Test params WITHOUT vnp_ExpireDate
const params = {
  vnp_Amount: 10000000,
  vnp_Command: 'pay',
  vnp_CreateDate: createDate,
  vnp_CurrCode: 'VND',
  vnp_IpAddr: '127.0.0.1',
  vnp_Locale: 'vn',
  vnp_OrderInfo: 'TestPayment',
  vnp_OrderType: 'billpayment',
  vnp_ReturnUrl: 'http://localhost:5173/payment/result',
  vnp_TmnCode: vnp_TmnCode,
  vnp_TxnRef: 'TEST-' + Date.now(),
  vnp_Version: '2.1.0'
  // ❌ NO vnp_ExpireDate!
};

// Sort
const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
};

const sorted = sortObject(params);

// Create signature WITHOUT encoding
const signData = Object.keys(sorted)
  .map(key => `${key}=${sorted[key]}`)
  .join('&');

console.log('Sign data:', signData);
console.log();

const hmac = crypto.createHmac('sha512', vnp_HashSecret);
const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

console.log('Signature:', signature);
console.log();

const finalParams = { ...sorted, vnp_SecureHash: signature };
const url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?' + 
            querystring.stringify(finalParams);

console.log('='.repeat(80));
console.log('🌐 Payment URL (NO ExpireDate):');
console.log('='.repeat(80));
console.log(url);
console.log();
console.log('✨ Copy this URL and test in browser NOW!');
console.log('='.repeat(80));