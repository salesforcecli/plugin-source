# summary

Deploy metadata to an org using Metadata API.

# examples

- Return a job ID you can use to check the deploy status:

  <%= config.bin %> <%= command.id %> --deploydir some/path

- Deploy and poll for 1000 minutes:

  <%= config.bin %> <%= command.id %> --deploydir some/path --wait 1000

- Deploy a ZIP file:

  <%= config.bin %> <%= command.id %> --zipfile stuff.zip

- Validate a deployment so the ID can be used for a quick deploy:

  <%= config.bin %> <%= command.id %> --deploydir some/path --wait 1000 --checkonly --testlevel RunAllTestsInOrg

- Quick deploy using a previously validated deployment:

  <%= config.bin %> <%= command.id %> --validateddeployrequestid MyValidatedId

# flags.checkOnly.summary

Validates the deployed metadata and runs all Apex tests, but prevents the deployment from being saved to the org.

# flags.deployDir.summary

Root of directory tree that contains the files you want to deploy.

# flags.wait.summary

Number of minutes to wait for the command to finish; specify -1 to wait indefinitely.

# flags.jobId.summary

Job ID of the deployment to check.

# flags.testLevel.summary

Level of deployment tests to run.

# flags.runTests.summary

Apex test classes to run if --testlevel is RunSpecifiedTests.

# flags.ignoreErrors.summary

Ignore any errors and don't roll back the deployment.

# flags.ignoreWarnings.summary

Ignore any warnings and don't roll back the deployment.

# flags.zipFile.summary

Path to .zip file of metadata to deploy.

# flags.verbose.summary

Display verbose output of the deploy results.

# flags.validatedDeployRequestId.summary

Request ID of the validated deployment to run a Quick Deploy.

# flags.singlePackage.summary

Indicates that the zip file points to a directory structure for a single package.

# flags.soapDeploy.summary

Deploy metadata with SOAP API instead of REST API.

# flags.purgeOnDelete.summary

Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion rather than being stored in the Recycle Bin.

# flags.concise.summary

Omit success messages for smaller JSON output.

# flags.junit.summary

Output JUnit test results.

# flags.coverageFormatters.summary

Format of the code coverage results.

# flags.resultsDir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# flags.checkOnly.description

IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.

If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the --checkonly parameter to test a deployment (validation). This kind of change isn’t supported for test deployments to avoid the risk of data loss or corruption. If a change that isn’t supported for test deployments is included in a deployment package, the test deployment fails and issues an error.

If your deployment package changes a field type from Master-Detail to Lookup or vice versa, you can still validate the changes prior to deploying to Production by performing a full deployment to another test Sandbox. A full deployment includes a validation of the changes as part of the deployment process.

Note: A Metadata API deployment that includes Master-Detail relationships deletes all detail records in the Recycle Bin in the following cases.

    1. For a deployment with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before proceeding to deploy the Master-Detail field, or the deployment fails. During the deployment, detail records are permanently deleted from the Recycle Bin and cannot be recovered.
    2. For a deployment that converts a Lookup field relationship to a Master-Detail relationship, detail records must reference a master record or be soft-deleted (sent to the Recycle Bin) for the deployment to succeed. However, a successful deployment permanently deletes any detail records in the Recycle Bin.

# flags.deployDir.description

The root must contain a valid package.xml file describing the entities in the directory structure. Required to initiate a deployment if you don’t use --zipfile. If you specify both --zipfile and --deploydir, a zip file of the contents of the --deploydir directory is written to the location specified by --zipfile.

# flags.wait.description

The default is 0 (returns immediately).

# flags.jobId.description

The job ID is required if you haven’t previously deployed using Salesforce CLI. If you deploy using Salesforce CLI and don’t specify a job ID, we use the ID of the most recent metadata deployment.

# flags.testLevel.description

Valid values are:

    * NoTestRun—No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.
    * RunSpecifiedTests—Runs only the tests that you specify in the --runtests option. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.
    * RunLocalTests—All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.
    * RunAllTestsInOrg—All tests in your org are run, including tests of managed packages.

If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

# flags.ignoreErrors.description

The default is false. Keep this parameter set to false when deploying to a production org. If set to true, components without errors are deployed, and components with errors are skipped.

# flags.ignoreWarnings.description

If a warning occurs and ignoreWarnings is set to true, the success field in DeployMessage is true. When ignoreWarnings is set to false, success is set to false, and the warning is treated like an error.
This field is available in API version 18.0 and later. Prior to version 18.0, there was no distinction between warnings and errors. All problems were treated as errors and prevented a successful deployment.

# flags.zipFile.description

You must indicate this option or --deploydir. If you specify both --zipfile and --deploydir, a .zip file of the contents of the deploy directory is created at the path specified for the .zip file.

# flags.verbose.description

Indicates that you want verbose output from the deploy operation.

# flags.validatedDeployRequestId.description

Deploying a validation helps you shorten your deployment time because tests aren’t rerun. If you have a recent successful validation, you can deploy the validated components without running tests. A validation doesn’t save any components in the org. You use a validation only to check the success or failure messages that you would receive with an actual deployment. To validate your components, add the -c | --checkonly flag when you run 'force mdapi deploy'. This flag sets the checkOnly='true' parameter for your deployment. Before deploying a recent validation, ensure that the following requirements are met:

    1. The components have been validated successfully for the target environment within the last 10 days.
    2. As part of the validation, Apex tests in the target org have passed.
    3. Code coverage requirements are met.
       - If all tests in the org or all local tests are run, overall code coverage is at least 75%, and Apex triggers have some coverage.
       - If specific tests are run with the RunSpecifiedTests test level, each class and trigger that was deployed is covered by at least 75% individually.

# flags.singlePackage.description

By default, the CLI assumes the directory is structured for a set of packages.

# flags.soapDeploy.description

Because SOAP API has a lower .ZIP file size limit (400 MB uncompressed, 39 MB compressed), Salesforce recommends REST API deployment. This flag provides backwards compatibility with API version 50.0 and earlier when deploy used SOAP API by default.

# noRestDeploy

REST deploy is not available for this org. This feature is currently for internal Salesforce use only.

# deployFailed

The metadata deploy operation failed. %s

# asyncDeployQueued

Deploy has been queued.

# asyncDeployCancel

Run sfdx force:mdapi:deploy:cancel -i %s -u %s to cancel the deploy.

# asyncDeployReport

Run sfdx force:mdapi:deploy:report -i %s -u %s to get the latest status.

# deployCanceled

The deployment has been canceled by %s.

# asyncCoverageJunitWarning

You requested an async deploy with code coverage or JUnit results. The reports will be available when the deploy completes.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
