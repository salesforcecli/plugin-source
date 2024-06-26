# summary

Cancel a source deployment.

# description

Use this command to cancel a specified asynchronous source deployment. You can also specify a wait time (in minutes) to check for updates to the canceled deploy status.

To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue to use the CLI. To check the status of the job, use "force source deploy report".

# examples

- Cancel a deployment and wait two minutes:

  <%= config.bin %> <%= command.id %> --wait 2

- If you have multiple deployments in progress and want to cancel a specific one, specify the job ID:

  <%= config.bin %> <%= command.id %> --jobid <jobid>

# flags.wait.summary

Number of minutes to wait for the command to complete and display results.

# flags.jobid.summary

Job ID of the deployment you want to cancel; defaults to your most recent CLI deployment if not specified.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# CancelFailed

The cancel command failed due to: %s

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
