/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as sinon from 'sinon';
import { expect } from 'chai';
import { fromStub, StubbedType, stubInterface, stubMethod } from '@salesforce/ts-sinon';
import { SfDoctor } from '@salesforce/plugin-info';
import { ConfigAggregator, Lifecycle, Messages, Org, SfProject } from '@salesforce/core';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { hook } from '../../src/hooks/diagnostics';

const pluginName = '@salesforce/plugin-source';
Messages.importMessagesDirectory(__dirname);
const messages = Messages.load(pluginName, 'diagnostics', [
  'apiVersionMismatch',
  'apiVersionUnset',
  'maxApiVersionMismatch',
  'sourceApiVersionMaxMismatch',
  'apiVersionMaxMismatch',
]);

describe('Doctor diagnostics', () => {
  const sandbox = new TestContext().SANDBOX;

  // Stubs for:
  //  1. the Doctor class needed by the hook
  //  2. ConfigAggregator for apiVersion in the config
  //  3. SfProject for sourceApiVersion in sfdx-project.json
  //  4. Org for maxApiVersion of default devhub and target orgs
  let doctorMock: SfDoctor;
  let doctorStubbedType: StubbedType<SfDoctor>;
  let configAggregatorMock: ConfigAggregator;
  let configAggregatorStubbedType: StubbedType<ConfigAggregator>;
  let sfProjectMock: SfProject;
  let sfProjectStubbedType: StubbedType<SfProject>;
  let orgMock: Org;
  let orgStubbedType: StubbedType<Org>;
  let addPluginDataStub: sinon.SinonStub;
  let getPropertyValueStub: sinon.SinonStub;
  let resolveProjectConfigStub: sinon.SinonStub;
  let addSuggestionStub: sinon.SinonStub;
  let lifecycleEmitStub: sinon.SinonStub;
  let maxApiVersionStub: sinon.SinonStub;

  beforeEach(() => {
    doctorStubbedType = stubInterface<SfDoctor>(sandbox);
    doctorMock = fromStub(doctorStubbedType);
    configAggregatorStubbedType = stubInterface<ConfigAggregator>(sandbox);
    configAggregatorMock = fromStub(configAggregatorStubbedType);
    stubMethod(sandbox, ConfigAggregator, 'create').resolves(configAggregatorMock);
    sfProjectStubbedType = stubInterface<SfProject>(sandbox);
    sfProjectMock = fromStub(sfProjectStubbedType);
    stubMethod(sandbox, SfProject, 'getInstance').returns(sfProjectMock);
    orgStubbedType = stubInterface<Org>(sandbox);
    orgMock = fromStub(orgStubbedType);
    stubMethod(sandbox, Org, 'create').resolves(orgMock);
    lifecycleEmitStub = stubMethod(sandbox, Lifecycle.prototype, 'emit');

    // Shortening these for brevity in tests.
    addPluginDataStub = doctorStubbedType.addPluginData;
    addSuggestionStub = doctorStubbedType.addSuggestion;
    getPropertyValueStub = configAggregatorStubbedType.getPropertyValue;
    resolveProjectConfigStub = sfProjectStubbedType.resolveProjectConfig;
    maxApiVersionStub = orgStubbedType.retrieveMaxApiVersion;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should warn when apiVersion does not match sourceApiVersion', async () => {
    getPropertyValueStub.onFirstCall().returns('55.0');
    resolveProjectConfigStub.onFirstCall().resolves({ sourceApiVersion: '52.0' });

    await hook({ doctor: doctorMock });

    expect(addPluginDataStub.callCount, 'Expected doctor.addPluginData() to be called once').to.equal(1);
    expect(addPluginDataStub.args[0][0]).to.equal(pluginName);
    expect(addPluginDataStub.args[0][1]).to.deep.equal({
      apiVersion: '55.0',
      sourceApiVersion: '52.0',
      targetDevHubApiVersion: undefined,
      targetOrgApiVersion: undefined,
    });
    expect(addSuggestionStub.callCount, 'Expected doctor.addSuggestion() to be called once').to.equal(1);
    expect(addSuggestionStub.args[0][0]).to.equal(messages.getMessage('apiVersionMismatch'));
    expect(lifecycleEmitStub.called).to.be.true;
    expect(lifecycleEmitStub.args[0][0]).to.equal('Doctor:diagnostic');
    expect(lifecycleEmitStub.args[0][1]).to.deep.equal({
      testName: `[${pluginName}] sourceApiVersion matches apiVersion`,
      status: 'warn',
    });
  });

  it('should pass when apiVersion matches sourceApiVersion', async () => {
    getPropertyValueStub.onFirstCall().returns('55.0');
    resolveProjectConfigStub.onFirstCall().resolves({ sourceApiVersion: '55.0' });

    await hook({ doctor: doctorMock });

    expect(addPluginDataStub.callCount, 'Expected doctor.addPluginData() to be called once').to.equal(1);
    expect(addPluginDataStub.args[0][0]).to.equal(pluginName);
    expect(addPluginDataStub.args[0][1]).to.deep.equal({
      apiVersion: '55.0',
      sourceApiVersion: '55.0',
      targetDevHubApiVersion: undefined,
      targetOrgApiVersion: undefined,
    });
    expect(addSuggestionStub.callCount, 'Expected doctor.addSuggestion() NOT to be called').to.equal(0);
    expect(lifecycleEmitStub.called).to.be.true;
    expect(lifecycleEmitStub.args[0][0]).to.equal('Doctor:diagnostic');
    expect(lifecycleEmitStub.args[0][1]).to.deep.equal({
      testName: `[${pluginName}] sourceApiVersion matches apiVersion`,
      status: 'pass',
    });
  });

  it('should warn when both apiVersion and sourceApiVersion are not set', async () => {
    await hook({ doctor: doctorMock });

    expect(addPluginDataStub.callCount, 'Expected doctor.addPluginData() to be called once').to.equal(1);
    expect(addPluginDataStub.args[0][0]).to.equal(pluginName);
    expect(addPluginDataStub.args[0][1]).to.deep.equal({
      apiVersion: undefined,
      sourceApiVersion: undefined,
      targetDevHubApiVersion: undefined,
      targetOrgApiVersion: undefined,
    });
    expect(addSuggestionStub.callCount, 'Expected doctor.addSuggestion() to be called once').to.equal(1);
    expect(addSuggestionStub.args[0][0]).to.equal(messages.getMessage('apiVersionUnset'));
    expect(lifecycleEmitStub.called).to.be.true;
    expect(lifecycleEmitStub.args[0][0]).to.equal('Doctor:diagnostic');
    expect(lifecycleEmitStub.args[0][1]).to.deep.equal({
      testName: `[${pluginName}] sourceApiVersion matches apiVersion`,
      status: 'warn',
    });
  });

  it('should warn when default devhub target org and default target org have different max apiVersions', async () => {
    getPropertyValueStub.onSecondCall().returns('devhubOrg').onThirdCall().returns('scratchOrg');
    maxApiVersionStub.onFirstCall().resolves('55.0').onSecondCall().resolves('56.0');

    await hook({ doctor: doctorMock });

    expect(addPluginDataStub.callCount, 'Expected doctor.addPluginData() to be called once').to.equal(1);
    expect(addPluginDataStub.args[0][0]).to.equal(pluginName);
    expect(addPluginDataStub.args[0][1]).to.deep.equal({
      apiVersion: undefined,
      sourceApiVersion: undefined,
      targetDevHubApiVersion: '55.0',
      targetOrgApiVersion: '56.0',
    });
    expect(addSuggestionStub.callCount, 'Expected doctor.addSuggestion() to be called twice').to.equal(2);
    expect(addSuggestionStub.args[1][0]).to.equal(messages.getMessage('maxApiVersionMismatch'));
    expect(lifecycleEmitStub.called).to.be.true;
    expect(lifecycleEmitStub.args[1][0]).to.equal('Doctor:diagnostic');
    expect(lifecycleEmitStub.args[1][1]).to.deep.equal({
      testName: `[${pluginName}] default target DevHub max apiVersion matches default target org max apiVersion`,
      status: 'warn',
    });
  });

  it('should warn when sourceApiVersion and default target org max apiVersion does not match', async () => {
    const targetOrgApiVersion = '56.0';
    resolveProjectConfigStub.resolves({ sourceApiVersion: '55.0' });
    getPropertyValueStub.onThirdCall().returns('scratchOrg');
    maxApiVersionStub.onFirstCall().resolves(targetOrgApiVersion);

    await hook({ doctor: doctorMock });

    expect(addPluginDataStub.callCount, 'Expected doctor.addPluginData() to be called once').to.equal(1);
    expect(addPluginDataStub.args[0][0]).to.equal(pluginName);
    expect(addPluginDataStub.args[0][1]).to.deep.equal({
      apiVersion: undefined,
      sourceApiVersion: '55.0',
      targetDevHubApiVersion: undefined,
      targetOrgApiVersion,
    });
    expect(addSuggestionStub.callCount, 'Expected doctor.addSuggestion() to be called once').to.equal(1);
    expect(addSuggestionStub.args[0][0]).to.equal(
      messages.getMessage('sourceApiVersionMaxMismatch', [targetOrgApiVersion])
    );
    expect(lifecycleEmitStub.called).to.be.true;
    expect(lifecycleEmitStub.args[1][0]).to.equal('Doctor:diagnostic');
    expect(lifecycleEmitStub.args[1][1]).to.deep.equal({
      testName: `[${pluginName}] sourceApiVersion matches default target org max apiVersion`,
      status: 'warn',
    });
  });

  it('should warn when apiVersion and default target org max apiVersion does not match', async () => {
    const targetOrgApiVersion = '56.0';
    getPropertyValueStub.onFirstCall().returns('55.0');
    getPropertyValueStub.onThirdCall().returns('scratchOrg');
    maxApiVersionStub.onFirstCall().resolves(targetOrgApiVersion);

    await hook({ doctor: doctorMock });

    expect(addPluginDataStub.callCount, 'Expected doctor.addPluginData() to be called once').to.equal(1);
    expect(addPluginDataStub.args[0][0]).to.equal(pluginName);
    expect(addPluginDataStub.args[0][1]).to.deep.equal({
      apiVersion: '55.0',
      sourceApiVersion: undefined,
      targetDevHubApiVersion: undefined,
      targetOrgApiVersion,
    });
    expect(addSuggestionStub.callCount, 'Expected doctor.addSuggestion() to be called once').to.equal(1);
    expect(addSuggestionStub.args[0][0]).to.equal(messages.getMessage('apiVersionMaxMismatch', [targetOrgApiVersion]));
    expect(lifecycleEmitStub.called).to.be.true;
    expect(lifecycleEmitStub.args[1][0]).to.equal('Doctor:diagnostic');
    expect(lifecycleEmitStub.args[1][1]).to.deep.equal({
      testName: `[${pluginName}] apiVersion matches default target org max apiVersion`,
      status: 'warn',
    });
  });
});
