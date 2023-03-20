# summary

Check your local project package directories for forceignored files.

# examples

- Check all local project package directories for forceignored files:

  <%= config.bin %> <%= command.id %>

- Check the specified package directory for forceignored files:

  <%= config.bin %> <%= command.id %> --sourcepath force-app

# flags.sourcepath.summary

File or directory that the command checks for foreceignored files.

# invalidSourcePath

File or directory '%s' doesn't exist in your project. Specify one that exists and rerun the command.

# deprecation

We plan to deprecate this command soon. Try using the "%s" command instead.
