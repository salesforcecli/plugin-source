# description

retrieve source from an org
Use this command to retrieve source (metadata that’s in source format) from an org.
To take advantage of change tracking with scratch orgs, use "sfdx force:source:pull".
To retrieve metadata that’s in metadata format, use "sfdx force:mdapi:retrieve".

The source you retrieve overwrites the corresponding source files in your local project. This command does not attempt to merge the source from your org with your local source files.

If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes. On Windows, if the list contains commas, also enclose it in one set of double quotes.

# examples

- To retrieve the source files in a directory:
  $ sfdx force:source:retrieve -p path/to/source

- To retrieve a specific Apex class and the objects whose source is in a directory:
  $ sfdx force:source:retrieve -p "path/to/apex/classes/MyClass.cls,path/to/source/objects"

- To retrieve source files in a comma-separated list that contains spaces:
  $ sfdx force:source:retrieve -p "path/to/objects/MyCustomObject/fields/MyField.field-meta.xml, path/to/apex/classes"

- To retrieve all Apex classes:
  $ sfdx force:source:retrieve -m ApexClass

- To retrieve a specific Apex class:
  $ sfdx force:source:retrieve -m ApexClass:MyApexClass

- To retrieve a specific Apex class and update source tracking files:
  $ sfdx force:source:retrieve -m ApexClass:MyApexClass -t

- To retrieve all custom objects and Apex classes:
  $ sfdx force:source:retrieve -m "CustomObject,ApexClass"

- To retrieve all Apex classes and two specific profiles (one of which has a space in its name):
  $ sfdx force:source:retrieve -m "ApexClass, Profile:My Profile, Profile: AnotherProfile"

- To retrieve all metadata components listed in a manifest:
  $ sfdx force:source:retrieve -x path/to/package.xml

- To retrieve metadata from a package or multiple packages:
  $ sfdx force:source:retrieve -n MyPackageName
  $ sfdx force:source:retrieve -n "Package1, PackageName With Spaces, Package3"

- To retrieve all metadata from a package and specific components that aren’t in the package, specify both -n | --packagenames and one other scoping parameter:
  $ sfdx force:source:retrieve -n MyPackageName -p path/to/apex/classes
  $ sfdx force:source:retrieve -n MyPackageName -m ApexClass:MyApexClass
  $ sfdx force:source:retrieve -n MyPackageName -x path/to/package.xml

- To retrieve source files to a given directory instead of the default package directory specified in sfdx-project.json:
  $ sfdx force:source:retrieve -m "StandardValueSet:TaskStatus" -r path/to/unpackaged

# flags.retrievetargetdir

directory root for the retrieved source files

# flags.sourcePath

comma-separated list of source file paths to retrieve

# flags.wait

wait time for command to finish in minutes

# flags.manifest

file path for manifest (package.xml) of components to retrieve

# flags.metadata

comma-separated list of metadata component names

# flags.packagename

a comma-separated list of packages to retrieve

# flags.tracksource

if the retrieve succeeds, update source tracking information; doesn't delete local files that were deleted in the org

# flags.verbose

verbose output of retrieve result

# flags.forceoverwrite

ignore conflict warnings and overwrite changes to the project

# flagsLong.retrievetargetdir

- The root of the directory structure into which the source files are retrieved.

- If the target directory matches one of the package directories in your sfdx-project.json file, the command fails.

- Running the command multiple times with the same target adds new files and overwrites existing files.

# flagsLong.wait

Number of minutes to wait for the command to complete and display results to the terminal window. If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flagsLong.manifest

- The complete path for the manifest (package.xml) file that specifies the components to retrieve.

- If you specify this parameter, don’t specify --metadata or --sourcepath.

# flagsLong.metadata

- A comma-separated list of names of metadata components to retrieve from the org.

- If you specify this parameter, don’t specify --manifest or --sourcepath.

# flagsLong.sourcePath

- A comma-separated list of file paths for source to retrieve from the org. The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all source files in the directory and its sub-directories).

- If you specify this parameter, don’t specify --manifest or --metadata.

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

This command will be deprecated. Try using the '%s' command instead.
