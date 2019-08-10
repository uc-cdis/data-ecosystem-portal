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
import { immportApiPath } from '../localconf';
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
  _.merge(defaultConfig, config.dataExplorerConfig)
];

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

  obtainSubCommonsData = () => {
    const graphModelQueryURL = 'api/v0/submission/graphql';
    const subcommonURL = 'https://niaid.bionimbus.org/';
    const subcommonName = 'NDC: TB Data Commons';
    const queryString = `
      {
        study {
          study_design
          study_doi
          study_objective
          study_setup
          study_description
          study_organization
          submitter_id
        }
      }
    `;
    const headers = {
      'Authorization': 'bearer '
    };
    return fetch(subcommonURL + graphModelQueryURL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        query: queryString,
      })
    }).then(result => result.json()
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
          'link': subcommonURL,
          'supported_data_resource': subcommonName
        });
      }
      return reformatted;
    });
  }

  initializeData = () => {
    this.allData = [];
    this.obtainImmPortStudies().then(result => {
      const immportData = result.data.dataset;
      this.allData = this.allData.concat(immportData);
      
      return this.obtainSubCommonsData();
    }).then(subCommonsData => {
      this.allData = this.allData.concat(subCommonsData);

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

  obtainImmPortStudies = async () => {
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

  mergeRawDataWithImmPortResults = (immportData, rawData) => {
    for (let i = 0; i < immportData.length; i++) {
      const newObject = {
        'dataset_name': immportData[i].studyAccession,
        'description': immportData[i].briefDescription,
        'research_focus': immportData[i].conditionStudied,
        'link': 'https://www.immport.org/shared/study/' + immportData[i].studyAccession,
        'supported_data_resource': 'ImmPort'
      };
      rawData.push(newObject);
    }
    return rawData;
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
    // this.tableRef.current.paginate({'page': 0, 'pageSize': 10});
  }

  render() {
    const filterTabs = [];

    const projectOptions = [
      { text: 'NDC: TB Data Commons', filterType: 'singleSelect', count: 123 },
      { text: 'ImmPort', filterType: 'singleSelect', count: 123 },
      { text: 'NDC: DAIDs Data Commons', filterType: 'singleSelect', count: 123 }
    ];

    const studyOptions = [
      { text: 'AIDS', filterType: 'singleSelect', count: 123 },
      { text: 'TB', filterType: 'singleSelect', count: 123 },
      { text: 'Immune Response', filterType: 'singleSelect', count: 123 },
      { text: 'Allergy', filterType: 'singleSelect', count: 123 },
      { text: 'Atopy', filterType: 'singleSelect', count: 123 },
      { text: 'Infection Response', filterType: 'singleSelect', count: 123 },
      { text: 'Vaccine Response', filterType: 'singleSelect', count: 123 },
      { text: 'Transplantation', filterType: 'singleSelect', count: 123 },
      { text: 'Oncology', filterType: 'singleSelect', count: 123 },
      { text: 'Autoimmune', filterType: 'singleSelect', count: 123 },
      { text: 'Preterm Birth', filterType: 'singleSelect', count: 123 }
    ];

    const projectSections = [
      { title: 'Supported Data Resources', options: projectOptions },
      { title: 'Research Focus', options: studyOptions },
    ];

    const tabs = [
      <FilterList key={0} sections={projectSections} />
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

    const config = {
      'fieldMapping' : [
        { 'field': 'dataset_name', 'name': 'Dataset' },
        { 'field': 'supported_data_resource', 'name': 'Supported Data Resource' },
        { 'field': 'research_focus', 'name': 'Research Focus' },
        { 'field': 'description', 'name': 'Description of Dataset' },
        { 'field': 'link', 'name': 'Action' }
      ]
    }

    let fields = [];
    for(let j = 0; j < config.fieldMapping.length; j++) {
      fields.push(config.fieldMapping[j].field);
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
                guppyConfig={config}
                isLocked={false}
                totalCount={totalCount}
              />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

Explorer.propTypes = {
  history: PropTypes.object.isRequired, // inherited from ProtectedContent
  location: PropTypes.object.isRequired,
};

export default Explorer;
