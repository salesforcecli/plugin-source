# description

create a project manifest that lists the metadata components you want to deploy or retrieve
Create a manifest from a list of metadata components (--metadata) or from one or more local directories that contain source files (--sourcepath). You can specify either of these parameters, not both.

Use --manifesttype to specify the type of manifest you want to create. The resulting manifest files have specific names, such as the standard package.xml or destructiveChanges.xml to delete metadata. Valid values for this parameter, and their respective file names, are:

package : package.xml (default)
pre : destructiveChangesPre.xml
post : destructiveChangesPost.xml
destroy : destructiveChanges.xml

See https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_deleting_files.htm for information about these destructive manifest files.

Use --manifestname to specify a custom name for the generated manifest if the pre-defined ones don’t suit your needs. You can specify either --manifesttype or --manifestname, but not both.

# examples

- $ sfdx force:source:manifest:create -m ApexClass

- $ sfdx force:source:manifest:create -m ApexClass:MyApexClass --manifesttype destroy

- $ sfdx force:source:manifest:create --sourcepath force-app --manifestname myNewManifest

- $ sfdx force:source:manifest:create --fromorg test@myorg.com --includepackages unlocked

# flags.includepackages

comma-separated list of package types (managed, unlocked) whose metadata is included in the manifest; by default, metadata in packages is ignored

# flags.fromorg

username or alias of the org that contains the metadata components from which to build a manifest

# flags.manifesttype

type of manifest to create; the type determines the name of the created file

# flags.manifestname

name of a custom manifest file to create

# flags.outputdir

directory to save the created manifest

# flags.sourcepath

comma-separated list of paths to the local source files to include in the manifest

# flags.metadata

comma-separated list of names of metadata components to include in the manifest

# success

successfully wrote %s

# successOutputDir

successfully wrote %s to %s
