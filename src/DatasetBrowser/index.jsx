import React from 'react';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import { config } from '../params';
import DatasetBrowserTable from './DatasetBrowserTable/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import './DatasetBrowser.less';
import { fetchWithCreds } from '../actions';
import { guppyGraphQLUrl } from '../configs';
import Spinner from '../components/Spinner';
import { graphModelQueryRelativePath } from '../localconf';

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

class DatasetBrowser extends React.Component {
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
      loading: true,
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
    const queryString = `
      {
        study {
          study_description
          submitter_id
          study_design
        }
      }
    `;

    return fetchWithCreds({
      path: subcommonsURL + graphModelQueryRelativePath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: queryString,
      }),
    }).then(
      (result) => {
        if (result.status === 200) {
          return result.data;
        }
        return {};
      },
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
      try {
        promiseArray.push(
          this.obtainSubcommonsData(config.subcommons[j]),
        );
      } catch (err) {
        console.log(err); // eslint-disable-line no-console
      }
    }
    return Promise.all(promiseArray);
  }

  initializeData = () => {
    this.allData = [];
    this.obtainParentCommonsStudies().then((result) => {
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

      this.setState({ loading: false });
    });
  }

  obtainParentCommonsStudies = async () => {
    const queryString = `
      query {
        dataset(first: 10000) {
          dataset_name
          supported_data_resource
          auth_resource_path
          research_focus
          link
          description
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

  render() {
    const filterSections = config.datasetBrowserConfig.filterSections;
    for (let k = 0; k < filterSections.length; k += 1) {
      const options = filterSections[k].options.slice();
      const n = Object.keys(options).length;
      for (let m = 0; m < n; m += 1) {
        options[m].count = 1;
      }
      filterSections[k].options = options;
    }

    const fieldMapping = config.datasetBrowserConfig.fieldMapping;

    const tabs = [
      <FilterList key={0} sections={filterSections} />,
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
          Datasets Browser
        </div>
        <div id='def-spinner' className={this.state.loading ? 'visible' : 'hidden'} ><Spinner /></div>
        <div className='dataset-browser'>
          <div className='dataset-browser__filters'>
            <FilterGroup
              tabs={tabs}
              filterConfig={config.datasetBrowserConfig.filterConfig}
              onFilterChange={e => this.handleFilterChange(e)}
            />
          </div>
          <div className='dataset-browser__visualizations'>
            {
              <div className='guppy-explorer-visualization__charts'>
                <DataSummaryCardGroup summaryItems={summaries} connected />
              </div>
            }
            <DatasetBrowserTable
              ref={this.tableRef}
              className='guppy-explorer-visualization__table'
              tableConfig={tableConfig}
              filteredData={this.state.filteredData}
              totalCount={totalCount}
              guppyConfig={config.datasetBrowserConfig}
              isLocked={false}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default DatasetBrowser;
