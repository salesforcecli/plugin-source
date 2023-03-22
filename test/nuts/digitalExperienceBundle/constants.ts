/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join, sep } from 'path';
import { TestSessionOptions } from '@salesforce/cli-plugins-testkit/lib/testSession';
import { registry } from '@salesforce/source-deploy-retrieve';
import { META_XML_SUFFIX } from '@salesforce/source-deploy-retrieve/lib/src/common';

export const SOURCE_BASE_RELATIVE_PATH = join('force-app', 'main', 'default');
export const DEB_NUTS_PATH = join(process.cwd(), 'test', 'nuts', 'digitalExperienceBundle');

export const TYPES = {
  DEB: registry.types.digitalexperiencebundle,
  DE: registry.types.digitalexperiencebundle.children.types.digitalexperience,
  DEC: registry.types.digitalexperienceconfig,
  NETWORK: registry.types.network,
  CUSTOM_SITE: registry.types.customsite,
  APEX_PAGE: registry.types.apexpage,
  APEX_CLASS: registry.types.apexclass,
} as const;

export const DIR_NAMES = {
  PROJECT: 'project',
  STORE: 'store',
  COMPONENTS: 'components',
  MANIFESTS: 'manifests',
  NETWORKS: TYPES.NETWORK.directoryName,
  SITES: TYPES.CUSTOM_SITE.directoryName,
  DIGITAL_EXPERIENCE_CONFIGS: TYPES.DEC.directoryName,
  DIGITAL_EXPERIENCES: TYPES.DEB.directoryName,
  SITE: 'site',
  HOME: 'home',
  DEB_A: 'Capricorn_Coffee_A1',
  DEB_B: 'Capricorn_Coffee_B1',
  DE_VIEW: 'sfdc_cms__view',
  DE_ROUTE: 'sfdc_cms__route',
  VIEW_DOCUMENT_DETAIL: 'documentDetail',
  ROUTE_DOCUMENT_DETAIL: 'Document_Detail__c',
} as const;

export const DEBS_RELATIVE_PATH = join(SOURCE_BASE_RELATIVE_PATH, DIR_NAMES.DIGITAL_EXPERIENCES, DIR_NAMES.SITE);
export const DEB_A_RELATIVE_PATH = join(DEBS_RELATIVE_PATH, DIR_NAMES.DEB_A);
export const DEB_B_RELATIVE_PATH = join(DEBS_RELATIVE_PATH, DIR_NAMES.DEB_B);

export const STORE_PATH = join(DEB_NUTS_PATH, DIR_NAMES.STORE);
export const STORE_COMPONENTS_PATH = join(STORE_PATH, DIR_NAMES.COMPONENTS);
export const STORE_MANIFESTS_PATH = join(STORE_PATH, DIR_NAMES.MANIFESTS);

export const FULL_NAMES = {
  DEB_A: join(DIR_NAMES.SITE, DIR_NAMES.DEB_A),
  DEB_B: join(DIR_NAMES.SITE, DIR_NAMES.DEB_B),
  DE_VIEW_HOME_A: join(DIR_NAMES.SITE, `${DIR_NAMES.DEB_A}.${DIR_NAMES.DE_VIEW}`, DIR_NAMES.HOME),
  DE_VIEW_HOME_B: join(DIR_NAMES.SITE, `${DIR_NAMES.DEB_B}.${DIR_NAMES.DE_VIEW}`, DIR_NAMES.HOME),
  DE_VIEW_DOCUMENT_DETAIL_A: join(
    DIR_NAMES.SITE,
    `${DIR_NAMES.DEB_A}.${DIR_NAMES.DE_VIEW}`,
    DIR_NAMES.VIEW_DOCUMENT_DETAIL
  ),
  DE_ROUTE_DOCUMENT_DETAIL_A: join(
    DIR_NAMES.SITE,
    `${DIR_NAMES.DEB_A}.${DIR_NAMES.DE_ROUTE}`,
    DIR_NAMES.ROUTE_DOCUMENT_DETAIL
  ),
} as const;

