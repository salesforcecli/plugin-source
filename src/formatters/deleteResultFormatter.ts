/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DeployCommandResult, DeployResultFormatter } from './deployResultFormatter';
export class DeleteResultFormatter extends DeployResultFormatter {
  /**
   * Get the JSON output from the DeployResult.
   *
   * @returns a JSON formatted result matching the provided type.
   */
  public getJson(): DeployCommandResult {
    const json = this.getResponse() as DeployCommandResult;
    json.deletedSource = this.fileResponses; // to match toolbelt json output
    json.outboundFiles = []; // to match toolbelt version
    json.deletes = [Object.assign({}, this.getResponse())]; // to match toolbelt version

    return json;
  }
}
