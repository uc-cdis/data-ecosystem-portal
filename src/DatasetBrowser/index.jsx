import React from 'react';
import _ from 'lodash';
import PropTypes from 'prop-types';
// import DatasetBrowser from './DatasetBrowser';
import { config } from '../params';
// import { guppyUrl, tierAccessLevel, tierAccessLimit } from '../localconf';
// import './GuppyExplorer.css';
import DatasetBrowserTable from './DatasetBrowserTable/';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
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
}

class Explorer extends React.Component {
  constructor(props) {
    super(props);
    const tabIndex = routes.indexOf(props.location.pathname);
    this.state = {
      tab: tabIndex > 0 ? tabIndex : 0,
    };
    this.filterGroupRef = React.createRef();
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

  render() {
    const filterTabs = this.getFilterTabs();
    const filterConfig = {
      tabs: [{
        title: 'Supported Data Resources',
        fields: [
          'project',
          'study',
        ],
      },
      {
        title: 'Subject',
        fields: [
          'race',
          'ethnicity',
          'gender',
          'age',
        ],
      },
      {
        title: 'File',
        fields: [
          'file_type',
          'file_count',
        ],
      }],
    };

    const projectOptions = [
      { text: 'NDC: TB Data Commons', filterType: 'singleSelect', count: 123 },
      { text: 'ImmPort', filterType: 'singleSelect', count: 123 },
      { text: 'NDC: DAIDs Data Commons', filterType: 'singleSelect', count: 123 }
    ];

    const studyOptions = [
      { text: 'AIDS', filterType: 'singleSelect', count: 123 },
      { text: 'TB', filterType: 'singleSelect', count: 123 },
      { text: 'Immune Response', filterType: 'singleSelect', count: 123 },
      { text: 'Atopy/Allergy', filterType: 'singleSelect', count: 123 },
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



    // if (!filterTabs || filterTabs.length === 0) {
    //   return null;
    // }
    return (
      <React.Fragment>
        <div className='ndef-page-title'>
          Datasets Browser
        </div>
        <div className='dataset-browser'>
          <div className='data-explorer__filters'>
            <FilterGroup
              tabs={tabs}
              filterConfig={filterConfig}
              onFilterChange={action('filter change')}
            />
          </div>
          <div className='data-explorer__visualizations'>
            <DatasetBrowserTable
                className='guppy-explorer-visualization__table'
                tableConfig={{ fields: ['field1', 'field2'] }}
                fetchAndUpdateRawData={this.props.fetchAndUpdateRawData}
                rawData={this.props.rawData}
                totalCount={this.props.totalCount}
                guppyConfig={this.props.guppyConfig}
                isLocked={false}
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
