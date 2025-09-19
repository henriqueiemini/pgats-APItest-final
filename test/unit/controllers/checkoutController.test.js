const { expect } = require('chai');
const sinon = require('sinon');
const checkoutController = require('../../../rest/controllers/checkoutController');
const checkoutService = require('../../../src/services/checkoutService');
const userService = require('../../../src/services/userService');

describe('Checkout Controller Unit Tests', () => {
  let req, res, sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    req = {
      body: {},
      headers: {}
    };
    
    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub().returnsThis()
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('checkout', () => {
    it('should return 400 when checkout service throws an error', async () => {
      // Arrange
      req.headers.authorization = 'Bearer valid.jwt.token';
      req.body = {
        items: [{ productId: 999, quantity: 1 }], // Non-existent product
        freight: 10,
        paymentMethod: 'boleto'
      };

      const mockUserData = { id: 1, email: 'alice@email.com' };
      const verifyTokenStub = sandbox.stub(userService, 'verifyToken').returns(mockUserData);
      const checkoutStub = sandbox.stub(checkoutService, 'checkout').throws(new Error('Produto não encontrado'));

      // Act
      checkoutController.checkout(req, res);

      // Assert
      expect(verifyTokenStub).to.have.been.calledOnce;
      expect(checkoutStub).to.have.been.calledOnce;
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Produto não encontrado' });
    });

    it('should handle missing required fields in request body', async () => {
      // Arrange
      req.headers.authorization = 'Bearer valid.jwt.token';
      req.body = {
        items: [{ productId: 1, quantity: 1 }]
        // Missing freight and paymentMethod
      };

      const mockUserData = { id: 1, email: 'alice@email.com' };
      const verifyTokenStub = sandbox.stub(userService, 'verifyToken').returns(mockUserData);
      const checkoutStub = sandbox.stub(checkoutService, 'checkout').throws(new Error('Missing required fields'));

      // Act
      checkoutController.checkout(req, res);

      // Assert
      expect(verifyTokenStub).to.have.been.calledOnce;
      expect(checkoutStub).to.have.been.calledOnceWith(1, req.body.items, undefined, undefined, undefined);
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Missing required fields' });
    });

    it('should pass cardData when provided for credit card payment', async () => {
      // Arrange
      const cardData = {
        number: '4111111111111111',
        name: 'Test User',
        expiry: '12/30',
        cvv: '123'
      };

      req.headers.authorization = 'Bearer valid.jwt.token';
      req.body = {
        items: [{ productId: 1, quantity: 1 }],
        freight: 15,
        paymentMethod: 'credit_card',
        cardData: cardData
      };

      const mockUserData = { id: 1, email: 'alice@email.com' };
      const mockResult = { userId: 1, total: 109.25 };

      const verifyTokenStub = sandbox.stub(userService, 'verifyToken').returns(mockUserData);
      const checkoutStub = sandbox.stub(checkoutService, 'checkout').returns(mockResult);

      // Act
      checkoutController.checkout(req, res);

      // Assert
      expect(checkoutStub).to.have.been.calledOnceWith(1, req.body.items, 15, 'credit_card', cardData);
    });

    it('should handle different error types from checkout service', async () => {
      // Arrange
      req.headers.authorization = 'Bearer valid.jwt.token';
      req.body = {
        items: [{ productId: 1, quantity: 1 }],
        freight: 10,
        paymentMethod: 'credit_card'
        // Missing cardData
      };

      const mockUserData = { id: 1, email: 'alice@email.com' };
      const verifyTokenStub = sandbox.stub(userService, 'verifyToken').returns(mockUserData);
      const checkoutStub = sandbox.stub(checkoutService, 'checkout').throws(new Error('Dados do cartão obrigatórios para pagamento com cartão'));

      // Act
      checkoutController.checkout(req, res);

      // Assert
      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Dados do cartão obrigatórios para pagamento com cartão' });
    });

    it('should preserve user ID from token in checkout service call', async () => {
      // Arrange
      req.headers.authorization = 'Bearer valid.jwt.token';
      req.body = {
        items: [{ productId: 1, quantity: 1 }],
        freight: 10,
        paymentMethod: 'boleto'
      };

      const mockUserData = { id: 42, email: 'test@email.com', role: 'admin' };
      const mockResult = { userId: 42, total: 110 };

      const verifyTokenStub = sandbox.stub(userService, 'verifyToken').returns(mockUserData);
      const checkoutStub = sandbox.stub(checkoutService, 'checkout').returns(mockResult);

      // Act
      checkoutController.checkout(req, res);

      // Assert
      expect(checkoutStub).to.have.been.calledOnceWith(42, req.body.items, 10, 'boleto', undefined);
    });
  });

  describe('Error Handling', () => {
    it('should handle userService.verifyToken throwing an error', async () => {
      // Arrange
      req.headers.authorization = 'Bearer malformed.token';
      req.body = { items: [{ productId: 1, quantity: 1 }], freight: 10, paymentMethod: 'boleto' };

      const verifyTokenStub = sandbox.stub(userService, 'verifyToken').throws(new Error('Token parsing error'));

      // Act & Assert
      expect(() => checkoutController.checkout(req, res)).to.throw('Token parsing error');
      expect(verifyTokenStub).to.have.been.calledOnce;
    });

    it('should maintain consistent error response format', async () => {
      req.headers.authorization = 'Bearer valid.jwt.token';
      req.body = { items: [], freight: 10, paymentMethod: 'boleto' };

      const mockUserData = { id: 1, email: 'alice@email.com' };
      sandbox.stub(userService, 'verifyToken').returns(mockUserData);
      sandbox.stub(checkoutService, 'checkout').throws(new Error('Empty cart'));

      checkoutController.checkout(req, res);

      expect(res.status).to.have.been.calledWith(400);
      expect(res.json).to.have.been.calledWith({ error: 'Empty cart' });
    });
  });
});
