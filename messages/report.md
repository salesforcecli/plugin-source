# description

check the status of a metadata deployment
Specify the job ID for the deploy you want to check. You can also specify a wait time (minutes) to check for updates to the deploy status.

# examples

- Deploy a directory of files to the org

- $ sfdx force:source:deploy -d <directory>

- Now cancel this deployment and wait two minutes

- $ sfdx force:source:deploy:cancel -w 2

- If you have multiple deployments in progress and want to cancel a specific one, specify the job ID

- $ sfdx force:source:deploy:cancel -i <jobid>

- Check the status of the cancel job

- $ sfdx force:source:deploy:report

# flags.jobid

job ID of the deployment you want to check; defaults to your most recent CLI deployment if not specified

# flags.wait

wait time for command to finish in minutes

# flags.verbose

verbose output of deploy result

# flags.junit

output JUnit test results

# flags.coverageFormatters

format of the code coverage results

# flags.resultsDir

output directory for code coverage and JUnit results; defaults to the deploy ID

# flagsLong.wait

Number of minutes to wait for the command to complete and display results to the terminal window. If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flagsLong.jobid

The job ID (asyncId) of the deployment you want to check. If not specified, the default value is the ID of the most recent metadata deployment you ran using Salesforce CLI. Use with -w to resume waiting.

# mdapiDeployFailed

The metadata deploy operation failed.

# deprecation

The '<%= command.id %>' command will be deprecated. Try using the %s command instead.