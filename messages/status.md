# summary

List changes that have been made locally, in an org, or both.

# examples

- List changes that have been made locally but not in the org with alias "myscratch":

  <%= config.bin %> <%= command.id %> --local --target-org myscratch

- List changes that have been made in your default org but aren't reflected in your local project:

  <%= config.bin %> <%= command.id %> --remote

# flags.local.summary

List the changes that have been made locally.

# flags.remote.summary

List the changes that have been made in the org.

# flags.concise.summary

Show only the changes that will be pushed or pulled; omits files that are forceignored.

# humanSuccess

Source Status

# noResults

No local or remote changes found.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
