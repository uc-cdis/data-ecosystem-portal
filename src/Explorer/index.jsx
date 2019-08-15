import React from 'react';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import { config } from '../params';
import ExplorerTable from './ExplorerTable/';
import ExplorerCharts from './ExplorerCharts/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import './Explorer.less';
import { fetchWithCreds } from '../actions';
import { guppyGraphQLUrl } from '../configs';

import GuppyWrapper from '@gen3/guppy/dist/components/GuppyWrapper';
import { guppyUrl, tierAccessLevel, tierAccessLimit } from '../localconf';

var dataExplorerConfig2 = {
    "guppy": {
      "indices": [
        {
          "index": "dataset_browser",
          "type": "dataset"
        }
      ],
      "auth_filter_field": "auth_resource_path"
    },
    "projectSections": [
      { 
        "title": "Project/Dataset", 
        "options": [
          { "text": "MARCS", "filterType": "singleSelect"},
          { "text": "WIHS", "filterType": "singleSelect"},
          { "text": "DEPOT: DAIDs Data Commons", "filterType": "singleSelect"},
          { "text": "ImmPort", "filterType": "singleSelect"}
        ]
      }
    ],
    "subjectSections": [
      { 
        "title": "Ethnicity", 
        "options": [
          { "text": "Hispanic or Latino", "filterType": "singleSelect"},
          { "text": "Not Hispanic or Latino", "filterType": "singleSelect"}
        ]
      },
      { 
        "title": "Gender",
        "options": [
          { "text": "Male", "filterType": "singleSelect"},
          { "text": "Female", "filterType": "singleSelect"},
          { "text": "Not Reported", "filterType": "singleSelect"}
        ]
      }
    ],
    "fieldMapping" : [
      { "field": "link", "name": "View" },
      { "field": "dataset_name", "name": "Dataset" },
      { "field": "supported_data_resource", "name": "Supported Data Resource" },
      { "field": "research_focus", "name": "Research Focus" },
      { "field": "description", "name": "Description of Dataset" }
    ],
    "filterConfig": {
      "tabs": [{
        "title": "Project",
        "fields": ["dataset_name", "research_focus"]
      }, 
      {
        "title": "Subject",
        "fields": ["ethnicity", "gender"]
      }]
    }
};

function calculateSummaryCounts(field, filteredData) {
  const values = [];
  for (let j = 0; j < filteredData.length; j += 1) {
    values.push(filteredData[j][field]);
  }
  const uniqueValues = values.filter(
    (value, index) => values.indexOf(value) === index,
  );
  return uniqueValues.length;
}

function checkIfFiltersApply(filtersApplied, row) {
  const attributes = Object.keys(filtersApplied);
  for (let i = 0; i < attributes.length; i += 1) {
    const property = attributes[i];
    if (!row[property]) {
      return false;
    }
    const filtersApplyMatch = filtersApplied[property].selectedValues.map(
      x => x.toLowerCase(),
    ).includes(
      row[property].toLowerCase(),
    );
    let filtersApplyContains = filtersApplied[property].selectedValues.filter(
      x => row[property].toLowerCase().includes(x.toLowerCase()),
    );
    filtersApplyContains = filtersApplyContains.length > 0;
    const filtersApply = filtersApplyMatch || filtersApplyContains;
    if (!filtersApply) {
      return false;
    }
  }
  return true;
}

function addCountsToSectionList(filterSections) {
  for (let k = 0; k < filterSections.length; k += 1) {
    const options = filterSections[k].options.slice();
    const n = Object.keys(options).length;
    for (let m = 0; m < n; m += 1) {
      options[m].count = 1;
    }
    filterSections[k].options = options;
  }
  return filterSections
}

class Explorer extends React.Component {
  constructor(props) {
    super(props);
    const tabIndex = 0;
    this.state = {
      tab: tabIndex > 0 ? tabIndex : 0,
      rawData: [],
      filteredData: [],
      paginatedData: [],
      counts: {
        supported_data_resource: 0,
        dataset_name: 0,
      },
    };
    this.filterGroupRef = React.createRef();
    this.tableRef = React.createRef();
  }

  componentWillMount() {
    this.initializeData();
  }

  obtainSubcommonsData = (subcommonsConfig) => {
    const subcommonsURL = subcommonsConfig.URL;
    const subcommonsName = subcommonsConfig.name;
    const graphModelQueryURL = 'api/v0/submission/graphql';
    const queryString = `
      {
        study {
          study_description
          submitter_id
          study_design
        }
      }
    `;
    return fetch(subcommonsURL + graphModelQueryURL, {
      method: 'POST',
      body: JSON.stringify({
        query: queryString,
      }),
    }).then(
      result => result.json(),
      reason => [ ] // eslint-disable-line
    ).then((result) => {
      const reformatted = [];
      if (!result.data) {
        return [];
      }
      const studies = result.data.study;
      for (let j = 0; j < studies.length; j += 1) {
        reformatted.push({
          description: studies[j].study_description,
          dataset_name: studies[j].submitter_id,
          research_focus: studies[j].study_design,
          link: subcommonsURL,
          supported_data_resource: subcommonsName,
        });
      }
      return reformatted;
    });
  }

