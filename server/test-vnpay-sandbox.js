require('dotenv').config();
const crypto = require('crypto');
const querystring = require('querystring');

console.log('🔍 VNPay Official Test\n');

// Official test data from VNPay docs
const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
const vnp_HashSecret = process.env.VNPAY_HASH_SECRET?.trim();

console.log('Config:');
console.log(`TMN Code: ${vnp_TmnCode}`);
console.log(`Hash Secret: ${vnp_HashSecret?.substring(0, 8)}...`);
console.log();

// Test case 1: Minimal params
const params1 = {
  vnp_Amount: 10000000,
  vnp_Command: 'pay',
  vnp_CreateDate: '20241124120000',
  vnp_CurrCode: 'VND',
  vnp_IpAddr: '127.0.0.1',
  vnp_Locale: 'vn',
  vnp_OrderInfo: 'TestPayment',  // NO spaces
  vnp_OrderType: 'billpayment',
  vnp_ReturnUrl: 'http://localhost:5173/payment/result',
  vnp_TmnCode: vnp_TmnCode,
  vnp_TxnRef: 'TEST001',
  vnp_Version: '2.1.0'
};

// Sort
const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
};

const sorted1 = sortObject(params1);

// Create signature
const signData1 = Object.keys(sorted1)
  .map(key => `${key}=${sorted1[key]}`)
  .join('&');

console.log('Test 1: Minimal params (NO spaces in OrderInfo)');
console.log('Sign data:', signData1);

const hmac1 = crypto.createHmac('sha512', vnp_HashSecret);
const signature1 = hmac1.update(Buffer.from(signData1, 'utf-8')).digest('hex');

console.log('Signature:', signature1);

const finalParams1 = { ...sorted1, vnp_SecureHash: signature1 };
const url1 = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?' + 
             querystring.stringify(finalParams1);

console.log('\nTest URL 1:');
console.log(url1);
console.log('\n' + '='.repeat(80));

// Test case 2: With Vietnamese
const params2 = {
  ...params1,
  vnp_OrderInfo: 'ThanhToanDonHang',  // Vietnamese, no spaces
  vnp_TxnRef: 'TEST002'
};

const sorted2 = sortObject(params2);
const signData2 = Object.keys(sorted2)
  .map(key => `${key}=${sorted2[key]}`)
  .join('&');

console.log('\nTest 2: Vietnamese (NO spaces)');
console.log('Sign data:', signData2);

const hmac2 = crypto.createHmac('sha512', vnp_HashSecret);
const signature2 = hmac2.update(Buffer.from(signData2, 'utf-8')).digest('hex');

console.log('Signature:', signature2);

const finalParams2 = { ...sorted2, vnp_SecureHash: signature2 };
const url2 = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?' + 
             querystring.stringify(finalParams2);

console.log('\nTest URL 2:');
console.log(url2);
console.log('\n' + '='.repeat(80));
console.log('\n✨ Copy URLs above and test in browser!');
console.log('If BOTH fail with Error 70 → Hash Secret is WRONG');
console.log('If ONE works → Check your OrderInfo format');