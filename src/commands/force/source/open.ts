/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import * as dns from 'dns';
import * as util from 'util';
import * as open from 'open';
import { fs, AuthInfo } from '@salesforce/core';
import { SfdxCommand, flags, FlagsConfig } from '@salesforce/command';
import { Messages, sfdc, SfdxError } from '@salesforce/core';
import { RegistryAccess, MetadataType } from '@salesforce/source-deploy-retrieve';

export interface UrlObject {
  url: string;
  orgId: string;
  username: string;
}

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

function openBrowser(url: string, options: UrlObject): UrlObject {
  void open(url);
  return options;
}

export class Open extends SfdxCommand {
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

  public async run(): Promise<UrlObject> {
    const type = this.getTypeDefinitionByFileName(path.resolve(this.flags.sourcefile));
    const openPath =
      type && type.name === 'FlexiPage' ? await this.handleSupportedTypes() : await this.handleUnsupportedTypes();

    const { orgId, username, url } = await this.open(openPath);

    this.ux.log(messages.getMessage('SourceOpenCommandHumanSuccess', [orgId, username, url]));

    return { orgId, username, url };
  }

  private getSuffixByFileName(fsPath: string): string | undefined {
    const metadataFileExt = '-meta.xml';
    const fileName = path.basename(fsPath);
    if (fileName.endsWith(metadataFileExt)) {
      return fileName.substring(0, fileName.indexOf('-meta.xml')).split('.').slice(1, 2).pop();
    }
    return undefined;
  }

  private getTypeDefinitionByFileName(fsPath: string): MetadataType | undefined {
    if (fs.fileExistsSync(fsPath)) {
      const suffix = this.getSuffixByFileName(fsPath);
      const registryAccess = new RegistryAccess();
      return registryAccess.getTypeBySuffix(suffix);
    }
    return undefined;
  }

  private async handleSupportedTypes(): Promise<string> {
    return await this.setUpOpenPath();
  }

  private async handleUnsupportedTypes(): Promise<string> {
    return await this.buildFrontdoorUrl();
  }

  private async checkLightningDomain(domain: string): Promise<DnsLookupObject> {
    const lookup = util.promisify(dns.lookup);
    return await lookup(`${domain}.lightning.force.com`);
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

  private async open(src: string, urlonly?: boolean): Promise<UrlObject> {
    const connection = this.org.getConnection();
    const { username, orgId } = connection.getAuthInfoFields();
    const url = await this.getUrl(src);
    const act = (): UrlObject =>
      this.flags.urlonly || urlonly ? { url, username, orgId } : openBrowser(url, { url, username, orgId });
    if (sfdc.isInternalUrl(url)) {
      return act();
    }

    try {
      const domainRegex = new RegExp(/https?:\/\/([^.]*)/);
      const domain = domainRegex.exec(url)[1];
      const result = await this.checkLightningDomain(domain);
      if (result) {
        return act();
      }
    } catch (error) {
      throw SfdxError.create('@salesforce/plugin-source', 'open', 'SourceOpenCommandTimeoutError');
    }
  }

  private async deriveFlexipageURL(flexipage: string): Promise<string | undefined> {
    const connection = this.org.getConnection();
    try {
      const queryResult = await connection.tooling.query(`SELECT id FROM flexipage WHERE DeveloperName='${flexipage}'`);
      if (queryResult.totalSize === 1 && queryResult.records) {
        const record = queryResult.records[0] as FlexiPageRecord;
        return record.Id;
      }
      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  private async setUpOpenPath(): Promise<string> {
    const id = await this.deriveFlexipageURL(path.basename(this.flags.sourcefile, '.flexipage-meta.xml'));

    if (id) {
      return `/visualEditor/appBuilder.app?pageId=${id}`;
    }
    return '_ui/flexipage/ui/FlexiPageFilterListPage';
  }
}
