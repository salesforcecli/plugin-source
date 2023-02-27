# description

delete source from your project and from a non-source-tracked org
IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.

Use this command to delete components from orgs that don’t have source tracking.
To remove deleted items from scratch orgs, which have change tracking, use "sfdx force:source:push".

# examples

- $ sfdx force:source:delete -m <metadata>

- $ sfdx force:source:delete -p path/to/source

# flags.sourcepath

comma-separated list of source file paths to delete

# flags.metadata

comma-separated list of names of metadata components to delete

# flags.noprompt

do not prompt for delete confirmation

# flags.wait

wait time for command to finish in minutes

# flags.checkonly

validate delete command but do not delete from the org or delete files locally

# flags.testLevel

deployment testing level

# flags.runTests

tests to run if --testlevel RunSpecifiedTests

# flags.tracksource

If the delete succeeds, update the source tracking information, similar to push

# flags.forceoverwrite

ignore conflict warnings and overwrite changes to the org

# flags.verbose

verbose output of delete result

# flagsLong.checkonly

- Validates the deleted metadata and runs all Apex tests, but prevents the deletion from being saved to the org.

- If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the --checkonly parameter to test a deletion (validation). This kind of change isn’t supported for test deletions to avoid the risk of data loss or corruption. If a change that isn’t supported for test deletions is included in a deletion package, the test deletion fails and issues an error.

- If your deletion package changes a field type from Master-Detail to Lookup or vice versa, you can still validate the changes prior to deploying to Production by performing a full deletion to another test Sandbox. A full deletion includes a validation of the changes as part of the deletion process.

- Note: A Metadata API deletion that includes Master-Detail relationships deletes all detail records in the Recycle Bin in the following cases.

- 1. For a deletion with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before proceeding to delete the Master-Detail field, or the deletion fails. During the deletion, detail records are permanently deleted from the Recycle Bin and cannot be recovered.

- 2. For a deletion that converts a Lookup field relationship to a Master-Detail relationship, detail records must reference a master record or be soft-deleted (sent to the Recycle Bin) for the deletion to succeed. However, a successful deletion permanently deletes any detail records in the Recycle Bin.

# flagsLong.metadata

- A comma-separated list of names of metadata components to delete from your project and your org.

- If you specify this parameter, don’t specify --sourcepath.

# flagsLong.sourcepath

- A comma-separated list of paths to the local metadata to delete. The supplied paths can be a single file (in which case the operation is applied to only one file) or a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

- If you specify this parameter, don’t specify --metadata.

# flagsLong.wait

Number of minutes to wait for the command to complete and display results to the terminal window. If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flagsLong.testLevel

- Specifies which level of deployment tests to run. Valid values are:

- NoTestRun—No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

- RunLocalTests—All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

- RunAllTestsInOrg—All tests in your org are run, including tests of managed packages.

- If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

# localPrompt

This operation will delete the following files on your computer and in your org:
%s

# remotePrompt

This operation will delete the following metadata in your org:
%s

# deployPrompt

This operation will deploy the following:
%s

# areYouSure

Are you sure you want to proceed (y/n)?

# areYouSureCheckOnly

Are you sure you want to proceed (this is only a check and won't actually delete anything) (y/n)?
