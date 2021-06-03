/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { fs, SfdxProject } from '@salesforce/core';

/**
 * The minimum configuration for a metadata entity subtype (eg. CustomField).
 */
export interface DecomposedSubtypeConfig {
  metadataName: string; // Name of the metadata subtype (eg. CustomField)
  ext: string; // The normal file extension (eg. field)
  defaultDirectory: string; // The default directory (eg. fields)
  hasStandardMembers: boolean; // Does this subtype have standard members (eg. CustomField)?
  isAddressable: boolean; // Can this subtype be addressed individually by mdapi?
}

/**
 * The minimum configuration for a decomposition. Each decomposed type has a single configuration associated
 * with it in the metadata repository. This configuration (and any extension) drives the runtime behavior of
 * decomposition.
 */
export interface DecompositionConfig {
  metadataName: string; // Name of the aggregate metadata entity (eg. CustomObject)
  isGlobal: boolean; // Is this a global (singleton) metadata entity (eg. CustomLabels)?
  isEmptyContainer: boolean; // Is there anything left to represent once the subtypes are extracted?
  decompositions: DecomposedSubtypeConfig[]; // List of subtype decomposition configurations. DO NOT leave undefined!
  strategy: string; // Name of the strategy for decomposition of the raw metadata.
  workspaceStrategy: string; // Name of the strategy for manifesting the decomposition in the workspace.
  commitStrategy: string; // Name of the strategy for handling additions, deletions and updates.
  contentStrategy: string;
  useSparseComposition: boolean; // Like CustomObject, where (eg) fields can be combined into a CustomObject w/o any root data
}

export interface TypeDefObj {
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
  decompositionConfig: DecompositionConfig;
  hasVirtualSubtypes: boolean;
  inFolder: boolean;
  folderTypeDef: TypeDefObj;
  isGlobal: boolean;
  isEmptyContainer: boolean;
  parent: TypeDefObj;
}

interface TypeDefObjs {
  [key: string]: TypeDefObj;
}

interface ExtensionTypeDefObjs {
  [key: string]: TypeDefObj;
}

// Constants
const METADATA_FILE_EXT = '-meta.xml';
const LWC_FOLDER_NAME = 'lwc';

// A document must be co-resident with its metadata file.
// A file from an exploded zip static resource must be within a directory that is co-resident with its metadata file.
function getTypeDefinitionByFileNameWithNonStandardExtension(
  fileName: string,
  isDirectoryPathElement?: boolean,
  typeDefsToCheck?: TypeDefObj[]
): TypeDefObj {
  const typeDefs = getMetadataTypeDefs();
  const supportedTypeDefs = [typeDefs.Document, typeDefs.StaticResource];
  const candidateTypeDefs =
    typeDefsToCheck === undefined || typeDefsToCheck === null ? supportedTypeDefs : typeDefsToCheck;
  let typeDef = getTypeDefinitionByFileNameWithCoresidentMetadataFile(fileName, candidateTypeDefs, false);
  if ((typeDef === undefined || typeDef === null) && candidateTypeDefs.includes(typeDefs.StaticResource)) {
    typeDef = getTypeDefinitionByFileNameWithCoresidentMetadataFile(
      path.dirname(fileName),
      [typeDefs.StaticResource],
      true
    );
  }
  if (typeDef === undefined || typeDef === null) {
    typeDef = getTypeDefinitionByFileNameMatchingDefaultDirectory(fileName, isDirectoryPathElement, candidateTypeDefs);
  }

  return typeDef;
}

function getTypeDefinitionByFileNameWithCoresidentMetadataFile(
  fileName: string,
  typeDefsToCheck: TypeDefObj[],
  recurse: boolean
): TypeDefObj | null {
  const dir = path.dirname(fileName);
  if (isDirPathExpended(dir)) {
    return null;
  }

  const fullName = path.basename(fileName, path.extname(fileName));
  const typeDef = typeDefsToCheck.find((type) =>
    fs.existsSync(path.join(dir, `${fullName}.${type.ext}${METADATA_FILE_EXT}`))
  );
  if (!(typeDef === undefined || typeDef === null)) {
    return typeDef;
  }
  return recurse ? getTypeDefinitionByFileNameWithCoresidentMetadataFile(dir, typeDefsToCheck, true) : null;
}

