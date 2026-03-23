const ROLES = {
  ADMIN: 'admin',
  DISTRIBUTOR: 'distributor',
  RETAILER: 'retailer',
};

const SERVICE_TYPES = {
  MOBILE: 'mobile',
  FASTAG: 'fastag',
  DTH: 'dth',
};

const TXN_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BLOCKED: 'blocked',
};

module.exports = { ROLES, SERVICE_TYPES, TXN_STATUS, USER_STATUS };
