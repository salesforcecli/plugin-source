/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { stubInterface, fromStub } from '@salesforce/ts-sinon';
import { Dictionary } from '@salesforce/ts-types';
import { Logger } from '@salesforce/core';
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
    public resolveSuccess() {}
    public formatResult() {}
  }

  describe('isJsonOutput', () => {
    it('should return true when json flag is set', () => {
      const command = new SourceCommandTest([''], null);
      command.setCmdFlags({ json: true });
      expect(command.isJsonOutput()).to.equal(true);
    });

    it('should return false when json flag is unset', () => {
      const command = new SourceCommandTest([''], null);
      expect(command.isJsonOutput()).to.equal(false);
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
