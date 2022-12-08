/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages } from '@salesforce/core';
import { j2xParser } from 'fast-xml-parser';
import {
  DEFAULT_PACKAGE_ROOT_SFDX,
  META_XML_SUFFIX,
  XML_DECL,
  XML_NS_URL,
} from '@salesforce/source-deploy-retrieve/lib/src/common';
import { RegistryAccess } from '@salesforce/source-deploy-retrieve';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-source', 'profileRetrieve');

type ProfileMetadata = { Metadata: Record<string, unknown>; FullName: string };
type ProfileNamePathIndex = [{ name: string; path: string }];

export default class ProfileRetrieve extends SfdxCommand {
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessage('examples').split(os.EOL);
  public static readonly requiresProject = true;
  public static readonly requiresUsername = true;
  public static readonly flagsConfig: FlagsConfig = {
    profiles: flags.array({
      char: 'p',
      description: messages.getMessage('profilesFlag'),
      longDescription: messages.getMessage('profilesFlagLong'),
      default: [],
    }),
  };

  public async run(): Promise<ProfileNamePathIndex> {
    let queryResult = (
      await this.org.getConnection().tooling.query<ProfileMetadata>('SELECT FullName, Metadata FROM Profile')
    ).records;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result: ProfileNamePathIndex = [];
    const profiles = this.flags.profiles as string[];

    if (profiles.length) {
      // we can't do this in the query, because Profiles doesn't support "FullName IN ('x','y')"
      // https://developer.salesforce.com/docs/atlas.en-us.api_tooling.meta/api_tooling/tooling_api_objects_profile.htm
      // > Query this field only if the query result contains no more than one record. Otherwise, an error is returned. If more than one record exists, use multiple queries to retrieve the records. This limit protects performance.
      queryResult = queryResult.filter((res) => profiles.includes(res.FullName));
    }

    if (queryResult.length > 0) {
      const j2x = new j2xParser({
        format: true,
        indentBy: '    ',
      });
      const registry = new RegistryAccess();
      const profileType = registry.getTypeByName('profile');
      const profileDir = path.join(
        this.project.getDefaultPackage().fullPath,
        DEFAULT_PACKAGE_ROOT_SFDX,
        profileType.directoryName
      );
      fs.mkdirSync(profileDir, { recursive: true });

      queryResult.forEach((profile) => {
        const bodyContent = (j2x.parse(profile.Metadata) as string).replace(/\n/g, '\n    ');
        const xml = `${XML_DECL}<Profile xmlns="${XML_NS_URL}">
    ${bodyContent.substring(0, bodyContent.lastIndexOf('    '))}</Profile>\n`;

        const xmlPath = path.join(profileDir, `${profile.FullName}.${profileType.suffix}${META_XML_SUFFIX}`);
        fs.writeFileSync(xmlPath, xml);
        result.push({
          name: profile.FullName,
          path: path.join(
            this.project.getDefaultPackage().path,
            DEFAULT_PACKAGE_ROOT_SFDX,
            profileType.directoryName,
            `${profile.FullName}.${profileType.suffix}${META_XML_SUFFIX}`
          ),
        });
      });
    }

    this.ux.table(result, { name: { header: 'FILE NAME' }, path: { header: 'PATH' } });

    return result;
  }
}
