import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { config } from '../params';
import DatasetBrowserTable from './DatasetBrowserTable/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import './DatasetBrowser.less';
import { fetchWithCreds } from '../actions';
import { guppyGraphQLUrl } from '../configs';

const defaultConfig = {
  filters: { tabs: [] },
  table: {
    enabled: true,
    fields: [],
  },
  guppyConfig: {
    dataType: 'dataset',
    fieldMapping: []
  },
  buttons: [],
  dropdowns: {},
};

const datasetBrowserConfig = [
  _.merge(defaultConfig, config.datasetBrowserConfig)
];

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
        'supported_data_resource': 0,
        'dataset_name': 0
      }
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
      })
    }).then(
      result => result.json(), 
      reason => [ ]
    ).then(result => {
      const reformatted = [];
      if (!result.data) {
        return [];
      }
      const studies = result.data.study;
      for(let j = 0; j < studies.length; j++) {
        reformatted.push({
          'description': studies[j]['study_description'],
          'dataset_name': studies[j]['submitter_id'],
          'research_focus': studies[j]['study_design'],
          'link': subcommonsURL,
          'supported_data_resource': subcommonsName
        });
      }
      return reformatted;
    });
  }

  obtainAllSubcommonsData = () => {
    const promiseArray = [];
    const n = Object.keys(config.subcommons).length;
    for (let j = 0; j < n; j++) {
      promiseArray.push(
        this.obtainSubcommonsData(config.subcommons[j])
      );
    }
    return Promise.all(promiseArray);
  }

  initializeData = () => {
    this.allData = [];
    this.obtainParentCommonsStudies().then(result => {
      const parentCommonsData = result.data.dataset;
      this.allData = this.allData.concat(parentCommonsData);
      return this.obtainAllSubcommonsData();
    }).then(subCommonsData => {
      const data = subCommonsData.flat();
      if(data.length > 0) {
        this.allData = this.allData.concat(data);
      }

      this.setState({
        'filteredData': this.allData,
        'rawData': this.allData,
        'counts': {
          'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', this.allData),
          'dataset_name': this.calculateSummaryCounts('dataset_name', this.allData)
        }
      })

      this.tableRef.current.updateData(this.allData);
    });
  }

  calculateSummaryCounts(field, filteredData) {
    const values = [];
    for(let j = 0; j < filteredData.length; j++) {
      values.push(filteredData[j][field]);
    }
    const uniqueValues = values.filter(
      (value, index) => values.indexOf(value) === index 
    );
    return uniqueValues.length;
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

  checkIfFiltersApply(filtersApplied, row) {
    for (var property in filtersApplied) {
      if (!row[property]) {
        return false;
      }
      const filtersApplyMatch = filtersApplied[property].selectedValues.map(
        x => x.toLowerCase()
      ).includes(
        row[property].toLowerCase()
      );
      const filtersApplyContains = filtersApplied[property].selectedValues.filter(
        x => row[property].toLowerCase().includes(x.toLowerCase())
      );
      filtersApplyContains = filtersApplyContains.length > 0;
      const filtersApply = filtersApplyMatch || filtersApplyContains;
      if (!filtersApply) {
        return false;
      }
    }
    return true;
  }

  handleFilterChange(filtersApplied) {
    const rawData = this.state.rawData;
    let filteredData = [];
    for(let j = 0; j < rawData.length; j++) {
      const isMatch = this.checkIfFiltersApply(filtersApplied, rawData[j]);
      if(isMatch) {
        filteredData.push(rawData[j]);
      }
    }
    
    this.setState({
      filteredData : filteredData,
      'counts' : 
        { 
          'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', filteredData),
          'dataset_name': this.calculateSummaryCounts('dataset_name', filteredData)
        }
    });

    this.tableRef.current.updateData(filteredData);
  }

  render() {
    var filterSections = config.datasetBrowserConfig.filterSections;
    for(let k = 0; k < filterSections.length; k++) {
      let options = filterSections[k].options.slice();
      let n = Object.keys(options).length;
      for(let m = 0; m < n; m++) {
        options[m].count = 1;
      }
      filterSections[k].options = options;
    }
    
    const fieldMapping = config.datasetBrowserConfig.fieldMapping;

    const tabs = [
      <FilterList key={0} sections={filterSections} />
    ];

    const supportedDataResourceCount = {
      label: 'Supported Data Resources',
      value: this.state.counts['supported_data_resource']
    };

    const datasetCount = {
      label: 'Datasets',
      value: this.state.counts['dataset_name']
    };

    const summaries = [supportedDataResourceCount, datasetCount];

    const totalCount = this.state.filteredData.length;

    let fields = [];
    for(let j = 0; j < fieldMapping.length; j++) {
      fields.push(fieldMapping[j].field);
    }
    const tableConfig = { fields: fields };

    const filterConfig = {
      tabs: [{
        title: 'Filters',
        fields: ["supported_data_resource", "research_focus"],
      }],
    };

    return (
      <React.Fragment>
        <div className='ndef-page-title'>
          Datasets Browser
        </div>
        <div className='dataset-browser'>
          <div className='dataset-browser__filters'>
            <FilterGroup
              tabs={tabs}
              filterConfig={filterConfig}
              onFilterChange={ (e) => this.handleFilterChange(e) }
            />
          </div>
          <div className='data-explorer__visualizations'>
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
                totalCount={this.props.totalCount}
                guppyConfig={config.datasetBrowserConfig}
                isLocked={false}
                totalCount={totalCount}
              />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

DatasetBrowser.propTypes = {
  history: PropTypes.object.isRequired, // inherited from ProtectedContent
  location: PropTypes.object.isRequired,
};

export default DatasetBrowser;
