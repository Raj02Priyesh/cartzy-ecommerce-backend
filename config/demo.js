// Public demo shopper account created by scripts/seed-demo.js.
// Its password is published so anyone can try the apps, so the API blocks changing it.
const DEMO_USER_EMAIL = (process.env.DEMO_USER_EMAIL || 'demo@cartzy.app').toLowerCase();

const isDemoUser = (email) => typeof email === 'string' && email.toLowerCase() === DEMO_USER_EMAIL;

module.exports = { DEMO_USER_EMAIL, isDemoUser };
