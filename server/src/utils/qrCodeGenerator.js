const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const QR_SECRET = process.env.QR_CODE_SECRET || 'EternityTicket@464';

function generateSecureQRData(ticketData) {
  const {
    ticket_code,
    event_id,
    session_id,
    order_id,
    user_id
  } = ticketData;

  const payload = {
    tc: ticket_code,    
    eid: event_id,      
    sid: session_id,     
    oid: order_id,       
    uid: user_id,        
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) 
  };

  const token = jwt.sign(payload, QR_SECRET, { algorithm: 'HS256' });
  
  return token;
}

function verifySecureQRData(qrToken) {
  try {
    const decoded = jwt.verify(qrToken, QR_SECRET);
    
    return {
      ticket_code: decoded.tc,
      event_id: decoded.eid,
      session_id: decoded.sid,
      order_id: decoded.oid,
      user_id: decoded.uid,
      issued_at: new Date(decoded.iat * 1000),
      expires_at: new Date(decoded.exp * 1000)
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('QR code has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid QR code');
    }
    throw error;
  }
}

module.exports = {
  generateSecureQRData,
  verifySecureQRData
};