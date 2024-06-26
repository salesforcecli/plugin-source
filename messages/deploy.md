# summary

Deploy source to an org.

# description

Use this command to deploy source (metadata that’s in source format) to an org. To take advantage of change tracking with scratch orgs, use "force source push". To deploy metadata that’s in metadata format, use "force mdapi deploy".

The source you deploy overwrites the corresponding metadata in your org. This command does not attempt to merge your source with the versions in your org.

To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue to use the CLI. To check the status of the job, use "force source deploy report".

If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes. On Windows, if the list contains commas, also enclose the entire list in one set of double quotes.

If you use the --manifest, --predestructivechanges, or --postdestructivechanges parameters, run the "force source manifest create" command to easily generate the different types of manifest files.

# examples

- Deploy the source files in a directory:

  <%= config.bin %> <%= command.id %> --sourcepath path/to/source

- Deploy a specific Apex class and the objects whose source is in a directory:

  <%= config.bin %> <%= command.id %> --sourcepath "path/to/apex/classes/MyClass.cls,path/to/source/objects"

- Deploy source files in a comma-separated list that contains spaces:

  <%= config.bin %> <%= command.id %> --sourcepath "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, path/to/apex/classes"

- Deploy all Apex classes:

  <%= config.bin %> <%= command.id %> --metadata ApexClass

- Deploy a specific Apex class:

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Deploy a specific Apex class and update source tracking files :

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass --tracksource

- Deploy all custom objects and Apex classes:

  <%= config.bin %> <%= command.id %> --metadata "CustomObject,ApexClass"

- Deploy all Apex classes and two specific profiles (one of which has a space in its name):

  <%= config.bin %> <%= command.id %> --metadata "ApexClass, Profile:My Profile, Profile: AnotherProfile"

- Deploy all components listed in a manifest:

  <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Run the tests that aren’t in any managed packages as part of a deployment:

  <%= config.bin %> <%= command.id %> --metadata ApexClass --testlevel RunLocalTests

- Check whether a deployment would succeed (to prepare for Quick Deploy):

  <%= config.bin %> <%= command.id %> --metadata ApexClass --testlevel RunAllTestsInOrg -c

