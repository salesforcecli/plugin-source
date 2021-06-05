/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import * as https from 'https';
import * as dns from 'dns';
import * as util from 'util';
import * as open from 'open';
import { fs } from '@salesforce/core';
import { SfdxCommand, flags, FlagsConfig } from '@salesforce/command';
import { Messages, sfdc, SfdxError, Org } from '@salesforce/core';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { PackageTypeMembers } from '@salesforce/source-deploy-retrieve/lib/src/collections/types';

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
      hidden: false,
      description: messages.getMessage('SourceOpenFileDescription'),
      longDescription: messages.getMessage('SourceOpenFileLongDescription'),
    }),
    urlonly: flags.boolean({
      char: 'r',
      required: false,
      hidden: false,
      description: messages.getMessage('SourceOpenPathDescription'),
      longDescription: messages.getMessage('SourceOpenPathLongDescription'),
    }),
  };

  public async run(): Promise<UrlObject> {
    const type = this.getTypeDefinitionByFileName(path.resolve(this.flags.sourcefile));
    const { orgId, username, url } =
      type && type.name === 'FlexiPage' ? await this.handleSupportedTypes() : await this.handleUnsupportedTypes();

    this.ux.log(messages.getMessage('SourceOpenCommandHumanSuccess', [orgId, username, url]));

    return { orgId, username, url };
  }

  private getTypeDefinitionByFileName(fsPath: string): PackageTypeMembers | undefined {
    if (fs.fileExistsSync(fsPath)) {
      const components = ComponentSet.fromSource(fsPath);
      const manifestObject = components.getObject();
      const { types } = manifestObject.Package;
      return types[0];
    }
    return undefined;
  }

  private async handleSupportedTypes(): Promise<UrlObject> {
    const openPath = await this.setUpOpenPath();
    return await this.open(openPath);
  }

  private async handleUnsupportedTypes(): Promise<UrlObject> {
    const openPath: string = await this.buildFrontdoorUrl();
    return await this.open(openPath);
  }

  /* this is just temporal untill we find an http request library */
  private readUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        response.setEncoding('utf8');
        let body = '';
        response.on('data', (data) => {
          body += data;
        });
        response.on('end', () => {
          resolve(body);
        });
        response.on('error', (error) => {
          reject(error);
        });
      });
    });
  }

  private async checkLightningDomain(domain: string): Promise<DnsLookupObject> {
    const lookup = util.promisify(dns.lookup);
    return await lookup(`${domain}.lightning.force.com`);
  }

  private async getUrl(retURL: string): Promise<string> {
    const frontDoorUrl: string = await this.buildFrontdoorUrl();
    return `${frontDoorUrl}&retURL=${encodeURIComponent(decodeURIComponent(retURL))}`;
  }

  private async isSalesforceOneEnabled(): Promise<boolean> {
    const src = 'one/one.app';
    const { url } = await this.open(src, true);
    const response = await this.readUrl(url);
    return response && !response.includes('lightning/access/orgAccessDenied.jsp');
  }

  private async buildFrontdoorUrl(): Promise<string> {
    await this.org.refreshAuth(); // we need a live accessToken for the frontdoor url
    const connection = this.org.getConnection();
    const { accessToken } = connection;
    const instanceUrl = this.org.getField(Org.Fields.INSTANCE_URL) as string;
    const instanceUrlClean = instanceUrl.replace(/\/$/, '');
    return `${instanceUrlClean}/secur/frontdoor.jsp?sid=${accessToken}`;
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
      } else {
        return undefined;
      }
    } catch (err) {
      return undefined;
    }
  }

  private async setUpOpenPath(): Promise<string> {
    const id = await this.deriveFlexipageURL(path.basename(this.flags.sourcefile, '.flexipage-meta.xml'));
    const salesforceOne = await this.isSalesforceOneEnabled();

    if (id) {
      return `/visualEditor/appBuilder.app?pageId=${id}`;
    }
    if (salesforceOne) {
      return '/one/one.app#/setup/FlexiPageList/home';
    }
    return '_ui/flexipage/ui/FlexiPageFilterListPage';
  }
}
