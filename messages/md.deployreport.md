# description

check the status of a metadata deployment

# mdDeployReportCommandCliHelp

Specify the job ID for the deploy you want to check. The job ID is returned by the force:mdapi:deploy command when run without the --wait parameter. You can also specify a wait time (minutes) to check for updates to the deploy status.

# examples

- Check the status of the most recent deployment

- $ sfdx force:mdapi:deploy:report

- Check the status of a deploy with job ID 1234 and wait for 10 minutes for the result:

- $ sfdx force:mdapi:deploy:report -i 1234 -w 10

# flags.verbose

verbose output of deploy results

# flags.jobId

job ID of the deployment to check; required if you’ve never deployed using Salesforce CLI; if not specified, defaults to your most recent CLI deployment

# flags.wait

wait time for command to finish in minutes. Use -1 to poll indefinitely

# flags.concise

omit success messages for smaller JSON output

# flags.junit

output JUnit test results

# flags.coverageFormatters

format of the code coverage results

# flags.resultsDir

output directory for code coverage and JUnit results; defaults to the deploy ID

# flagsLong.jobId

The job ID (id field value for AsyncResult) of the deployment you want to check. The job ID is required if you haven’t previously deployed using Salesforce CLI. If you deploy using Salesforce CLI and don’t specify a job ID, we use the ID of the most recent metadata deployment.

# flagsLong.verbose

Indicates that you want verbose output for deploy results.

# flagsLong.wait

The number of minutes to wait for the command to complete. The default is –1 (no limit).

# usernameOutput

Using specified username %s

# deprecation

We plan to deprecate this command soon. Try using the "%s" command instead.
