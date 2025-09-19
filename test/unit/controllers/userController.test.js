const { expect } = require('chai');
const sinon = require('sinon');
const userController = require('../../../rest/controllers/userController');
const userService = require('../../../src/services/userService');

describe('User Controller Unit Tests', () => {
  let req, res, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    req = {
      body: {}
    };
    
    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('register', () => {
    it('should register user successfully with valid data', async () => {
      // Arrange
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        name: 'Test User',
        email: 'test@example.com'
      };

      const registerUserStub = sandbox.stub(userService, 'registerUser').returns(mockUser);

      // Act
      userController.register(req, res);

      // Assert
      expect(registerUserStub).to.have.been.calledOnceWith('Test User', 'test@example.com', 'password123');
      expect(res.status).to.have.been.calledWith(201);
      expect(res.json).to.have.been.calledWith({ user: mockUser });
    });

    it('should return 400 when user registration fails (email already exists)', async () => {
      // Arrange
      req.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123'
      };

      const registerUserStub = sandbox.stub(userService, 'registerUser').returns(null);

      // Act
      userController.register(req, res);

      // Assert
      expect(registerUserStub).to.have.been.calledOnceWith('Test User', 'existing@example.com', 'password123');
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Email já cadastrado' });
    });

    it('should handle missing request body fields', async () => {
      // Arrange
      req.body = {
        name: 'Test User'
        // Missing email and password
      };

      const registerUserStub = sandbox.stub(userService, 'registerUser').returns(null);

      // Act
      userController.register(req, res);

      // Assert
      expect(registerUserStub).to.have.been.calledOnceWith('Test User', undefined, undefined);
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Email já cadastrado' });
    });

    it('should extract correct fields from request body', async () => {
      // Arrange
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepass',
        extraField: 'should be ignored'
      };

      const mockUser = { name: 'John Doe', email: 'john@example.com' };
      const registerUserStub = sandbox.stub(userService, 'registerUser').returns(mockUser);

      // Act
      userController.register(req, res);

      // Assert
      expect(registerUserStub).to.have.been.calledOnceWith('John Doe', 'john@example.com', 'securepass');
      expect(res.status).to.have.been.calledWith(201);
      expect(res.json).to.have.been.calledWith({ user: mockUser });
    });

    it('should handle userService throwing an error', async () => {
      // Arrange
      req.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const registerUserStub = sandbox.stub(userService, 'registerUser').throws(new Error('Database error'));

      // Act & Assert
      expect(() => userController.register(req, res)).to.throw('Database error');
      expect(registerUserStub).to.have.been.calledOnce;
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      req.body = {
        email: 'alice@email.com',
        password: '123456'
      };

      const mockResult = {
        token: 'valid.jwt.token'
      };

      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(mockResult);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith('alice@email.com', '123456');
      expect(res.json).to.have.been.calledWith(mockResult);
      expect(res.status).to.not.have.been.called; // Status 200 is default
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      req.body = {
        email: 'alice@email.com',
        password: 'wrongpassword'
      };

      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(null);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith('alice@email.com', 'wrongpassword');
      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ error: 'Credenciais inválidas' });
    });

    it('should handle missing email', async () => {
      // Arrange
      req.body = {
        password: '123456'
        // Missing email
      };

      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(null);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith(undefined, '123456');
      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ error: 'Credenciais inválidas' });
    });

    it('should handle missing password', async () => {
      // Arrange
      req.body = {
        email: 'alice@email.com'
        // Missing password
      };

      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(null);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith('alice@email.com', undefined);
      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ error: 'Credenciais inválidas' });
    });

    it('should handle empty request body', async () => {
      // Arrange
      req.body = {};

      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(null);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith(undefined, undefined);
      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ error: 'Credenciais inválidas' });
    });

    it('should ignore extra fields in request body', async () => {
      // Arrange
      req.body = {
        email: 'alice@email.com',
        password: '123456',
        extraField: 'ignored',
        anotherField: 'also ignored'
      };

      const mockResult = { token: 'valid.jwt.token' };
      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(mockResult);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith('alice@email.com', '123456');
      expect(res.json).to.have.been.calledWith(mockResult);
    });

    it('should handle userService throwing an error', async () => {
      // Arrange
      req.body = {
        email: 'alice@email.com',
        password: '123456'
      };

      const authenticateStub = sandbox.stub(userService, 'authenticate').throws(new Error('Service error'));

      // Act & Assert
      expect(() => userController.login(req, res)).to.throw('Service error');
      expect(authenticateStub).to.have.been.calledOnce;
    });

    it('should handle userService returning different token formats', async () => {
      // Arrange
      req.body = {
        email: 'alice@email.com',
        password: '123456'
      };

      const mockResult = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhbGljZUBlbWFpbC5jb20iLCJpYXQiOjE2MzQ1NjE2NjYsImV4cCI6MTYzNDU2NTI2Nn0.test'
      };

      const authenticateStub = sandbox.stub(userService, 'authenticate').returns(mockResult);

      // Act
      userController.login(req, res);

      // Assert
      expect(authenticateStub).to.have.been.calledOnceWith('alice@email.com', '123456');
      expect(res.json).to.have.been.calledWith(mockResult);
    });
  });

  describe('Controller Error Handling', () => {
    it('should maintain consistent error response format for register', async () => {
      req.body = { name: 'Test', email: 'existing@email.com', password: 'pass' };
      sandbox.stub(userService, 'registerUser').returns(null);

      userController.register(req, res);

      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Email já cadastrado' });
    });

    it('should maintain consistent error response format for login', async () => {
      req.body = { email: 'wrong@email.com', password: 'wrongpass' };
      sandbox.stub(userService, 'authenticate').returns(null);

      userController.login(req, res);

      expect(res.status).to.have.been.calledWith(401);
      expect(res.json).to.have.been.calledWith({ error: 'Credenciais inválidas' });
    });
  });
});
