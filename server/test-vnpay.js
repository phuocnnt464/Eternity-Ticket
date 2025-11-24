require('dotenv').config();
const crypto = require('crypto');
const querystring = require('querystring');

console.log('🔍 VNPay Signature Test Tool\n');
console.log('=' .repeat(80));

// Config
const vnp_TmnCode = process.env.VNPAY_TMN_CODE;
const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;

console.log('\n📋 Configuration:');
console.log(`   TMN Code: ${vnp_TmnCode}`);
console.log(`   Hash Secret Length: ${vnp_HashSecret?.length} chars`);
console.log(`   Hash Secret (first 8 chars): ${vnp_HashSecret?.substring(0, 8)}...`);

// Test params
const vnp_Params = {
  vnp_Amount: 10000000,
  vnp_Command: 'pay',
  vnp_CreateDate: '20241124120000',
  vnp_CurrCode: 'VND',
  vnp_ExpireDate: '20241124121500',
  vnp_IpAddr: '127.0.0.1',
  vnp_Locale: 'vn',
  vnp_OrderInfo: 'Test payment',
  vnp_OrderType: 'billpayment',
  vnp_ReturnUrl: 'http://localhost:5173/payment/result',
  vnp_TmnCode: vnp_TmnCode,
  vnp_TxnRef: 'TEST-ORDER-001',
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

const sorted = sortObject(vnp_Params);

console.log('\n' + '='.repeat(80));
console.log('🧪 TEST 1: Manual string concatenation (NO encoding)');
console.log('='.repeat(80));

const signData1 = Object.keys(sorted)
  .map(key => `${key}=${sorted[key]}`)
  .join('&');

console.log('\nSign Data:');
console.log(signData1);

const hmac1 = crypto.createHmac('sha512', vnp_HashSecret);
const signature1 = hmac1.update(Buffer.from(signData1, 'utf-8')).digest('hex');

console.log('\n✅ Signature:');
console.log(signature1);

console.log('\n' + '='.repeat(80));
console.log('🧪 TEST 2: Using querystring.stringify()');
console.log('='.repeat(80));

const signData2 = querystring.stringify(sorted);

console.log('\nSign Data:');
console.log(signData2);

const hmac2 = crypto.createHmac('sha512', vnp_HashSecret);
const signature2 = hmac2.update(Buffer.from(signData2, 'utf-8')).digest('hex');

console.log('\n✅ Signature:');
console.log(signature2);

console.log('\n' + '='.repeat(80));
console.log('📊 Comparison:');
console.log('='.repeat(80));
console.log(`Signature 1: ${signature1.substring(0, 32)}...`);
console.log(`Signature 2: ${signature2.substring(0, 32)}...`);
console.log(`Are they equal? ${signature1 === signature2 ? '✅ YES' : '❌ NO'}`);

console.log('\n' + '='.repeat(80));
console.log('🌐 Final Payment URL (with encoding):');
console.log('='.repeat(80));

const finalParams = { ...sorted, vnp_SecureHash: signature1 };
const paymentUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?' + 
                   querystring.stringify(finalParams);

console.log(paymentUrl);

console.log('\n💡 Note: VNPay requires:');
console.log('   1. Sign data: NO encoding (spaces stay as spaces)');
console.log('   2. Final URL: WITH encoding (spaces become %20)');
console.log('\n✨ Copy the URL above and test it in your browser!');