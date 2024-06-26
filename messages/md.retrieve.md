# retrieve.summary

Retrieve metadata from an org using Metadata API.

# retrieve.description

This command uses Metadata API to retrieve a .zip of XML files that represent metadata from the targeted org. You can retrieve and deploy up to 10,000 files or 400 MB (39 MB compressed) at one time.

# retrieve.examples

- Retrieve metadata in the default project directory into the target directory:

  <%= config.bin %> <%= command.id %> --retrievetargetdir path/to/retrieve/dir

- Retrieve metadata defined in the specified manifest into the target directory:

  <%= config.bin %> <%= command.id %> --retrievetargetdir path/to/retrieve/dir --unpackaged package.xml

- Retrieve metadata defined by the specified directory, name the retrieved zipfile and extract all contents

  <%= config.bin %> <%= command.id %> --sourcedir path/to/apexClasses --retrievetargetdir path/to/retrieve/dir --unzip --zipfilename apexClasses.zip

- Enqueue a retrieve request but do not wait for the metadata to be retrieved:

  <%= config.bin %> <%= command.id %> --retrievetargetdir path/to/retrieve/dir --wait 0

# report.summary

Check the status of a metadata retrieval.

# report.description

Specify the job ID and a target directory for the retrieve you want to check. You can also specify a wait time (minutes) to check for updates to the retrieve status. If the retrieve was successful, the resulting zip file will be saved to the location passed in with the retrieve target parameter.

# report.examples

- Poll until the metadata is retrieved (or timeout is reached) using data from the last force:mdapi:retrieve command:

  <%= config.bin %> <%= command.id %>

- Report the current status of the last retrieve command. If the retrieve is complete the zip file of metadata is written to the target directoy:

  <%= config.bin %> <%= command.id %> --retrievetargetdir path/to/retrieve/dir --wait 0

- Poll until the metadata is retrieved (or timeout is reached) using the provided RetrieveID, naming the zip file and extracting all contents:

  <%= config.bin %> <%= command.id %> -i retrieveId --retrievetargetdir path/to/retrieve/dir --unzip --zipfilename apexClasses.zip

# flags.retrievetargetdir.summary

Root of the directory structure where the retrieved .zip or metadata files are retrieved.

# flags.unpackaged.summary

Complete path for the manifest file that specifies the components to retrieve.

# flags.sourcedir.summary

Source directory to use instead of the default package directory specified in sfdx-project.json.

# flags.packagenames.summary

Comma-separated list of packages to retrieve.

# flags.singlepackage.summary

Specify that the zip file points to a directory structure for a single package.

# flags.zipfilename.summary

File name to use for the retrieved zip file.

# flags.unzip.summary

Extract all files from the retrieved zip file.

# flags.wait.summary

Number of minutes to wait for the command to complete.

# flags.apiversion.summary

Target API version for the retrieve.

# flags.verbose.summary

Display verbose output of retrieve result.

# flags.jobid.summary

Job ID of the retrieve you want to check; defaults to your most recent CLI retrieval.

# flags.singlepackage.description

By default, the CLI assumes the directory is structured for a set of packages.

# flags.apiversion.description

Use to override the default, which is the latest version supported by your CLI plug-in, with the version in your package.xml file.

# flags.jobid.description

You must specify a --retrievetargetdir. Use with --wait to resume waiting.

# InvalidPackageNames

You specified [%s]. Try again and specify only one package when using --singlepackage.

# MissingRetrieveId

The jobid command parameter was not provided, neither directly nor from a previous retrieval.

# checkStatus

To check the status of this retrieve, run "sfdx force:mdapi:retrieve:report %s".
If the retrieve request has completed, the retrieved metadata zip file will be written to the retrieve target dir.

# deprecation

This command is deprecated and will be removed from Salesforce CLI on November 6, 2024. Use the "%s" command instead.
