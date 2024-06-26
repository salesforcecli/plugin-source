# summary

Check the status of a metadata deployment.

# description

Specify the job ID for the deploy you want to check. You can also specify a wait time (minutes) to check for updates to the deploy status.

# examples

- Check the status of the most recent deployment on your default org:

  <%= config.bin %> <%= command.id %>

- Check the status using the job ID; output JUnit test results and format code coverage results in the specified format:

  <%= config.bin %> <%= command.id %> --jobid <id> --junit --coverageformatters cobertura

# flags.jobid.summary

Job ID of the deployment you want to check; defaults to your most recent CLI deployment.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results to the terminal window.

# flags.verbose.summary

Verbose output of deploy result.

# flags.junit.summary

Output JUnit test results.

# flags.coverageFormatters.summary

Format of the code coverage results.

# flags.resultsDir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# mdapiDeployFailed

The metadata deploy operation failed.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" and "%s" pair instead.
