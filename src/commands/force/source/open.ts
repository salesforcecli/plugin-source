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
import { exec } from 'child_process';
import { SfdxCommand, flags, FlagsConfig } from '@salesforce/command';
import { Messages, sfdc, SfdxError } from '@salesforce/core';
import getTypeDefinitionByFileName from '../../../utils/getTypeDefinitionByFileName';

export interface OpenCommandResult {
  url: string;
}

export interface UrlObject {
  url: string;
  orgId: string;
  username: string;
}

export interface DnsLookupObject {
  address: string;
  family: number;
}

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'open');

function openBrowser(url: string, options: UrlObject): UrlObject {
  exec(`open ${url}`);
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


  public async run(): Promise<OpenCommandResult> {
    this.ux.warn('flags: ' + JSON.stringify(this.flags, null, 2));
    const type = getTypeDefinitionByFileName(path.resolve(this.flags.sourcefile));

    if (type) {
      if (type.metadataName === 'FlexiPage') {
        // do work
        this.ux.warn('Type Definition: ' + type.metadataName);
      }
    }

    const url = await this.setUpOpenPath();
    const urlObject = await this.open(url);
    this.ux.styledObject(urlObject);
    return urlObject;
  }

  /* this is just temporal untill we find an http request library */
  private readUrl(url): Promise<string> {
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
    const frontDoor = await this.getOrgFrontDoor();
    return `${frontDoor}&retURL=${encodeURIComponent(decodeURIComponent(retURL))}`;
  }

  private async isSalesforceOneEnabled(): Promise<boolean> {
    const src = 'one/one.app';
    const { url } = await this.open(src);
    const response = await this.readUrl(url);
    return response && !response.includes('lightning/access/orgAccessDenied.jsp');
  }

  private async getOrgFrontDoor(tryRefresh = true): Promise<string> {
    if (tryRefresh) {
      await this.org.refreshAuth();
    }
    const connection = this.org.getConnection();
    const { accessToken, instanceUrl } = connection.getAuthInfoFields();
    return `${instanceUrl.replace(new RegExp('\/$'), '')}/secur/frontdoor.jsp?sid=${accessToken}`;
  }

  private async open(src: string): Promise<UrlObject> {
    const connection = this.org.getConnection();
    const { username, orgId } = connection.getAuthInfoFields();
    const url = await this.getUrl(src);
    const act = (): UrlObject =>
      this.flags.urlonly ? { url, username, orgId } : openBrowser(url, { url, username, orgId });
    if (sfdc.isInternalUrl(url)) {
      return act();
    }

    try {
      const domain = url.match(/https?\:\/\/([^.]*)/)[1];
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
        const record: any = queryResult.records[0];
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
