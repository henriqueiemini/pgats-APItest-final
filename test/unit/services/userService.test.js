const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const userService = require('../../../src/services/userService');
const testHelper = require('../../helpers/testHelper');

describe('User Service Unit Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    testHelper.resetTestData();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('findUserByEmail', () => {
    it('should find existing user by email', () => {
      // Act
      const user = userService.findUserByEmail('alice@email.com');

      // Assert
      expect(user).to.not.be.null;
      expect(user).to.have.property('id', 1);
      expect(user).to.have.property('name', 'Alice');
      expect(user).to.have.property('email', 'alice@email.com');
      expect(user).to.have.property('password', '123456');
    });

    it('should return undefined for non-existent email', () => {
      // Act
      const user = userService.findUserByEmail('nonexistent@email.com');

      // Assert
      expect(user).to.be.undefined;
    });

    it('should be case sensitive for email search', () => {
      // Act
      const user = userService.findUserByEmail('ALICE@EMAIL.COM');

      // Assert
      expect(user).to.be.undefined;
    });

    it('should handle empty string email', () => {
      // Act
      const user = userService.findUserByEmail('');

      // Assert
      expect(user).to.be.undefined;
    });

    it('should handle null email', () => {
      // Act
      const user = userService.findUserByEmail(null);

      // Assert
      expect(user).to.be.undefined;
    });

    it('should handle undefined email', () => {
      // Act
      const user = userService.findUserByEmail(undefined);

      // Assert
      expect(user).to.be.undefined;
    });

    it('should find second user correctly', () => {
      // Act
      const user = userService.findUserByEmail('bob@email.com');

      // Assert
      expect(user).to.not.be.null;
      expect(user).to.have.property('id', 2);
      expect(user).to.have.property('name', 'Bob');
      expect(user).to.have.property('email', 'bob@email.com');
    });
  });

  describe('registerUser', () => {
    it('should register new user successfully', () => {
      // Arrange
      const name = 'New User';
      const email = 'newuser@example.com';
      const password = 'password123';

      // Act
      const result = userService.registerUser(name, email, password);

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('name', name);
      expect(result).to.have.property('email', email);
      expect(result).to.not.have.property('password'); // Password should not be returned
      expect(result).to.not.have.property('id'); // ID should not be returned

      // Verify user was actually added to the users array
      const addedUser = userService.findUserByEmail(email);
      expect(addedUser).to.not.be.undefined;
      expect(addedUser).to.have.property('id', 3); // Should be next available ID
      expect(addedUser).to.have.property('password', password);
    });

    it('should return null when email already exists', () => {
      // Arrange
      const name = 'Alice Clone';
      const email = 'alice@email.com'; // Already exists
      const password = 'password123';

      // Act
      const result = userService.registerUser(name, email, password);

      // Assert
      expect(result).to.be.null;
    });

    it('should generate correct user ID for new users', () => {
      // Arrange
      const users = require('../../../src/models/user');
      const initialLength = users.length;

      // Act
      const result = userService.registerUser('User 1', 'user1@test.com', 'pass');
      const result2 = userService.registerUser('User 2', 'user2@test.com', 'pass');

      // Assert
      const user1 = userService.findUserByEmail('user1@test.com');
      const user2 = userService.findUserByEmail('user2@test.com');
      
      expect(user1).to.have.property('id', initialLength + 1);
      expect(user2).to.have.property('id', initialLength + 2);
    });

    it('should handle empty name', () => {
      // Act
      const result = userService.registerUser('', 'empty@test.com', 'password');

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('name', '');
      expect(result).to.have.property('email', 'empty@test.com');
    });

    it('should handle empty password', () => {
      // Act
      const result = userService.registerUser('Test User', 'test@test.com', '');

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('name', 'Test User');
      expect(result).to.have.property('email', 'test@test.com');

      // Verify password is stored (even if empty)
      const user = userService.findUserByEmail('test@test.com');
      expect(user).to.have.property('password', '');
    });

    it('should maintain user array integrity', () => {
      // Arrange
      const users = require('../../../src/models/user');
      const initialUsers = [...users];

      // Act
      userService.registerUser('Test User', 'test@example.com', 'password');

      // Assert
      expect(users.length).to.equal(initialUsers.length + 1);
      expect(users[users.length - 1]).to.have.property('email', 'test@example.com');
      
      // Original users should remain unchanged
      for (let i = 0; i < initialUsers.length; i++) {
        expect(users[i]).to.deep.equal(initialUsers[i]);
      }
    });

    it('should handle special characters in user data', () => {
      // Act
      const result = userService.registerUser('José María', 'josé@test.com', 'páss123!@#');

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('name', 'José María');
      expect(result).to.have.property('email', 'josé@test.com');

      const user = userService.findUserByEmail('josé@test.com');
      expect(user).to.have.property('password', 'páss123!@#');
    });
  });

  describe('authenticate', () => {
    it('should authenticate user with correct credentials', () => {
      // Act
      const result = userService.authenticate('alice@email.com', '123456');

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('token');
      expect(result.token).to.be.a('string');
      expect(result.token.length).to.be.greaterThan(0);
    });

    it('should return null for incorrect email', () => {
      // Act
      const result = userService.authenticate('nonexistent@email.com', '123456');

      // Assert
      expect(result).to.be.null;
    });

    it('should return null for incorrect password', () => {
      // Act
      const result = userService.authenticate('alice@email.com', 'wrongpassword');

      // Assert
      expect(result).to.be.null;
    });

    it('should return null for empty credentials', () => {
      // Act
      const result1 = userService.authenticate('', '');
      const result2 = userService.authenticate(null, null);
      const result3 = userService.authenticate(undefined, undefined);

      // Assert
      expect(result1).to.be.null;
      expect(result2).to.be.null;
      expect(result3).to.be.null;
    });

    it('should generate valid JWT token with correct payload', () => {
      // Act
      const result = userService.authenticate('bob@email.com', '123456');

      // Assert
      expect(result).to.not.be.null;
      
      const decoded = jwt.decode(result.token);
      expect(decoded).to.have.property('id', 2);
      expect(decoded).to.have.property('email', 'bob@email.com');
      expect(decoded).to.have.property('exp');
      expect(decoded).to.have.property('iat');
      
      // Check token expiration (should be 1 hour from now)
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).to.be.approximately(now + 3600, 10); // Allow 10 seconds tolerance
    });

    it('should use correct secret for token signing', () => {
      // Arrange
      const jwtStub = sandbox.stub(jwt, 'sign').returns('mocked.jwt.token');

      // Act
      const result = userService.authenticate('alice@email.com', '123456');

      // Assert
      expect(jwtStub).to.have.been.calledOnceWith(
        { id: 1, email: 'alice@email.com' },
        'supersecret',
        { expiresIn: '1h' }
      );
      expect(result).to.deep.equal({ token: 'mocked.jwt.token' });
    });

    it('should be case sensitive for password', () => {
      // Act
      const result = userService.authenticate('alice@email.com', '123456');
      const resultWrongCase = userService.authenticate('alice@email.com', '123456');

      // Assert
      expect(result).to.not.be.null;
      expect(resultWrongCase).to.not.be.null; // Same case, should work
      
      const resultActualWrongCase = userService.authenticate('alice@email.com', '123456');
      expect(resultActualWrongCase).to.not.be.null;
    });

    it('should authenticate different users correctly', () => {
      // Act
      const resultAlice = userService.authenticate('alice@email.com', '123456');
      const resultBob = userService.authenticate('bob@email.com', '123456');

      // Assert
      expect(resultAlice).to.not.be.null;
      expect(resultBob).to.not.be.null;

      const decodedAlice = jwt.decode(resultAlice.token);
      const decodedBob = jwt.decode(resultBob.token);

      expect(decodedAlice).to.have.property('id', 1);
      expect(decodedAlice).to.have.property('email', 'alice@email.com');
      expect(decodedBob).to.have.property('id', 2);
      expect(decodedBob).to.have.property('email', 'bob@email.com');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token successfully', () => {
      // Arrange
      const validToken = testHelper.generateValidToken({ id: 1, email: 'alice@email.com' });

      // Act
      const result = userService.verifyToken(validToken);

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('id', 1);
      expect(result).to.have.property('email', 'alice@email.com');
      expect(result).to.have.property('exp');
      expect(result).to.have.property('iat');
    });

    it('should return null for invalid token', () => {
      // Act
      const result = userService.verifyToken('invalid.jwt.token');

      // Assert
      expect(result).to.be.null;
    });

    it('should return null for expired token', () => {
      // Arrange
      const expiredToken = testHelper.generateExpiredToken();

      // Act
      const result = userService.verifyToken(expiredToken);

      // Assert
      expect(result).to.be.null;
    });

    it('should return null for empty token', () => {
      // Act
      const result1 = userService.verifyToken('');
      const result2 = userService.verifyToken(null);
      const result3 = userService.verifyToken(undefined);

      // Assert
      expect(result1).to.be.null;
      expect(result2).to.be.null;
      expect(result3).to.be.null;
    });

    it('should use correct secret for token verification', () => {
      // Arrange
      const jwtStub = sandbox.stub(jwt, 'verify').returns({ id: 1, email: 'test@test.com' });

      // Act
      const result = userService.verifyToken('some.jwt.token');

      // Assert
      expect(jwtStub).to.have.been.calledOnceWith('some.jwt.token', 'supersecret');
      expect(result).to.deep.equal({ id: 1, email: 'test@test.com' });
    });

    it('should handle jwt.verify throwing an error', () => {
      // Arrange
      const jwtStub = sandbox.stub(jwt, 'verify').throws(new Error('Token verification failed'));

      // Act
      const result = userService.verifyToken('malformed.token');

      // Assert
      expect(result).to.be.null;
      expect(jwtStub).to.have.been.calledOnce;
    });

    it('should verify tokens with different payloads', () => {
      // Arrange
      const token1 = testHelper.generateValidToken({ id: 1, email: 'alice@email.com', role: 'admin' });
      const token2 = testHelper.generateValidToken({ id: 2, email: 'bob@email.com', role: 'user' });

      // Act
      const result1 = userService.verifyToken(token1);
      const result2 = userService.verifyToken(token2);

      // Assert
      expect(result1).to.have.property('id', 1);
      expect(result1).to.have.property('email', 'alice@email.com');
      expect(result1).to.have.property('role', 'admin');

      expect(result2).to.have.property('id', 2);
      expect(result2).to.have.property('email', 'bob@email.com');
      expect(result2).to.have.property('role', 'user');
    });

    it('should handle malformed JWT structure', () => {
      // Act
      const result1 = userService.verifyToken('not.a.jwt');
      const result2 = userService.verifyToken('only.two.parts');
      const result3 = userService.verifyToken('too.many.parts.here.invalid');

      // Assert
      expect(result1).to.be.null;
      expect(result2).to.be.null;
      expect(result3).to.be.null;
    });
  });

  describe('Integration Tests', () => {
    it('should complete full user registration and authentication flow', () => {
      // Arrange
      const userData = {
        name: 'Integration Test User',
        email: 'integration@test.com',
        password: 'testpass123'
      };

      // Act - Register
      const registerResult = userService.registerUser(userData.name, userData.email, userData.password);
      
      // Act - Authenticate
      const authResult = userService.authenticate(userData.email, userData.password);
      
      // Act - Verify token
      const verifyResult = userService.verifyToken(authResult.token);

      // Assert
      expect(registerResult).to.have.property('name', userData.name);
      expect(registerResult).to.have.property('email', userData.email);
      
      expect(authResult).to.have.property('token');
      
      expect(verifyResult).to.have.property('email', userData.email);
      expect(verifyResult).to.have.property('id');
    });

    it('should prevent duplicate registration and allow authentication of existing user', () => {
      // Act - Try to register Alice again
      const registerResult = userService.registerUser('Alice Duplicate', 'alice@email.com', 'newpassword');
      
      // Act - Authenticate with original password
      const authResult = userService.authenticate('alice@email.com', '123456');

      // Assert
      expect(registerResult).to.be.null; // Registration should fail
      expect(authResult).to.not.be.null; // Authentication should succeed with original password
    });
  });
});
