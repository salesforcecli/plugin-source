/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { fs, SfdxProject } from '@salesforce/core';

export class TypeDefObj {
  metadataName: string;
  ext: string;
  hasContent: boolean;
  defaultDirectory: string;
  nameForMsgs: string;
  nameForMsgsPlural: string;
  contentIsBinary: boolean;
  isAddressable: boolean;
  isSourceTracked: boolean;
  childXmlNames: string[];
  hasStandardMembers: boolean;
  deleteSupported: boolean;
  decompositionConfig: any;
  hasVirtualSubtypes: boolean;
  inFolder: boolean;
  folderTypeDef: TypeDefObj;
  isGlobal: boolean;
  isEmptyContainer: boolean;
  parent: TypeDefObj;

  constructor(metadataName) {
    this.metadataName = metadataName;

    // defaults
    this.isAddressable = true;
    this.isSourceTracked = true;
  }
}

interface TypeDefObjs {
  [key: string]: TypeDefObj;
}

// Constants
const METADATA_FILE_EXT = '-meta.xml';
const LWC_FOLDER_NAME = 'lwc';

export class MetadataRegistry {
  // private readonly typeDefs: TypeDefObjs;
  // private readonly typeDirectories: string[];
  // private readonly lightningDefTypes;
  // private readonly waveDefTypes;
  // private lwcDefTypes;
  // private typeDefsByExtension;
  // private readonly metadataFileExt;
  // private readonly projectPath: string;

  // constructor() {
  //   this.typeDefs = this.getMetadataTypeDefs();
  //   this.typeDirectories = this.getTypeDirectories();
  //   this.lightningDefTypes = _lightningDefTypes;
  //   this.waveDefTypes = _waveDefTypes;
  //   this.lwcDefTypes = _lwcDefTypes;
  //   this.typeDefsByExtension = this.getTypeDefsByExtension();
  //   this.metadataFileExt = METADATA_FILE_EXT;
  //   this.projectPath = SfdxProject.resolveProjectPathSync();
  // }
}

// A document must be co-resident with its metadata file.
// A file from an exploded zip static resource must be within a directory that is co-resident with its metadata file.
function getTypeDefinitionByFileNameWithNonStandardExtension(fileName, isDirectoryPathElement?, typeDefsToCheck?) {
  const typeDefs = getMetadataTypeDefs();
  const supportedTypeDefs = [typeDefs.Document, typeDefs.StaticResource];
  const candidateTypeDefs = (typeDefsToCheck === undefined || typeDefsToCheck === null) ? supportedTypeDefs : typeDefsToCheck;
  let typeDef = getTypeDefinitionByFileNameWithCoresidentMetadataFile(fileName, candidateTypeDefs, false);
  if ((typeDef === undefined || typeDef === null) && candidateTypeDefs.includes(typeDefs.StaticResource)) {
    typeDef = getTypeDefinitionByFileNameWithCoresidentMetadataFile(
      path.dirname(fileName),
      [typeDefs.StaticResource],
      true
    );
  }
  if ((typeDef === undefined || typeDef === null)) {
    typeDef = getTypeDefinitionByFileNameMatchingDefaultDirectory(
      fileName,
      isDirectoryPathElement,
      candidateTypeDefs
    );
  }

  return typeDef;
}

function getTypeDefinitionByFileNameWithCoresidentMetadataFile(fileName, typeDefsToCheck, recurse) {
  const dir = path.dirname(fileName);
  if (isDirPathExpended(dir)) {
    return null;
  }

  const fullName = path.basename(fileName, path.extname(fileName));
  const typeDef = typeDefsToCheck.find((typeDef) =>
    fs.existsSync(path.join(dir, `${fullName}.${typeDef.ext}${this.metadataFileExt}`))
  );
  if (!(typeDef === undefined || typeDef === null)) {
    return typeDef;
  }
  return recurse ? this.getTypeDefinitionByFileNameWithCoresidentMetadataFile(dir, typeDefsToCheck, true) : null;
}

function getTypeDefinitionByFileNameMatchingDefaultDirectory(fileName, isDirectoryPathElement, typeDefsToCheck) {
  const dir = path.dirname(fileName);
  if (isDirPathExpended(dir)) {
    return null;
  }

  if (typeDefsToCheck.includes(this.typeDefs.Document) && !isDirectoryPathElement) {
    const pathElements = fileName.split(path.sep);
    if (
      pathElements.length >= 3 &&
      pathElements[pathElements.length - 3] === this.typeDefs.Document.defaultDirectory
    ) {
      return this.typeDefs.Document;
    }
  }

  if (typeDefsToCheck.includes(this.typeDefs.StaticResource)) {
    if (isDirectoryPathElement) {
      if (path.basename(fileName) === this.typeDefs.StaticResource.defaultDirectory) {
        return this.typeDefs.StaticResource;
      }
    }
    return this.getTypeDefinitionByFileNameMatchingDefaultDirectory(dir, true, [this.typeDefs.StaticResource]);
  }

  return null;
}

