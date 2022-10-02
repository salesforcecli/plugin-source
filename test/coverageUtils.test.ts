/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { expect } from 'chai';
import { MockTestOrgData, testSetup } from '@salesforce/core/lib/testSetup';
import { AuthInfo, Connection } from '@salesforce/core';
import { createSandbox, SinonSandbox } from 'sinon';
import { transformCoverageToApexCoverage } from '../src/coverageUtils';
import { transformDeployTestsResultsToTestResult } from '../src/coverageUtils';

const sampleRunTestResult = {
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

describe('transform md RunTestResult', () => {
  const $$ = testSetup();
  let mockConnection: Connection;
  const testData = new MockTestOrgData();

  let sandboxStub: SinonSandbox;
  beforeEach(async () => {
    sandboxStub = createSandbox();

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

  afterEach(async () => {
    sandboxStub.restore();
  });
  it('should transform md coverage to apex coverage format', () => {
    const apexCoverage = transformCoverageToApexCoverage(sampleRunTestResult.codeCoverage);
    expect(apexCoverage.records).to.have.length(4);
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
    const apexTestResults = transformDeployTestsResultsToTestResult(mockConnection, sampleRunTestResult);
    expect(apexTestResults).to.be.ok;
  });
});
