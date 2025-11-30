/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This is a doc command
/* istanbul ignore file */

import got from 'got';
import { Help } from '@oclif/core';
import { ProxyAgent } from 'proxy-agent';
import { ConfigAggregator } from '@salesforce/core';
import { SfCommand } from '@salesforce/sf-plugins-core';

const getAsciiSignature = (apiVersion: string): string => `
                 DX DX DX
             DX DX DX DX DX DX          DX DX DX
          DX DX DX      DX DX DX    DX DX DX DX DX DX
        DX DX              DX DX DX DX DX     DX DX DX
       DX DX                 DX DX DX             DX DX    DX DX DX
      DX DX                    DX DX                DX DX DX DX DX DX DX
     DX DX                                          DX DX DX       DX DX DX
     DX DX                                            DX             DX DX DX
      DX DX                                                              DX DX
      DX DX                                                               DX DX
       DX DX                                                              DX DX
     DX DX                                                                 DX DX
   DX DX                                                                   DX DX
 DX DX                                                                     DX DX
DX DX                                                                     DX DX
DX DX                                                                    DX DX
DX DX                                                                   DX DX
 DX DX                                                    DX          DX DX
 DX DX                                                  DX DX DX DX DX DX
  DX DX                                                 DX DX DX DX DX
    DX DX DX   DX DX                     DX           DX DX
       DX DX DX DX DX                   DX DX DX DX DX DX
          DX DX  DX DX                  DX DX DX DX DX
                  DX DX              DX DX
                    DX DX DX     DX DX DX
                      DX DX DX DX DX DX                     v${apiVersion}
                          DX DX DX

* Salesforce CLI Release Notes: https://github.com/forcedotcom/cli/tree/main/releasenotes
* Salesforce DX Setup Guide: https://sfdc.co/sfdx_setup_guide
* Salesforce DX Developer Guide: https://sfdc.co/sfdx_dev_guide
* Salesforce CLI Command Reference: https://sfdc.co/sfdx_cli_reference
* Salesforce Extensions for VS Code: https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode
`;

const getCurrentApiVersion = async (): Promise<string> => {
  const apiFromConfig = ConfigAggregator.getValue('apiVersion').value as string;
  if (apiFromConfig) {
    return apiFromConfig;
  }
  const url = 'https://mdcoverage.secure.force.com/services/apexrest/report';
  return `${(
    JSON.parse(
      (
        await got(url, {
          agent: { https: new ProxyAgent() },
        })
      ).body
    ) as {
      versions: { selected: number };
    }
  ).versions.selected.toString()}.0`;
};

export type ForceCommandResult = { apiVersion: string };

export class ForceCommand extends SfCommand<ForceCommandResult> {
  public static readonly hidden = true;
  public static readonly examples = [];
  public static state = 'deprecated';
  public static readonly deprecationOptions = {
    message: 'Use "org display" to see the API version of any org.',
  };
  // eslint-disable-next-line sf-plugin/no-hardcoded-messages-commands
  public static readonly summary = 'Display the ASCII art logo for the Salesforce CLI';

  public async run(): Promise<ForceCommandResult> {
    const apiVersion = await getCurrentApiVersion();
    this.log(getAsciiSignature(apiVersion));
    return { apiVersion };
  }

  // overrides the help so that it shows the help for the `force` topic and not "help" for this command
  protected _help(): void {
    const help = new Help(this.config);
    // We need to include force in the args for topics to be shown
    void help.showHelp(process.argv.slice(2));
    return this.exit(0);
  }
}
