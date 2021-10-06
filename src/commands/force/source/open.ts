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
import { Messages, sfdc, SfdxError, AuthInfo, SfdcUrl } from '@salesforce/core';
import { SourceComponent, MetadataResolver } from '@salesforce/source-deploy-retrieve';
import { OpenResultFormatter, OpenCommandResult } from '../../../formatters/openResultFormatter';
import { SourceCommand } from '../../../sourceCommand';

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
    const openPath = typeName === 'FlexiPage' ? await this.setUpOpenPath() : await this.buildFrontdoorUrl();

    this.openResult = await this.open(openPath);
  }

  private getTypeNameDefinitionByFileName(fsPath: string): string | undefined {
    if (fs.existsSync(fsPath)) {
      const metadataResolver = new MetadataResolver();
      const components: SourceComponent[] = metadataResolver.getComponentsFromPath(fsPath);
      return components[0].type.name;
    }
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
        throw SfdxError.create('@salesforce/plugin-source', 'open', 'SourceOpenCommandTimeoutError');
      }
    }

    return this.flags.urlonly ? result : this.openBrowser(url, result);
  }

  private async setUpOpenPath(): Promise<string> {
    try {
      const flexipage = await this.org
        .getConnection()
        .singleRecordQuery<{ Id: string }>(
          `SELECT id FROM flexipage WHERE DeveloperName='${path.basename(
            this.flags.sourcefile,
            '.flexipage-meta.xml'
          )}'`,
          { tooling: true }
        );
      return `/visualEditor/appBuilder.app?pageId=${flexipage.Id}`;
    } catch (error) {
      return '_ui/flexipage/ui/FlexiPageFilterListPage';
    }
  }
  private openBrowser(url: string, options: OpenCommandResult): OpenCommandResult {
    void open(url);
    return options;
  }
}
