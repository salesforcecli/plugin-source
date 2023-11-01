/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { MockTestOrgData, TestContext } from '@salesforce/core/lib/testSetup.js';
import { AuthInfo, Connection } from '@salesforce/core';
import sinon from 'sinon';
import chalk from 'chalk';
import {
  prepCoverageForDisplay,
  transformCoverageToApexCoverage,
  transformDeployTestsResultsToTestResult,
} from '../src/coverageUtils.js';

// methods are mutating the object instead of returning new ones
function getSampleTestResult() {
  return {
    codeCoverage: [
      {
        id: '01p19000002uDLAAA2',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'PagedResult',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '4',
        numLocationsNotCovered: '1',
        type: 'Class',
      },
      {
        id: '01p19000002uDLBAA2',
        locationsNotCovered: [
          {
            column: '0',
            line: '26',
            numExecutions: '0',
            time: '-1.0',
          },
          {
            column: '0',
            line: '31',
            numExecutions: '0',
            time: '-1.0',
          },
          {
            column: '0',
            line: '78',
            numExecutions: '0',
            time: '-1.0',
          },
        ],
        name: 'PropertyController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '44',
        numLocationsNotCovered: '3',
        type: 'Class',
      },
      {
        id: '01p19000002uDLCAA2',
        name: 'SampleDataController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '34',
        numLocationsNotCovered: '0',
        type: 'Class',
      },
      {
        id: '01p19000002uDL8AAM',
        name: 'GeocodingService',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '36',
        numLocationsNotCovered: '0',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAAAN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'A',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '100',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAAAN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'B',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '26',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAABN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'C',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '25',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAABN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'D',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '11',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAABN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'E',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '10',
        type: 'Class',
      },
      {
        id: '01p19000002uDLAACN',
        locationsNotCovered: {
          column: '0',
          line: '12',
          numExecutions: '0',
          time: '-1.0',
        },
        name: 'F',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        numLocations: '100',
        numLocationsNotCovered: '0',
        type: 'Class',
      },
    ],
    failures: {
      id: '01p19000002uDLDAA2',
      message: 'System.QueryException: Insufficient permissions: secure query included inaccessible field',
      methodName: 'testGetPagedPropertyList',
      name: 'TestPropertyController',
      namespace: {
        $: {
          'xsi:nil': 'true',
        },
      },
      packageName: 'TestPropertyController',
      stackTrace:
        'Class.PropertyController.getPagedPropertyList: line 52, column 1\nClass.TestPropertyController.testGetPagedPropertyList: line 22, column 1',
      time: '604.0',
      type: 'Class',
    },
    numFailures: '1',
    numTestsRun: '7',
    successes: [
      {
        id: '01p19000002uDL9AAM',
        methodName: 'blankAddress',
        name: 'GeocodingServiceTest',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '26.0',
      },
      {
        id: '01p19000002uDL9AAM',
        methodName: 'errorResponse',
        name: 'GeocodingServiceTest',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '77.0',
      },
      {
        id: '01p19000002uDL9AAM',
        methodName: 'successResponse',
        name: 'GeocodingServiceTest',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '63.0',
      },
      {
        id: '01p19000002uDLDAA2',
        methodName: 'testGetPicturesNoResults',
        name: 'TestPropertyController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '691.0',
      },
      {
        id: '01p19000002uDLDAA2',
        methodName: 'testGetPicturesWithResults',
        name: 'TestPropertyController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '1873.0',
      },
      {
        id: '01p19000002uDLEAA2',
        methodName: 'importSampleData',
        name: 'TestSampleDataController',
        namespace: {
          $: {
            'xsi:nil': 'true',
          },
        },
        time: '1535.0',
      },
    ],
    totalTime: '4952.0',
  };
}

