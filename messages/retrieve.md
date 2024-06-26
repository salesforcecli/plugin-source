# summary

Retrieve source from an org.

# description

Use this command to retrieve source (metadata that’s in source format) from an org. To take advantage of change tracking with scratch orgs, use "force source pull". To retrieve metadata that’s in metadata format, use "force mdapi retrieve".

The source you retrieve overwrites the corresponding source files in your local project. This command does not attempt to merge the source from your org with your local source files.

If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes. On Windows, if the list contains commas, also enclose it in one set of double quotes.

# examples

- Retrieve the source files in a directory from your default org:

  <%= config.bin %> <%= command.id %> --sourcepath path/to/source

- Retrieve a specific Apex class and the objects whose source is in a directory from an org with alias "myscratch":

  <%= config.bin %> <%= command.id %> --sourcepath "path/to/apex/classes/MyClass.cls,path/to/source/objects" --target-org myscratch

- Retrieve source files in a comma-separated list that contains spaces:

  <%= config.bin %> <%= command.id %> --sourcepath "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, path/to/apex/classes"

- Retrieve all Apex classes:

  <%= config.bin %> <%= command.id %> --metadata ApexClass

- Retrieve a specific Apex class:

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Retrieve a specific Apex class and update source tracking files:

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass --tracksource

- Retrieve all custom objects and Apex classes:

  <%= config.bin %> <%= command.id %> --metadata "CustomObject,ApexClass"

- Retrieve all Apex classes and two specific profiles (one of which has a space in its name):

  <%= config.bin %> <%= command.id %> --metadata "ApexClass, Profile:My Profile, Profile: AnotherProfile"

- Retrieve all metadata components listed in a manifest:

  <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Retrieve metadata from a package or multiple packages:

  <%= config.bin %> <%= command.id %> --packagenames MyPackageName
  <%= config.bin %> <%= command.id %> --packagenames "Package1, PackageName With Spaces, Package3"

- Retrieve all metadata from a package and specific components that aren’t in the package, specify both -n | --packagenames and one other scoping parameter:

  <%= config.bin %> <%= command.id %> --packagenames MyPackageName --sourcepath path/to/apex/classes
  <%= config.bin %> <%= command.id %> --packagenames MyPackageName --metadata ApexClass:MyApexClass
  <%= config.bin %> <%= command.id %> --packagenames MyPackageName --manifest path/to/package.xml

- Retrieve source files to a given directory instead of the default package directory specified in sfdx-project.json:

  <%= config.bin %> <%= command.id %> --metadata "StandardValueSet:TaskStatus" --retrievetargetdir path/to/unpackaged

# flags.retrievetargetdir.summary

Root of the directory structure into which the source files are retrieved.

# flags.sourcePath.summary

Comma-separated list of file paths for source to retrieve from the org.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results to the terminal window.

# flags.manifest.summary

Complete path for the manifest (package.xml) file that specifies the components to retrieve.

# flags.metadata.summary

Comma-separated list of names of metadata components to retrieve from the org.

# flags.packagename.summary

Comma-separated list of packages to retrieve.

# flags.tracksource.summary

If the retrieve succeeds, update source tracking information; doesn't delete local files that were deleted in the org.

# flags.verbose.summary

Verbose output of retrieve result.

# flags.forceoverwrite.summary

Ignore conflict warnings and overwrite changes to the project.

# flags.retrievetargetdir.description

If the target directory matches one of the package directories in your sfdx-project.json file, the command fails.

Running the command multiple times with the same target adds new files and overwrites existing files.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flags.manifest.description

If you specify this parameter, don’t specify --metadata or --sourcepath.

# flags.metadata.description

If you specify this parameter, don’t specify --manifest or --sourcepath.

# flags.sourcePath.description

The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all source files in the directory and its sub-directories).

If you specify this parameter, don’t specify --manifest or --metadata.

# SourceRetrieveError

Could not retrieve files in the sourcepath%s

# retrieveTimeout

Your retrieve request did not complete within the specified wait time [%s minutes]. Try again with a longer wait time.

# retrievedSourceHeader

Retrieved Source

# retrievedSourceWarningsHeader

Retrieved Source Warnings

# fullNameTableColumn

FULL NAME

# typeTableColumn

TYPE

# workspacePathTableColumn

PROJECT PATH

# NoResultsFound

No results found

# metadataNotFoundWarning

WARNING: The following metadata isn’t in your org. If it’s not new, someone deleted it from the org.

# columnNumberColumn

COLUMN NUMBER

# lineNumberColumn

LINE NUMBER

# errorColumn

PROBLEM

# nothingToRetrieve

Specify a source path, manifest, metadata, or package names to retrieve.

# wantsToRetrieveCustomFields

Because you're retrieving one or more CustomFields, we're also retrieving the CustomObject to which it's associated.

# retrieveWontDelete

You currently have files deleted in your org. The retrieve command will NOT delete them from your local project

# retrieveTargetDirOverlapsPackage

The retrieve target directory [%s] overlaps one of your package directories. Specify a different retrieve target directory and try again.

# apiVersionMsgDetailed

%s v%s metadata from %s using the v%s SOAP API

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
