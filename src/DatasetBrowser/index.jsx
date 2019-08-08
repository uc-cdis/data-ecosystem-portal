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

function action(input) {
  console.log(input);
  console.log('hey');
}

class Explorer extends React.Component {
  constructor(props) {
    super(props);
    const tabIndex = routes.indexOf(props.location.pathname);
    this.state = {
      tab: tabIndex > 0 ? tabIndex : 0,
    };
    this.filterGroupRef = React.createRef();

    this.state.rawData = [];
    this.state.filteredData = [];
    this.state.counts = {
      'supported_data_resource': 0,
      'dataset': 0
    }

    this.initializeData();

    // this.state.rawData = this.mergeRawDataWithImmPortResults(immportData, rawData);
    // this.state.filteredData = this.state.rawData;

    // this.state.counts = { 
    //   'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', this.state.filteredData),
    //   'dataset': this.calculateSummaryCounts('dataset', this.state.filteredData)
    // }
  }

  initializeData = async () => {
    const immportData = await this.obtainImmPortStudies();

    this.setState( {
      'rawData': await this.mergeRawDataWithImmPortResults(immportData, this.state.rawData),
      'counts': {
        'supported_data_resource': this.calculateSummaryCounts('supported_data_resource', this.state.filteredData),
        'dataset': this.calculateSummaryCounts('dataset', this.state.filteredData)
      }
    });
  }

  fetchSubCommonsData() {
    return [
      {
        'dataset' : 'MACS',
        'supported_data_resource' : 'NDC: DAIDs Data Commons',
        'research_focus' : 'AIDS',
        'description': 'Having published over 1300 publications, the MACS has made significant contributions to understanding the science of HIV, the AIDS epidemic, and the effects of therapy. Many of these MACS publications have guided Public Health Policy.',
        'link' : 'https://daids.niaiddata.org'
      },
      {
        'dataset' : 'WIHS',
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

  authWithImmPort = () => {
    const immportAuthURL = "https://auth.immport.org/auth/token";
    const corsAnywhereURL = "https://cors-anywhere.herokuapp.com/";

    const data = {
        username: "",
        password: ""
    };

    fetch(corsAnywhereURL + immportAuthURL, {
      method: "POST", 
      body: JSON.stringify(data)
    }).then(res => {
      console.log("Request complete! response:", res);
    });
  }

  sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  corsFetch = (URL) => {
    const corsAnywhereURL = "https://cors-anywhere.herokuapp.com/";
    return fetch(corsAnywhereURL + URL);
  }

  obtainImmPortStudyDetails = async () => {
    // ImmPort Docs are here http://docs.immport.org/#API/DataQueryAPI/dataqueryapi/
    console.log('169');
    let promiseArray = [];
    const summaryURL = 'https://api.immport.org/data/query/study/summary/';
    for (let i = 0; i <= studyAccessions.length; i++) {
      promiseArray.push(this.corsFetch(summaryURL + studyAccessions[i]).then(function(response) {
        console.log('study summary response: ', response);
        return response.json();
      }));
      await this.sleep(2000);
    }
    return Promise.all(promiseArray);
  }

  obtainImmPortStudies = async () => {
    const immportListStudiesURL = "/immport-list-studies";

    fetch(immportListStudiesURL)
      .then(response => { 
        console.log(response);
        return response.json();
      })
      .then(data => {
        console.log('hi: ', data);
        if (data.studyAccessions && data.studyAccessions.length > 0) {
          const promiseArray = this.obtainImmPortStudyDetails(data.studyAccessions);
          console.log(promiseArray);

        }
      });

    
  }

  mergeRawDataWithImmPortResults = (immportData, rawData) => {
    for (let i = 0; i < immportResults.length; i++) {
      const newObject = {
        'dataset': immportResults[i].studyAccession,
        'description': immportResults[i].briefDescription,
        'research_focus': immportResults[i].conditionStudied,
        'link': 'https://www.immport.org/shared/study/' + immportResults[i].studyAccession,
        'supported_data_resource': 'ImmPort'
      };
      rawData.push(newObject);
    }
    return rawData;
  }

  fetchAndUpdateRawData = () => {
    return;
    console.log('here i am');
    const mergedData = [];

    // this.authWithImmPort();

    const immportListStudiesURL = "/immport-list-studies";
    const tbURL = ""
    const googleURL = "https://google.com/"

    fetch(immportListStudiesURL)
      .then(response => { 
        console.log(response);
        return response.json();
      })
      .then(data => {
        console.log('hi: ', data);
        if (data.studyAccessions && data.studyAccessions.length > 0) {
          const promiseArray = this.obtainImmPortStudyDetails(data.studyAccessions);
          console.log(promiseArray);

        }
      });


    this.setState({rawData: mergedData});
    return Promise.resolve({});
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
          'dataset': this.calculateSummaryCounts('dataset', filteredData)
        }
    });
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
      value: this.state.counts['dataset']
    };

    const summaries = [supportedDataResourceCount, datasetCount];

    const totalCount = this.state.rawData.length;

    const config = {
      'fieldMapping' : [
        { 'field': 'dataset', 'name': 'Dataset' },
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
