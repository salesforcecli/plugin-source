# plugin-source (beta)

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
@salesforce/plugin-source/1.0.5 linux-x64 node-v12.22.4
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceconvert--r-directory--d-directory--n-string--p-array---x-string---m-array---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -x <filepath> | -m <array> | -p <array> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeploy---soapdeploy--w-minutes--q-id---x-filepath---m-array---p-array---c---l-notestrunrunspecifiedtestsrunlocaltestsrunalltestsinorg---r-array---o---g--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeploycancel--w-minutes--i-id--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeployreport--w-minutes--i-id--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:retrieve [-p <array> | -x <filepath> | -m <array>] [-w <minutes>] [-n <array>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceretrieve--p-array---x-filepath---m-array--w-minutes--n-array--u-string--a-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

convert source into Metadata API format

```
convert source into Metadata API format

USAGE
  $ sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>]
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         [default: ./] output directory to
                                                                                    store the Metadata API–formatted
                                                                                    files in

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

EXAMPLES
  $ sfdx force:source:convert -r path/to/source
  $ sfdx force:source:convert -r path/to/source -d path/to/outputdir -n 'My Package'
```

_See code: [src/commands/force/source/convert.ts](https://github.com/salesforcecli/plugin-source/blob/v1.0.5/src/commands/force/source/convert.ts)_

## `sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -x <filepath> | -m <array> | -p <array> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

deploy source to an org

```
deploy source to an org

USAGE
  $ sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -x <filepath> | -m <array> | -p <array> | -c | -l
  NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [-u <string>] [--apiversion
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

  --soapdeploy                                                                      deploy metadata with SOAP API
                                                                                    instead of REST API

  --verbose                                                                         verbose output of deploy result

EXAMPLES
  $ sfdx force:source:deploy -p path/to/source
  $ sfdx force:source:deploy -p "path/to/apex/classes/MyClass.cls,path/to/source/objects"
  $ sfdx force:source:deploy -p "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, path/to/apex/classes"
  $ sfdx force:source:deploy -m ApexClass
  $ sfdx force:source:deploy -m ApexClass:MyApexClass
  $ sfdx force:source:deploy -m "CustomObject,ApexClass"
  $ sfdx force:source:deploy -m "ApexClass, Profile:My Profile, Profile: AnotherProfile"
  $ sfdx force:source:deploy -x path/to/package.xml
  $ sfdx force:source:deploy -m ApexClass -l RunLocalTests
  $ sfdx force:source:deploy -m ApexClass -l RunAllTestsInOrg -c
  $ sfdx force:source:deploy -q 0Af9A00000FTM6pSAH
```

_See code: [src/commands/force/source/deploy.ts](https://github.com/salesforcecli/plugin-source/blob/v1.0.5/src/commands/force/source/deploy.ts)_

## `sfdx force:source:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

cancel a source deployment

```
cancel a source deployment

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

EXAMPLES
  $ sfdx force:source:deploy:cancel
  $ sfdx force:source:deploy:cancel -w 2
  $ sfdx force:source:deploy:cancel -i <jobid>
```

_See code: [src/commands/force/source/deploy/cancel.ts](https://github.com/salesforcecli/plugin-source/blob/v1.0.5/src/commands/force/source/deploy/cancel.ts)_

## `sfdx force:source:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

check the status of a metadata deployment

```
check the status of a metadata deployment

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

_See code: [src/commands/force/source/deploy/report.ts](https://github.com/salesforcecli/plugin-source/blob/v1.0.5/src/commands/force/source/deploy/report.ts)_

## `sfdx force:source:retrieve [-p <array> | -x <filepath> | -m <array>] [-w <minutes>] [-n <array>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

retrieve source from an org

```
retrieve source from an org

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

EXAMPLES
  sfdx force:source:retrieve -p path/to/source
  sfdx force:source:retrieve -p "path/to/apex/classes/MyClass.cls,path/to/source/objects"
  sfdx force:source:retrieve -p "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, path/to/apex/classes"
  sfdx force:source:retrieve -m ApexClass
  sfdx force:source:retrieve -m ApexClass:MyApexClass
  sfdx force:source:retrieve -m "CustomObject,ApexClass"
  sfdx force:source:retrieve -x path/to/package.xml
  sfdx force:source:retrieve -n "Package1, PackageName With Spaces, Package3"
  sfdx force:source:retrieve -n MyPackageName -p path/to/apex/classes
  sfdx force:source:retrieve -n MyPackageName -x path/to/package.xml
```

_See code: [src/commands/force/source/retrieve.ts](https://github.com/salesforcecli/plugin-source/blob/v1.0.5/src/commands/force/source/retrieve.ts)_
<!-- commandsstop -->
