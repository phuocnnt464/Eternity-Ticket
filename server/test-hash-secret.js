require('dotenv').config();
const crypto = require('crypto');

console.log('🔐 VNPay Hash Secret Verification Tool\n');
console.log('='.repeat(80));

const vnp_HashSecret = process.env.VNPAY_HASH_SECRET;
const vnp_TmnCode = process.env.VNPAY_TMN_CODE;

console.log('\n📋 Raw Values:');
console.log(`TMN Code: "${vnp_TmnCode}"`);
console.log(`Hash Secret: "${vnp_HashSecret}"`);

console.log('\n📏 Length Check:');
console.log(`TMN Code length: ${vnp_TmnCode?.length} chars`);
console.log(`Hash Secret length: ${vnp_HashSecret?.length} chars`);
console.log(`Expected: 32 chars for Hash Secret`);

console.log('\n🔍 Character Analysis:');
console.log(`Hash Secret (hex): ${Buffer.from(vnp_HashSecret || '').toString('hex')}`);
console.log(`First 10 chars: "${vnp_HashSecret?.substring(0, 10)}"`);
console.log(`Last 10 chars: "${vnp_HashSecret?.substring(vnp_HashSecret.length - 10)}"`);

// Check for whitespace or special characters
const hasWhitespace = /\s/.test(vnp_HashSecret);
const hasNewline = /\n|\r/.test(vnp_HashSecret);
const hasTab = /\t/.test(vnp_HashSecret);

console.log('\n⚠️ Whitespace Check:');
console.log(`Contains spaces: ${hasWhitespace ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
console.log(`Contains newlines: ${hasNewline ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);
console.log(`Contains tabs: ${hasTab ? '❌ YES (BAD)' : '✅ NO (GOOD)'}`);

// Trim and compare
const trimmed = vnp_HashSecret?.trim();
const lengthDiff = vnp_HashSecret?.length - trimmed?.length;

console.log('\n✂️ Trim Check:');
console.log(`Original length: ${vnp_HashSecret?.length}`);
console.log(`Trimmed length: ${trimmed?.length}`);
console.log(`Difference: ${lengthDiff} chars ${lengthDiff > 0 ? '❌ (has whitespace)' : '✅ (clean)'}`);

// Test signature with original and trimmed
console.log('\n' + '='.repeat(80));
console.log('🧪 Signature Test (Original vs Trimmed)');
console.log('='.repeat(80));

const testData = 'vnp_Amount=10000000&vnp_Command=pay&vnp_CreateDate=20241124120000&vnp_CurrCode=VND&vnp_TmnCode=3PVL30Q0&vnp_TxnRef=TEST-001&vnp_Version=2.1.0';

const hmac1 = crypto.createHmac('sha512', vnp_HashSecret);
const sig1 = hmac1.update(Buffer.from(testData, 'utf-8')).digest('hex');

const hmac2 = crypto.createHmac('sha512', trimmed);
const sig2 = hmac2.update(Buffer.from(testData, 'utf-8')).digest('hex');

console.log(`\nTest data: ${testData.substring(0, 50)}...`);
console.log(`\nSignature with ORIGINAL: ${sig1.substring(0, 32)}...`);
console.log(`Signature with TRIMMED:  ${sig2.substring(0, 32)}...`);
console.log(`\nAre they equal? ${sig1 === sig2 ? '✅ YES' : '❌ NO'}`);

if (sig1 !== sig2) {
  console.log('\n⚠️ WARNING: Original and trimmed Hash Secret produce DIFFERENT signatures!');
  console.log('This means your .env file has hidden whitespace characters.');
  console.log('\n🔧 FIX: Update your .env file:');
  console.log(`VNPAY_HASH_SECRET=${trimmed}`);
}

// Character-by-character analysis
console.log('\n' + '='.repeat(80));
console.log('📝 Character-by-Character Analysis (first 32 chars):');
console.log('='.repeat(80));

for (let i = 0; i < Math.min(32, vnp_HashSecret?.length || 0); i++) {
  const char = vnp_HashSecret[i];
  const code = char.charCodeAt(0);
  const hex = code.toString(16).padStart(2, '0');
  const isAlphaNum = /[A-Za-z0-9]/.test(char);
  
  console.log(`[${i.toString().padStart(2, ' ')}] '${char}' (0x${hex}) ${isAlphaNum ? '✅' : '⚠️'}`);
}

console.log('\n' + '='.repeat(80));
console.log('💡 Next Steps:');
console.log('='.repeat(80));
console.log('1. If you see ⚠️ warnings, your Hash Secret has issues');
console.log('2. Copy Hash Secret from VNPay Portal again (without extra spaces)');
console.log('3. Update .env file and remove any whitespace');
console.log('4. Restart server and test again');
console.log('='.repeat(80));