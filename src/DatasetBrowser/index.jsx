import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
// import DatasetBrowser from './DatasetBrowser';
import { config } from '../params';
// import { guppyUrl, tierAccessLevel, tierAccessLimit } from '../localconf';
// import './GuppyExplorer.css';
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
  charts: {},
  filters: { tabs: [] },
  table: {
    enabled: true,
    fields: [],
  },
  guppyConfig: {
    dataType: 'subject',
    fieldMapping: [],
    manifestMapping: {
      resourceIndexType: 'file',
      resourceIdField: 'file_id', // TODO: change to object_id
      referenceIdFieldInResourceIndex: 'subject_id',
      referenceIdFieldInDataIndex: 'subject_id', // TODO: change to node_id
    },
  },
  buttons: [],
  dropdowns: {},
};

const defaultFileConfig = {
  charts: {},
  filters: { tabs: [] },
  table: {
    enabled: true,
    fields: [],
  },
  guppyConfig: {
    dataType: 'file',
    fieldMapping: [],
    manifestMapping: {
      resourceIndexType: 'subject',
      resourceIdField: 'subject_id',
      referenceIdFieldInResourceIndex: 'file_id', // TODO: change to object_id
      referenceIdFieldInDataIndex: 'file_id', // TODO: change to object_id
    },
  },
  buttons: [],
  dropdowns: {},
};

const datasetBrowserConfig = [
  _.merge(defaultConfig, config.dataExplorerConfig),
  _.merge(defaultFileConfig, config.fileExplorerConfig),
];

const routes = [
  '/explorer',
  '/files',
];

class Explorer extends React.Component {
  constructor(props) {
    super(props);
    const tabIndex = routes.indexOf(props.location.pathname);
    this.state = {
      tab: tabIndex > 0 ? tabIndex : 0,
    };
    this.filterGroupRef = React.createRef();
    this.tableRef = React.createRef();

    this.state.rawData = [];
    this.state.filteredData = [];
    this.state.paginatedData = [];
    this.state.counts = {
      'supported_data_resource': 0,
      'dataset_name': 0
    }

    // this.state.rawData = this.mergeRawDataWithImmPortResults(immportData, rawData);
    // this.state.filteredData = this.state.rawData;

    // this.state.counts = { 
    //   'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', this.state.filteredData),
    //   'dataset_name': this.calculateSummaryCounts('dataset_name', this.state.filteredData)
    // }
  }

  componentWillMount() {
    this.initializeData();
  }

