/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { fromStub, stubInterface } from '@salesforce/ts-sinon';
import { Dictionary } from '@salesforce/ts-types';
import { Logger } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { SourceCommand } from '../../../src/sourceCommand';

describe('SourceCommand', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  class SourceCommandTest extends SourceCommand {
    protected logger = fromStub(
      stubInterface<Logger>(sandbox, {
        debug: () => {},
        isDebugEnabled: () => false,
      })
    );
    public async run() {}
    public callSetExitCode(exitCode: number) {
      this.setExitCode(exitCode);
    }
    public setCmdFlags(flags: Dictionary) {
      this.flags = flags;
    }
    public callIsJsonOutput() {
      return this.isJsonOutput();
    }
    public callCalculatePollingFrequency() {
      return this.calculatePollingFrequency();
    }

    public setCompSet(compSet: ComponentSet) {
      this.componentSet = compSet;
    }
    public resolveSuccess() {}
    public formatResult() {}
  }

  describe('isJsonOutput', () => {
    it('should return true when json flag is set', () => {
      const command = new SourceCommandTest([''], null);
      command.setCmdFlags({ json: true });
      expect(command.callIsJsonOutput()).to.equal(true);
    });

    it('should return false when json flag is unset', () => {
      const command = new SourceCommandTest([''], null);
      expect(command.callIsJsonOutput()).to.equal(false);
    });
  });

  describe('calculatePollingFrequency', () => {
    it('returns 100 for componentSet size of 1', () => {
      const command = new SourceCommandTest([''], null);
      const compSet = new ComponentSet();

      sandbox.stub(compSet, 'getSourceComponents').returns({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        toArray: () => {
          return { length: 1 };
        },
      });
      command.setCompSet(compSet);
      expect(command.callCalculatePollingFrequency()).to.equal(100);
    });

    it('returns 1000 for componentSet size of 0', () => {
      const command = new SourceCommandTest([''], null);
      const compSet = new ComponentSet();

      sandbox.stub(compSet, 'getSourceComponents').returns({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        toArray: () => {
          return { length: 0 };
        },
      });
      command.setCompSet(compSet);
      expect(command.callCalculatePollingFrequency()).to.equal(1000);
    });

    it('returns 2500 for componentSet size of 2500', () => {
      const command = new SourceCommandTest([''], null);
      const compSet = new ComponentSet();

      sandbox.stub(compSet, 'getSourceComponents').returns({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        toArray: () => {
          return { length: 2500 };
        },
      });
      command.setCompSet(compSet);
      expect(command.callCalculatePollingFrequency()).to.equal(2500);
    });

    it('returns 250 for componentSet size of 50', () => {
      const command = new SourceCommandTest([''], null);
      const compSet = new ComponentSet();

      sandbox.stub(compSet, 'getSourceComponents').returns({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        toArray: () => {
          return { length: 50 };
        },
      });
      command.setCompSet(compSet);
      expect(command.callCalculatePollingFrequency()).to.equal(250);
    });
  });

  describe('setExitCode', () => {
    const exitCode = process.exitCode;
    it('should set process.exitCode', () => {
      const testCode = 100;
      const command = new SourceCommandTest([''], null);
      command.callSetExitCode(testCode);
      expect(process.exitCode).to.equal(testCode);
    });

    after(() => {
      process.exitCode = exitCode;
    });
  });
});
