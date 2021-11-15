/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { UX } from '@salesforce/command';
import { Logger } from '@salesforce/core';
import { ConvertResult } from '@salesforce/source-deploy-retrieve';
import { ResultFormatter } from '../resultFormatter';

interface ConvertEntry {
  fullName: string;
  type: string;
  filePath: string;
  state: 'Add';
}

export type ConvertCommandResult = ConvertEntry[];

export class ConvertResultFormatter extends ResultFormatter {
  protected result: ConvertResult;
  private convertResults: ConvertCommandResult;

  public constructor(logger: Logger, ux: UX, result: ConvertResult) {
    super(logger, ux);
    this.result = result;
  }

  public getJson(): ConvertCommandResult {
    if (!this.convertResults) {
      this.convertResults = [];
      this.result.converted.forEach((component) => {
        if (component.xml) {
          this.convertResults.push({
            fullName: component.fullName,
            type: component.type.name,
            filePath: path.relative('.', component.xml),
            state: 'Add',
          });
        }
        if (component.content) {
          this.convertResults.push({
            fullName: component.fullName,
            type: component.type.name,
            filePath: path.relative('.', component.content),
            state: 'Add',
          });
        }
      });
    }

    return this.convertResults;
  }

  public display(): void {
    this.ux.table(this.getJson(), {
      columns: [
        { key: 'state', label: 'STATE' },
        { key: 'fullName', label: 'FULL NAME' },
        { key: 'type', label: 'TYPE' },
        { key: 'filePath', label: 'PROJECT PATH' },
      ],
    });
  }
}
