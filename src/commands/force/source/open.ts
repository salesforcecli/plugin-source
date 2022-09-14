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
import { flags, FlagsConfig } from '@salesforce/command';
import { AuthInfo, Messages, sfdc, SfdcUrl, SfError } from '@salesforce/core';
import { MetadataResolver, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { OpenCommandResult, OpenResultFormatter } from '../../../formatters/source/openResultFormatter';
import { SourceCommand } from '../../../sourceCommand';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-source', 'open', [
  'description',
  'examples',
  'SourceOpenFileDescription',
  'SourceOpenPathDescription',
]);

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
    const typeName = getTypeNameDefinitionByFileName(path.resolve(this.flags.sourcefile as string));
    const openPath = ['FlexiPage', 'ApexPage'].includes(typeName)
      ? await this.setUpOpenPath(typeName)
      : await this.buildFrontdoorUrl();

    this.openResult = await this.open(openPath);
  }

  private async buildFrontdoorUrl(): Promise<string> {
    const authInfo = await AuthInfo.create({ username: this.org.getUsername() });
    return authInfo.getOrgFrontDoorUrl();
  }

  private async open(src: string): Promise<OpenCommandResult> {
    const url = `${await this.buildFrontdoorUrl()}&retURL=${encodeURIComponent(decodeURIComponent(src))}`;
    const result: OpenCommandResult = {
      url,
      username: this.org.getUsername(),
      orgId: this.org.getOrgId(),
    };

    if (!sfdc.isInternalUrl(url)) {
      try {
        await new SfdcUrl(url).checkLightningDomain();
      } catch (error) {
        throw new SfError('SourceOpenCommandTimeoutError', 'SourceOpenCommandTimeoutError');
      }
    }

    return this.flags.urlonly ? result : this.openBrowser(url, result);
  }

  private async setUpOpenPath(pageType: string): Promise<string> {
    try {
      if (pageType === 'FlexiPage') {
        const flexipage = await this.org
          .getConnection()
          .singleRecordQuery<{ Id: string }>(
            `SELECT id FROM flexipage WHERE DeveloperName='${path.basename(
              this.flags.sourcefile as string,
              '.flexipage-meta.xml'
            )}'`,
            { tooling: true }
          );
        return `/visualEditor/appBuilder.app?pageId=${flexipage.Id}`;
      } else if (pageType === 'ApexPage') {
        return `/apex/${path
          .basename(this.flags.sourcefile as string)
          .replace('.page-meta.xml', '')
          .replace('.page', '')}`;
      } else {
        return '_ui/flexipage/ui/FlexiPageFilterListPage';
      }
    } catch (error) {
      return '_ui/flexipage/ui/FlexiPageFilterListPage';
    }
  }

  // Leave it on the class because method stubbed test
  // eslint-disable-next-line class-methods-use-this
  private openBrowser(url: string, options: OpenCommandResult): OpenCommandResult {
    void open(url);
    return options;
  }
}

const getTypeNameDefinitionByFileName = (fsPath: string): string | undefined => {
  if (fs.existsSync(fsPath)) {
    const metadataResolver = new MetadataResolver();
    const components: SourceComponent[] = metadataResolver.getComponentsFromPath(fsPath);
    return components[0].type.name;
  }
  throw new SfError(`File not found: ${fsPath}`, 'FileNotFound');
};