describe('transform md RunTestResult', () => {
  const $$ = new TestContext();
  let mockConnection: Connection;
  const testData = new MockTestOrgData();
  let sampleTestResult = getSampleTestResult();

  let sandboxStub: sinon.SinonSandbox;
  beforeEach(async () => {
    sampleTestResult = getSampleTestResult();
    sandboxStub = sinon.createSandbox();

    $$.setConfigStubContents('StateAggregator', {
      contents: {
        orgs: {
          [testData.username]: await testData.getConfig(),
        },
      },
    });
    // Stub retrieveMaxApiVersion to get over "Domain Not Found: The org cannot be found" error
    sandboxStub.stub(Connection.prototype, 'retrieveMaxApiVersion').resolves('50.0');
    mockConnection = await Connection.create({
      authInfo: await AuthInfo.create({
        username: testData.username,
      }),
    });
    sandboxStub.stub(mockConnection, 'instanceUrl').get(() => 'https://na139.salesforce.com');
  });

  afterEach(() => {
    sandboxStub.restore();
  });

  it('should transform md coverage to apex coverage format', () => {
    const apexCoverage = transformCoverageToApexCoverage(sampleTestResult.codeCoverage);
    expect(apexCoverage.records).to.have.length(10);
    expect(apexCoverage.records[0].ApexClassOrTrigger.Name).to.equal('PagedResult');
    expect(apexCoverage.records[1].ApexClassOrTrigger.Name).to.equal('PropertyController');
    expect(apexCoverage.records[2].ApexClassOrTrigger.Name).to.equal('SampleDataController');
    expect(apexCoverage.records[1].NumLinesCovered).to.equal(44);
    expect(apexCoverage.records[1].NumLinesUncovered).to.equal(3);
    expect(apexCoverage.records[1].Coverage.uncoveredLines).to.deep.equal([26, 31, 78]);
    expect(apexCoverage.records[2].Coverage.uncoveredLines).to.have.lengthOf(0);
    expect(apexCoverage.records[2].Coverage.uncoveredLines).to.have.lengthOf(apexCoverage.records[2].NumLinesUncovered);
    expect(apexCoverage.records[2].Coverage.coveredLines).to.have.lengthOf(apexCoverage.records[2].NumLinesCovered);
  });

  it('should transform md test results to apex test results format', () => {
    const apexTestResults = transformDeployTestsResultsToTestResult(mockConnection, sampleTestResult);
    expect(apexTestResults).to.be.ok;
  });

  it('should display code coverage classes ordered alphabetically', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);

    expect(codeCoverage[0].name).to.equal('A');
    expect(codeCoverage[1].name).to.equal('B');
    expect(codeCoverage[2].name).to.equal('C');
    expect(codeCoverage[3].name).to.equal('D');
    expect(codeCoverage[4].name).to.equal('E');
    expect(codeCoverage[5].name).to.equal('F');
    expect(codeCoverage[6].name).to.equal('GeocodingService');
    expect(codeCoverage[7].name).to.equal('PagedResult');
    expect(codeCoverage[8].name).to.equal('PropertyController');
    expect(codeCoverage[9].name).to.equal('SampleDataController');
  });

  it('should display code coverage percentage with red color when its value is < 75%', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);
    expect(codeCoverage[0].numLocations).to.equal(chalk.red('0%'));
    expect(codeCoverage[1].numLocations).to.equal(chalk.red('74%'));
  });

  it('should display code coverage percentage with yellow color when its value is >= 75% and < 90%', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);
    expect(codeCoverage[2].numLocations).to.equal(chalk.yellow('75%'));
    expect(codeCoverage[3].numLocations).to.equal(chalk.yellow('89%'));
  });

  it('should display code coverage percentage with green color when its value is >= 90%', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);
    expect(codeCoverage[4].numLocations).to.equal(chalk.green('90%'));
    expect(codeCoverage[5].numLocations).to.equal(chalk.green('100%'));
  });

  it('lineNotCovered is empty string when there is no data', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);
    expect(codeCoverage.find((c) => c.name === 'SampleDataController')?.lineNotCovered).equal('');
  });
  it('lineNotCovered is single number for one item', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);
    expect(codeCoverage.find((c) => c.name === 'PagedResult')?.lineNotCovered).equal('12');
  });
  it('lineNotCovered is comma separated list for multiple items', () => {
    const codeCoverage = prepCoverageForDisplay(sampleTestResult.codeCoverage);
    expect(codeCoverage.find((c) => c.name === 'PropertyController')?.lineNotCovered).equal('26,31,78');
  });
});