function getTypeDefinitionByFileNameMatchingDefaultDirectory(
  fileName: string,
  isDirectoryPathElement: boolean,
  typeDefsToCheck: TypeDefObj[]
): TypeDefObj | null {
  const typeDefs = getMetadataTypeDefs();
  const dir = path.dirname(fileName);
  if (isDirPathExpended(dir)) {
    return null;
  }

  if (typeDefsToCheck.includes(typeDefs.Document) && !isDirectoryPathElement) {
    const pathElements = fileName.split(path.sep);
    if (pathElements.length >= 3 && pathElements[pathElements.length - 3] === typeDefs.Document.defaultDirectory) {
      return typeDefs.Document;
    }
  }

  if (typeDefsToCheck.includes(typeDefs.StaticResource)) {
    if (isDirectoryPathElement) {
      if (path.basename(fileName) === typeDefs.StaticResource.defaultDirectory) {
        return typeDefs.StaticResource;
      }
    }
    return getTypeDefinitionByFileNameMatchingDefaultDirectory(dir, true, [typeDefs.StaticResource]);
  }

  return null;
}

function isDirPathExpended(dir?: string): boolean {
  return dir === undefined || dir === null || dir === path.parse(dir).root || dir === '.';
}

const getMetadataTypeDefs = (function (): () => TypeDefObjs {
  let metadataInfos: {
    typeDefs: TypeDefObjs;
  };
  return function (): TypeDefObjs {
    const filePath = path.join(__dirname, '..', '..', 'metadata', 'metadataTypeInfos.json');
    if (!metadataInfos) {
      metadataInfos = (fs.readJsonSync(filePath) as unknown) as {
        typeDefs: TypeDefObjs;
      };
    }
    return metadataInfos.typeDefs;
  };
})();

// Returns list of default directories for all metadata types
function getTypeDirectories(): string[] {
  const metadataTypeInfos = getMetadataTypeDefs();
  return Object.values(metadataTypeInfos).map((i) => i.defaultDirectory);
}

function getTypeDefsByExtension(typeDefs: TypeDefObjs): ExtensionTypeDefObjs[] {
  return Object.keys(typeDefs).map((metadataName) => ({
    [typeDefs[metadataName].ext]: typeDefs[metadataName],
  }));
}

function getTypeDef(filePath: string): TypeDefObj {
  const typeDefs = getMetadataTypeDefs();

  if (filePath.includes(`${path.sep}aura${path.sep}`)) {
    return typeDefs.AuraDefinitionBundle;
  }

  if (filePath.includes(`${path.sep}waveTemplates${path.sep}`)) {
    return typeDefs.WaveTemplateBundle;
  }

  if (filePath.includes(`${path.sep}${typeDefs.ExperienceBundle.defaultDirectory}${path.sep}`)) {
    return typeDefs.ExperienceBundle;
  }

  if (filePath.includes(`${path.sep}${LWC_FOLDER_NAME}${path.sep}`)) {
    return typeDefs.LightningComponentBundle;
  }

  if (filePath.includes(`${path.sep}${typeDefs.CustomSite.defaultDirectory}${path.sep}`)) {
    return typeDefs.CustomSite;
  }

  // CustomObject file names are special, they are all named "object-meta.xml"
  if (path.basename(filePath) === typeDefs.CustomObject.ext + METADATA_FILE_EXT) {
    return typeDefs.CustomObject;
  }
  return;
}
/* given file extension, return type def */
export default function getTypeDefinitionByFileName(filePath: string, useTrueExtType?: boolean): TypeDefObj {
  const projectPath = SfdxProject.resolveProjectPathSync();
  const typeDefs = getMetadataTypeDefs();
  let typeDef: TypeDefObj;

  let workspaceFilePath = filePath;
  if (filePath.startsWith(projectPath)) {
    workspaceFilePath = filePath.substring(SfdxProject.resolveProjectPathSync().length, filePath.length);
  }

  typeDef = getTypeDef(filePath);
  if (typeDef) {
    return typeDef;
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

  typeExtension = typeExtension.replace('.', '');

  const typeDirectories = getTypeDirectories();
  const defs = Object.values(typeDefs);

  const defaultDirectory = path
    .dirname(workspaceFilePath)
    .split(path.sep)
    .find((i) => !!i && typeDirectories.includes(i));

  if (defaultDirectory) {
    typeDef = defs.find((def) => def.ext === typeExtension && def.defaultDirectory === defaultDirectory);
  }
  if (typeDef === undefined || typeDef === null) {
    const typeDefsByExtension = getTypeDefsByExtension(typeDefs);
    typeDef = typeDefsByExtension[typeExtension] as TypeDefObj;
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
}
