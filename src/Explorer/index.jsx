import React from 'react';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import { config } from '../params';
import ExplorerTable from './ExplorerTable/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import './Explorer.less';
import { fetchWithCreds } from '../actions';
import { guppyDownloadUrl } from '../configs';
import { askGuppyForAggregationData } from '@gen3/guppy/dist/components/Utils/queries';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import { components } from '../params';

var dataExplorerConfig2 = {
    "guppy": {
      "indices": [
        {
          "index": "data_explorer",
          "type": "subject"
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
      { "field": "dataset", "name": "Dataset" },
      { "field": "studyAccession", "name": "Study Accession" },
      { "field": "phenotype", "name": "Phenotype" },
      { "field": "age", "name": "Age" },
      { "field": "race", "name": "Race" },
      { "field": "gender", "name": "Gender" },
      { "field": "ethnicity", "name": "Ethnicity" },
      { "field": "strain", "name": "Strain" },
      { "field": "species", "name": "Species" },
      { "field": "submitter_id", "name": "Submitter ID" }
    ],
    "filterConfig": {
      "tabs": [{
        "title": "Project",
        "fields": ["dataset", "research_focus"]
      }, 
      {
        "title": "Subject",
        "fields": ["ethnicity", "gender"]
      }]
    }
};

const fieldMapping = dataExplorerConfig2.fieldMapping;

const fields = [];
for (let j = 0; j < fieldMapping.length; j += 1) {
  fields.push(fieldMapping[j].field);
}
const tableConfig = { fields };

const chartConfig = { 
  "project_id": {
    "chartType": "count",
    "title": "Projects"
  },
  "subject_id": {
    "chartType": "count",
    "title": "Subjects"
  },
  "gender": {
    "chartType": "pie",
    "title": "Gender"
  },
  "race": {
    "chartType": "bar",
    "title": "Race"
  },
  "ethnicity": {
    "chartType": "bar",
    "title": "Ethnicity"
  }
};

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
      chartData: { }
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
        subject {
          race
          ethnicity
          gender
          spdecies
          ageUnit
          age
          phenotype
          strain
          armAccession
          studyAccession
          filePath
          fileDetail
          submitter_Id
          subjectAccession
          dataset
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

  buildCharts = (aggsData, chartConfig) => {
    const summaries = [];
    const countItems = [];
    const stackedBarCharts = [];
    countItems.push({
      label: 'Total Number of Subjects', // this.props.nodeCountTitle,
      value: this.state.filteredData.length //this.props.totalCount,
    });
    Object.keys(chartConfig).forEach((field) => {
      if (!aggsData || !aggsData[field] || !aggsData[field].histogram) return;
      const { histogram } = aggsData[field];
      switch (chartConfig[field].chartType) {
      case 'pie':
      case 'bar':
      case 'stackedBar': {
        const dataItem = {
          type: chartConfig[field].chartType,
          title: chartConfig[field].title,
          data: histogram.map(i => ({ name: i.key, value: i.count })),
        };
        if (chartConfig[field].chartType === 'stackedBar') {
          stackedBarCharts.push(dataItem);
        } else {
          summaries.push(dataItem);
        }
        break;
      }
      default:
        throw new Error(`Invalid chartType ${chartConfig[field].chartType}`);
      }
    });
    return { summaries, countItems, stackedBarCharts };
  }

  initializeData = () => {
    this.allData = [];
    var _this = this;
    this.obtainParentCommonsSubjects().then((result) => {
      const parentCommonsData = result; //.data.subject;
      this.allData = this.allData.concat(parentCommonsData);
      return this.obtainAllSubcommonsData();
    }).then((subCommonsData) => {
      // const data = subCommonsData.flat();
      // if (data.length > 0) {
      //   this.allData = this.allData.concat(data);
      // }

      this.setState({
        filteredData: this.allData,
        rawData: this.allData,
        counts: {
          supported_data_resource: 0, // calculateSummaryCounts('supported_data_resource', this.allData),
          dataset_name: 0 //calculateSummaryCounts('dataset_name', this.allData),
        },
      });

      this.tableRef.current.updateData(this.allData);
    }).then(function() {
       askGuppyForAggregationData(
        '/guppy/',
        'subject',
        fields,
        {},
        '',
      ).then((res) => {
          const chartData = _this.buildCharts(res.data._aggregation.subject, chartConfig);
          _this.setState({'chartData': chartData});
        });
    });
  }

  obtainParentCommonsSubjects = async () => {
    const queryString = `
      {
        subject(first: 10000) {
          race
          ethnicity
          gender
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
          dataset
        }
      }
    `;
    
    const queryObject = {
      "type": "subject",
      "fields": [
        "race",
        "ethnicity",
        "gender",
        "species",
        "ageUnit",
        "age",
        "phenotype",
        "strain",
        "armAccession",
        "studyAccession",
        "filePath",
        "fileDetail",
        "submitter_id",
        "subjectAccession",
        "dataset"
      ]
    };


    return fetchWithCreds({
      path: `${guppyDownloadUrl}`, // `${guppyDownloadUrl}`,
      body: JSON.stringify(queryObject),

      // JSON.stringify({
      //   query: queryString,
      // }),
      method: 'POST',
    }).then(
      ({ status, data }) => { 
        return data; // eslint-disable-line no-unused-vars
      }
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
      filteredData: filteredData,
      counts:
        {
          supported_data_resource: calculateSummaryCounts('supported_data_resource', filteredData),
          dataset_name: calculateSummaryCounts('dataset_name', filteredData),
        },
    });

    this.tableRef.current.updateData(filteredData);
  }

  render() {
    const projectSections = addCountsToSectionList(dataExplorerConfig2.projectSections);
    const subjectSections = addCountsToSectionList(dataExplorerConfig2.subjectSections);

    const tabs = [
      <FilterList key={0} sections={projectSections} />,
      <FilterList key={1} sections={subjectSections} />
    ];

    const totalCount = this.state.filteredData.length;

    if (this.props.onFilterChange) {
      this.props.onFilterChange(filterResults, this.state.accessibility);
    }

    const barChartColor = components.categorical2Colors ? components.categorical2Colors[0] : null;

    return (
      <React.Fragment>
        <div className='ndef-page-title'>
          Data Explorer
        </div>
        <div className='explorer'>
          <div className='explorer__filters'>
            <FilterGroup
              tabs={tabs}
              filterConfig={dataExplorerConfig2.filterConfig}
              onFilterChange={e => this.handleFilterChange(e)}
            />
          </div>
          <div className='explorer__visualizations'>
            {
              this.state.chartData.countItems && this.state.chartData.countItems.length > 0 && (
                <div className='guppy-explorer-visualization__summary-cards'>
                  <DataSummaryCardGroup summaryItems={this.state.chartData.countItems} connected />
                </div>
              )
            }
            {
              this.state.chartData.summaries && this.state.chartData.summaries.length > 0 && (
                <div className='guppy-explorer-visualization__charts'>
                  <SummaryChartGroup
                    summaries={this.state.chartData.summaries}
                    lockMessage={'This chart is locked.'}
                    barChartColor={barChartColor}
                    useCustomizedColorMap={!!components.categorical9Colors}
                    customizedColorMap={components.categorical9Colors || []}
                    maximumDisplayItem={6}
                  />
                </div>
              )
            }
            {
              this.state.chartData.stackedBarCharts && this.state.chartData.stackedBarCharts.map((chart, i) => (
                <PercentageStackedBarChart
                  key={i}
                  data={chart.data}
                  title={chart.title}
                  width='100%'
                  lockMessage={'This chart is locked.'}
                  useCustomizedColorMap={!!components.categorical9Colors}
                  customizedColorMap={components.categorical9Colors || []}
                  maximumDisplayItem={6}
                />
              ),
              )
            }
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
      </React.Fragment>
    );
  }
}

export default Explorer;
