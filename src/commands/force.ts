/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
    message:
      'The Salesforce CLI does ship an API version.  You can use "org display" to see the API version of any org.',
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
