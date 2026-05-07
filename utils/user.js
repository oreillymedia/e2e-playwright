const DEFAULT_PASSWORD = 'Testing_12345';

/**
 * Returns a user object that can be used for creating new users
 * @param {string} type - a usertype to add to the username for reference
 * @param {string} prefix - a prefix that gets added to the username for tracking/reference
 * @returns {object} user
 */
function createNewUserInfo({ type = 'b2b', prefix = 'qa', domain = 'oreillynet.com' } = {}) {
  const time = Date.now();
  return {
    email: `${prefix}+${type}-${time}@${domain}`,
    password: DEFAULT_PASSWORD,
    firstName: `Test ${type}`,
    lastName: `Test ${type}`,
    country: 'USA',
  };
}

module.exports = { createNewUserInfo };