- Deploy an already validated deployment (Quick Deploy):

  <%= config.bin %> <%= command.id %> --validateddeployrequestid 0Af9A00000FTM6pSAH`

- Run a destructive operation before the deploy occurs:

  <%= config.bin %> <%= command.id %> --manifest package.xml --predestructivechanges destructiveChangesPre.xml

- Run a destructive operation after the deploy occurs:

  <%= config.bin %> <%= command.id %> --manifest package.xml --postdestructivechanges destructiveChangesPost.xml

# flags.sourcePath.summary

Comma-separated list of source file paths to deploy.

# flags.manifest.summary

Complete path for the manifest (package.xml) file that specifies the components to deploy.

# flags.metadata.summary

Comma-separated list of metadata component names.

# flags.wait.summary

Wait time for command to finish in minutes.

# flags.verbose.summary

Specify verbose output about the deploy result.

# flags.checkonly.summary

Validate the deployed metadata and run all Apex tests, but don't save to the org.

# flags.testLevel.summary

Deployment testing level.

# flags.runTests.summary

Apex test classes to run if --testlevel RunSpecifiedTests.

# flags.ignoreErrors.summary

Ignore any errors and don't roll back deployment.

# flags.ignoreWarnings.summary

Allow a deployment to complete successfully even if there are warnings.

# flags.validateDeployRequestId.summary

Deploy request ID of the validated deployment to run a Quick Deploy.

# flags.soapDeploy.summary

Deploy metadata with SOAP API instead of REST API.

# flags.predestructivechanges.summary

File path for a manifest (destructiveChangesPre.xml) of components to delete before the deploy.

# flags.postdestructivechanges.summary

File path for a manifest (destructiveChangesPost.xml) of components to delete after the deploy.

# flags.tracksource.summary

If the deploy succeeds, update source tracking information.

# flags.tracksource.description

Doesn't delete locally deleted files from org unless you also specify --predestructivechanges or --postdestructivechanges.

# flags.forceoverwrite.summary

Ignore conflict warnings and overwrite changes to the org.

# flags.purgeOnDelete.summary

Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion rather than being stored in the Recycle Bin.

# flags.junit.summary

Output JUnit test results.

# flags.coverageFormatters.summary

Format of the code coverage results.

# flags.resultsDir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# flags.sourcePath.description

The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

If you specify this parameter, don’t specify --manifest or --metadata.

# flags.manifest.description

All child components are included.

If you specify this parameter, don’t specify --metadata or --sourcepath.

# flags.metadata.description

If you specify this parameter, don’t specify --manifest or --sourcepath.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flags.checkonly.description

IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.

If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the --checkonly parameter to test a deployment (validation). This kind of change isn’t supported for test deployments to avoid the risk of data loss or corruption. If a change that isn’t supported for test deployments is included in a deployment package, the test deployment fails and issues an error.

If your deployment package changes a field type from Master-Detail to Lookup or vice versa, you can still validate the changes prior to deploying to Production by performing a full deployment to another test Sandbox. A full deployment includes a validation of the changes as part of the deployment process.

Note: A Metadata API deployment that includes Master-Detail relationships deletes all detail records in the Recycle Bin in the following cases.

    1. For a deployment with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before proceeding to deploy the Master-Detail field, or the deployment fails. During the deployment, detail records are permanently deleted from the Recycle Bin and cannot be recovered.

    2. For a deployment that converts a Lookup field relationship to a Master-Detail relationship, detail records must reference a master record or be soft-deleted (sent to the Recycle Bin) for the deployment to succeed. However, a successful deployment permanently deletes any detail records in the Recycle Bin.

# flags.testLevel.description

Valid values are:

    - NoTestRun—No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests—Runs only the tests that you specify in the --runtests option. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

    - RunLocalTests—All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg—All tests in your org are run, including tests of managed packages.

If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

# flags.ignoreErrors.description

Keep this parameter set to false when deploying to a production org. If set to true, components without errors are deployed, and components with errors are skipped.

# flags.ignoreWarnings.description

If a warning occurs and ignoreWarnings is set to true, the success field in DeployMessage is true. When ignoreWarnings is set to false, success is set to false, and the warning is treated like an error.

# flags.validateDeployRequestId.description

Deploying a validation helps you shorten your deployment time because tests aren’t rerun. If you have a recent successful validation, you can deploy the validated components without running tests. A validation doesn’t save any components in the org. You use a validation only to check the success or failure messages that you would receive with an actual deployment. To validate your components, add the -c | --checkonly flag when you run "force mdapi deploy". This flag sets the checkOnly="true" parameter for your deployment. Before deploying a recent validation, ensure that the following requirements are met:

    1. The components have been validated successfully for the target environment within the last 10 days.

    2. As part of the validation, Apex tests in the target org have passed.

    3. Code coverage requirements are met.

        * If all tests in the org or all local tests are run, overall code coverage is at least 75%, and Apex triggers have some coverage.

        * If specific tests are run with the RunSpecifiedTests test level, each class and trigger that was deployed is covered by at least 75% individually.

# checkOnlySuccess

Successfully validated the deployment. %s components deployed and %s tests run.
Use the --verbose parameter to see detailed output.

# checkOnlySuccessVerbose

Successfully validated the deployment.

# deploySuccess

Deploy Succeeded.

# deployCanceled

The deployment has been canceled by %s.

# deployFailed

Deploy failed. %s

# asyncDeployQueued

Deploy has been queued.

# asyncDeployCancel

Run "force source deploy cancel -i %s -u %s" to cancel the deploy.

# asyncDeployReport

Run "force source deploy report -i %s -u %s" to get the latest status.

# invalidDeployId

The provided ID is invalid, deploy IDs must start with '0Af'.

# deployWontDelete

You currently have files deleted locally. The deploy command will NOT delete them from your org unless you use one of the destructivechanges Flags.

# asyncCoverageJunitWarning

You requested an async deploy with code coverage or JUnit results. The reports will be available when the deploy completes.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
