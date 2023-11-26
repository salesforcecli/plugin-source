# plugin-source

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-source.svg?label=@salesforce/plugin-source)](https://www.npmjs.com/package/@salesforce/plugin-source) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-source.svg)](https://npmjs.org/package/@salesforce/plugin-source) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-source/main/LICENSE.txt)

Commands for interacting with metadata in Salesforce orgs.

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific plugin version or tag if needed.

## Install

```bash
sfdx plugins:install source@x.y.z
```

## Issues

Please report any issues at <https://github.com/forcedotcom/cli/issues>

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
Agreement. You can do so by going to <https://cla.salesforce.com/sign-cla>.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-source

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev source:
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
$ sfdx (--version)
@salesforce/plugin-source/2.11.5 linux-x64 node-v18.18.2
$ sfdx --help [COMMAND]
USAGE
  $ sfdx COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`sfdx force mdapi deploy`](#sfdx-force-mdapi-deploy)
- [`sfdx force mdapi deploy cancel`](#sfdx-force-mdapi-deploy-cancel)
- [`sfdx force mdapi deploy report`](#sfdx-force-mdapi-deploy-report)
- [`sfdx force mdapi retrieve`](#sfdx-force-mdapi-retrieve)
- [`sfdx force mdapi retrieve report`](#sfdx-force-mdapi-retrieve-report)
- [`sfdx force source deploy`](#sfdx-force-source-deploy)
- [`sfdx force source deploy cancel`](#sfdx-force-source-deploy-cancel)
- [`sfdx force source deploy report`](#sfdx-force-source-deploy-report)
- [`sfdx force source pull`](#sfdx-force-source-pull)
- [`sfdx force source push`](#sfdx-force-source-push)
- [`sfdx force source retrieve`](#sfdx-force-source-retrieve)
- [`sfdx force source status`](#sfdx-force-source-status)

## `sfdx force mdapi deploy`

Deploy metadata to an org using Metadata API.

```
USAGE
  $ sfdx force mdapi deploy -u <value> [--json] [--api-version <value>] [-d <value>] [-w <value>] [-o] [-g] [-q <value>
    | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r <value> | -c] [--verbose] [-f <value>] [-s]
    [--soapdeploy] [--purgeondelete] [--concise] [--resultsdir <value>] [--coverageformatters
    clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary] [--junit]

FLAGS
  -c, --checkonly
      Validates the deployed metadata and runs all Apex tests, but prevents the deployment from being saved to the org.

  -d, --deploydir=<value>
      Root of directory tree that contains the files you want to deploy.

  -f, --zipfile=<value>
      Path to .zip file of metadata to deploy.

  -g, --ignorewarnings
      Ignore any warnings and don't roll back the deployment.

  -l, --testlevel=<option>
      Level of deployment tests to run.
      <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>

  -o, --ignoreerrors
      Ignore any errors and don't roll back the deployment.

  -q, --validateddeployrequestid=<value>
      Request ID of the validated deployment to run a Quick Deploy.

  -r, --runtests=<value>...
      Apex test classes to run if --testlevel is RunSpecifiedTests.

  -s, --singlepackage
      Indicates that the zip file points to a directory structure for a single package.

  -u, --target-org=<value>
      (required) Username or alias of the target org.

  -w, --wait=<value>
      [default: 0 minutes] Number of minutes to wait for the command to finish; specify -1 to wait indefinitely.

  --api-version=<value>
      Override the api version used for api requests made by this command

  --concise
      Omit success messages for smaller JSON output.

  --coverageformatters=clover,cobertura,html-spa,html,json,json-summary,lcovonly,none,teamcity,text,text-summary...
      Format of the code coverage results.

  --junit
      Output JUnit test results.

  --purgeondelete
      Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion
      rather than being stored in the Recycle Bin.

  --resultsdir=<value>
      Output directory for code coverage and JUnit results; defaults to the deploy ID.

  --soapdeploy
      Deploy metadata with SOAP API instead of REST API.

  --verbose
      Display verbose output of the deploy results.

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  Return a job ID you can use to check the deploy status:

    $ sfdx force mdapi deploy --deploydir some/path

  Deploy and poll for 1000 minutes:

    $ sfdx force mdapi deploy --deploydir some/path --wait 1000

  Deploy a ZIP file:

    $ sfdx force mdapi deploy --zipfile stuff.zip

  Validate a deployment so the ID can be used for a quick deploy:

    $ sfdx force mdapi deploy --deploydir some/path --wait 1000 --checkonly --testlevel RunAllTestsInOrg

  Quick deploy using a previously validated deployment:

    $ sfdx force mdapi deploy --validateddeployrequestid MyValidatedId

FLAG DESCRIPTIONS
  -c, --checkonly

    Validates the deployed metadata and runs all Apex tests, but prevents the deployment from being saved to the org.

    IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained
    certain terms to avoid any effect on customer implementations.

    If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the
    --checkonly parameter to test a deployment (validation). This kind of change isn’t supported for test deployments to
    avoid the risk of data loss or corruption. If a change that isn’t supported for test deployments is included in a
    deployment package, the test deployment fails and issues an error.

    If your deployment package changes a field type from Master-Detail to Lookup or vice versa, you can still validate
    the changes prior to deploying to Production by performing a full deployment to another test Sandbox. A full
    deployment includes a validation of the changes as part of the deployment process.

    Note: A Metadata API deployment that includes Master-Detail relationships deletes all detail records in the Recycle
    Bin in the following cases.

    1. For a deployment with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before
    proceeding to deploy the Master-Detail field, or the deployment fails. During the deployment, detail records are
    permanently deleted from the Recycle Bin and cannot be recovered.
    2. For a deployment that converts a Lookup field relationship to a Master-Detail relationship, detail records must
    reference a master record or be soft-deleted (sent to the Recycle Bin) for the deployment to succeed. However, a
    successful deployment permanently deletes any detail records in the Recycle Bin.

  -d, --deploydir=<value>  Root of directory tree that contains the files you want to deploy.

    The root must contain a valid package.xml file describing the entities in the directory structure. Required to
    initiate a deployment if you don’t use --zipfile. If you specify both --zipfile and --deploydir, a zip file of the
    contents of the --deploydir directory is written to the location specified by --zipfile.

  -f, --zipfile=<value>  Path to .zip file of metadata to deploy.

    You must indicate this option or --deploydir. If you specify both --zipfile and --deploydir, a .zip file of the
    contents of the deploy directory is created at the path specified for the .zip file.

  -g, --ignorewarnings  Ignore any warnings and don't roll back the deployment.

    If a warning occurs and ignoreWarnings is set to true, the success field in DeployMessage is true. When
    ignoreWarnings is set to false, success is set to false, and the warning is treated like an error.
    This field is available in API version 18.0 and later. Prior to version 18.0, there was no distinction between
    warnings and errors. All problems were treated as errors and prevented a successful deployment.

  -l, --testlevel=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Level of deployment tests to run.

    Valid values are:

    * NoTestRun—No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.
    * RunSpecifiedTests—Runs only the tests that you specify in the --runtests option. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.
    * RunLocalTests—All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.
    * RunAllTestsInOrg—All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

  -o, --ignoreerrors  Ignore any errors and don't roll back the deployment.

    The default is false. Keep this parameter set to false when deploying to a production org. If set to true,
    components without errors are deployed, and components with errors are skipped.

  -q, --validateddeployrequestid=<value>  Request ID of the validated deployment to run a Quick Deploy.

    Deploying a validation helps you shorten your deployment time because tests aren’t rerun. If you have a recent
    successful validation, you can deploy the validated components without running tests. A validation doesn’t save any
    components in the org. You use a validation only to check the success or failure messages that you would receive
    with an actual deployment. To validate your components, add the -c | --checkonly flag when you run 'force mdapi
    deploy'. This flag sets the checkOnly='true' parameter for your deployment. Before deploying a recent validation,
    ensure that the following requirements are met:

    1. The components have been validated successfully for the target environment within the last 10 days.
    2. As part of the validation, Apex tests in the target org have passed.
    3. Code coverage requirements are met.
    - If all tests in the org or all local tests are run, overall code coverage is at least 75%, and Apex triggers have
    some coverage.
    - If specific tests are run with the RunSpecifiedTests test level, each class and trigger that was deployed is
    covered by at least 75% individually.

  -s, --singlepackage  Indicates that the zip file points to a directory structure for a single package.

    By default, the CLI assumes the directory is structured for a set of packages.

  -w, --wait=<value>  Number of minutes to wait for the command to finish; specify -1 to wait indefinitely.

    The default is 0 (returns immediately).

  --soapdeploy  Deploy metadata with SOAP API instead of REST API.

    Because SOAP API has a lower .ZIP file size limit (400 MB uncompressed, 39 MB compressed), Salesforce recommends
    REST API deployment. This flag provides backwards compatibility with API version 50.0 and earlier when deploy used
    SOAP API by default.

  --verbose  Display verbose output of the deploy results.

    Indicates that you want verbose output from the deploy operation.
```

_See code: [src/commands/force/mdapi/deploy.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/mdapi/deploy.ts)_

## `sfdx force mdapi deploy cancel`

Cancel a metadata deployment.

```
USAGE
  $ sfdx force mdapi deploy cancel -o <value> [--json] [--api-version <value>] [-w <value>] [-i <value>]

FLAGS
  -i, --jobid=<value>        Job ID of the deployment you want to cancel; defaults to your most recent CLI deployment.
  -o, --target-org=<value>   (required) Username or alias of the target org.
  -w, --wait=<value>         [default: 33 minutes] Number of minutes for the command to complete and display results to
                             the terminal window.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Cancel a metadata deployment.

  Use this command to cancel a specified asynchronous metadata deployment. You can also specify a wait time (in minutes)
  to check for updates to the canceled deploy status.

  Cancels an asynchronous metadata deployment.

EXAMPLES
  Cancel a deployment and wait two minutes:

    $ sfdx force mdapi deploy cancel --wait 2

  If you have multiple deployments in progress and want to cancel a specific one, specify the job ID:

    $ sfdx force mdapi deploy cancel --jobid <jobid>

FLAG DESCRIPTIONS
  -w, --wait=<value>  Number of minutes for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.
```

_See code: [src/commands/force/mdapi/deploy/cancel.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/mdapi/deploy/cancel.ts)_

## `sfdx force mdapi deploy report`

Check the status of a metadata deployment.

```
USAGE
  $ sfdx force mdapi deploy report -o <value> [--json] [--api-version <value>] [-w <value>] [-i <value>] [--verbose]
    [--concise] [--resultsdir <value>] [--coverageformatters
    clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary] [--junit]

FLAGS
  -i, --jobid=<value>
      Job ID of the deployment to check; required if you’ve never deployed using Salesforce CLI; defaults to your most
      recent CLI deployment.

  -o, --target-org=<value>
      (required) Username or alias of the target org.

  -w, --wait=<value>
      [default: 0 minutes] Number of minutes to wait for the command to finish; use -1 to poll indefinitely.

  --api-version=<value>
      Override the api version used for api requests made by this command

  --concise
      Omit success messages for smaller JSON output.

  --coverageformatters=clover,cobertura,html-spa,html,json,json-summary,lcovonly,none,teamcity,text,text-summary...
      Format of the code coverage results.

  --junit
      Output JUnit test results.

  --resultsdir=<value>
      Output directory for code coverage and JUnit results; defaults to the deploy ID.

  --verbose
      Verbose output of deploy results.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check the status of a metadata deployment.

  Specify the job ID for the deploy you want to check. The job ID is returned by the "force mdapi deploy" command when
  run without the --wait parameter. You can also specify a wait time (minutes) to check for updates to the deploy
  status.

EXAMPLES
  Check the status of the most recent deployment

    $ sfdx force mdapi deploy report

  Check the status of a deploy with job ID 1234 and wait for 10 minutes for the result:

    $ sfdx force mdapi deploy report --jobid 1234 --wait 10

FLAG DESCRIPTIONS
  -i, --jobid=<value>

    Job ID of the deployment to check; required if you’ve never deployed using Salesforce CLI; defaults to your most
    recent CLI deployment.

    The job ID (id field value for AsyncResult) of the deployment you want to check. The job ID is required if you
    haven’t previously deployed using Salesforce CLI. If you deploy using Salesforce CLI and don’t specify a job ID, we
    use the ID of the most recent metadata deployment.
```

_See code: [src/commands/force/mdapi/deploy/report.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/mdapi/deploy/report.ts)_

## `sfdx force mdapi retrieve`

Retrieve metadata from an org using Metadata API.

```
USAGE
  $ sfdx force mdapi retrieve -o <value> -r <value> [--json] [-k <value> | -d <value> | -p <value>] [-s] [-n <value>] [-z]
    [-w <value>] [-a <value>] [--verbose]

FLAGS
  -a, --apiversion=<value>         Target API version for the retrieve.
  -d, --sourcedir=<value>          Source directory to use instead of the default package directory specified in
                                   sfdx-project.json.
  -k, --unpackaged=<value>         Complete path for the manifest file that specifies the components to retrieve.
  -n, --zipfilename=<value>        File name to use for the retrieved zip file.
  -o, --target-org=<value>         (required) Username or alias of the target org.
  -p, --packagenames=<value>...    Comma-separated list of packages to retrieve.
  -r, --retrievetargetdir=<value>  (required) Root of the directory structure where the retrieved .zip or metadata files
                                   are retrieved.
  -s, --singlepackage              Specify that the zip file points to a directory structure for a single package.
  -w, --wait=<value>               [default: 1440 minutes] Number of minutes to wait for the command to complete.
  -z, --unzip                      Extract all files from the retrieved zip file.
      --verbose                    Display verbose output of retrieve result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Retrieve metadata from an org using Metadata API.

  This command uses Metadata API to retrieve a .zip of XML files that represent metadata from the targeted org. You can
  retrieve and deploy up to 10,000 files or 400 MB (39 MB compressed) at one time.

EXAMPLES
  Retrieve metadata in the default project directory into the target directory:

    $ sfdx force mdapi retrieve --retrievetargetdir path/to/retrieve/dir

  Retrieve metadata defined in the specified manifest into the target directory:

    $ sfdx force mdapi retrieve --retrievetargetdir path/to/retrieve/dir --unpackaged package.xml

  Retrieve metadata defined by the specified directory, name the retrieved zipfile and extract all contents

    $ sfdx force mdapi retrieve --sourcedir path/to/apexClasses --retrievetargetdir path/to/retrieve/dir --unzip \
      --zipfilename apexClasses.zip

  Enqueue a retrieve request but do not wait for the metadata to be retrieved:

    $ sfdx force mdapi retrieve --retrievetargetdir path/to/retrieve/dir --wait 0

FLAG DESCRIPTIONS
  -a, --apiversion=<value>  Target API version for the retrieve.

    Use to override the default, which is the latest version supported by your CLI plug-in, with the version in your
    package.xml file.

  -s, --singlepackage  Specify that the zip file points to a directory structure for a single package.

    By default, the CLI assumes the directory is structured for a set of packages.
```

_See code: [src/commands/force/mdapi/retrieve.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/mdapi/retrieve.ts)_

## `sfdx force mdapi retrieve report`

Check the status of a metadata retrieval.

```
USAGE
  $ sfdx force mdapi retrieve report -o <value> [--json] [--api-version <value>] [-r <value>] [-i <value>] [-n <value>] [-z] [-w
    <value>] [--verbose]

FLAGS
  -i, --jobid=<value>              Job ID of the retrieve you want to check; defaults to your most recent CLI retrieval.
  -n, --zipfilename=<value>        File name to use for the retrieved zip file.
  -o, --target-org=<value>         (required) Username or alias of the target org.
  -r, --retrievetargetdir=<value>  Root of the directory structure where the retrieved .zip or metadata files are
                                   retrieved.
  -w, --wait=<value>               [default: 1440 minutes] Number of minutes to wait for the command to complete.
  -z, --unzip                      Extract all files from the retrieved zip file.
      --api-version=<value>        Override the api version used for api requests made by this command
      --verbose                    Display verbose output of retrieve result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check the status of a metadata retrieval.

  Specify the job ID and a target directory for the retrieve you want to check. You can also specify a wait time
  (minutes) to check for updates to the retrieve status. If the retrieve was successful, the resulting zip file will be
  saved to the location passed in with the retrieve target parameter.

EXAMPLES
  Poll until the metadata is retrieved (or timeout is reached) using data from the last force:mdapi:retrieve command:

    $ sfdx force mdapi retrieve report

  Report the current status of the last retrieve command. If the retrieve is complete the zip file of metadata is
  written to the target directoy:

    $ sfdx force mdapi retrieve report --retrievetargetdir path/to/retrieve/dir --wait 0

  Poll until the metadata is retrieved (or timeout is reached) using the provided RetrieveID, naming the zip file and
  extracting all contents:

    $ sfdx force mdapi retrieve report -i retrieveId --retrievetargetdir path/to/retrieve/dir --unzip --zipfilename \
      apexClasses.zip

FLAG DESCRIPTIONS
  -i, --jobid=<value>  Job ID of the retrieve you want to check; defaults to your most recent CLI retrieval.

    You must specify a --retrievetargetdir. Use with --wait to resume waiting.
```

_See code: [src/commands/force/mdapi/retrieve/report.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/mdapi/retrieve/report.ts)_

## `sfdx force source deploy`

Deploy source to an org.

```
USAGE
  $ sfdx force source deploy -u <value> [--json] [--api-version <value>] [--soapdeploy] [-w <value>] [-o] [-g]
    [--purgeondelete -x <value>] [-q <value> | -c | -l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg | -r
    <value> | -t] [--verbose] [-m <value>] [-p <value>] [--predestructivechanges <value> ] [--postdestructivechanges
    <value> ] [-f ] [--resultsdir <value>] [--coverageformatters
    clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary] [--junit]

FLAGS
  -c, --checkonly
      Validate the deployed metadata and run all Apex tests, but don't save to the org.

  -f, --forceoverwrite
      Ignore conflict warnings and overwrite changes to the org.

  -g, --ignorewarnings
      Allow a deployment to complete successfully even if there are warnings.

  -l, --testlevel=<option>
      Deployment testing level.
      <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>

  -m, --metadata=<value>...
      Comma-separated list of metadata component names.

  -o, --ignoreerrors
      Ignore any errors and don't roll back deployment.

  -p, --sourcepath=<value>...
      Comma-separated list of source file paths to deploy.

  -q, --validateddeployrequestid=<value>
      Deploy request ID of the validated deployment to run a Quick Deploy.

  -r, --runtests=<value>...
      Apex test classes to run if --testlevel RunSpecifiedTests.

  -t, --tracksource
      If the deploy succeeds, update source tracking information.

  -u, --target-org=<value>
      (required) Username or alias of the target org.

  -w, --wait=<value>
      [default: 33 minutes] Wait time for command to finish in minutes.

  -x, --manifest=<value>
      Complete path for the manifest (package.xml) file that specifies the components to deploy.

  --api-version=<value>
      Override the api version used for api requests made by this command

  --coverageformatters=clover,cobertura,html-spa,html,json,json-summary,lcovonly,none,teamcity,text,text-summary...
      Format of the code coverage results.

  --junit
      Output JUnit test results.

  --postdestructivechanges=<value>
      File path for a manifest (destructiveChangesPost.xml) of components to delete after the deploy.

  --predestructivechanges=<value>
      File path for a manifest (destructiveChangesPre.xml) of components to delete before the deploy.

  --purgeondelete
      Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion
      rather than being stored in the Recycle Bin.

  --resultsdir=<value>
      Output directory for code coverage and JUnit results; defaults to the deploy ID.

  --soapdeploy
      Deploy metadata with SOAP API instead of REST API.

  --verbose
      Specify verbose output about the deploy result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deploy source to an org.

  Use this command to deploy source (metadata that’s in source format) to an org. To take advantage of change tracking
  with scratch orgs, use "force source push". To deploy metadata that’s in metadata format, use "force mdapi deploy".

  The source you deploy overwrites the corresponding metadata in your org. This command does not attempt to merge your
  source with the versions in your org.

  To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue
  to use the CLI. To check the status of the job, use "force source deploy report".

  If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of
  double quotes. On Windows, if the list contains commas, also enclose the entire list in one set of double quotes.

  If you use the --manifest, --predestructivechanges, or --postdestructivechanges parameters, run the "force source
  manifest create" command to easily generate the different types of manifest files.

EXAMPLES
  Deploy the source files in a directory:

    $ sfdx force source deploy --sourcepath path/to/source

  Deploy a specific Apex class and the objects whose source is in a directory:

    $ sfdx force source deploy --sourcepath "path/to/apex/classes/MyClass.cls,path/to/source/objects"

  Deploy source files in a comma-separated list that contains spaces:

    $ sfdx force source deploy --sourcepath "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, \
      path/to/apex/classes"

  Deploy all Apex classes:

    $ sfdx force source deploy --metadata ApexClass

  Deploy a specific Apex class:

    $ sfdx force source deploy --metadata ApexClass:MyApexClass

  Deploy a specific Apex class and update source tracking files :

    $ sfdx force source deploy --metadata ApexClass:MyApexClass --tracksource

  Deploy all custom objects and Apex classes:

    $ sfdx force source deploy --metadata "CustomObject,ApexClass"

  Deploy all Apex classes and two specific profiles (one of which has a space in its name):

    $ sfdx force source deploy --metadata "ApexClass, Profile:My Profile, Profile: AnotherProfile"

  Deploy all components listed in a manifest:

    $ sfdx force source deploy --manifest path/to/package.xml

  Run the tests that aren’t in any managed packages as part of a deployment:

    $ sfdx force source deploy --metadata ApexClass --testlevel RunLocalTests

  Check whether a deployment would succeed (to prepare for Quick Deploy):

    $ sfdx force source deploy --metadata ApexClass --testlevel RunAllTestsInOrg -c

  Deploy an already validated deployment (Quick Deploy):

    $ sfdx force source deploy --validateddeployrequestid 0Af9A00000FTM6pSAH`

  Run a destructive operation before the deploy occurs:

    $ sfdx force source deploy --manifest package.xml --predestructivechanges destructiveChangesPre.xml

  Run a destructive operation after the deploy occurs:

    $ sfdx force source deploy --manifest package.xml --postdestructivechanges destructiveChangesPost.xml

FLAG DESCRIPTIONS
  -c, --checkonly  Validate the deployed metadata and run all Apex tests, but don't save to the org.

    IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained
    certain terms to avoid any effect on customer implementations.

    If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the
    --checkonly parameter to test a deployment (validation). This kind of change isn’t supported for test deployments to
    avoid the risk of data loss or corruption. If a change that isn’t supported for test deployments is included in a
    deployment package, the test deployment fails and issues an error.

    If your deployment package changes a field type from Master-Detail to Lookup or vice versa, you can still validate
    the changes prior to deploying to Production by performing a full deployment to another test Sandbox. A full
    deployment includes a validation of the changes as part of the deployment process.

    Note: A Metadata API deployment that includes Master-Detail relationships deletes all detail records in the Recycle
    Bin in the following cases.

    1. For a deployment with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before
    proceeding to deploy the Master-Detail field, or the deployment fails. During the deployment, detail records are
    permanently deleted from the Recycle Bin and cannot be recovered.

    2. For a deployment that converts a Lookup field relationship to a Master-Detail relationship, detail records must
    reference a master record or be soft-deleted (sent to the Recycle Bin) for the deployment to succeed. However, a
    successful deployment permanently deletes any detail records in the Recycle Bin.

  -g, --ignorewarnings  Allow a deployment to complete successfully even if there are warnings.

    If a warning occurs and ignoreWarnings is set to true, the success field in DeployMessage is true. When
    ignoreWarnings is set to false, success is set to false, and the warning is treated like an error.

  -l, --testlevel=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment testing level.

    Valid values are:

    - NoTestRun—No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests—Runs only the tests that you specify in the --runtests option. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests—All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg—All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

  -m, --metadata=<value>...  Comma-separated list of metadata component names.

    If you specify this parameter, don’t specify --manifest or --sourcepath.

  -o, --ignoreerrors  Ignore any errors and don't roll back deployment.

    Keep this parameter set to false when deploying to a production org. If set to true, components without errors are
    deployed, and components with errors are skipped.

  -p, --sourcepath=<value>...  Comma-separated list of source file paths to deploy.

    The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its sub-directories).

    If you specify this parameter, don’t specify --manifest or --metadata.

  -q, --validateddeployrequestid=<value>  Deploy request ID of the validated deployment to run a Quick Deploy.

    Deploying a validation helps you shorten your deployment time because tests aren’t rerun. If you have a recent
    successful validation, you can deploy the validated components without running tests. A validation doesn’t save any
    components in the org. You use a validation only to check the success or failure messages that you would receive
    with an actual deployment. To validate your components, add the -c | --checkonly flag when you run "force mdapi
    deploy". This flag sets the checkOnly="true" parameter for your deployment. Before deploying a recent validation,
    ensure that the following requirements are met:

    1. The components have been validated successfully for the target environment within the last 10 days.

    2. As part of the validation, Apex tests in the target org have passed.

    3. Code coverage requirements are met.

    * If all tests in the org or all local tests are run, overall code coverage is at least 75%, and Apex triggers have
    some coverage.

    * If specific tests are run with the RunSpecifiedTests test level, each class and trigger that was deployed is
    covered by at least 75% individually.

  -t, --tracksource  If the deploy succeeds, update source tracking information.

    Doesn't delete locally deleted files from org unless you also specify --predestructivechanges or
    --postdestructivechanges.

  -w, --wait=<value>  Wait time for command to finish in minutes.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

  -x, --manifest=<value>  Complete path for the manifest (package.xml) file that specifies the components to deploy.

    All child components are included.

    If you specify this parameter, don’t specify --metadata or --sourcepath.
```

_See code: [src/commands/force/source/deploy.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/deploy.ts)_

## `sfdx force source deploy cancel`

Cancel a source deployment.

```
USAGE
  $ sfdx force source deploy cancel -o <value> [--json] [--api-version <value>] [-w <value>] [-i <value>]

FLAGS
  -i, --jobid=<value>        Job ID of the deployment you want to cancel; defaults to your most recent CLI deployment if
                             not specified.
  -o, --target-org=<value>   (required) Username or alias of the target org.
  -w, --wait=<value>         [default: 33 minutes] Number of minutes to wait for the command to complete and display
                             results.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Cancel a source deployment.

  Use this command to cancel a specified asynchronous source deployment. You can also specify a wait time (in minutes)
  to check for updates to the canceled deploy status.

  To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue
  to use the CLI. To check the status of the job, use "force source deploy report".

EXAMPLES
  Cancel a deployment and wait two minutes:

    $ sfdx force source deploy cancel --wait 2

  If you have multiple deployments in progress and want to cancel a specific one, specify the job ID:

    $ sfdx force source deploy cancel --jobid <jobid>

FLAG DESCRIPTIONS
  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.
```

_See code: [src/commands/force/source/deploy/cancel.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/deploy/cancel.ts)_

## `sfdx force source deploy report`

Check the status of a metadata deployment.

```
USAGE
  $ sfdx force source deploy report -o <value> [--json] [--api-version <value>] [-w <value>] [-i <value>] [--verbose]
    [--resultsdir <value>] [--coverageformatters
    clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary] [--junit]

FLAGS
  -i, --jobid=<value>
      Job ID of the deployment you want to check; defaults to your most recent CLI deployment.

  -o, --target-org=<value>
      (required) Username or alias of the target org.

  -w, --wait=<value>
      [default: 33 minutes] Number of minutes to wait for the command to complete and display results to the terminal
      window.

  --api-version=<value>
      Override the api version used for api requests made by this command

  --coverageformatters=clover,cobertura,html-spa,html,json,json-summary,lcovonly,none,teamcity,text,text-summary...
      Format of the code coverage results.

  --junit
      Output JUnit test results.

  --resultsdir=<value>
      Output directory for code coverage and JUnit results; defaults to the deploy ID.

  --verbose
      Verbose output of deploy result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check the status of a metadata deployment.

  Specify the job ID for the deploy you want to check. You can also specify a wait time (minutes) to check for updates
  to the deploy status.

EXAMPLES
  Check the status of the most recent deployment on your default org:

    $ sfdx force source deploy report

  Check the status using the job ID; output JUnit test results and format code coverage results in the specified
  format:

    $ sfdx force source deploy report --jobid <id> --junit --coverageformatters cobertura

FLAG DESCRIPTIONS
  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.
```

_See code: [src/commands/force/source/deploy/report.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/deploy/report.ts)_

## `sfdx force source pull`

Pull changed source from the org to your project to keep them in sync.

```
USAGE
  $ sfdx force source pull -o <value> [--json] [--verbose] [--api-version <value>] [-f] [-w <value>]

FLAGS
  -f, --forceoverwrite       Ignore conflict warnings; changes in the org overwrite changes in the project.
  -o, --target-org=<value>   (required) Username or alias of the target org.
  -w, --wait=<value>         [default: 33 minutes] Number of minutes to wait for the command to complete and display
                             results to the terminal window.
      --api-version=<value>  Override the api version used for api requests made by this command
      --verbose              Display additional details about the command results.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Pull changed source from the org to your project to keep them in sync.

  If the command detects a conflict, it displays the conflicts but does not complete the process. After reviewing the
  conflict, rerun the command with the --forceoverwrite parameter.

EXAMPLES
  Pull source from your default org:

    $ sfdx force source pull

  Pull source from the org with alias "myscratch"; ignore any conflicts and overwrite the local project files with org
  changes; wait for only 5 minutes:

    $ sfdx force source pull --target-org myscratch --wait 5 --forceoverwrite

FLAG DESCRIPTIONS
  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.
```

_See code: [src/commands/force/source/pull.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/pull.ts)_

## `sfdx force source push`

Push changed source from your project to an org to keep them in sync.

```
USAGE
  $ sfdx force source push -o <value> [--json] [--api-version <value>] [-f] [-w <value>] [-g] [--quiet]

FLAGS
  -f, --forceoverwrite       Ignore conflict warnings and push source anyway; changes in the project overwrite changes
                             in the org.
  -g, --ignorewarnings       Deploy changes even if warnings are generated.
  -o, --target-org=<value>   (required) Username or alias of the target org.
  -w, --wait=<value>         [default: 33 minutes] Number of minutes to wait for the command to complete and display
                             results to the terminal window.
      --api-version=<value>  Override the api version used for api requests made by this command
      --quiet                Minimize JSON and sdtout output on success.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Push changed source from your project to an org to keep them in sync.

  If the command detects a conflict, it displays the conflicts but does not complete the process. After reviewing the
  conflict, rerun the command with the --forceoverwrite parameter.

EXAMPLES
  Push source to your default org:

    $ sfdx force source push

  Push source to the org with alias "myscratch"; ignore any conflicts and overwrite with org with the local project
  changes; wait for only 5 minutes:

    $ sfdx force source push --target-org myscratch --wait 5 --forceoverwrite

FLAG DESCRIPTIONS
  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.
```

_See code: [src/commands/force/source/push.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/push.ts)_

## `sfdx force source retrieve`

Retrieve source from an org.

```
USAGE
  $ sfdx force source retrieve -o <value> [--json] [-a <value>] [-r <value> | -n <value> | -p <value>] [-w <value>] [-x
    <value> | -m <value> | ] [-f -t] [--verbose]

FLAGS
  -a, --api-version=<value>        Override the api version used for api requests made by this command
  -f, --forceoverwrite             Ignore conflict warnings and overwrite changes to the project.
  -m, --metadata=<value>...        Comma-separated list of names of metadata components to retrieve from the org.
  -n, --packagenames=<value>...    Comma-separated list of packages to retrieve.
  -o, --target-org=<value>         (required) Username or alias of the target org.
  -p, --sourcepath=<value>...      Comma-separated list of file paths for source to retrieve from the org.
  -r, --retrievetargetdir=<value>  Root of the directory structure into which the source files are retrieved.
  -t, --tracksource                If the retrieve succeeds, update source tracking information; doesn't delete local
                                   files that were deleted in the org.
  -w, --wait=<value>               [default: 33 minutes] Number of minutes to wait for the command to complete and
                                   display results to the terminal window.
  -x, --manifest=<value>           Complete path for the manifest (package.xml) file that specifies the components to
                                   retrieve.
      --verbose                    Verbose output of retrieve result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Retrieve source from an org.

  Use this command to retrieve source (metadata that’s in source format) from an org. To take advantage of change
  tracking with scratch orgs, use "force source pull". To retrieve metadata that’s in metadata format, use "force mdapi
  retrieve".

  The source you retrieve overwrites the corresponding source files in your local project. This command does not attempt
  to merge the source from your org with your local source files.

  If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of
  double quotes. On Windows, if the list contains commas, also enclose it in one set of double quotes.

EXAMPLES
  Retrieve the source files in a directory from your default org:

    $ sfdx force source retrieve --sourcepath path/to/source

  Retrieve a specific Apex class and the objects whose source is in a directory from an org with alias "myscratch":

    $ sfdx force source retrieve --sourcepath "path/to/apex/classes/MyClass.cls,path/to/source/objects" --target-org \
      myscratch

  Retrieve source files in a comma-separated list that contains spaces:

    $ sfdx force source retrieve --sourcepath "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, \
      path/to/apex/classes"

  Retrieve all Apex classes:

    $ sfdx force source retrieve --metadata ApexClass

  Retrieve a specific Apex class:

    $ sfdx force source retrieve --metadata ApexClass:MyApexClass

  Retrieve a specific Apex class and update source tracking files:

    $ sfdx force source retrieve --metadata ApexClass:MyApexClass --tracksource

  Retrieve all custom objects and Apex classes:

    $ sfdx force source retrieve --metadata "CustomObject,ApexClass"

  Retrieve all Apex classes and two specific profiles (one of which has a space in its name):

    $ sfdx force source retrieve --metadata "ApexClass, Profile:My Profile, Profile: AnotherProfile"

  Retrieve all metadata components listed in a manifest:

    $ sfdx force source retrieve --manifest path/to/package.xml

  Retrieve metadata from a package or multiple packages:

    $ sfdx force source retrieve --packagenames MyPackageName
    $ sfdx force source retrieve --packagenames "Package1, PackageName With Spaces, Package3"

  Retrieve all metadata from a package and specific components that aren’t in the package, specify both -n |
  --packagenames and one other scoping parameter:

    $ sfdx force source retrieve --packagenames MyPackageName --sourcepath path/to/apex/classes
    $ sfdx force source retrieve --packagenames MyPackageName --metadata ApexClass:MyApexClass
    $ sfdx force source retrieve --packagenames MyPackageName --manifest path/to/package.xml

  Retrieve source files to a given directory instead of the default package directory specified in sfdx-project.json:

    $ sfdx force source retrieve --metadata "StandardValueSet:TaskStatus" --retrievetargetdir path/to/unpackaged

FLAG DESCRIPTIONS
  -m, --metadata=<value>...  Comma-separated list of names of metadata components to retrieve from the org.

    If you specify this parameter, don’t specify --manifest or --sourcepath.

  -p, --sourcepath=<value>...  Comma-separated list of file paths for source to retrieve from the org.

    The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all source files in the directory and its sub-directories).

    If you specify this parameter, don’t specify --manifest or --metadata.

  -r, --retrievetargetdir=<value>  Root of the directory structure into which the source files are retrieved.

    If the target directory matches one of the package directories in your sfdx-project.json file, the command fails.

    Running the command multiple times with the same target adds new files and overwrites existing files.

  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

  -x, --manifest=<value>  Complete path for the manifest (package.xml) file that specifies the components to retrieve.

    If you specify this parameter, don’t specify --metadata or --sourcepath.
```

_See code: [src/commands/force/source/retrieve.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/retrieve.ts)_

## `sfdx force source status`

List changes that have been made locally, in an org, or both.

```
USAGE
  $ sfdx force source status -o <value> [--json] [--api-version <value>] [-l | -r] [--concise]

FLAGS
  -l, --local                List the changes that have been made locally.
  -o, --target-org=<value>   (required) Username or alias of the target org.
  -r, --remote               List the changes that have been made in the org.
      --api-version=<value>  Override the api version used for api requests made by this command
      --concise              Show only the changes that will be pushed or pulled; omits files that are forceignored.

GLOBAL FLAGS
  --json  Format output as json.

EXAMPLES
  List changes that have been made locally but not in the org with alias "myscratch":

    $ sfdx force source status --local --target-org myscratch

  List changes that have been made in your default org but aren't reflected in your local project:

    $ sfdx force source status --remote
```

_See code: [src/commands/force/source/status.ts](https://github.com/salesforcecli/plugin-source/blob/2.11.5/src/commands/force/source/status.ts)_

<!-- commandsstop -->
