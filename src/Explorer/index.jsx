/* eslint no-underscore-dangle: 0 */
import React from 'react';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import { askGuppyForAggregationData, getGQLFilter } from '@gen3/guppy/dist/components/Utils/queries';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import PercentageStackedBarChart from '@gen3/ui-component/dist/components/charts/PercentageStackedBarChart';
import { config, components } from '../params';
import ExplorerTable from './ExplorerTable/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import './Explorer.less';
import { fetchWithCreds } from '../actions';
import { guppyDownloadUrl } from '../configs';

import Spinner from '../components/Spinner';

const fieldMapping = config.dataExplorerConfig.fieldMapping;

const fields = [];
for (let j = 0; j < fieldMapping.length; j += 1) {
  fields.push(fieldMapping[j].field);
}
const tableConfig = { fields };

function addCountsToSectionList(filterSections) {
  const filterSectionsCopy = filterSections.slice();
  for (let k = 0; k < filterSectionsCopy.length; k += 1) {
    const options = filterSectionsCopy[k].options.slice();
    const n = Object.keys(options).length;
    for (let m = 0; m < n; m += 1) {
      options[m].count = 1;
    }
    filterSectionsCopy[k].options = options;
  }
  return filterSectionsCopy;
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
    ) === row[property].toLowerCase();
    let filtersApplyContains = filtersApplied[property].selectedValues.filter(
      x => row[property].toLowerCase() === x.toLowerCase(),
    );
    filtersApplyContains = filtersApplyContains.length > 0;
    const filtersApply = filtersApplyMatch || filtersApplyContains;
    if (!filtersApply) {
      return false;
    }
  }
  return true;
}

