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
@salesforce/plugin-source/1.2.4 linux-x64 node-v12.22.7
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`sfdx force:source:convert [-r <directory>] [-d <directory>] [-n <string>] [-p <array> | -x <string> | -m <array>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceconvert--r-directory--d-directory--n-string--p-array---x-string---m-array---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx `](#sfdx-)
- [`sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -x <filepath> | -m <array> | -p <array> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [--predestructivechanges <filepath> ] [--postdestructivechanges <filepath> ] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeploy---soapdeploy--w-minutes--q-id---x-filepath---m-array---p-array---c---l-notestrunrunspecifiedtestsrunlocaltestsrunalltestsinorg---r-array---o---g---predestructivechanges-filepath----postdestructivechanges-filepath---u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy:cancel [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeploycancel--w-minutes--i-id--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:deploy:report [-w <minutes>] [-i <id>] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcedeployreport--w-minutes--i-id--u-string---apiversion-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:manifest:create [-m <array> | -p <array>] [-n <string> | -t pre|post|destroy|package] [-o <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourcemanifestcreate--m-array---p-array--n-string---t-prepostdestroypackage--o-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:open -f <filepath> [-r] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceopen--f-filepath--r--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)
- [`sfdx force:source:retrieve [-p <array> | -x <filepath> | -m <array>] [-w <minutes>] [-n <array>] [-u <string>] [-a <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-forcesourceretrieve--p-array---x-filepath---m-array--w-minutes--n-array--u-string--a-string---verbose---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

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
                                                                                    metadataPackage_1634829671715]
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

_See code: [src/commands/force/source/convert.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/convert.ts)_

## `sfdx `

delete source from your project and from a non-source-tracked org

```
delete source from your project and from a non-source-tracked org
 Use this command to delete components from orgs that don’t have source tracking.
To remove deleted items from scratch orgs, which have change tracking, use "sfdx force:source:push".

USAGE
  $ sfdx force:source:delete

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
  Use this command to delete components from orgs that don’t have source tracking.
  To remove deleted items from scratch orgs, which have change tracking, use "sfdx force:source:push".

EXAMPLES
  $ sfdx force:source:delete -m <metadata>
  $ sfdx force:source:delete -p path/to/source
```

_See code: [src/commands/force/source/delete.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/delete.ts)_

## `sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -x <filepath> | -m <array> | -p <array> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [--predestructivechanges <filepath> ] [--postdestructivechanges <filepath> ] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

deploy source to an org

```
deploy source to an org
Use this command to deploy source (metadata that’s in source format) to an org.
To take advantage of change tracking with scratch orgs, use "sfdx force:source:push".
To deploy metadata that’s in metadata format, use "sfdx force:mdapi:deploy".

The source you deploy overwrites the corresponding metadata in your org. This command does not attempt to merge your source with the versions in your org.

To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue to use the CLI.
To check the status of the job, use force:source:deploy:report.

If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes. On Windows, if the list contains commas, also enclose the entire list in one set of double quotes.
 If you use the --manifest, --predestructivechanges, or --postdestructivechanges parameters, run the force:source:manifest:create command to easily generate the different types of manifest files.

USAGE
  $ sfdx force:source:deploy [--soapdeploy] [-w <minutes>] [-q <id> | -x <filepath> | -m <array> | -p <array> | -c | -l
  NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <array> | -o | -g] [--predestructivechanges <filepath>
  ] [--postdestructivechanges <filepath> ] [-u <string>] [--apiversion <string>] [--verbose] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

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

_See code: [src/commands/force/source/deploy.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/deploy.ts)_

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

_See code: [src/commands/force/source/deploy/cancel.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/deploy/cancel.ts)_

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

_See code: [src/commands/force/source/deploy/report.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/deploy/report.ts)_

## `sfdx force:source:manifest:create [-m <array> | -p <array>] [-n <string> | -t pre|post|destroy|package] [-o <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

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
  $ sfdx force:source:manifest:create [-m <array> | -p <array>] [-n <string> | -t pre|post|destroy|package] [-o
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

_See code: [src/commands/force/source/manifest/create.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/manifest/create.ts)_

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

_See code: [src/commands/force/source/open.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/open.ts)_

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
  path/to/apex/classes
  To retrieve all Apex classes:
      $ sfdx force:source:retrieve -m ApexClass
  To retrieve a specific Apex class:
      $ sfdx force:source:retrieve -m ApexClass:MyApexClass
  To retrieve all custom objects and Apex classes:
      $ sfdx force:source:retrieve -m "CustomObject,ApexClass
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

_See code: [src/commands/force/source/retrieve.ts](https://github.com/salesforcecli/plugin-source/blob/v1.2.4/src/commands/force/source/retrieve.ts)_

<!-- commandsstop -->
