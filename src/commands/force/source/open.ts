/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as open from 'open';
import { getString } from '@salesforce/ts-types';
import { AuthInfo, SfdcUrl } from '@salesforce/core';
import { flags, FlagsConfig } from '@salesforce/command';
import { Messages, sfdc, SfdxError } from '@salesforce/core';
import { SourceComponent, MetadataResolver } from '@salesforce/source-deploy-retrieve';
import { OpenResultFormatter, OpenCommandResult } from '../../../formatters/openResultFormatter';
import { SourceCommand } from '../../../sourceCommand';

export interface DnsLookupObject {
  address: string;
  family: number;
}

export interface FlexiPageRecord {
  attributes: {
    type: string;
    url: string;
  };
  Id: string;
}

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'open');

export class Open extends SourceCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    sourcefile: flags.filepath({
      char: 'f',
      required: true,
      description: messages.getMessage('SourceOpenFileDescription'),
    }),
    urlonly: flags.boolean({
      char: 'r',
      description: messages.getMessage('SourceOpenPathDescription'),
    }),
  };

  protected openResult: OpenCommandResult;

  public async run(): Promise<OpenCommandResult> {
    await this.doOpen();
    this.resolveSuccess();
    return this.formatResult();
  }

  protected resolveSuccess(): void {
    if (!getString(this.openResult, 'url')) {
      process.exitCode = 1;
    }
  }

  protected formatResult(): OpenCommandResult {
    const formatter = new OpenResultFormatter(this.logger, this.ux, this.openResult);

    if (!this.isJsonOutput()) {
      formatter.display();
    }
    return formatter.getJson();
  }

  private async doOpen(): Promise<void> {
    const typeName = this.getTypeNameDefinitionByFileName(path.resolve(this.flags.sourcefile));
    const openPath = typeName === 'FlexiPage' ? await this.handleSupportedTypes() : await this.handleUnsupportedTypes();

    this.openResult = await this.open(openPath);
  }

  private getTypeNameDefinitionByFileName(fsPath: string): string | undefined {
    if (fs.existsSync(fsPath)) {
      const metadataResolver = new MetadataResolver();
      const components: SourceComponent[] = metadataResolver.getComponentsFromPath(fsPath);
      return components[0].type.name;
    }
    return undefined;
  }

  private async handleSupportedTypes(): Promise<string> {
    return await this.setUpOpenPath();
  }

  private async handleUnsupportedTypes(): Promise<string> {
    return await this.buildFrontdoorUrl();
  }

  private async getUrl(retURL: string): Promise<string> {
    const frontDoorUrl: string = await this.buildFrontdoorUrl();
    return `${frontDoorUrl}&retURL=${encodeURIComponent(decodeURIComponent(retURL))}`;
  }

  private async buildFrontdoorUrl(): Promise<string> {
    const connection = this.org.getConnection();
    const { username } = connection.getAuthInfoFields();
    const authInfo = await AuthInfo.create({ username });
    const url = authInfo.getOrgFrontDoorUrl();
    return url;
  }

  private async open(src: string, urlonly?: boolean): Promise<OpenCommandResult> {
    const connection = this.org.getConnection();
    const { username, orgId } = connection.getAuthInfoFields();
    const url = await this.getUrl(src);
    const act = (): OpenCommandResult =>
      this.flags.urlonly || urlonly ? { url, username, orgId } : this.openBrowser(url, { url, username, orgId });
    if (sfdc.isInternalUrl(url)) {
      return act();
    }

    try {
      const result = await new SfdcUrl(url).checkLightningDomain();

      if (result) {
        return act();
      }
    } catch (error) {
      throw SfdxError.create('@salesforce/plugin-source', 'open', 'SourceOpenCommandTimeoutError');
    }
  }

  private async deriveFlexipageURL(flexipage: string): Promise<string | undefined> {
    const connection = this.org.getConnection();
    const queryResult = await connection.tooling.query(`SELECT id FROM flexipage WHERE DeveloperName='${flexipage}'`);
    if (queryResult.totalSize === 1 && queryResult.records) {
      const record = queryResult.records[0] as FlexiPageRecord;
      return record.Id;
    }
    return;
  }

  private async setUpOpenPath(): Promise<string> {
    const id = await this.deriveFlexipageURL(path.basename(this.flags.sourcefile, '.flexipage-meta.xml'));

    if (id) {
      return `/visualEditor/appBuilder.app?pageId=${id}`;
    }
    return '_ui/flexipage/ui/FlexiPageFilterListPage';
  }

  private openBrowser(url: string, options: OpenCommandResult): OpenCommandResult {
    void open(url);
    return options;
  }
}
