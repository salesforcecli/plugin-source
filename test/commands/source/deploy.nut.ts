/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TestSession, execCmd } from '@salesforce/cli-plugins-testkit';

let session: TestSession;

describe('source:deploy NUTs', () => {
  before(() => {
    session = TestSession.create({
      project: {
        gitClone: 'https://github.com/amphro/simple-mpd-project.git',
      },
      // create org and push source to get something to deploy
      setupCommands: [
        'sfdx force:org:create -d 1 -s -f config/project-scratch-def.json',
        'sfdx force:source:push',
        'sfdx force:source:convert --packagename force-app --outputdir FORCE-APP',
        'sfdx force:source:convert --packagename my-app --outputdir MY-APP',
      ],
    });
  });

  it('deploys via sourcepath', () => {
    execCmd('force:source:deploy --sourcepath "force-app" --json', { ensureExitCode: 0 });
    // TODO: once json is fixed add json validation
    // const output =
    // expect(output.jsonOutput)
    //   .to.have.property('result')
    //   .with.keys(['username', 'accessToken', 'id', 'orgId', 'profileName', 'loginUrl', 'instanceUrl']);
    // const result = (output.jsonOutput as Record<string, unknown>).result as Record<string, string>;
    // expect(result.orgId).to.have.length(18);
    // expect(result.id).to.have.length(18);
    // expect(result.accessToken.startsWith(result.orgId.substr(0, 15))).to.be.true;
  });

  it('deploys via sourcepath with multiple', () => {
    execCmd('force:source:deploy --sourcepath "force-app, my-app" --json', { ensureExitCode: 0 });
  });

  // it('deploys via package name with spaces', () => {
  //   execCmd('force:source:deploy --packagenames "my app" --json', { ensureExitCode: 0 });
  // });
  //
  // it('deploys via package names', () => {
  //   execCmd('force:source:deploy --packagenames "my app, force-app" --json', { ensureExitCode: 0 });
  // });

  it('deploys via metadata', () => {
    execCmd('force:source:deploy --metadata ApexClass --json', { ensureExitCode: 0 });
  });

  it('deploys via metadata', () => {
    execCmd('force:source:deploy --metadata ApexClass:MyTest --json', { ensureExitCode: 0 });
  });

  it('deploys via metadata mixed param types', () => {
    execCmd('force:source:deploy --metadata ApexClass:MyTest,CustomField --json', { ensureExitCode: 0 });
  });

  it('deploys via manifest', () => {
    execCmd('force:source:deploy --manifest "FORCE-APP/package.xml" --json', { ensureExitCode: 0 });
  });

  it('deploys via multiple manifests', () => {
    execCmd('force:source:deploy --manifest "FORCE-APP/package.xml,MY-APP/package.xml" --json', {
      ensureExitCode: 0,
    });
  });

  it('deploys via undefined manifest, should fail', () => {
    execCmd('force:source:deploy --manifest "doesnotexist.xml --json', { ensureExitCode: 1 });
  });

  after(async () => {
    await session.clean();
  });
});
