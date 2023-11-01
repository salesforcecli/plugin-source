/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { ConfigAggregator, Lifecycle, Logger, Messages, SfProject, OrgConfigProperties, Org } from '@salesforce/core';
import { SfDoctor } from '@salesforce/plugin-info';
type HookFunction = (options: { doctor: SfDoctor }) => Promise<[void]>;

let logger: Logger;
const getLogger = (): Logger => {
  if (!logger) {
    logger = Logger.childFromRoot('plugin-source-diagnostics');
  }
  return logger;
};

const pluginName = '@salesforce/plugin-source';
Messages.importMessagesDirectory(dirname(fileURLToPath(import.meta.url)));
const messages = Messages.loadMessages(pluginName, 'diagnostics');

export const hook: HookFunction = async (options) => {
  getLogger().debug(`Running SfDoctor diagnostics for ${pluginName}`);
  return Promise.all([apiVersionTest(options.doctor)]);
};

// ============================
// ***   DIAGNOSTIC TESTS   ***
// ============================

// Gathers and compares the following API versions:
//  1. apiVersion (if set) from the sfdx config, including environment variable
//  2. sourceApiVersion (if set) from sfdx-project.json
//  3. max apiVersion of the default target dev hub org (if set)
//  4. max apiVersion of the default target org (if set)
//
// Warns if:
//  1. apiVersion and sourceApiVersion are set but not equal
//  2. apiVersion and sourceApiVersion are both not set
//  3. default devhub target org and default target org have different max apiVersions
//  4. sourceApiVersion is set and does not match max apiVersion of default target org
//  5. apiVersion is set and does not match max apiVersion of default target org
const apiVersionTest = async (doctor: SfDoctor): Promise<void> => {
  getLogger().debug('Running API Version tests');

  // check org-api-version from ConfigAggregator
  const aggregator = await ConfigAggregator.create();
  const apiVersion = aggregator.getPropertyValue<string>(OrgConfigProperties.ORG_API_VERSION) as string;

  const sourceApiVersion = await getSourceApiVersion();

  const targetDevHub = aggregator.getPropertyValue<string>(OrgConfigProperties.TARGET_DEV_HUB);
  const targetOrg = aggregator.getPropertyValue<string>(OrgConfigProperties.TARGET_ORG);
  const targetDevHubApiVersion = targetDevHub && (await getMaxApiVersion(aggregator, targetDevHub));
  const targetOrgApiVersion = targetOrg && (await getMaxApiVersion(aggregator, targetOrg));

  doctor.addPluginData(pluginName, {
    apiVersion,
    sourceApiVersion,
    targetDevHubApiVersion,
    targetOrgApiVersion,
  });

  const testName1 = `[${pluginName}] sourceApiVersion matches apiVersion`;
  let status1 = 'pass';
  if (diff(sourceApiVersion, apiVersion)) {
    status1 = 'warn';
    doctor.addSuggestion(messages.getMessage('apiVersionMismatch'));
  }
  if (sourceApiVersion === undefined && apiVersion === undefined) {
    status1 = 'warn';
    doctor.addSuggestion(messages.getMessage('apiVersionUnset'));
  }
  void Lifecycle.getInstance().emit('Doctor:diagnostic', { testName: testName1, status: status1 });

  if (targetDevHubApiVersion && targetOrgApiVersion) {
    const testName2 = `[${pluginName}] default target DevHub max apiVersion matches default target org max apiVersion`;
    let status2 = 'pass';
    if (diff(targetDevHubApiVersion, targetOrgApiVersion)) {
      status2 = 'warn';
      doctor.addSuggestion(messages.getMessage('maxApiVersionMismatch'));
    }
    void Lifecycle.getInstance().emit('Doctor:diagnostic', { testName: testName2, status: status2 });
  }

  // Only run this test if both sourceApiVersion and the default target org max version are set.
  if (sourceApiVersion?.length && targetOrgApiVersion?.length) {
    const testName3 = `[${pluginName}] sourceApiVersion matches default target org max apiVersion`;
    let status3 = 'pass';
    if (diff(sourceApiVersion, targetOrgApiVersion)) {
      status3 = 'warn';
      doctor.addSuggestion(messages.getMessage('sourceApiVersionMaxMismatch', [targetOrgApiVersion]));
    }
    void Lifecycle.getInstance().emit('Doctor:diagnostic', { testName: testName3, status: status3 });
  }

  // Only run this test if both apiVersion and the default target org max version are set.
  if (apiVersion?.length && targetOrgApiVersion?.length) {
    const testName4 = `[${pluginName}] apiVersion matches default target org max apiVersion`;
    let status4 = 'pass';
    if (diff(apiVersion, targetOrgApiVersion)) {
      status4 = 'warn';
      doctor.addSuggestion(messages.getMessage('apiVersionMaxMismatch', [targetOrgApiVersion]));
    }
    void Lifecycle.getInstance().emit('Doctor:diagnostic', { testName: testName4, status: status4 });
  }
};

// check sfdx-project.json for sourceApiVersion
const getSourceApiVersion = async (): Promise<string | undefined> => {
  try {
    const project = SfProject.getInstance();
    const projectJson = await project.resolveProjectConfig();
    return projectJson.sourceApiVersion as string | undefined;
  } catch (error) {
    const errMsg = (error as Error).message;
    getLogger().debug(`Cannot determine sourceApiVersion due to: ${errMsg}`);
  }
};

// check max API version for default orgs
const getMaxApiVersion = async (aggregator: ConfigAggregator, aliasOrUsername: string): Promise<string | undefined> => {
  try {
    const org = await Org.create({ aliasOrUsername, aggregator });
    return await org.retrieveMaxApiVersion();
  } catch (error) {
    const errMsg = (error as Error).message;
    getLogger().debug(`Cannot determine the max ApiVersion for org: [${aliasOrUsername}] due to: ${errMsg}`);
  }
};

// Compare 2 API versions that have values and return if they are different.
// E.g.,
//   Comparing undefined with 56.0 would return false.
//   Comparing undefined with undefined would return false.
//   Comparing 55.0 with 55.0 would return false.
//   Comparing 55.0 with 56.0 would return true.
const diff = (version1: string | undefined, version2: string | undefined): boolean => {
  getLogger().debug(`Comparing API versions: [${version1},${version2}]`);
  return (version1?.length && version2?.length && version1 !== version2) as boolean;
};