  obtainAllSubcommonsData = () => {
    const promiseArray = [];
    const n = Object.keys(config.subcommons).length;
    for (let j = 0; j < n; j += 1) {
      promiseArray.push(
        this.obtainSubcommonsData(config.subcommons[j]),
      );
    }
    return Promise.all(promiseArray);
  }

  initializeData = () => {
    this.allData = [];
    this.obtainParentCommonsStudies().then((result) => {
      console.log('parentCommonsData: ', parentCommonsData);
      const parentCommonsData = result.data.dataset;
      this.allData = this.allData.concat(parentCommonsData);
      return this.obtainAllSubcommonsData();
    }).then((subCommonsData) => {
      const data = subCommonsData.flat();
      if (data.length > 0) {
        this.allData = this.allData.concat(data);
      }

      this.setState({
        filteredData: this.allData,
        rawData: this.allData,
        counts: {
          supported_data_resource: calculateSummaryCounts('supported_data_resource', this.allData),
          dataset_name: calculateSummaryCounts('dataset_name', this.allData),
        },
      });

      this.tableRef.current.updateData(this.allData);
    });
  }

  obtainParentCommonsStudies = async () => {
    const queryString = `
      query {
        subject(first: 10000) {
          submitter_id
          race
          gender
          ethnicity
          species
          ageUnit
          age
          phenotype
          strain
          armAccession
          studyAccession
          filePath
          fileDetail
          submitter_id
          subjectAccession
        }
      }
    `;

    return fetchWithCreds({
      path: `${guppyGraphQLUrl}`,
      body: JSON.stringify({
        query: queryString,
      }),
      method: 'POST',
    }).then(
      ({ status, data }) => data, // eslint-disable-line no-unused-vars
    );
  }

  handleFilterChange(filtersApplied) {
    const rawData = this.state.rawData;
    const filteredData = [];
    for (let j = 0; j < rawData.length; j += 1) {
      const isMatch = checkIfFiltersApply(filtersApplied, rawData[j]);
      if (isMatch) {
        filteredData.push(rawData[j]);
      }
    }

    this.setState({
      filteredData,
      counts:
        {
          supported_data_resource: calculateSummaryCounts('supported_data_resource', filteredData),
          dataset_name: calculateSummaryCounts('dataset_name', filteredData),
        },
    });

    this.tableRef.current.updateData(filteredData);
  }

  handleReceiveNewAggsData = (newAggsData) => {
    console.log('new aggsdata: ', newAggsData);
    this.setState({ aggsData: newAggsData });
  };

  render() {
    // const chartData = this.buildChartData(this.props.aggsData, this.props.chartConfig, this.props.filter);
    const projectSections = addCountsToSectionList(dataExplorerConfig2.projectSections);
    const subjectSections = addCountsToSectionList(dataExplorerConfig2.subjectSections);

    const fieldMapping = dataExplorerConfig2.fieldMapping;

    const tabs = [
      <FilterList key={0} sections={projectSections} />,
      <FilterList key={1} sections={subjectSections} />
    ];

    const supportedDataResourceCount = {
      label: 'Supported Data Resources',
      value: this.state.counts.supported_data_resource,
    };

    const datasetCount = {
      label: 'Datasets',
      value: this.state.counts.dataset_name,
    };

    const summaries = [supportedDataResourceCount, datasetCount];

    const totalCount = this.state.filteredData.length;

    const fields = [];
    for (let j = 0; j < fieldMapping.length; j += 1) {
      fields.push(fieldMapping[j].field);
    }
    const tableConfig = { fields };

    return (
      <React.Fragment>
        <div className='ndef-page-title'>
          Data Explorer
        </div>
        <GuppyWrapper
            filterConfig={dataExplorerConfig2.filterConfig}
            guppyConfig={{ type: 'subject', ...dataExplorerConfig2 }}
            onReceiveNewAggsData={this.handleReceiveNewAggsData}
            onFilterChange={this.handleFilterChange}
            rawDataFields={tableConfig.fields}
            accessibleFieldCheckList={tableConfig.fields}
            >
          <div className='explorer'>
            <div className='guppy-explorer-visualization__charts'>
              <DataSummaryCardGroup summaryItems={summaries} connected />
            </div>
            <div className='explorer__filters'>
              <FilterGroup
                tabs={tabs}
                filterConfig={dataExplorerConfig2.filterConfig}
                onFilterChange={e => this.handleFilterChange(e)}
              />
            </div>
            <div className='explorer__visualizations'>
              <ExplorerCharts/>
              <ExplorerTable
                ref={this.tableRef}
                className='guppy-explorer-visualization__table'
                tableConfig={tableConfig}
                filteredData={this.state.filteredData}
                totalCount={totalCount}
                guppyConfig={dataExplorerConfig2}
                isLocked={false}
              />
            </div>
          </div>
        </GuppyWrapper>
      </React.Fragment>
    );
  }
}

export default Explorer;
