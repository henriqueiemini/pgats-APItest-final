const request = require('supertest');
const { expect } = require('chai');
const app = require('../../../graphql/app');
const testHelper = require('../../helpers/testHelper');

describe('GraphQL API - User Operations', () => {
  beforeEach(() => {
    testHelper.resetTestData();
  });

  describe('register mutation', () => {
    it('should register a new user successfully', async () => {
      const mutation = `
        mutation Register($name: String!, $email: String!, $password: String!) {
          register(name: $name, email: $email, password: $password) {
            name
            email
          }
        }
      `;

      const variables = {
        name: 'New GraphQL User',
        email: 'graphql@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/graphql')
        .send({
          query: mutation,
          variables: variables
        })
        .expect(200);

      expect(response.body).to.not.have.property('errors');
      expect(response.body).to.have.property('data');
      expect(response.body.data.register).to.have.property('name', variables.name);
      expect(response.body.data.register).to.have.property('email', variables.email);
      expect(response.body.data.register).to.not.have.property('password');
    });

    it('should return error when email already exists', async () => {
      const mutation = `
        mutation Register($name: String!, $email: String!, $password: String!) {
          register(name: $name, email: $email, password: $password) {
            name
            email
          }
        }
      `;

      const variables = {
        name: 'Alice Clone',
        email: 'alice@email.com', // Already exists
        password: 'password123'
      };

      const response = await request(app)
        .post('/graphql')
        .send({
          query: mutation,
          variables: variables
        })
        .expect(200);

      expect(response.body).to.have.property('errors');
      expect(response.body.errors).to.be.an('array');
      expect(response.body.errors[0]).to.have.property('message');
    });

  });

  describe('login mutation', () => {
    it('should login with valid credentials', async () => {
      const mutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }
      `;

      const variables = {
        email: 'alice@email.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/graphql')
        .send({
          query: mutation,
          variables: variables
        })
        .expect(200);

      expect(response.body).to.not.have.property('errors');
      expect(response.body).to.have.property('data');
      expect(response.body.data.login).to.have.property('token');
      expect(response.body.data.login.token).to.be.a('string');
      expect(response.body.data.login.token.length).to.be.greaterThan(0);
    });

    it('should return error for invalid credentials', async () => {
      const mutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }
      `;

      const variables = {
        email: 'alice@email.com',
        password: 'wrongpassword'
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

    it('should return error for non-existent user', async () => {
      const mutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }
      `;

      const variables = {
        email: 'nonexistent@email.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/graphql')
        .send({
          query: mutation,
          variables: variables
        })
        .expect(200);

      expect(response.body).to.have.property('errors');
    });

    it('should return a valid JWT token', async () => {
      const mutation = `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
          }
        }
      `;

      const variables = {
        email: 'bob@email.com',
        password: '123456'
      };

      const response = await request(app)
        .post('/graphql')
        .send({
          query: mutation,
          variables: variables
        })
        .expect(200);

      const jwt = require('jsonwebtoken');
      const token = response.body.data.login.token;
      const decoded = jwt.decode(token);
      
      expect(decoded).to.have.property('id', 2);
      expect(decoded).to.have.property('email', 'bob@email.com');
      expect(decoded).to.have.property('exp');
      expect(decoded).to.have.property('iat');
    });
  });

  describe('users query', () => {
    it('should return all users', async () => {
      const query = `
        query Users {
          users {
            name
            email
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body).to.not.have.property('errors');
      expect(response.body).to.have.property('data');
      expect(response.body.data.users).to.be.an('array');
      expect(response.body.data.users).to.have.length.greaterThan(0);
      
      const firstUser = response.body.data.users[0];
      expect(firstUser).to.have.property('name');
      expect(firstUser).to.have.property('email');
      expect(firstUser).to.not.have.property('password');
    });

    it('should return users in correct format', async () => {
      const query = `
        query Users {
          users {
            name
            email
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      const users = response.body.data.users;
      expect(users).to.include.deep.members([
        { name: 'Alice', email: 'alice@email.com' },
        { name: 'Bob', email: 'bob@email.com' }
      ]);
    });

    it('should handle empty user list gracefully', async () => {
      // Clear all users
      const users = require('../../../src/models/user');
      users.splice(0, users.length);

      const query = `
        query Users {
          users {
            name
            email
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query })
        .expect(200);

      expect(response.body).to.not.have.property('errors');
      expect(response.body.data.users).to.be.an('array');
      expect(response.body.data.users).to.have.length(0);
    });
  });

  describe('GraphQL Schema Validation', () => {
    it('should reject invalid query syntax', async () => {
      const invalidQuery = `
        query {
          users {
            invalidField
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body).to.have.property('errors');
    });

    it('should validate required mutation arguments', async () => {
      const mutation = `
        mutation {
          register(name: "Test") {
            name
            email
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation })
        .expect(400);

      expect(response.body).to.have.property('errors');
    });
  });
});