  obtainSubCommonsData = () => {
    console.log('yuh');
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
      'Authorization': 'bearer <access token>'
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
      console.log('136: ', subCommonsData);
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

  fetchSubCommonsData() {
    return [
      {
        'dataset_name' : 'MACS',
        'supported_data_resource' : 'NDC: DAIDs Data Commons',
        'research_focus' : 'AIDS',
        'description': 'Having published over 1300 publications, the MACS has made significant contributions to understanding the science of HIV, the AIDS epidemic, and the effects of therapy. Many of these MACS publications have guided Public Health Policy.',
        'link' : 'https://daids.niaiddata.org'
      },
      {
        'dataset_name' : 'WIHS',
        'supported_data_resource' : 'NDC: DAIDs Data Commons',
        'research_focus' : 'AIDS',
        'description': 'The Women’s Interagency HIV Study (WIHS) is a large, comprehensive prospective cohort study designed to investigate the progression of HIV disease in women. The WIHS began in 1993 in response to growing concern about the impact of HIV on women. The core study visit includes a detailed and structured interview, physical and gynecologic examinations, and laboratory testing. After more than 20 years, the WIHS continues to investigate questions at the forefront of HIV research, spanning topics such as women’s reproductive health, clinical outcomes (for example, cardiovascular disease, diabetes, and others), and the effectiveness of antiretroviral therapy.',
        'link' : 'https://daids.niaiddata.org'
      } 
    ];

    // const subCommons = ['https://niaid.bionimbus.org'];
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

  sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  corsFetch = (URL) => {
    const corsAnywhereURL = "https://cors-anywhere.herokuapp.com/";
    return fetch(corsAnywhereURL + URL);
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

  fetchAndUpdateRawData = () => {
    return;
  }

  /**
   * This function contains partial rendering logic for filter components.
   * It transfers aggregation data (`this.state.receivedAggsData`) to items inside filters.
   * But before that, the function first calls `this.props.onProcessFilterAggsData`, which is
   * a callback function passed by `ConnectedFilter`'s parent component, so that the parent
   * component could do some pre-processing modification about filter.
   */
  getFilterTabs() {
    return [];
    const processedTabsOptions = this.props.onProcessFilterAggsData(this.state.receivedAggsData);
    if (!processedTabsOptions || Object.keys(processedTabsOptions).length === 0) return null;
    const { fieldMapping } = this.props;
    const tabs = this.props.filterConfig.tabs.map(({ fields }, index) => (
      <FilterList
        key={index}
        sections={
          getFilterSections(fields, fieldMapping, processedTabsOptions, this.state.initialAggsData)
        }
        tierAccessLimit={this.props.tierAccessLimit}
      />
    ));
    return tabs;
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
    const filterTabs = this.getFilterTabs();

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

    const genderOptions = [
      { text: 'Male', filterType: 'singleSelect', count: 123 },
      { text: 'Female', filterType: 'singleSelect', count: 123 },
    ];

    const raceOptions = [
      { text: 'White', filterType: 'singleSelect', count: 123 },
      { text: 'Black', filterType: 'singleSelect', count: 123 },
      {
        text: 'American Indian or Alaskan Nativ',
        filterType: 'singleSelect',
        count: 123,
      },
      { text: 'Asian/Pacific Islander', filterType: 'singleSelect', count: 123 },
      { text: 'Multiracial', filterType: 'singleSelect', count: 123 },
      { text: 'Other', filterType: 'singleSelect', count: 123 },
    ];

    const ethnicityOptions = [
      { text: 'Hispanic or Latino', filterType: 'singleSelect', count: 123, accessible: true },
      { text: 'Not Hispanic or Latino', filterType: 'singleSelect', count: 123, accessible: false },
      { text: 'Unknown', filterType: 'singleSelect', count: 123, accessible: true },
      { text: 'Not Specified', filterType: 'singleSelect', count: -1, accessible: true },
    ];

    const ageOptions = [
      { min: 2, max: 97, filterType: 'range' },
    ];

    const fileTypeOptions = [
      { text: 'mRNA Array', filterType: 'singleSelect', count: 123 },
      { text: 'Unaligned Reads', filterType: 'singleSelect', count: 123 },
      { text: 'Lipidomic MS', filterType: 'singleSelect', count: 123 },
      { text: 'Proteomic MS', filterType: 'singleSelect', count: 123 },
      { text: 'Metabolomic MS', filterType: 'singleSelect', count: 123 },
    ];

    const fileCountOptions = [
      { min: 2, max: 97, filterType: 'range' },
    ];

    const projectSections = [
      { title: 'Supported Data Resources', options: projectOptions },
      { title: 'Research Focus', options: studyOptions },
    ];

    const subjectSections = [
      { title: 'Gender', options: genderOptions },
      { title: 'Race', options: raceOptions },
      { title: 'Ethnicity', options: ethnicityOptions },
      { title: 'Age', options: ageOptions },
    ];

    const fileSections = [
      { title: 'File Types', options: fileTypeOptions },
      { title: 'File Counts', options: fileCountOptions },
    ];

    const tabs = [
      <FilterList key={0} sections={projectSections} /> //, <FilterList key={1} sections={subjectSections} />, <FilterList key={2} sections={fileSections} />,
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
                fetchAndUpdateRawData={this.fetchAndUpdateRawData}
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
