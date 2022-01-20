# plugin-source (beta)

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-source.svg?label=@salesforce/plugin-source)](https://www.npmjs.com/package/@salesforce/plugin-source) [![CircleCI](https://circleci.com/gh/salesforcecli/plugin-source/tree/main.svg?style=shield)](https://circleci.com/gh/salesforcecli/plugin-source/tree/main) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-source.svg)](https://npmjs.org/package/@salesforce/plugin-source) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-source/main/LICENSE.txt)

Source commands for Salesforce CLI

#### Current List of Commands

1. force:source:convert
2. force:source:deploy
3. force:source:deploy:cancel
4. force:source:deploy:report
5. force:source:retrieve

This plugin will soon be bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific plugin version or tag if needed.

## Install

```bash
sfdx plugins:install source@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-source

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/run` or `./bin/run.cmd` file.

```bash
# Run using local run file.
./bin/run source:
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sfdx cli
sfdx plugins:link .
# To verify
sfdx plugins
```

# Usage

<!-- usage -->

```sh-session
$ npm install -g @salesforce/plugin-source
$ sfdx COMMAND
running command...
$ sfdx (-v|--version|version)
@salesforce/plugin-source/1.8.2 linux-x64 node-v12.22.9
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`sfdx force:mdapi:beta:convert -r <directory> [-d <directory>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapibetaconvert--r-directory--d-directory--p-array---x-string---m-array---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:beta:deploy [-d <directory>] [-w <minutes>] [-q <id> | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g | -c] [-f <filepath>] [-s] [--soapdeploy] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapibetadeploy--d-directory--w-minutes--q-id---l-notestrunrunspecifiedtestsrunlocaltestsrunalltestsinorg---r-array---o---g---c--f-filepath--s---soapdeploy--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:beta:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapibetadeployreport--w-minutes--i-id--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:beta:retrieve -r <directory> [-k <filepath> | -d <directory> | -p <array>] [-s] [-f <string>] [-z] [-w <minutes>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapibetaretrieve--r-directory--k-filepath---d-directory---p-array--s--f-string--z--w-minutes--u-string--a-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:beta:retrieve:report [-r <directory>] [-i <id>] [-n <string>] [-z] [-w <minutes>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapibetaretrievereport--r-directory--i-id--n-string--z--w-minutes--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapideploycancel--w-minutes--i-id--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:describemetadata [-f <filepath>] [-u <string>] [-a <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapidescribemetadata--f-filepath--u-string--a-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:mdapi:listmetadata -m <string> [-f <filepath>] [--folder <string>] [-u <string>] [-a <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcemdapilistmetadata--m-string--f-filepath---folder-string--u-string--a-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:beta:pull [-f] [-w <minutes>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcebetapull--f--w-minutes--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:beta:push [-f] [-w <minutes>] [-g] [-u <string>] [--apiversion <string>] [--quiet] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcebetapush--f--w-minutes--g--u-string---apiversion-string---quiet---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:beta:status [-l | -r] [-u <string>] [--apiversion <string>] [--concise] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcebetastatus--l---r--u-string---apiversion-string---concise---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:beta:tracking:clear [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcebetatrackingclear--p--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:beta:tracking:reset [-r <integer>] [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcebetatrackingreset--r-integer--p--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceconvert--r-directory--d-directory--n-string--p-array---x-string---m-array---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:delete [-c] [-w <minutes>] [-l NoTestRun|RunLocalTests|RunAllTestsInOrg] [-r] [-m <array>] [-p <array>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedelete--c--w-minutes--l-notestrunrunlocaltestsrunalltestsinorg--r--m-array--p-array--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [-m <array>] [-p <array>] [--predestructivechanges <filepath> -x <filepath>] [--postdestructivechanges <filepath> ] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeploy---soapdeploy--w-minutes--q-id---c---l-notestrunrunspecifiedtestsrunlocaltestsrunalltestsinorg---r-array---o---g--m-array--p-array---predestructivechanges-filepath--x-filepath---postdestructivechanges-filepath---u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeploycancel--w-minutes--i-id--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeployreport--w-minutes--i-id--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:manifest:create [-m <array>] [-p <array>] [-n <string> | -t pre|post|destroy|package] [-o <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcemanifestcreate--m-array--p-array--n-string---t-prepostdestroypackage--o-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:open -f <filepath> [-r] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceopen--f-filepath--r--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:retrieve [-p <array> | -x <filepath> | -m <array>] [-w <minutes>] [-n <array>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceretrieve--p-array---x-filepath---m-array--w-minutes--n-array--u-string--a-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx force:mdapi:beta:convert -r <directory> [-d <directory>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

convert metadata from the Metadata API format into the source format

```
convert metadata from the Metadata API format into the source format
Converts metadata retrieved via Metadata API into the source format used in Salesforce DX projects.

To use Salesforce CLI to work with components that you retrieved via Metadata API, first convert your files from the metadata format to the source format using "sfdx force:mdapi:convert".

To convert files from the source format back to the metadata format, so that you can deploy them using "sfdx force:mdapi:deploy", run "sfdx force:source:convert".

USAGE
  $ sfdx force:mdapi:beta:convert -r <directory> [-d <directory>] [-p <array> | -x <string> | -m <array>] [--json]
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         the output directory to store the
                                                                                    source–formatted files

  -m, --metadata=metadata                                                           comma-separated list of metadata
                                                                                    component names to convert

  -p, --metadatapath=metadatapath                                                   comma-separated list of metadata
                                                                                    file paths to convert

  -r, --rootdir=rootdir                                                             (required) the root directory
                                                                                    containing the Metadata
                                                                                    API–formatted metadata

  -x, --manifest=manifest                                                           file path to manifest (package.xml)
                                                                                    of metadata types to convert.

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Converts metadata retrieved via Metadata API into the source format used in Salesforce DX projects.

  To use Salesforce CLI to work with components that you retrieved via Metadata API, first convert your files from the
  metadata format to the source format using "sfdx force:mdapi:convert".

  To convert files from the source format back to the metadata format, so that you can deploy them using "sfdx
  force:mdapi:deploy", run "sfdx force:source:convert".

EXAMPLES
  $ sfdx force:mdapi:beta:convert -r path/to/metadata
  $ sfdx force:mdapi:beta:convert -r path/to/metadata -d path/to/outputdir
```

_See code: [src/commands/force/mdapi/beta/convert.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/beta/convert.ts)_

## `sfdx force:mdapi:beta:deploy [-d <directory>] [-w <minutes>] [-q <id> | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g | -c] [-f <filepath>] [-s] [--soapdeploy] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

deploy metadata to an org using Metadata API

```
deploy metadata to an org using Metadata API

USAGE
  $ sfdx force:mdapi:beta:deploy [-d <directory>] [-w <minutes>] [-q <id> | -l
  NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g | -c] [-f <filepath>] [-s]
  [--soapdeploy] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --checkonly                                                                   validate deploy but don’t save to
                                                                                    the org

  -d, --deploydir=deploydir                                                         root of directory tree of files to
                                                                                    deploy

  -f, --zipfile=zipfile                                                             path to .zip file of metadata to
                                                                                    deploy

  -g, --ignorewarnings                                                              whether a warning will allow a
                                                                                    deployment to complete successfully

  -l, --testlevel=(NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg)      [default: NoTestRun] deployment
                                                                                    testing level

  -o, --ignoreerrors                                                                ignore any errors and do not roll
                                                                                    back deployment

  -q, --validateddeployrequestid=validateddeployrequestid                           request ID of the validated
                                                                                    deployment to run a Quick Deploy

  -r, --runtests=runtests                                                           [default: ] tests to run if
                                                                                    --testlevel RunSpecifiedTests

  -s, --singlepackage                                                               Indicates that the zip file points
                                                                                    to a directory structure for a
                                                                                    single package

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 0 minutes] wait time for
                                                                                    command to finish in minutes
                                                                                    (default: 0)

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --soapdeploy                                                                      deploy metadata with SOAP API
                                                                                    instead of REST API

  --verbose                                                                         verbose output of deploy results

EXAMPLES
  Return a job ID you can use to check the deploy status:
     sfdx force:mdapi:beta:deploy -d some/path
  Deploy and poll for 1000 minutes:
     sfdx force:mdapi:beta:deploy -d some/path -w 1000
  Deploy a ZIP file:
     sfdx force:mdapi:beta:deploy -f stuff.zip
  Validate a deployment so the ID can be used for a quick deploy:
     sfdx force:mdapi:beta:deploy -d some/path -w 1000 -c --testlevel RunAllTestsInOrg
  Quick deploy using a previously validated deployment:
     sfdx force:mdapi:beta:deploy -q MyValidatedId
```

_See code: [src/commands/force/mdapi/beta/deploy.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/beta/deploy.ts)_

## `sfdx force:mdapi:beta:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

check the status of a metadata deployment

```
check the status of a metadata deployment

USAGE
  $ sfdx force:mdapi:beta:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose]
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -i, --jobid=jobid                                                                 job ID of the deployment to check;
                                                                                    required if you’ve never deployed
                                                                                    using Salesforce CLI; if not
                                                                                    specified, defaults to your most
                                                                                    recent CLI deployment

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes
                                                                                    (default: 33)

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of deploy results

EXAMPLES
  Check the status of the most recent deployment
    sfdx force:mdapi:beta:deploy:report
  Check the status of a deploy with job ID 1234 and wait for 10 minutes for the result:
    sfdx force:mdapi:beta:deploy:report -i 1234 -w 10
```

_See code: [src/commands/force/mdapi/beta/deploy/report.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/beta/deploy/report.ts)_

## `sfdx force:mdapi:beta:retrieve -r <directory> [-k <filepath> | -d <directory> | -p <array>] [-s] [-f <string>] [-z] [-w <minutes>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

retrieve metadata from an org using Metadata API

```
retrieve metadata from an org using Metadata API
Uses Metadata API to retrieve a .zip of XML files that represent metadata from the targeted org. The default target username is the admin user for the default scratch org. You can retrieve and deploy up to 10,000 files or 400 MB (39 MB compressed) at one time.

USAGE
  $ sfdx force:mdapi:beta:retrieve -r <directory> [-k <filepath> | -d <directory> | -p <array>] [-s] [-f <string>] [-z]
  [-w <minutes>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apiversion=apiversion                                                       target API version for the retrieve

  -d, --sourcedir=sourcedir                                                         source dir to use instead of the
                                                                                    default package dir in
                                                                                    sfdx-project.json

  -f, --zipfilename=zipfilename                                                     file name to use for the retrieved
                                                                                    zip file

  -k, --unpackaged=unpackaged                                                       file path of manifest of components
                                                                                    to retrieve

  -p, --packagenames=packagenames                                                   a comma-separated list of packages
                                                                                    to retrieve

  -r, --retrievetargetdir=retrievetargetdir                                         (required) directory root for the
                                                                                    retrieved files

  -s, --singlepackage                                                               indicates that the zip file points
                                                                                    to a directory structure for a
                                                                                    single package

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 1440 minutes] wait time
                                                                                    for command to finish in minutes

  -z, --unzip                                                                       extract all files from the retrieved
                                                                                    zip file

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of retrieve result

DESCRIPTION
  Uses Metadata API to retrieve a .zip of XML files that represent metadata from the targeted org. The default target
  username is the admin user for the default scratch org. You can retrieve and deploy up to 10,000 files or 400 MB (39
  MB compressed) at one time.

EXAMPLES
  Retrieve metadata in the default project directory into the target directory:
     sfdx force:mdapi:beta:retrieve -r path/to/retrieve/dir
  Retrieve metadata defined in the specified manifest into the target directory:
     sfdx force:mdapi:beta:retrieve -r path/to/retrieve/dir -k package.xml
  Retrieve metadata defined by the specified directory, name the retrieved zipfile and extract all contents
     sfdx force:mdapi:beta:retrieve -d path/to/apexClasses -r path/to/retrieve/dir --unzip --zipfilename apexClasses.zip
  Enqueue a retrieve request but do not wait for the metadata to be retrieved:
     sfdx force:mdapi:beta:retrieve -r path/to/retrieve/dir --wait 0
```

_See code: [src/commands/force/mdapi/beta/retrieve.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/beta/retrieve.ts)_

## `sfdx force:mdapi:beta:retrieve:report [-r <directory>] [-i <id>] [-n <string>] [-z] [-w <minutes>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

check the status of a metadata retrieval

```
check the status of a metadata retrieval
Specify the job ID and a target directory for the retrieve you want to check. You can also specify a wait time (minutes) to check for updates to the retrieve status. If the retrieve was successful, the resulting zip file will be saved to the location passed in with the retrieve target parameter.

USAGE
  $ sfdx force:mdapi:beta:retrieve:report [-r <directory>] [-i <id>] [-n <string>] [-z] [-w <minutes>] [-u <string>]
  [--apiversion <string>] [--verbose] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -i, --jobid=jobid                                                                 job ID of the retrieve you want to
                                                                                    check; defaults to your most recent
                                                                                    CLI retrieval if not specified

  -n, --zipfilename=zipfilename                                                     file name to use for the retrieved
                                                                                    zip file

  -r, --retrievetargetdir=retrievetargetdir                                         directory root for the retrieved
                                                                                    files

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 1440 minutes] wait time
                                                                                    for command to finish in minutes

  -z, --unzip                                                                       extract all files from the retrieved
                                                                                    zip file

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of retrieve result

DESCRIPTION
  Specify the job ID and a target directory for the retrieve you want to check. You can also specify a wait time
  (minutes) to check for updates to the retrieve status. If the retrieve was successful, the resulting zip file will be
  saved to the location passed in with the retrieve target parameter.

EXAMPLES
  Poll until the metadata is retrieved (or timeout is reached) using data from the last force:mdapi:retrieve command:
     sfdx force:mdapi:beta:retrieve:report
  Report the current status of the last retrieve command. If the retrieve is complete the zip file of metadata is
  written to the target directoy:
     sfdx force:mdapi:beta:retrieve:report -r path/to/retrieve/dir -w 0
  Poll until the metadata is retrieved (or timeout is reached) using the provided RetrieveID, naming the zip file and
  extracting all contents:
     sfdx force:mdapi:beta:retrieve:report -i retrieveId -r path/to/retrieve/dir --unzip --zipfilename apexClasses.zip
```

_See code: [src/commands/force/mdapi/beta/retrieve/report.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/beta/retrieve/report.ts)_

## `sfdx force:mdapi:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

cancel a metadata deployment

```
cancel a metadata deployment
 Use this command to cancel a specified asynchronous metadata deployment. You can also specify a wait time (in minutes) to check for updates to the canceled deploy status.

USAGE
  $ sfdx force:mdapi:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -i, --jobid=jobid                                                                 job ID of the deployment you want to
                                                                                    cancel; defaults to your most recent
                                                                                    CLI deployment if not specified

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Use this command to cancel a specified asynchronous metadata deployment. You can also specify a wait time (in minutes)
  to check for updates to the canceled deploy status.

EXAMPLES
  Deploy a directory of files to the org
     $ sfdx force:mdapi:deploy -d <directory>
  Now cancel this deployment and wait two minutes
     $ sfdx force:mdapi:deploy:cancel -w 2
  If you have multiple deployments in progress and want to cancel a specific one, specify the job ID
     $ sfdx force:mdapi:deploy:cancel -i <jobid>
  Check the status of the cancel job
     $ sfdx force:mdapi:deploy:report
```

_See code: [src/commands/force/mdapi/deploy/cancel.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/deploy/cancel.ts)_

## `sfdx force:mdapi:describemetadata [-f <filepath>] [-u <string>] [-a <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

display details about the metadata types enabled for your org

```
display details about the metadata types enabled for your org
Use this information to identify the syntax needed for a <name> element in package.xml. The most recent API version is the default, or you can specify an older version.

The default target username is the admin user for the default scratch org. The username must have the Modify All Data permission or the Modify Metadata permission (Beta). For more information about permissions, see Salesforce Help.

USAGE
  $ sfdx force:mdapi:describemetadata [-f <filepath>] [-u <string>] [-a <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apiversion=apiversion                                                       API version to use

  -f, --resultfile=resultfile                                                       path to the file where results are
                                                                                    stored

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Use this information to identify the syntax needed for a <name> element in package.xml. The most recent API version is
  the default, or you can specify an older version.

  The default target username is the admin user for the default scratch org. The username must have the Modify All Data
  permission or the Modify Metadata permission (Beta). For more information about permissions, see Salesforce Help.

EXAMPLES
  $ sfdx force:mdapi:describemetadata -a 43.0
  $ sfdx force:mdapi:describemetadata -u me@example.com
  $ sfdx force:mdapi:describemetadata -f /path/to/outputfilename.txt
  $ sfdx force:mdapi:describemetadata -u me@example.com -f /path/to/outputfilename.txt
```

_See code: [src/commands/force/mdapi/describemetadata.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/describemetadata.ts)_

## `sfdx force:mdapi:listmetadata -m <string> [-f <filepath>] [--folder <string>] [-u <string>] [-a <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

display properties of metadata components of a specified type

```
display properties of metadata components of a specified type
This command is useful when you want to identify individual components in your manifest file or if you want a high-level view of particular components in your organization. For example, you could use this target to return a list of names of all Layout components in your org, then use this information in a retrieve operation that returns a subset of these components.

USAGE
  $ sfdx force:mdapi:listmetadata -m <string> [-f <filepath>] [--folder <string>] [-u <string>] [-a <string>] [--json]
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apiversion=apiversion                                                       API version to use

  -f, --resultfile=resultfile                                                       path to the file where results are
                                                                                    stored

  -m, --metadatatype=metadatatype                                                   (required) metadata type to be
                                                                                    retrieved, such as CustomObject;
                                                                                    metadata type value is
                                                                                    case-sensitive

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --folder=folder                                                                   folder associated with the
                                                                                    component; required for components
                                                                                    that use folders; folder names are
                                                                                    case-sensitive

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  This command is useful when you want to identify individual components in your manifest file or if you want a
  high-level view of particular components in your organization. For example, you could use this target to return a list
  of names of all Layout components in your org, then use this information in a retrieve operation that returns a subset
  of these components.

EXAMPLES
  $ sfdx force:mdapi:listmetadata -m CustomObject
  $ sfdx force:mdapi:listmetadata -m CustomObject -a 43.0
  $ sfdx force:mdapi:listmetadata -m CustomObject -u me@example.com
  $ sfdx force:mdapi:listmetadata -m CustomObject -f /path/to/outputfilename.txt
  $ sfdx force:mdapi:listmetadata -m Dashboard --folder foldername
  $ sfdx force:mdapi:listmetadata -m Dashboard --folder foldername -a 43.0
  $ sfdx force:mdapi:listmetadata -m Dashboard --folder foldername -u me@example.com
  $ sfdx force:mdapi:listmetadata -m Dashboard --folder foldername -f /path/to/outputfilename.txt
  $ sfdx force:mdapi:listmetadata -m CustomObject -u me@example.com -f /path/to/outputfilename.txt
```

_See code: [src/commands/force/mdapi/listmetadata.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/mdapi/listmetadata.ts)_

## `sfdx force:source:beta:pull [-f] [-w <minutes>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

pull source from the scratch org to the project

```
pull source from the scratch org to the project

USAGE
  $ sfdx force:source:beta:pull [-f] [-w <minutes>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --forceoverwrite
      ignore conflict warnings and overwrite changes to the project

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  -w, --wait=wait
      [default: 33 minutes] The number of minutes to wait for the command to complete and display results to the terminal
      window. If the command continues to run after the wait period, the CLI returns control of the terminal window to
      you. The default is 33 minutes.

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation
```

_See code: [src/commands/force/source/beta/pull.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/beta/pull.ts)_

## `sfdx force:source:beta:push [-f] [-w <minutes>] [-g] [-u <string>] [--apiversion <string>] [--quiet] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

push source to a scratch org from the project

```
push source to a scratch org from the project

USAGE
  $ sfdx force:source:beta:push [-f] [-w <minutes>] [-g] [-u <string>] [--apiversion <string>] [--quiet] [--json]
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --forceoverwrite
      ignore conflict warnings and overwrite changes to scratch org

  -g, --ignorewarnings
      deploy changes even if warnings are generated

  -u, --targetusername=targetusername
      username or alias for the target org; overrides default target org

  -w, --wait=wait
      [default: 33 minutes] Number of minutes to wait for the command to complete and display results to the terminal
      window. If the command continues to run after the wait period, the CLI returns control of the terminal window to
      you. The default is 33 minutes.

  --apiversion=apiversion
      override the api version used for api requests made by this command

  --json
      format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)
      [default: warn] logging level for this command invocation

  --quiet
      minimize json and sdtout output on success
```

_See code: [src/commands/force/source/beta/push.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/beta/push.ts)_

## `sfdx force:source:beta:status [-l | -r] [-u <string>] [--apiversion <string>] [--concise] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

list local changes and/or changes in a scratch org

```
list local changes and/or changes in a scratch org

USAGE
  $ sfdx force:source:beta:status [-l | -r] [-u <string>] [--apiversion <string>] [--concise] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -l, --local                                                                       list the changes that have been made
                                                                                    locally

  -r, --remote                                                                      list the changes that have been made
                                                                                    in the scratch org

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --concise                                                                         show only the changes that will be
                                                                                    pushed or pulled; omits files that
                                                                                    are forceignored

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  sfdx force:source:beta:status -l
  sfdx force:source:status -r
  sfdx force:source:status -a
  sfdx force:source:status -a -u me@example.com --json
```

_See code: [src/commands/force/source/beta/status.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/beta/status.ts)_

## `sfdx force:source:beta:tracking:clear [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

clear all local source tracking information

```
clear all local source tracking information

WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

Clears all local source tracking information. When you next run force:source:beta:status, the CLI displays all local and remote files as changed, and any files with the same name are listed as conflicts.

USAGE
  $ sfdx force:source:beta:tracking:clear [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --noprompt                                                                    do not prompt for source tracking
                                                                                    override confirmation

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

  Clears all local source tracking information. When you next run force:source:beta:status, the CLI displays all local
  and remote files as changed, and any files with the same name are listed as conflicts.
```

_See code: [src/commands/force/source/beta/tracking/clear.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/beta/tracking/clear.ts)_

## `sfdx force:source:beta:tracking:reset [-r <integer>] [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

reset local and remote source tracking

```
reset local and remote source tracking

 WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

Resets local and remote source tracking so that the CLI no longer registers differences between your local files and those in the org. When you next run force:source:beta:status, the CLI returns no results, even though conflicts might actually exist. The CLI then resumes tracking new source changes as usual.

Use the --revision parameter to reset source tracking to a specific revision number of an org source member. To get the revision number, query the SourceMember Tooling API object with the force:data:soql:query command. For example:
 $ sfdx force:data:soql:query -q "SELECT MemberName, MemberType, RevisionCounter FROM SourceMember" -t

USAGE
  $ sfdx force:source:beta:tracking:reset [-r <integer>] [-p] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --noprompt                                                                    do not prompt for source tracking
                                                                                    override confirmation

  -r, --revision=revision                                                           reset to a specific SourceMember
                                                                                    revision counter number

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

  Resets local and remote source tracking so that the CLI no longer registers differences between your local files and
  those in the org. When you next run force:source:beta:status, the CLI returns no results, even though conflicts might
  actually exist. The CLI then resumes tracking new source changes as usual.

  Use the --revision parameter to reset source tracking to a specific revision number of an org source member. To get
  the revision number, query the SourceMember Tooling API object with the force:data:soql:query command. For example:
    $ sfdx force:data:soql:query -q "SELECT MemberName, MemberType, RevisionCounter FROM SourceMember" -t
```

_See code: [src/commands/force/source/beta/tracking/reset.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/beta/tracking/reset.ts)_

## `sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

convert source into Metadata API format

```
convert source into Metadata API format
 Converts source-formatted files into metadata that you can deploy using Metadata API.
To convert source-formatted files into the metadata format, so that you can deploy them using Metadata API,
run "sfdx force:source:convert". Then deploy the metadata using "sfdx force:mdapi:deploy".

To convert Metadata API–formatted files into the source format, run "sfdx force:mdapi:convert".

To specify a package name that includes spaces, enclose the name in single quotes.

USAGE
  $ sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>]
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         [default:
                                                                                    metadataPackage_1642700742206]
                                                                                    output directory to store the
                                                                                    Metadata API–formatted files in

  -m, --metadata=metadata                                                           comma-separated list of metadata
                                                                                    component names to convert

  -n, --packagename=packagename                                                     name of the package to associate
                                                                                    with the metadata-formatted files

  -p, --sourcepath=sourcepath                                                       comma-separated list of paths to the
                                                                                    local source files to convert

  -r, --rootdir=rootdir                                                             a source directory other than the
                                                                                    default package to convert

  -x, --manifest=manifest                                                           file path to manifest (package.xml)
                                                                                    of metadata types to convert.

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Converts source-formatted files into metadata that you can deploy using Metadata API.
  To convert source-formatted files into the metadata format, so that you can deploy them using Metadata API,
  run "sfdx force:source:convert". Then deploy the metadata using "sfdx force:mdapi:deploy".

  To convert Metadata API–formatted files into the source format, run "sfdx force:mdapi:convert".

  To specify a package name that includes spaces, enclose the name in single quotes.

EXAMPLES
  $ sfdx force:source:convert -r path/to/source
  $ sfdx force:source:convert -r path/to/source -d path/to/outputdir -n 'My Package'
```

_See code: [src/commands/force/source/convert.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/convert.ts)_

## `sfdx force:source:delete [-c] [-w <minutes>] [-l NoTestRun|RunLocalTests|RunAllTestsInOrg] [-r] [-m <array>] [-p <array>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

delete source from your project and from a non-source-tracked org

```
delete source from your project and from a non-source-tracked org
IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.

Use this command to delete components from orgs that don’t have source tracking.
To remove deleted items from scratch orgs, which have change tracking, use "sfdx force:source:push".

USAGE
  $ sfdx force:source:delete [-c] [-w <minutes>] [-l NoTestRun|RunLocalTests|RunAllTestsInOrg] [-r] [-m <array>] [-p
  <array>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --checkonly                                                                   validate delete command but do not
                                                                                    delete from the org or delete files
                                                                                    locally

  -l, --testlevel=(NoTestRun|RunLocalTests|RunAllTestsInOrg)                        [default: NoTestRun] deployment
                                                                                    testing level

  -m, --metadata=metadata                                                           comma-separated list of names of
                                                                                    metadata components to delete

  -p, --sourcepath=sourcepath                                                       comma-separated list of source file
                                                                                    paths to delete

  -r, --noprompt                                                                    do not prompt for delete
                                                                                    confirmation

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of delete result

DESCRIPTION
  IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained
  certain terms to avoid any effect on customer implementations.

  Use this command to delete components from orgs that don’t have source tracking.
  To remove deleted items from scratch orgs, which have change tracking, use "sfdx force:source:push".

EXAMPLES
  $ sfdx force:source:delete -m <metadata>
  $ sfdx force:source:delete -p path/to/source
```

_See code: [src/commands/force/source/delete.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/delete.ts)_

## `sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [-m <array>] [-p <array>] [--predestructivechanges <filepath> -x <filepath>] [--postdestructivechanges <filepath> ] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

deploy source to an org

```
deploy source to an org
IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.

Use this command to deploy source (metadata that’s in source format) to an org.
To take advantage of change tracking with scratch orgs, use "sfdx force:source:push".
To deploy metadata that’s in metadata format, use "sfdx force:mdapi:deploy".

The source you deploy overwrites the corresponding metadata in your org. This command does not attempt to merge your source with the versions in your org.

To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue to use the CLI.
To check the status of the job, use force:source:deploy:report.

If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes. On Windows, if the list contains commas, also enclose the entire list in one set of double quotes.
 If you use the --manifest, --predestructivechanges, or --postdestructivechanges parameters, run the force:source:manifest:create command to easily generate the different types of manifest files.

USAGE
  $ sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -c | -l
  NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [-m <array>] [-p <array>]
  [--predestructivechanges <filepath> -x <filepath>] [--postdestructivechanges <filepath> ] [-u <string>] [--apiversion
  <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -c, --checkonly                                                                   validate deploy but don’t save to
                                                                                    the org

  -g, --ignorewarnings                                                              whether a warning will allow a
                                                                                    deployment to complete successfully

  -l, --testlevel=(NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg)      [default: NoTestRun] deployment
                                                                                    testing level

  -m, --metadata=metadata                                                           comma-separated list of metadata
                                                                                    component names

  -o, --ignoreerrors                                                                ignore any errors and do not roll
                                                                                    back deployment

  -p, --sourcepath=sourcepath                                                       comma-separated list of source file
                                                                                    paths to deploy

  -q, --validateddeployrequestid=validateddeployrequestid                           deploy request ID of the validated
                                                                                    deployment to run a Quick Deploy

  -r, --runtests=runtests                                                           [default: ] tests to run if
                                                                                    --testlevel RunSpecifiedTests

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes

  -x, --manifest=manifest                                                           file path for manifest (package.xml)
                                                                                    of components to deploy

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --postdestructivechanges=postdestructivechanges                                   file path for a manifest
                                                                                    (destructiveChangesPost.xml) of
                                                                                    components to delete after the
                                                                                    deploy

  --predestructivechanges=predestructivechanges                                     file path for a manifest
                                                                                    (destructiveChangesPre.xml) of
                                                                                    components to delete before the
                                                                                    deploy

  --soapdeploy                                                                      deploy metadata with SOAP API
                                                                                    instead of REST API

  --verbose                                                                         verbose output of deploy result

DESCRIPTION
  IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained
  certain terms to avoid any effect on customer implementations.

  Use this command to deploy source (metadata that’s in source format) to an org.
  To take advantage of change tracking with scratch orgs, use "sfdx force:source:push".
  To deploy metadata that’s in metadata format, use "sfdx force:mdapi:deploy".

  The source you deploy overwrites the corresponding metadata in your org. This command does not attempt to merge your
  source with the versions in your org.

  To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue
  to use the CLI.
  To check the status of the job, use force:source:deploy:report.

  If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of
  double quotes. On Windows, if the list contains commas, also enclose the entire list in one set of double quotes.
    If you use the --manifest, --predestructivechanges, or --postdestructivechanges parameters, run the
  force:source:manifest:create command to easily generate the different types of manifest files.

EXAMPLES
  To deploy the source files in a directory:
  	$ sfdx force:source:deploy -p path/to/source
  To deploy a specific Apex class and the objects whose source is in a directory:
  	$ sfdx force:source:deploy -p "path/to/apex/classes/MyClass.cls,path/to/source/objects"
  To deploy source files in a comma-separated list that contains spaces:
      $ sfdx force:source:deploy -p "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, path/to/apex/classes"
  To deploy all Apex classes:
      $ sfdx force:source:deploy -m ApexClass
  To deploy a specific Apex class:
      $ sfdx force:source:deploy -m ApexClass:MyApexClass
  To deploy all custom objects and Apex classes:
      $ sfdx force:source:deploy -m "CustomObject,ApexClass"
  To deploy all Apex classes and two specific profiles (one of which has a space in its name):
      $ sfdx force:source:deploy -m "ApexClass, Profile:My Profile, Profile: AnotherProfile"
  To deploy all components listed in a manifest:
      $ sfdx force:source:deploy -x path/to/package.xml
  To run the tests that aren’t in any managed packages as part of a deployment:
      $ sfdx force:source:deploy -m ApexClass -l RunLocalTests
  To check whether a deployment would succeed (to prepare for Quick Deploy):
      $ sfdx force:source:deploy -m ApexClass -l RunAllTestsInOrg -c
  To deploy an already validated deployment (Quick Deploy):
       $ sfdx force:source:deploy -q 0Af9A00000FTM6pSAH`
  To run a destructive operation before the deploy occurs:
       $ sfdx force:source:deploy --manifest package.xml --predestructivechanges destructiveChangesPre.xml
  To run a destructive operation after the deploy occurs:
       $ sfdx force:source:deploy --manifest package.xml --postdestructivechanges destructiveChangesPost.xml
```

_See code: [src/commands/force/source/deploy.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/deploy.ts)_

## `sfdx force:source:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

cancel a source deployment

```
cancel a source deployment
 Use this command to cancel a specified asynchronous source deployment. You can also specify a wait time (in minutes) to check for updates to the canceled deploy status.

To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue to use the CLI.
To check the status of the job, use force:source:deploy:report.

USAGE
  $ sfdx force:source:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -i, --jobid=jobid                                                                 job ID of the deployment you want to
                                                                                    cancel; defaults to your most recent
                                                                                    CLI deployment if not specified

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Use this command to cancel a specified asynchronous source deployment. You can also specify a wait time (in minutes)
  to check for updates to the canceled deploy status.

  To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue
  to use the CLI.
  To check the status of the job, use force:source:deploy:report.

EXAMPLES
  Deploy a directory of files to the org
     $ sfdx force:source:deploy -d <directory>
  Now cancel this deployment and wait two minutes
     $ sfdx force:source:deploy:cancel -w 2
  If you have multiple deployments in progress and want to cancel a specific one, specify the job ID
     $ sfdx force:source:deploy:cancel -i <jobid>
  Check the status of the cancel job
     $ sfdx force:source:deploy:report
```

_See code: [src/commands/force/source/deploy/cancel.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/deploy/cancel.ts)_

## `sfdx force:source:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

check the status of a metadata deployment

```
check the status of a metadata deployment
Specify the job ID for the deploy you want to check. You can also specify a wait time (minutes) to check for updates to the deploy status.

USAGE
  $ sfdx force:source:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json]
  [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -i, --jobid=jobid                                                                 job ID of the deployment you want to
                                                                                    check; defaults to your most recent
                                                                                    CLI deployment if not specified

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of deploy result

DESCRIPTION
  Specify the job ID for the deploy you want to check. You can also specify a wait time (minutes) to check for updates
  to the deploy status.

EXAMPLES
  Deploy a directory of files to the org
    $ sfdx force:source:deploy -d <directory>
  Now cancel this deployment and wait two minutes
    $ sfdx force:source:deploy:cancel -w 2
  If you have multiple deployments in progress and want to cancel a specific one, specify the job ID
    $ sfdx force:source:deploy:cancel -i <jobid>
  Check the status of the cancel job
    $ sfdx force:source:deploy:report
```

_See code: [src/commands/force/source/deploy/report.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/deploy/report.ts)_

## `sfdx force:source:manifest:create [-m <array>] [-p <array>] [-n <string> | -t pre|post|destroy|package] [-o <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

create a project manifest that lists the metadata components you want to deploy or retrieve

```
create a project manifest that lists the metadata components you want to deploy or retrieve
 Create a manifest from a list of metadata components (--metadata) or from one or more local directories that contain source files (--sourcepath). You can specify either of these parameters, not both.

Use --manifesttype to specify the type of manifest you want to create. The resulting manifest files have specific names, such as the standard package.xml or destructiveChanges.xml to delete metadata. Valid values for this parameter, and their respective file names, are:

  package :  package.xml (default)
  pre : destructiveChangesPre.xml
  post : destructiveChangesPost.xml
  destroy : destructiveChanges.xml

See https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_deleting_files.htm for information about these destructive manifest files.

Use --manifestname to specify a custom name for the generated manifest if the pre-defined ones don’t suit your needs. You can specify either --manifesttype or --manifestname, but not both.


USAGE
  $ sfdx force:source:manifest:create [-m <array>] [-p <array>] [-n <string> | -t pre|post|destroy|package] [-o
  <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -m, --metadata=metadata                                                           comma-separated list of names of
                                                                                    metadata components to include in
                                                                                    the manifest

  -n, --manifestname=manifestname                                                   name of a custom manifest file to
                                                                                    create

  -o, --outputdir=outputdir                                                         directory to save the created
                                                                                    manifest

  -p, --sourcepath=sourcepath                                                       comma-separated list of paths to the
                                                                                    local source files to include in the
                                                                                    manifest

  -t, --manifesttype=(pre|post|destroy|package)                                     type of manifest to create; the type
                                                                                    determines the name of the created
                                                                                    file

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Create a manifest from a list of metadata components (--metadata) or from one or more local directories that contain
  source files (--sourcepath). You can specify either of these parameters, not both.

  Use --manifesttype to specify the type of manifest you want to create. The resulting manifest files have specific
  names, such as the standard package.xml or destructiveChanges.xml to delete metadata. Valid values for this parameter,
  and their respective file names, are:

     package :  package.xml (default)
     pre : destructiveChangesPre.xml
     post : destructiveChangesPost.xml
     destroy : destructiveChanges.xml

  See https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_deleting_files.htm for
  information about these destructive manifest files.

  Use --manifestname to specify a custom name for the generated manifest if the pre-defined ones don’t suit your needs.
  You can specify either --manifesttype or --manifestname, but not both.

EXAMPLES
  $ sfdx force:source:manifest:create -m ApexClass
  $ sfdx force:source:manifest:create -m ApexClass:MyApexClass --manifesttype destroy
  $ sfdx force:source:manifest:create --sourcepath force-app --manifestname myNewManifest
```

_See code: [src/commands/force/source/manifest/create.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/manifest/create.ts)_

## `sfdx force:source:open -f <filepath> [-r] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

edit a Lightning Page with Lightning App Builder

```
edit a Lightning Page with Lightning App Builder
Opens the specified Lightning Page in Lightning App Builder. Lightning Page files have the suffix .flexipage-meta.xml, and are stored in the flexipages directory. If you specify a different type of file, this command opens your org’s home page.

The file opens in your default browser.
If no browser-based editor is available for the selected file, this command opens your org's home page.
To generate a URL for the browser-based editor but not open the editor, use --urlonly.

USAGE
  $ sfdx force:source:open -f <filepath> [-r] [-u <string>] [--apiversion <string>] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --sourcefile=sourcefile                                                       (required) file to edit

  -r, --urlonly                                                                     generate a navigation URL; don’t
                                                                                    launch the editor

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

DESCRIPTION
  Opens the specified Lightning Page in Lightning App Builder. Lightning Page files have the suffix .flexipage-meta.xml,
  and are stored in the flexipages directory. If you specify a different type of file, this command opens your org’s
  home page.

  The file opens in your default browser.
  If no browser-based editor is available for the selected file, this command opens your org's home page.
  To generate a URL for the browser-based editor but not open the editor, use --urlonly.

EXAMPLES
  $ sfdx force:source:open -f path/to/source
  $ sfdx force:source:open -r -f path/to/source
  $ sfdx force:source:open -f path/to/source -u my-user@my-org.com
```

_See code: [src/commands/force/source/open.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/open.ts)_

## `sfdx force:source:retrieve [-p <array> | -x <filepath> | -m <array>] [-w <minutes>] [-n <array>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

retrieve source from an org

```
retrieve source from an org
Use this command to retrieve source (metadata that’s in source format) from an org.
To take advantage of change tracking with scratch orgs, use "sfdx force:source:pull".
To retrieve metadata that’s in metadata format, use "sfdx force:mdapi:retrieve".

The source you retrieve overwrites the corresponding source files in your local project. This command does not attempt to merge the source from your org with your local source files.

If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes. On Windows, if the list contains commas, also enclose it in one set of double quotes.

USAGE
  $ sfdx force:source:retrieve [-p <array> | -x <filepath> | -m <array>] [-w <minutes>] [-n <array>] [-u <string>] [-a
  <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -a, --apiversion=apiversion                                                       override the api version used for
                                                                                    api requests made by this command

  -m, --metadata=metadata                                                           comma-separated list of metadata
                                                                                    component names

  -n, --packagenames=packagenames                                                   a comma-separated list of packages
                                                                                    to retrieve

  -p, --sourcepath=sourcepath                                                       comma-separated list of source file
                                                                                    paths to retrieve

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -w, --wait=wait                                                                   [default: 33 minutes] wait time for
                                                                                    command to finish in minutes

  -x, --manifest=manifest                                                           file path for manifest (package.xml)
                                                                                    of components to retrieve

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

  --verbose                                                                         verbose output of retrieve result

DESCRIPTION
  Use this command to retrieve source (metadata that’s in source format) from an org.
  To take advantage of change tracking with scratch orgs, use "sfdx force:source:pull".
  To retrieve metadata that’s in metadata format, use "sfdx force:mdapi:retrieve".

  The source you retrieve overwrites the corresponding source files in your local project. This command does not attempt
  to merge the source from your org with your local source files.

  If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of
  double quotes. On Windows, if the list contains commas, also enclose it in one set of double quotes.

EXAMPLES
  To retrieve the source files in a directory:
      $ sfdx force:source:retrieve -p path/to/source
  To retrieve a specific Apex class and the objects whose source is in a directory:
      $ sfdx force:source:retrieve -p "path/to/apex/classes/MyClass.cls,path/to/source/objects"
  To retrieve source files in a comma-separated list that contains spaces:
      $ sfdx force:source:retrieve -p "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml,
  path/to/apex/classes"
  To retrieve all Apex classes:
      $ sfdx force:source:retrieve -m ApexClass
  To retrieve a specific Apex class:
      $ sfdx force:source:retrieve -m ApexClass:MyApexClass
  To retrieve all custom objects and Apex classes:
      $ sfdx force:source:retrieve -m "CustomObject,ApexClass"
  To retrieve all Apex classes and two specific profiles (one of which has a space in its name):
      $ sfdx force:source:retrieve -m "ApexClass, Profile:My Profile, Profile: AnotherProfile"
  To retrieve all metadata components listed in a manifest:
      $ sfdx force:source:retrieve -x path/to/package.xml
  To retrieve metadata from a package or multiple packages:
      $ sfdx force:source:retrieve -n MyPackageName
      $ sfdx force:source:retrieve -n "Package1, PackageName With Spaces, Package3"
  To retrieve all metadata from a package and specific components that aren’t in the package, specify both -n |
  --packagenames and one other scoping parameter:
      $ sfdx force:source:retrieve -n MyPackageName -p path/to/apex/classes
      $ sfdx force:source:retrieve -n MyPackageName -m ApexClass:MyApexClass
      $ sfdx force:source:retrieve -n MyPackageName -x path/to/package.xml
```

_See code: [src/commands/force/source/retrieve.ts](https://github.com/salesforcecli/plugin-source/blob/v1.8.2/src/commands/force/source/retrieve.ts)_

<!-- commandsstop -->
