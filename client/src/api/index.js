// client/src/api/index.js
export { authAPI } from './auth'
export { eventsAPI } from './events'
export { ordersAPI } from './orders'
export { usersAPI } from './users'
export { adminAPI } from './admin'
export { membershipAPI } from './membership'
export { sessionsAPI } from './sessions'
export { checkinAPI } from './checkin'
export { queueAPI } from './queue'
export { notificationsAPI } from './notifications'
export { refundAPI } from './refund'
export { couponAPI } from './coupon'  

// Default export for convenience
export default {
  auth: require('./auth').authAPI,
  events: require('./events').eventsAPI,
  orders: require('./orders').ordersAPI,
  users: require('./users').usersAPI,
  admin: require('./admin').adminAPI,
  membership: require('./membership').membershipAPI,
  sessions: require('./sessions').sessionsAPI,
  checkin: require('./checkin').checkinAPI,
  queue: require('./queue').queueAPI,
  notifications: require('./notifications').notificationsAPI,
  refund: require('./refund').refundAPI,
  coupon: require('./coupon').couponAPI
}