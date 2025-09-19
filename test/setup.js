// Global test setup
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

// Configure Chai
chai.use(sinonChai);
global.expect = chai.expect;
global.sinon = sinon;

// Suppress console.log during tests unless NODE_ENV is set to 'test-verbose'
if (process.env.NODE_ENV !== 'test-verbose') {
  const originalLog = console.log;
  console.log = () => {};
  
  // Restore console.log after tests if needed
  process.on('exit', () => {
    console.log = originalLog;
  });
}

// Set test environment
process.env.NODE_ENV = 'test';