export const FILE_NAMES = {
  CONTENT: {
    DE_MAIN: 'content.json',
    DE_FRENCH_VARIANT: 'fr.json',
  },
  META: {
    DEB_A: `${DIR_NAMES.DEB_A}.${TYPES.DEB.suffix}${META_XML_SUFFIX}`,
    DEB_B: `${DIR_NAMES.DEB_B}.${TYPES.DEB.suffix}${META_XML_SUFFIX}`,
    DE: TYPES.DE.metaFileSuffix, // metaFileName = metaFileSuffix in case of DigitalExperience
  },
} as const;

export const DIR_RELATIVE_PATHS = {
  NETWORKS: join(SOURCE_BASE_RELATIVE_PATH, DIR_NAMES.NETWORKS),
  SITES: join(SOURCE_BASE_RELATIVE_PATH, DIR_NAMES.SITES),
  DIGITAL_EXPERIENCE_CONFIGS: join(SOURCE_BASE_RELATIVE_PATH, DIR_NAMES.DIGITAL_EXPERIENCE_CONFIGS),
  DE_VIEW_A: join(DEB_A_RELATIVE_PATH, DIR_NAMES.DE_VIEW),
  DE_VIEW_B: join(DEB_B_RELATIVE_PATH, DIR_NAMES.DE_VIEW),
  DE_ROUTE_A: join(DEB_A_RELATIVE_PATH, DIR_NAMES.DE_ROUTE),
  DE_ROUTE_B: join(DEB_B_RELATIVE_PATH, DIR_NAMES.DE_ROUTE),
  DE_VIEW_HOME_A: join(DEB_A_RELATIVE_PATH, DIR_NAMES.DE_VIEW, DIR_NAMES.HOME),
  DE_VIEW_HOME_B: join(DEB_B_RELATIVE_PATH, DIR_NAMES.DE_VIEW, DIR_NAMES.HOME),
  DE_VIEW_DOCUMENT_DETAIL_A: join(DEB_A_RELATIVE_PATH, DIR_NAMES.DE_VIEW, DIR_NAMES.VIEW_DOCUMENT_DETAIL),
  DE_ROUTE_DOCUMENT_DETAIL_A: join(DEB_A_RELATIVE_PATH, DIR_NAMES.DE_ROUTE, DIR_NAMES.ROUTE_DOCUMENT_DETAIL),
} as const;

export const FILE_RELATIVE_PATHS = {
  DEB_META_A: join(DEB_A_RELATIVE_PATH, FILE_NAMES.META.DEB_A),
  DEB_META_B: join(DEB_B_RELATIVE_PATH, FILE_NAMES.META.DEB_B),
  DE_VIEW_HOME_META_A: join(DIR_RELATIVE_PATHS.DE_VIEW_HOME_A, FILE_NAMES.META.DE),
  DE_VIEW_HOME_META_B: join(DIR_RELATIVE_PATHS.DE_VIEW_HOME_B, FILE_NAMES.META.DE),
  DE_VIEW_HOME_CONTENT_A: join(DIR_RELATIVE_PATHS.DE_VIEW_HOME_A, FILE_NAMES.CONTENT.DE_MAIN),
  DE_VIEW_HOME_CONTENT_B: join(DIR_RELATIVE_PATHS.DE_VIEW_HOME_B, FILE_NAMES.CONTENT.DE_MAIN),
  DE_VIEW_HOME_FR_VARIANT_A: join(DIR_RELATIVE_PATHS.DE_VIEW_HOME_A, FILE_NAMES.CONTENT.DE_FRENCH_VARIANT),
  DE_VIEW_HOME_FR_VARIANT_B: join(DIR_RELATIVE_PATHS.DE_VIEW_HOME_B, FILE_NAMES.CONTENT.DE_FRENCH_VARIANT),
  DE_VIEW_DOCUMENT_DETAIL_META_A: join(DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A, FILE_NAMES.META.DE),
  DE_VIEW_DOCUMENT_DETAIL_CONTENT_A: join(DIR_RELATIVE_PATHS.DE_VIEW_DOCUMENT_DETAIL_A, FILE_NAMES.CONTENT.DE_MAIN),
  DE_ROUTE_DOCUMENT_DETAIL_META_A: join(DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A, FILE_NAMES.META.DE),
  DE_ROUTE_DOCUMENT_DETAIL_CONTENT_A: join(DIR_RELATIVE_PATHS.DE_ROUTE_DOCUMENT_DETAIL_A, FILE_NAMES.CONTENT.DE_MAIN),
} as const;

