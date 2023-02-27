# retrieveCmd.description

retrieve metadata from an org using Metadata API
Uses Metadata API to retrieve a .zip of XML files that represent metadata from the targeted org. The default target username is the admin user for the default scratch org. You can retrieve and deploy up to 10,000 files or 400 MB (39 MB compressed) at one time.

# retrieveCmd.examples

- Retrieve metadata in the default project directory into the target directory:

- $ sfdx force:mdapi:retrieve -r path/to/retrieve/dir

- Retrieve metadata defined in the specified manifest into the target directory:

- $ sfdx force:mdapi:retrieve -r path/to/retrieve/dir -k package.xml

- Retrieve metadata defined by the specified directory, name the retrieved zipfile and extract all contents

- $ sfdx force:mdapi:retrieve -d path/to/apexClasses -r path/to/retrieve/dir --unzip --zipfilename apexClasses.zip

- Enqueue a retrieve request but do not wait for the metadata to be retrieved:

- $ sfdx force:mdapi:retrieve -r path/to/retrieve/dir --wait 0

# reportCmd.description

check the status of a metadata retrieval
Specify the job ID and a target directory for the retrieve you want to check. You can also specify a wait time (minutes) to check for updates to the retrieve status. If the retrieve was successful, the resulting zip file will be saved to the location passed in with the retrieve target parameter.

# reportCmd.examples

- Poll until the metadata is retrieved (or timeout is reached) using data from the last force:mdapi:retrieve command:

- sfdx force:mdapi:retrieve:report

- Report the current status of the last retrieve command. If the retrieve is complete the zip file of metadata is written to the target directoy:

- sfdx force:mdapi:retrieve:report -r path/to/retrieve/dir -w 0

- Poll until the metadata is retrieved (or timeout is reached) using the provided RetrieveID, naming the zip file and extracting all contents:

- sfdx force:mdapi:retrieve:report -i retrieveId -r path/to/retrieve/dir --unzip --zipfilename apexClasses.zip

# flags.retrievetargetdir

directory root for the retrieved files

# flags.unpackaged

file path of manifest of components to retrieve

# flags.sourcedir

source dir to use instead of the default package dir in sfdx-project.json

# flags.packagenames

a comma-separated list of packages to retrieve

# flags.singlepackage

indicates that the zip file points to a directory structure for a single package

# flags.zipfilename

file name to use for the retrieved zip file

# flags.unzip

extract all files from the retrieved zip file

# flags.wait

wait time for command to finish in minutes

# flags.apiversion

target API version for the retrieve

# flags.verbose

verbose output of retrieve result

# flags.jobid

job ID of the retrieve you want to check; defaults to your most recent CLI retrieval if not specified

# flagsLong.retrievetargetdir

The root of the directory structure where the retrieved .zip or metadata files are put.

# flagsLong.unpackaged

The complete path for the manifest file that specifies the components to retrieve.

# flagsLong.sourcedir

The source directory to use instead of the default package directory specified in sfdx-project.json

# flagsLong.packagenames

A comma-separated list of package names to retrieve.

# flagsLong.singlepackage

Indicates that the specified .zip file points to a directory structure for a single package. By default, the CLI assumes the directory is structured for a set of packages.

# flagsLong.zipfilename

The file name to use for the retrieved zip file.

# flagsLong.unzip

Extract all files from the retrieved zip file.

# flagsLong.wait

The number of minutes to wait for the command to complete.

# flagsLong.apiversion

Use to override the default, which is the latest version supported by your CLI plug-in, with the version in your package.xml file.

# flagsLong.verbose

Indicates that you want verbose output from the retrieve operation.

# flagsLong.jobid

The job ID (asyncId) of the retrieve you want to check. If not specified, the default value is the ID of the most recent metadata retrieval you ran using Salesforce CLI. You must specify a --retrievetargetdir. Use with --wait to resume waiting.

# InvalidPackageNames

You specified [%s]. Try again and specify only one package when using --singlepackage.

# MissingRetrieveId

The jobid command parameter was not provided, neither directly nor from a previous retrieval.

# checkStatus

To check the status of this retrieve, run "sfdx force:mdapi:retrieve:report %s".
If the retrieve request has completed, the retrieved metadata zip file will be written to the retrieve target dir.
