# summary

Push changed source from your project to an org to keep them in sync.

# description

If the command detects a conflict, it displays the conflicts but does not complete the process. After reviewing the conflict, rerun the command with the --forceoverwrite parameter.

# examples

- Push source to your default org:

  <%= config.bin %> <%= command.id %>

- Push source to the org with alias "myscratch"; ignore any conflicts and overwrite with org with the local project changes; wait for only 5 minutes:

  <%= config.bin %> <%= command.id %> --target-org myscratch --wait 5 --forceoverwrite

# flags.wait.summary

Number of minutes to wait for the command to complete and display results to the terminal window.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flags.forceoverwrite.summary

Ignore conflict warnings and push source anyway; changes in the project overwrite changes in the org.

# flags.replacetokens.summary

Replace tokens in source files prior to deployment.

# flags.ignorewarnings.summary

Deploy changes even if warnings are generated.

# flags.quiet.summary

Minimize JSON and sdtout output on success.

# sourcepushFailed

Push failed. %s

# sequentialFail

Check the order of your dependencies and ensure all metadata is included.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
