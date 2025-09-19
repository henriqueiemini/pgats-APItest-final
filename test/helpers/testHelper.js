const jwt = require('jsonwebtoken');

const SECRET = 'supersecret';

// Test helper functions
const testHelper = {
  // Generate valid JWT token for testing
  generateValidToken(userData = { id: 1, email: 'alice@email.com' }) {
    return jwt.sign(userData, SECRET, { expiresIn: '1h' });
  },

  // Generate expired JWT token for testing
  generateExpiredToken(userData = { id: 1, email: 'alice@email.com' }) {
    return jwt.sign(userData, SECRET, { expiresIn: '-1h' });
  },

  // Generate invalid JWT token
  generateInvalidToken() {
    return 'invalid.jwt.token';
  },

  // Reset user and product data to initial state
  resetTestData() {
    const users = require('../../src/models/user');
    const products = require('../../src/models/product');
    
    // Reset users to initial state
    users.splice(0, users.length);
    users.push(
      { id: 1, name: 'Alice', email: 'alice@email.com', password: '123456' },
      { id: 2, name: 'Bob', email: 'bob@email.com', password: '123456' }
    );

    // Products are read-only, no need to reset
  },

  // Sample test data
  sampleUser: {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpass123'
  },

  sampleCheckoutData: {
    items: [
      { productId: 1, quantity: 2 },
      { productId: 2, quantity: 1 }
    ],
    freight: 20,
    paymentMethod: 'boleto'
  },

  sampleCheckoutWithCard: {
    items: [{ productId: 1, quantity: 1 }],
    freight: 15,
    paymentMethod: 'credit_card',
    cardData: {
      number: '4111111111111111',
      name: 'Test User',
      expiry: '12/30',
      cvv: '123'
    }
  }
};

module.exports = testHelper;