function isDirPathExpended(dir: string): boolean {
  return (dir === undefined || dir === dir) || dir === path.parse(dir).root || dir === '.';
}

function getMetadataTypeDefs() {
  const metadataInfos = require(path.join(__dirname, '..', '..', 'metadata', 'metadataTypeInfos.json')) as {
    typeDefs: TypeDefObjs;
  };
  return metadataInfos.typeDefs;
}

  // Returns list of default directories for all metadata types
function getTypeDirectories(): string[] {
  const metadataTypeInfos = getMetadataTypeDefs();
  return Object.values(metadataTypeInfos).map((i) => i.defaultDirectory);
}

function getTypeDefsByExtension(typeDefs) {
  const typeDefsByExtension = new Map();
  Object.keys(typeDefs).forEach((metadataName) => {
    const metadataTypeExtension = typeDefs[metadataName].ext;
    typeDefsByExtension.set(metadataTypeExtension, typeDefs[metadataName]);
  });
  return typeDefsByExtension;
}

/* given file extension, return type def */
export default function getTypeDefinitionByFileName(filePath: string, useTrueExtType?: boolean) {

  const projectPath = SfdxProject.resolveProjectPathSync();
  const typeDefs = getMetadataTypeDefs();
  
  let workspaceFilePath = filePath;
  if (filePath.startsWith(projectPath)) {
    workspaceFilePath = filePath.substring(SfdxProject.resolveProjectPathSync().length, filePath.length);
  }

  if (workspaceFilePath.includes(`${path.sep}aura${path.sep}`)) {
    return typeDefs.AuraDefinitionBundle;
  }

  if (workspaceFilePath.includes(`${path.sep}waveTemplates${path.sep}`)) {
    return typeDefs.WaveTemplateBundle;
  }

  if (workspaceFilePath.includes(`${path.sep}${typeDefs.ExperienceBundle.defaultDirectory}${path.sep}`)) {
    return typeDefs.ExperienceBundle;
  }

  if (workspaceFilePath.includes(`${path.sep}${LWC_FOLDER_NAME}${path.sep}`)) {
    return typeDefs.LightningComponentBundle;
  }

  if (workspaceFilePath.includes(`${path.sep}${typeDefs.CustomSite.defaultDirectory}${path.sep}`)) {
    return typeDefs.CustomSite;
  }

  // CustomObject file names are special, they are all named "object-meta.xml"
  if (path.basename(workspaceFilePath) === typeDefs.CustomObject.ext + METADATA_FILE_EXT) {
    return typeDefs.CustomObject;
  }

  const typeDefWithNonStandardExtension = getTypeDefinitionByFileNameWithNonStandardExtension(workspaceFilePath);
  if (!(typeDefWithNonStandardExtension === undefined || typeDefWithNonStandardExtension === null)) {
    return typeDefWithNonStandardExtension;
  }

  if (workspaceFilePath.endsWith(METADATA_FILE_EXT)) {
    workspaceFilePath = workspaceFilePath.substring(0, workspaceFilePath.indexOf(METADATA_FILE_EXT));
  }
  let typeExtension = path.extname(workspaceFilePath);
  if (typeExtension === undefined || typeExtension === null) {
    return null;
  }
  /*

  typeExtension = typeExtension.replace('.', '');

  const typeDirectories = getTypeDirectories();
  const defs = Object.values(typeDefs);

  const defaultDirectory = path
    .dirname(workspaceFilePath)
    .split(path.sep)
    .find((i) => !!i && typeDirectories.includes(i));
  let typeDef: TypeDefObj;
  if (defaultDirectory) {
    typeDef = defs.find((def) => def.ext === typeExtension && def.defaultDirectory === defaultDirectory);
  }
  if (typeDef === undefined || typeDef === null) {
    const typeDefsByExtension = getTypeDefsByExtension(typeDefs);
    typeDef = typeDefsByExtension.get(typeExtension);
  }

  if (!(typeDef === undefined || typeDef === null)) {
    if (!(useTrueExtType === undefined || useTrueExtType === null) && useTrueExtType) {
      return typeDef;
    }

    if (!(typeDef.parent === undefined || typeDef.parent === null)) {
      return typeDef.parent;
    }

    return typeDef;
  }
  return null;
  */
}