function flattenHistograms(listOfHistograms) {
  // This absurd function combines Guppy histograms from an arbitrary
  // number of commons for the purpose of rendering explorer charts.
  const flattened = {};

  for (let j = 0; j < listOfHistograms.length; j += 1) {
    // eslint-disable-next-line no-continue
    if (!listOfHistograms[j] || typeof listOfHistograms[j] === 'undefined') continue;
    const keys = Object.keys(listOfHistograms[j]);
    for (let k = 0; k < keys.length; k += 1) {
      const fieldName = keys[k];
      if (!Object.prototype.hasOwnProperty.call(flattened, fieldName)) {
        flattened[fieldName] = {};
      }

      if (!listOfHistograms[j][keys[k]]) {
        continue; // eslint-disable-line no-continue
      }
      const histogramsForKey = listOfHistograms[j][keys[k]].histogram;
      if (!histogramsForKey || typeof histogramsForKey === 'undefined') {
        continue; // eslint-disable-line no-continue
      }
      for (let z = 0; z < histogramsForKey.length; z += 1) {
        const fieldValue = histogramsForKey[z].key;
        const fieldCount = histogramsForKey[z].count;
        if (!Object.prototype.hasOwnProperty.call(flattened[fieldName], fieldValue)) {
          flattened[fieldName][fieldValue] = fieldCount;
        } else {
          flattened[fieldName][fieldValue] += fieldCount;
        }
      }
    }
  }

  const result = {};
  Object.keys(flattened).forEach((key) => {
    result[key] = { histogram: [] };
    Object.keys(flattened[key]).forEach((subKey) => {
      result[key].histogram.push({ key: subKey, count: flattened[key][subKey] });
    });
  });

  return result;
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
        dataset: 0,
      },
      chartData: { },
      dataExplorerConfig: config.dataExplorerConfig,
      datasetsCount: 0,
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
    const flatModelQueryURL = 'guppy/download';

    const queryObject = {
      type: 'subject',
      fields: [
        'race',
        'ethnicity',
        'gender',
        'species',
        'submitter_id',
        'year_of_birth',
      ],
    };

    return fetchWithCreds({
      path: subcommonsURL + flatModelQueryURL,
      method: 'POST',
      body: JSON.stringify(queryObject),
    }).then((result) => {
      const reformatted = [];
      if (!result || !result.data) {
        return [];
      }
      const subjects = result.data;
      for (let j = 0; j < subjects.length; j += 1) {
        const subject = subjects[j];
        subject.dataset = subcommonsName;
        reformatted.push(subject);
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

  filterSelf = (histograms, field, filtersApplied) => {
    if (typeof filtersApplied === 'undefined'
      || filtersApplied.length === 0
      || !Object.keys(filtersApplied).includes(field)) {
      return histograms;
    }

    const filteredHistogram = [];
    for (let j = 0; j < histograms.length; j += 1) {
      if (filtersApplied[field].selectedValues.includes(histograms[j].key)) {
        filteredHistogram.push(histograms[j]);
      }
    }
    return filteredHistogram;
  }

  buildCharts = (aggsData, chartConfig, filter) => {
    const summaries = [];
    const countItems = [];
    const stackedBarCharts = [];
    const numUniqueDatasets = [...new Set(this.state.filteredData.map(x => x.dataset))].length;

    countItems.push({
      label: 'Datasets', // this.props.nodeCountTitle,
      value: numUniqueDatasets, // this.props.totalCount,
    });
    countItems.push({
      label: 'Subjects', // this.props.nodeCountTitle,
      value: this.state.filteredData.length, // this.props.totalCount,
    });
    Object.keys(chartConfig).forEach((field) => {
      if (!aggsData || !aggsData[field] || !aggsData[field].histogram) return;
      const histogram = this.filterSelf(aggsData[field].histogram, field, filter);
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

  buildFilterFromData = (data, fieldName) => {
    const uniqueValues = [...new Set(data.map(x => x[fieldName]))];
    const options = [];
    uniqueValues.forEach((x) => {
      if (!x) return;
      options.push({ text: x, filterType: 'singleSelect', count: 0 });
    });
    return options.sort((a, b) => {
      if (a.text > b.text) return 1;
      if (a.text < b.text) return -1;
      return 0;
    });
  }

  histogramQueryStrForEachField = field => `${field} {
      histogram {
        key
        count
      }
    }`

  obtainSubcommonsAggsData = (subcommonsConfig, filtersApplied) => {
    const subcommonsURL = subcommonsConfig.URL;
    const subcommonsName = subcommonsConfig.name;
    const filtersAppliedReduced = Object.assign({}, filtersApplied);
    if (Object.prototype.hasOwnProperty.call(filtersApplied, 'dataset')
      && !filtersApplied.dataset.selectedValues.includes(subcommonsName)) {
      return null;
    } else if (Object.prototype.hasOwnProperty.call(filtersApplied, 'dataset')
      && filtersApplied.dataset.selectedValues.includes(subcommonsName)) {
      delete filtersAppliedReduced.dataset;
    }
    const chartFields = ['species', 'gender', 'race'];
    const applyFilter = typeof filtersAppliedReduced !== 'undefined'
      && Object.keys(filtersAppliedReduced).length > 0;

    const query = {
      query:
        `query ${applyFilter ? '($filter: JSON)' : ''} {
          _aggregation {
            subject ${applyFilter ? '(filter: $filter, filterSelf: true)' : ''} {
              ${chartFields.map(field => this.histogramQueryStrForEachField(field))}
              _totalCount
            }
          }
        }`,
    };

    if (applyFilter) {
      query.variables = { filter: getGQLFilter(filtersAppliedReduced) };
    }

    return fetchWithCreds({
      path: `${subcommonsURL}guppy/graphql`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    }).then((result) => {
      if (!result || !result.data || !result.data.data || !result.data.data._aggregation) {
        return null;
      }
      const histograms = result.data.data._aggregation.subject;
      if (histograms._totalCount > 0) {
        histograms.dataset = {};
        histograms.dataset.histogram = [{
          key: subcommonsName,
          count: histograms._totalCount,
        }];
      }
      return histograms;
    });
  }

  obtainAllSubcommonsAggsData = (filtersApplied) => {
    const promiseArray = [];
    const n = Object.keys(config.subcommons).length;
    for (let j = 0; j < n; j += 1) {
      promiseArray.push(
        this.obtainSubcommonsAggsData(config.subcommons[j], filtersApplied),
      );
    }
    return Promise.all(promiseArray);
  }


  initializeData = () => {
    this.allData = [];
    this.obtainParentCommonsSubjects().then((result) => {
      const parentCommonsData = result; // .data.subject;
      this.allData = this.allData.concat(parentCommonsData);
      return this.obtainAllSubcommonsData();
    }).then((subCommonsData) => {
      const data = subCommonsData.flat();
      if (data.length > 0) {
        this.allData = this.allData.concat(data);
      }

      const dataExplorerConfig = this.state.dataExplorerConfig;
      const currentSubjectFilters = dataExplorerConfig.subjectSections;
      const currentSubjectFiltersCopy = dataExplorerConfig.subjectSections.slice();
      currentSubjectFilters.forEach((x, index) => {
        const options = this.buildFilterFromData(this.allData, x.field);
        currentSubjectFiltersCopy[index].options = options;
      });
      dataExplorerConfig.subjectSections = currentSubjectFiltersCopy;

      const currentProjectFilters = dataExplorerConfig.projectSections;
      const currentProjectFiltersCopy = dataExplorerConfig.projectSections.slice();
      let datasetsCount = 0;
      currentProjectFilters.forEach((x, index) => {
        const options = this.buildFilterFromData(this.allData, x.field);
        currentProjectFiltersCopy[index].options = options;
        if (x.field === 'dataset') {
          datasetsCount = options.length;
        }
      });
      dataExplorerConfig.projectSections = currentProjectFiltersCopy;


      this.setState({
        filteredData: this.allData,
        rawData: this.allData,
        counts: {
          supported_data_resource: 0,
          dataset: 0,
        },
        dataExplorerConfig,
        datasetsCount,
      });

      this.tableRef.current.updateData(this.allData);

      return this.refreshCharts();
    });
  }

  obtainParentCommonsSubjects = async () => {
    const queryObject = {
      type: 'subject',
      fields: [
        'race',
        'ethnicity',
        'gender',
        'species',
        'ageUnit',
        'age',
        'phenotype',
        'strain',
        'armAccession',
        'studyAccession',
        'filePath',
        'fileDetail',
        'submitter_id',
        'subjectAccession',
        'dataset',
      ],
    };


    return fetchWithCreds({
      path: `${guppyDownloadUrl}`, // `${guppyDownloadUrl}`,
      body: JSON.stringify(queryObject),

      // JSON.stringify({
      //   query: queryString,
      // }),
      method: 'POST',
    }).then(
      ({ status, data }) => // eslint-disable-line no-unused-vars
        data, // eslint-disable-line no-unused-vars

    );
  }

  refreshCharts = (filtersApplied) => {
    const outerThis = this;
    let filters = Object.assign({}, filtersApplied);
    if (typeof filtersApplied === 'undefined') {
      filters = {};
    }
    return this.obtainAllSubcommonsAggsData(filters).then((subcommonsAggsData) => {
      askGuppyForAggregationData(
        '/guppy/',
        'subject',
        ['species', 'race', 'gender', 'dataset'],
        filters,
        '',
      ).then((res) => {
        let combinedAggsData = subcommonsAggsData.concat(res.data._aggregation.subject);
        combinedAggsData = flattenHistograms(combinedAggsData);
        const chartData = outerThis.buildCharts(combinedAggsData,
          outerThis.state.dataExplorerConfig.charts, filters);
        outerThis.setState({ chartData, loading: false });
      });
    });
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
          dataset: calculateSummaryCounts('dataset', filteredData),
        },
    });

    this.refreshCharts(filtersApplied);

    this.tableRef.current.updateData(filteredData);
  }

  render() {
    const projectSections = addCountsToSectionList(this.state.dataExplorerConfig.projectSections);
    const subjectSections = addCountsToSectionList(this.state.dataExplorerConfig.subjectSections);

    const tabs = [
      <FilterList key={0} sections={subjectSections} />,
      <FilterList key={1} sections={projectSections} />,
    ];

    const totalCount = this.state.filteredData.length;
    const barChartColor = components.categorical2Colors ? components.categorical2Colors[0] : null;

    // if (this.state.loading) {
    //   return (<Spinner />)
    // };
    return (
      <React.Fragment>
        <div className='ndef-page-title'>
          Data Explorer
        </div>
        <div id='def-spinner' className={this.state.loading ? 'visible' : 'hidden'} >
          <Spinner />
        </div>
        <div className='explorer'>
          <div className='explorer__filters'>
            <FilterGroup
              tabs={tabs}
              filterConfig={this.state.dataExplorerConfig.filterConfig}
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
              this.state.chartData.stackedBarCharts
                && this.state.chartData.stackedBarCharts.map((chart, i) => (
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
              guppyConfig={this.state.dataExplorerConfig}
              isLocked={false}
              loading={this.state.loading}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Explorer;
