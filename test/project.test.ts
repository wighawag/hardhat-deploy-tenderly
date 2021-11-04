import {assert} from 'chai';
import {useEnvironment} from './helpers';

describe('Integration tests examples', function () {
  describe('Hardhat Runtime Environment extension', function () {
    useEnvironment('hardhat-project');
  });
});

describe('Unit tests examples', function () {
  describe('ExampleHardhatRuntimeEnvironmentField', function () {
    describe('sayHello', function () {
      it('Should say hello', function () {
        //
      });
    });
  });
});
