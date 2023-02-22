/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { ConvertResult } from '@salesforce/source-deploy-retrieve';
import { Ux } from '@salesforce/sf-plugins-core';
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

  public constructor(ux: Ux, result: ConvertResult) {
    super(ux);
    this.result = result;
  }

  public getJson(): ConvertCommandResult {
    if (!this.convertResults) {
      this.convertResults = [];
      this.result?.converted.forEach((component) => {
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
    const convertData = this.getJson();
    if (convertData?.length) {
      this.ux.table(
        convertData.map((entry) => ({
          state: entry.state,
          fullName: entry.fullName,
          type: entry.type,
          filePath: entry.filePath,
        })),
        {
          state: { header: 'STATE' },
          fullName: { header: 'FULL NAME' },
          type: { header: 'TYPE' },
          filePath: { header: 'PROJECT PATH' },
        }
      );
    } else {
      this.ux.log('No metadata found to convert');
    }
  }
}