export const STORE = {
  COMPONENTS: {
    VIEW_DOCUMENT_DETAIL: join(STORE_COMPONENTS_PATH, DIR_NAMES.DE_VIEW, DIR_NAMES.VIEW_DOCUMENT_DETAIL),
    ROUTE_DOCUMENT_DETAIL: join(STORE_COMPONENTS_PATH, DIR_NAMES.DE_ROUTE, DIR_NAMES.ROUTE_DOCUMENT_DETAIL),
  },
  MANIFESTS: {
    ALL_DEBS: join(STORE_MANIFESTS_PATH, 'all-debs-package.xml'),
    ALL_DE: join(STORE_MANIFESTS_PATH, 'all-de-package.xml'),
    ALL_DE_OF_DEB_A: join(STORE_MANIFESTS_PATH, 'all-de-of-deb-a-package.xml'),
    FULL_SITE_DEB_A_AND_B: join(STORE_MANIFESTS_PATH, 'full-site-deb-a-and-b-package.xml'),
    JUST_DEB_A: join(STORE_MANIFESTS_PATH, 'just-deb-a-package.xml'),
    DE_VIEW_HOME_OF_DEB_A: join(STORE_MANIFESTS_PATH, 'de-view-home-of-deb-a-package.xml'),
    DE_DOCUMENT_DETAIL_PAGE_A: join(STORE_MANIFESTS_PATH, 'de-document-detail-page-a-package.xml'),
    EMPTY_PACKAGE_XML: join(STORE_MANIFESTS_PATH, 'empty-package.xml'),
    ALL_DEBS_SOURCE_PATH_GEN: 'all-debs-sourcepath-gen-package.xml',
    ALL_DEBS_METADATA_GEN: 'all-debs-metadata-gen-package.xml',
  },
} as const;

export const METADATA = {
  ALL_DEBS: TYPES.DEB.name,
  ALL_DE: TYPES.DE.name,
  ALL_DE_OF_DEB_B: `${TYPES.DE.name}:${DIR_NAMES.SITE}${sep}${DIR_NAMES.DEB_B}.*`,
  FULL_SITE_DEB_A_AND_B: `${TYPES.DEB.name},${TYPES.DEC.name},${TYPES.NETWORK.name},${TYPES.CUSTOM_SITE.name}`,
  JUST_DEB_B: `${TYPES.DEB.name}:${FULL_NAMES.DEB_B}`,
  DE_VIEW_HOME_OF_DEB_B: `${TYPES.DE.name}:${FULL_NAMES.DE_VIEW_HOME_B}`,
  DE_DOCUMENT_DETAIL_PAGE_A: `${TYPES.DE.name}:${FULL_NAMES.DE_VIEW_DOCUMENT_DETAIL_A},${TYPES.DE.name}:${FULL_NAMES.DE_ROUTE_DOCUMENT_DETAIL_A}`,
};

export const TEST_SESSION_OPTIONS: TestSessionOptions = {
  project: {
    sourceDir: join(DEB_NUTS_PATH, DIR_NAMES.PROJECT),
  },
  devhubAuthStrategy: 'AUTO',
  scratchOrgs: [
    {
      executable: 'sfdx',
      duration: 1,
      setDefault: true,
      wait: 10,
      config: join('config', 'project-scratch-def.json'),
    },
  ],
};
