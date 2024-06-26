# summary

Check the status of a metadata deployment.

# description

Specify the job ID for the deploy you want to check. The job ID is returned by the "force mdapi deploy" command when run without the --wait parameter. You can also specify a wait time (minutes) to check for updates to the deploy status.

# examples

- Check the status of the most recent deployment

  <%= config.bin %> <%= command.id %>

- Check the status of a deploy with job ID 1234 and wait for 10 minutes for the result:

  <%= config.bin %> <%= command.id %> --jobid 1234 --wait 10

# flags.verbose.summary

Verbose output of deploy results.

# flags.jobId.summary

Job ID of the deployment to check; required if you’ve never deployed using Salesforce CLI; defaults to your most recent CLI deployment.

# flags.wait.summary

Number of minutes to wait for the command to finish; use -1 to poll indefinitely.

# flags.concise.summary

Omit success messages for smaller JSON output.

# flags.junit.summary

Output JUnit test results.

# flags.coverageFormatters.summary

Format of the code coverage results.

# flags.resultsDir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# flags.jobId.description

The job ID (id field value for AsyncResult) of the deployment you want to check. The job ID is required if you haven’t previously deployed using Salesforce CLI. If you deploy using Salesforce CLI and don’t specify a job ID, we use the ID of the most recent metadata deployment.

# usernameOutput

Using specified username %s.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" and "%s" pair instead.
