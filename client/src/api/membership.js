import api from './axios'

export const membershipAPI = {
  // ==========================================
  // MEMBERSHIP TIERS
  // ==========================================
  
  /**
   * Get membership tiers
   */
  getTiers: () => {
    return api.get('/membership/tiers')
  },

  /**
   * Get my membership
   */
  getMyMembership: () => {
    return api.get('/membership/my-membership')
  },

  /**
   * Purchase membership
   */
  purchaseMembership: (data) => {
    return api.post('/membership/purchase', data)
  },

  /**
   * Upgrade membership
   */
  upgradeMembership: (data) => {
    return api.post('/membership/upgrade', data)
  },

  /**
   * Cancel membership
   */
  cancelMembership: (reason) => {
    return api.post('/membership/cancel', { reason })
  },

  /**
   * Renew membership
   */
  renewMembership: () => {
    return api.post('/membership/renew')
  },

  // ==========================================
  // MEMBERSHIP BENEFITS
  // ==========================================
  
  /**
   * Get membership benefits
   */
  getBenefits: (tier) => {
    return api.get(`/membership/benefits/${tier}`)
  },

  /**
   * Get exclusive coupons
   */
  getExclusiveCoupons: () => {
    return api.get('/membership/exclusive-coupons')
  },

  /**
   * Get early access events
   */
  getEarlyAccessEvents: () => {
    return api.get('/membership/early-access-events')
  },

  // ==========================================
  // MEMBERSHIP HISTORY
  // ==========================================
  
  /**
   * Get membership history
   */
  getMembershipHistory: () => {
    return api.get('/membership/history')
  },

  /**
   * Get membership transactions
   */
  getMembershipTransactions: () => {
    return api.get('/membership/transactions')
  }
}