const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../graphql/app');
const testHelper = require('../../helpers/testHelper');

describe('GraphQL API - Checkout Operations', () => {
  let validToken;

  beforeEach(() => {
    testHelper.resetTestData();
    validToken = testHelper.generateValidToken({ id: 1, email: 'alice@email.com' });
  });

  describe('checkout mutation', () => {
    describe('Authentication', () => {
      it('should require authentication token', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              userId
              valorFinal
              paymentMethod
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }],
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
        expect(response.body.errors[0]).to.have.property('message');
      });

      it('should reject invalid token', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              userId
              valorFinal
              paymentMethod
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }],
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', 'Bearer invalid.token')
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
      });

      it('should accept valid token', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              userId
              valorFinal
              paymentMethod
              freight
              items {
                productId
                quantity
              }
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }],
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.not.have.property('errors');
        expect(response.body).to.have.property('data');
        expect(response.body.data.checkout).to.have.property('userId', '1');
      });
    });

    describe('Boleto Payment', () => {
      it('should process boleto payment successfully', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              userId
              valorFinal
              paymentMethod
              freight
              items {
                productId
                quantity
              }
            }
          }
        `;

        const variables = {
          items: [
            { productId: 1, quantity: 2 }, // 2 * 100 = 200
            { productId: 2, quantity: 1 }  // 1 * 200 = 200
          ],
          freight: 20,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.not.have.property('errors');
        const checkout = response.body.data.checkout;
        
        expect(checkout).to.have.property('userId', '1');
        expect(checkout).to.have.property('valorFinal', 420); // 200 + 200 + 20 = 420
        expect(checkout).to.have.property('paymentMethod', 'boleto');
        expect(checkout).to.have.property('freight', 20);
        expect(checkout.items).to.deep.equal(variables.items);
      });

      it('should calculate total correctly for single item', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [{ productId: 2, quantity: 1 }], // 1 * 200 = 200
          freight: 15,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body.data.checkout).to.have.property('valorFinal', 215); // 200 + 15 = 215
      });
    });

    describe('Credit Card Payment', () => {
      it('should process credit card payment with 5% discount', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!, $cardData: CardDataInput) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod, cardData: $cardData) {
              userId
              valorFinal
              paymentMethod
              freight
              items {
                productId
                quantity
              }
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }], // 1 * 100 = 100
          freight: 20,
          paymentMethod: 'credit_card',
          cardData: {
            number: '4111111111111111',
            name: 'Test User',
            expiry: '12/30',
            cvv: '123'
          }
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.not.have.property('errors');
        const checkout = response.body.data.checkout;
        
        expect(checkout).to.have.property('paymentMethod', 'credit_card');
        expect(checkout).to.have.property('valorFinal', 114); // (100 + 20) * 0.95 = 114
      });

      it('should require card data for credit card payment', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }],
          freight: 15,
          paymentMethod: 'credit_card'
          // Missing cardData
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
        expect(response.body.errors[0].message).to.include('cartão');
      });

      it('should calculate complex credit card scenario correctly', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!, $cardData: CardDataInput) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod, cardData: $cardData) {
              valorFinal
              paymentMethod
            }
          }
        `;

        const variables = {
          items: [
            { productId: 1, quantity: 2 }, // 2 * 100 = 200
            { productId: 2, quantity: 1 }  // 1 * 200 = 200
          ],
          freight: 50,
          paymentMethod: 'credit_card',
          cardData: {
            number: '4111111111111111',
            name: 'Test User',
            expiry: '12/30',
            cvv: '123'
          }
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.not.have.property('errors');
        // (200 + 200 + 50) * 0.95 = 427.5
        expect(response.body.data.checkout).to.have.property('valorFinal', 427.5);
      });
    });

    describe('Product Validation', () => {
      it('should return error for non-existent product', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [{ productId: 999, quantity: 1 }], // Non-existent product
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
        expect(response.body.errors[0].message).to.include('Produto não encontrado');
      });

      it('should validate all products in the list', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [
            { productId: 1, quantity: 1 }, // Valid
            { productId: 999, quantity: 1 } // Invalid
          ],
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.have.property('errors');
      });
    });

    describe('GraphQL Input Validation', () => {
      it('should validate required fields', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!) {
            checkout(items: $items) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }]
          // Missing required freight and paymentMethod
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(400);

        expect(response.body).to.have.property('errors');
      });

      it('should validate item input structure', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [{ productId: 'invalid', quantity: 1 }], // Invalid productId type
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(400);

        expect(response.body).to.have.property('errors');
      });

      it('should handle zero and negative quantities', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              valorFinal
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 0 }],
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        expect(response.body).to.not.have.property('errors');
        expect(response.body.data.checkout).to.have.property('valorFinal', 10); // Only freight
      });
    });

    describe('Response Structure', () => {
      it('should return all expected fields', async () => {
        const mutation = `
          mutation Checkout($items: [CheckoutItemInput!]!, $freight: Float!, $paymentMethod: String!) {
            checkout(items: $items, freight: $freight, paymentMethod: $paymentMethod) {
              userId
              valorFinal
              paymentMethod
              freight
              items {
                productId
                quantity
              }
            }
          }
        `;

        const variables = {
          items: [{ productId: 1, quantity: 1 }],
          freight: 10,
          paymentMethod: 'boleto'
        };

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            query: mutation,
            variables: variables
          })
          .expect(200);

        const checkout = response.body.data.checkout;
        expect(checkout).to.have.all.keys('userId', 'valorFinal', 'paymentMethod', 'freight', 'items');
        expect(checkout.items[0]).to.have.all.keys('productId', 'quantity');
      });
    });
  });
});
