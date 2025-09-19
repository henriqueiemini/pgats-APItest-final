const { expect } = require('chai');
const sinon = require('sinon');
const checkoutService = require('../../../src/services/checkoutService');
const testHelper = require('../../helpers/testHelper');

describe('Checkout Service Unit Tests', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    testHelper.resetTestData();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('calculateTotal', () => {
    it('should calculate total for single item with boleto payment', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 2 }]; // 2 * 100 = 200
      const freight = 20;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(220); // 200 + 20 = 220
    });

    it('should calculate total for multiple items with boleto payment', () => {
      // Arrange
      const items = [
        { productId: 1, quantity: 2 }, // 2 * 100 = 200
        { productId: 2, quantity: 1 }  // 1 * 200 = 200
      ];
      const freight = 30;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(430); // 200 + 200 + 30 = 430
    });

    it('should apply 5% discount for credit card payment', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 1 }]; // 1 * 100 = 100
      const freight = 20;
      const paymentMethod = 'credit_card';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(114); // (100 + 20) * 0.95 = 114
    });

    it('should apply 5% discount correctly for large amounts', () => {
      // Arrange
      const items = [
        { productId: 1, quantity: 5 }, // 5 * 100 = 500
        { productId: 2, quantity: 3 }  // 3 * 200 = 600
      ];
      const freight = 50;
      const paymentMethod = 'credit_card';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(1092.5); // (500 + 600 + 50) * 0.95 = 1092.5
    });

    it('should round result to 2 decimal places', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 1 }]; // 1 * 100 = 100
      const freight = 33.33;
      const paymentMethod = 'credit_card';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(126.66); // (100 + 33.33) * 0.95 = 126.6635, rounded to 126.66
    });

    it('should handle zero quantity items', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 0 }]; // 0 * 100 = 0
      const freight = 15;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(15); // 0 + 15 = 15
    });

    it('should handle negative freight', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 1 }]; // 1 * 100 = 100
      const freight = -10;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(90); // 100 + (-10) = 90
    });

    it('should handle zero freight', () => {
      // Arrange
      const items = [{ productId: 2, quantity: 1 }]; // 1 * 200 = 200
      const freight = 0;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(200); // 200 + 0 = 200
    });

    it('should throw error for non-existent product', () => {
      // Arrange
      const items = [{ productId: 999, quantity: 1 }]; // Non-existent product
      const freight = 10;
      const paymentMethod = 'boleto';

      // Act & Assert
      expect(() => {
        checkoutService.calculateTotal(items, freight, paymentMethod);
      }).to.throw('Produto não encontrado');
    });

    it('should throw error when any product in list does not exist', () => {
      // Arrange
      const items = [
        { productId: 1, quantity: 1 }, // Valid product
        { productId: 999, quantity: 1 } // Invalid product
      ];
      const freight = 10;
      const paymentMethod = 'boleto';

      // Act & Assert
      expect(() => {
        checkoutService.calculateTotal(items, freight, paymentMethod);
      }).to.throw('Produto não encontrado');
    });

    it('should handle empty items array', () => {
      // Arrange
      const items = [];
      const freight = 25;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(25); // 0 + 25 = 25
    });

    it('should handle large quantities', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 100 }]; // 100 * 100 = 10000
      const freight = 50;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(10050); // 10000 + 50 = 10050
    });

    it('should not apply discount for payment methods other than credit_card', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 1 }]; // 1 * 100 = 100
      const freight = 20;

      // Act
      const totalBoleto = checkoutService.calculateTotal(items, freight, 'boleto');
      const totalPix = checkoutService.calculateTotal(items, freight, 'pix');
      const totalOther = checkoutService.calculateTotal(items, freight, 'other_method');

      // Assert
      expect(totalBoleto).to.equal(120); // No discount
      expect(totalPix).to.equal(120); // No discount
      expect(totalOther).to.equal(120); // No discount
    });

    it('should be case sensitive for payment method', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 1 }]; // 1 * 100 = 100
      const freight = 20;

      // Act
      const totalLowerCase = checkoutService.calculateTotal(items, freight, 'credit_card');
      const totalUpperCase = checkoutService.calculateTotal(items, freight, 'CREDIT_CARD');
      const totalMixedCase = checkoutService.calculateTotal(items, freight, 'Credit_Card');

      // Assert
      expect(totalLowerCase).to.equal(114); // With discount
      expect(totalUpperCase).to.equal(120); // No discount (case sensitive)
      expect(totalMixedCase).to.equal(120); // No discount (case sensitive)
    });

    it('should handle decimal prices correctly', () => {
      // Note: Current products have integer prices, but testing the logic
      const products = require('../../../src/models/product');
      const originalProduct = { ...products[0] };
      
      // Temporarily modify product price for testing
      products[0].price = 99.99;

      try {
        // Arrange
        const items = [{ productId: 1, quantity: 1 }];
        const freight = 10.50;
        const paymentMethod = 'credit_card';

        // Act
        const total = checkoutService.calculateTotal(items, freight, paymentMethod);

        // Assert
        expect(total).to.equal(104.97); // (99.99 + 10.50) * 0.95 = 104.9655, rounded to 104.97
      } finally {
        // Restore original product price
        products[0] = originalProduct;
      }
    });
  });

  describe('checkout', () => {
    it('should process boleto checkout successfully', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 1, quantity: 2 }];
      const freight = 20;
      const paymentMethod = 'boleto';
      const cardData = undefined;

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod, cardData);

      // Assert
      expect(result).to.have.property('userId', userId);
      expect(result).to.have.property('items').that.deep.equals(items);
      expect(result).to.have.property('freight', freight);
      expect(result).to.have.property('paymentMethod', paymentMethod);
      expect(result).to.have.property('total', 220); // 2 * 100 + 20 = 220
    });

    it('should process credit card checkout successfully', () => {
      // Arrange
      const userId = 2;
      const items = [{ productId: 2, quantity: 1 }];
      const freight = 15;
      const paymentMethod = 'credit_card';
      const cardData = {
        number: '4111111111111111',
        name: 'Test User',
        expiry: '12/30',
        cvv: '123'
      };

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod, cardData);

      // Assert
      expect(result).to.have.property('userId', userId);
      expect(result).to.have.property('items').that.deep.equals(items);
      expect(result).to.have.property('freight', freight);
      expect(result).to.have.property('paymentMethod', paymentMethod);
      expect(result).to.have.property('total', 204.25); // (200 + 15) * 0.95 = 204.25
    });

    it('should throw error when credit card payment has no card data', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;
      const paymentMethod = 'credit_card';
      const cardData = undefined;

      // Act & Assert
      expect(() => {
        checkoutService.checkout(userId, items, freight, paymentMethod, cardData);
      }).to.throw('Dados do cartão obrigatórios para pagamento com cartão');
    });

    it('should throw error when credit card payment has null card data', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;
      const paymentMethod = 'credit_card';
      const cardData = null;

      // Act & Assert
      expect(() => {
        checkoutService.checkout(userId, items, freight, paymentMethod, cardData);
      }).to.throw('Dados do cartão obrigatórios para pagamento com cartão');
    });

    it('should accept empty card data for boleto payment', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;
      const paymentMethod = 'boleto';
      const cardData = null;

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod, cardData);

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('total', 110);
    });

    it('should handle complex checkout scenario', () => {
      // Arrange
      const userId = 42;
      const items = [
        { productId: 1, quantity: 3 }, // 3 * 100 = 300
        { productId: 2, quantity: 2 }  // 2 * 200 = 400
      ];
      const freight = 50;
      const paymentMethod = 'credit_card';
      const cardData = {
        number: '5555555555554444',
        name: 'John Doe',
        expiry: '06/25',
        cvv: '456'
      };

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod, cardData);

      // Assert
      expect(result).to.have.property('userId', 42);
      expect(result).to.have.property('items').that.deep.equals(items);
      expect(result).to.have.property('freight', 50);
      expect(result).to.have.property('paymentMethod', 'credit_card');
      expect(result).to.have.property('total', 712.5); // (300 + 400 + 50) * 0.95 = 712.5
    });

    it('should propagate calculateTotal errors', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 999, quantity: 1 }]; // Non-existent product
      const freight = 10;
      const paymentMethod = 'boleto';

      // Act & Assert
      expect(() => {
        checkoutService.checkout(userId, items, freight, paymentMethod);
      }).to.throw('Produto não encontrado');
    });

    it('should handle zero userId', () => {
      // Arrange
      const userId = 0;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;
      const paymentMethod = 'boleto';

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod);

      // Assert
      expect(result).to.have.property('userId', 0);
      expect(result).to.have.property('total', 110);
    });

    it('should handle negative userId', () => {
      // Arrange
      const userId = -1;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;
      const paymentMethod = 'boleto';

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod);

      // Assert
      expect(result).to.have.property('userId', -1);
      expect(result).to.have.property('total', 110);
    });

    it('should preserve all input data in result', () => {
      // Arrange
      const userId = 123;
      const items = [
        { productId: 1, quantity: 1, extraField: 'should be preserved' },
        { productId: 2, quantity: 2 }
      ];
      const freight = 25;
      const paymentMethod = 'boleto';

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod);

      // Assert
      expect(result.items).to.deep.equal(items); // Should preserve extra fields
      expect(result.items[0]).to.have.property('extraField', 'should be preserved');
    });

    it('should handle empty items array in checkout', () => {
      // Arrange
      const userId = 1;
      const items = [];
      const freight = 20;
      const paymentMethod = 'boleto';

      // Act
      const result = checkoutService.checkout(userId, items, freight, paymentMethod);

      // Assert
      expect(result).to.have.property('userId', 1);
      expect(result).to.have.property('items').that.is.an('array').with.length(0);
      expect(result).to.have.property('total', 20); // Only freight
    });

    it('should handle different payment method cases', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;

      // Act
      const resultBoleto = checkoutService.checkout(userId, items, freight, 'boleto');
      const resultPix = checkoutService.checkout(userId, items, freight, 'pix');
      const resultDebit = checkoutService.checkout(userId, items, freight, 'debit_card');

      // Assert
      expect(resultBoleto).to.have.property('total', 110); // No discount
      expect(resultPix).to.have.property('total', 110); // No discount
      expect(resultDebit).to.have.property('total', 110); // No discount
    });

    it('should validate card data structure for credit card payments', () => {
      // Arrange
      const userId = 1;
      const items = [{ productId: 1, quantity: 1 }];
      const freight = 10;
      const paymentMethod = 'credit_card';

      // Test with empty object
      const emptyCardData = {};
      
      // Act - Current implementation doesn't validate card data structure
      // This test documents the current behavior
      const result = checkoutService.checkout(userId, items, freight, paymentMethod, emptyCardData);

      // Assert
      expect(result).to.not.be.null;
      expect(result).to.have.property('total', 104.5); // (100 + 10) * 0.95 = 104.5
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete checkout flow for boleto', () => {
      // Arrange
      const checkoutData = {
        userId: 1,
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 1 }
        ],
        freight: 30,
        paymentMethod: 'boleto'
      };

      // Act
      const total = checkoutService.calculateTotal(checkoutData.items, checkoutData.freight, checkoutData.paymentMethod);
      const result = checkoutService.checkout(
        checkoutData.userId,
        checkoutData.items,
        checkoutData.freight,
        checkoutData.paymentMethod
      );

      // Assert
      expect(total).to.equal(430); // 200 + 200 + 30 = 430
      expect(result.total).to.equal(total);
      expect(result).to.have.property('userId', checkoutData.userId);
      expect(result).to.have.property('paymentMethod', checkoutData.paymentMethod);
    });

    it('should handle complete checkout flow for credit card', () => {
      // Arrange
      const checkoutData = {
        userId: 2,
        items: [{ productId: 2, quantity: 2 }], // 2 * 200 = 400
        freight: 25,
        paymentMethod: 'credit_card',
        cardData: {
          number: '4111111111111111',
          name: 'Integration Test',
          expiry: '12/25',
          cvv: '789'
        }
      };

      // Act
      const total = checkoutService.calculateTotal(checkoutData.items, checkoutData.freight, checkoutData.paymentMethod);
      const result = checkoutService.checkout(
        checkoutData.userId,
        checkoutData.items,
        checkoutData.freight,
        checkoutData.paymentMethod,
        checkoutData.cardData
      );

      // Assert
      expect(total).to.equal(403.75); // (400 + 25) * 0.95 = 403.75
      expect(result.total).to.equal(total);
      expect(result).to.have.property('userId', checkoutData.userId);
      expect(result).to.have.property('paymentMethod', checkoutData.paymentMethod);
    });

    it('should maintain consistency between calculateTotal and checkout', () => {
      // Arrange
      const testCases = [
        {
          items: [{ productId: 1, quantity: 1 }],
          freight: 10,
          paymentMethod: 'boleto'
        },
        {
          items: [{ productId: 1, quantity: 1 }],
          freight: 10,
          paymentMethod: 'credit_card'
        },
        {
          items: [
            { productId: 1, quantity: 2 },
            { productId: 2, quantity: 1 }
          ],
          freight: 20,
          paymentMethod: 'boleto'
        }
      ];

      testCases.forEach((testCase, index) => {
        // Act
        const calculatedTotal = checkoutService.calculateTotal(testCase.items, testCase.freight, testCase.paymentMethod);
        const cardData = testCase.paymentMethod === 'credit_card' ? { number: '4111111111111111', name: 'Test', expiry: '12/30', cvv: '123' } : undefined;
        const checkoutResult = checkoutService.checkout(1, testCase.items, testCase.freight, testCase.paymentMethod, cardData);

        // Assert
        expect(checkoutResult.total).to.equal(calculatedTotal, `Test case ${index} failed: checkout total should match calculateTotal result`);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very large numbers', () => {
      // Arrange
      const items = [{ productId: 1, quantity: 1000000 }]; // 1M * 100 = 100M
      const freight = 1000000;
      const paymentMethod = 'boleto';

      // Act
      const total = checkoutService.calculateTotal(items, freight, paymentMethod);

      // Assert
      expect(total).to.equal(101000000); // 100M + 1M = 101M
    });

  });
});
