/* eslint no-underscore-dangle: 0 */
/* eslint no-console: 0 */
import React from 'react';
import _ from 'lodash';
import FileSaver from 'file-saver';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import Button from '@gen3/ui-component/dist/components/Button';
import { getGQLFilter } from '@gen3/guppy/dist/components/Utils/queries';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import PercentageStackedBarChart from '@gen3/ui-component/dist/components/charts/PercentageStackedBarChart';
import { config, components } from '../params';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import './Explorer.less';
import { fetchWithCredsAndTimeout, fetchUser } from '../actions';
import { capitalizeFirstLetter } from '../utils';
import { flatModelQueryRelativePath, flatModelDownloadRelativePath } from '../localconf';
import getReduxStore from '../reduxStore';
import Spinner from '../components/Spinner';

function flattenHistograms(listOfHistograms) {
  const result = {};
  const addCountToResult = (field, value, count, disabled) => {
    if (!result[field]) result[field] = { histogram: [] };
    const findItem = result[field].histogram.find(b => b.key === value);
    if (findItem) {
      findItem.count += count;
    } else {
      result[field].histogram.push({
        key: value,
        count,
        disabled,
      });
    }
  };
  listOfHistograms.forEach((h) => {
    if (h) {
      Object.keys(h).forEach((field) => {
        if (!h[field] || !h[field].histogram) return;
        const histogram = h[field].histogram;
        histogram.forEach((bin) => {
          const value = bin.key;
          const count = bin.count;
          const disabled = bin.disabled;
          addCountToResult(field, value, count, disabled);
        });
      });
    }
  });
  return result;
}

const filterValuesLastList = config.dataExplorerConfig.filterValuesLastList || [
  'not specified',
  'unspecified',
  'unknown',
  'no data',
  'n/a',
];

function buildFilterTabsByCombinedAggsData(combinedAggsData) {
  const result = config.dataExplorerConfig.filterConfig.tabs.map((t, i) => {
    const sections = t.fields.map((field) => {
      const options = combinedAggsData[field].histogram
        .filter(h => h.count > 0)
        .sort((h1, h2) => {
          if (Array.isArray(h1.key)) return -1;
          if (Array.isArray(h2.key)) return 1;
          const v1 = h1.key.toLowerCase ? h1.key.toLowerCase() : h1.key;
          const v2 = h2.key.toLowerCase ? h2.key.toLowerCase() : h2.key;
          const v1FoundInLastListIndex = filterValuesLastList.findIndex(k => k === v1);
          const v2FoundInLastListIndex = filterValuesLastList.findIndex(k => k === v2);
          if (v1FoundInLastListIndex === -1) {
            if (v2FoundInLastListIndex === -1) {
              return h1.count > h2.count; // order by desc count
            }
            return -1; // h2 in last list, put h1 first
          }
          if (v2FoundInLastListIndex === -1) {
            return 1; // h1 in last list, put h2 first
          }
          // both in last list, order by index
          return v1FoundInLastListIndex - v2FoundInLastListIndex;
        })
        .map((h) => {
          if (Array.isArray(h.key) && h.key.length === 2) {
            return {
              filterType: 'range',
              min: h.key[0],
              max: h.key[1],
            };
          }
          return {
            text: h.key,
            count: h.count,
            filterType: 'singleSelect',
            disabled: h.disabled,
          };
        });
      const foundFieldMapping = config.dataExplorerConfig
        .fieldMapping.find(f => f.field === field);
      const title = foundFieldMapping ? foundFieldMapping.name : capitalizeFirstLetter(field);
      return {
        title,
        field,
        options,
      };
    });
    return (<FilterList key={i} sections={sections} />);
  });
  return result;
}
class Explorer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      chartData: { },
      loading: true,
      isUserLoggedIn: false,
      queryableFieldsForEachSubcommons: {},
      filter: {},
      totalSubjects: 0,
      isDownloadingData: false,
    };
    this.filterGroupRef = React.createRef();
  }

  componentWillMount() {
    this.initializeData();
    getReduxStore().then((store) => {
      store.dispatch(fetchUser).then((response) => {
        if (response.user) {
          this.setState({ isUserLoggedIn: !!response.user.username });
        }
      });
    });
  }

  getFieldsOnTypeFromCommons = (subcommonsURL) => {
    const query = {
      query:
        `{
          __type(name: "Subject") {
            name
            kind
            fields {
              name
            }
          }
        }`,
    };
    return fetchWithCredsAndTimeout({
      path: subcommonsURL + flatModelQueryRelativePath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    }, 3000).then((result) => {
      const fieldsFromCommons = result.data.data.__type.fields.map(x => x.name);
      this.setState({
        queryableFieldsForEachSubcommons: {
          ...this.state.queryableFieldsForEachSubcommons,
          [subcommonsURL]: fieldsFromCommons,
        },
      });
      return fieldsFromCommons;
    }).catch(() => {
      console.log('Failed to retrieve schema / field list from ', subcommonsURL);
      return [];
    });
  }

  getSummaryChart() {
    const barChartColor = components.categorical2Colors ? components.categorical2Colors[0] : null;
    const chartRowList = [];
    this.state.chartData.summaries.forEach((s) => {
      if (s.chartRow !== undefined && !chartRowList.includes(s.chartRow)) {
        chartRowList.push(s.chartRow);
      }
    });
    if (chartRowList.length === 0) {
      return (
        <SummaryChartGroup
          summaries={this.state.chartData.summaries}
          lockMessage={'This chart is locked.'}
          barChartColor={barChartColor}
          useCustomizedColorMap={!!components.categorical9Colors}
          customizedColorMap={components.categorical9Colors || []}
          maximumDisplayItem={6}
        />
      );
    }
    return (
      <React.Fragment>
        {
          chartRowList.map(chartRowIndex => (
            <SummaryChartGroup
              key={chartRowIndex}
              summaries={this.state.chartData.summaries.filter(s => s.chartRow === chartRowIndex)}
              lockMessage={'This chart is locked.'}
              barChartColor={barChartColor}
              useCustomizedColorMap={!!components.categorical9Colors}
              customizedColorMap={components.categorical9Colors || []}
              maximumDisplayItem={6}
            />
          ))
        }
      </React.Fragment>
    );
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
    let numDatasets = 0;
    let numTotal = 0;
    if (aggsData.dataset && aggsData.dataset.histogram) {
      aggsData.dataset.histogram.forEach((h) => {
        if (h.count > 0) {
          const datasetIsSelected = (!filter.dataset || filter.dataset.length === 0
          || (filter.dataset && filter.dataset.selectedValues
          && filter.dataset.selectedValues.includes(h.key)));
          if (datasetIsSelected) {
            numDatasets += 1;
            numTotal += h.count;
          }
        }
      });
    }
    this.setState({ totalSubjects: numTotal });

    countItems.push({
      label: 'Supported Data Resources',
      value: numDatasets,
    });
    countItems.push({
      label: 'Subjects',
      value: numTotal,
    });
    Object.keys(chartConfig).forEach((field) => {
      if (!aggsData || !aggsData[field] || !aggsData[field].histogram) return;
      const histogram = this.filterSelf(aggsData[field].histogram, field, filter);
      const emptyChart = histogram && histogram.length === 1 && histogram[0].key === 'N/A';
      switch (chartConfig[field].chartType) {
      case 'pie':
      case 'bar':
      case 'stackedBar': {
        const dataItem = {
          type: chartConfig[field].chartType,
          title: chartConfig[field].title,
          chartIsEmpty: emptyChart,
          data: histogram
            // .filter(i => i.key !== 'N/A')
            .map(i => ({ name: i.key, value: i.count })),
          chartRow: chartConfig[field].chartRow,
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

  histogramQueryStrForEachField = field => `${field} {
      histogram {
        key
        count
      }
    }`

  isDatasetSelected = (filtersApplied, subcommonsName) => {
    let selectedDatasets = [];
    if (filtersApplied.dataset && filtersApplied.dataset.selectedValues) {
      selectedDatasets = filtersApplied.dataset.selectedValues;
    }
    const datasetIsSelected = (selectedDatasets.length === 0
      || selectedDatasets.includes(subcommonsName));
    return datasetIsSelected;
  }

  obtainSubcommonsAggsData = (subcommonsConfig, filtersApplied) => {
    const subcommonsURL = subcommonsConfig.URL;
    const subcommonsName = subcommonsConfig.name;
    const datasetIsSelected = this.isDatasetSelected(filtersApplied, subcommonsName);
    const filtersAppliedReduced = Object.assign({}, filtersApplied);
    delete filtersAppliedReduced.dataset;

    // construct query fields list
    const filterFields = config.dataExplorerConfig.filterConfig.tabs
      .reduce((acc, cur) => acc.concat(cur.fields), []).filter(f => f !== 'dataset');
    let wantedFields = filterFields.slice();
    const queryableFields = this.state.queryableFieldsForEachSubcommons[subcommonsURL];
    if (typeof queryableFields !== 'undefined') {
      wantedFields = wantedFields.filter(x => queryableFields.includes(x));
    }
    if (!datasetIsSelected) {
      wantedFields = []; // if this dataset is not selected, we don't need any aggs results
    }

    // check if filter contains non-queryable fields
    const nonQueryableFields = _.difference(filterFields, queryableFields);
    const nonQueryableFieldsInFilterApplied = _.intersection(
      Object.keys(filtersAppliedReduced), nonQueryableFields);
    if (nonQueryableFieldsInFilterApplied && nonQueryableFieldsInFilterApplied.length > 0) {
      // trying to query aggregation from subcommons using a non-queryable field
      // is meaningless, so let's just skip those fields in filter
      nonQueryableFieldsInFilterApplied.forEach((nonExistField) => {
        delete filtersAppliedReduced[nonExistField];
      });
    }

    const applyFilter = typeof filtersAppliedReduced !== 'undefined'
      && Object.keys(filtersAppliedReduced).length > 0;

    const query = {
      query:
        `query ${applyFilter ? '($filter: JSON)' : ''} {
          _aggregation {
            subject ${applyFilter ? '(filter: $filter, filterSelf: false)' : ''} {
              ${wantedFields.map(field => this.histogramQueryStrForEachField(field))}
              _totalCount
            }
          }
        }`,
    };

    if (applyFilter) {
      query.variables = { filter: getGQLFilter(filtersAppliedReduced) };
    }

    return fetchWithCredsAndTimeout({
      path: subcommonsURL + flatModelQueryRelativePath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    }, 3000).then((result) => {
      if (!result || !result.data || !result.data.data || !result.data.data._aggregation) {
        return null;
      }
      const histograms = result.data.data._aggregation.subject;

      // add 'dataset' field
      histograms.dataset = {};
      histograms.dataset.histogram = [{
        key: subcommonsName,
        count: histograms._totalCount,
      }];
      if (nonQueryableFieldsInFilterApplied && nonQueryableFieldsInFilterApplied.length > 0) {
        // querying non-existing field in subcommons is meaningless, total count should be zero
        histograms.dataset.histogram[0].count = 0;
      }

      // add those non-queryable fields with 'N/A' as values
      if (datasetIsSelected) {
        nonQueryableFields.forEach((f) => {
          histograms[f] = {};
          let count = histograms._totalCount;
          if (nonQueryableFieldsInFilterApplied && nonQueryableFieldsInFilterApplied.length > 0) {
            // non-existing field contained in filter in subcommons is meaningless,
            // so total count should be zero
            count = 0;
          }
          // if just querying non-existing field but with valid filter, just add count to 'n/a'
          histograms[f].histogram = [{
            key: 'N/A',
            count,
            disabled: true,
          }];
        });
        if (nonQueryableFieldsInFilterApplied && nonQueryableFieldsInFilterApplied.length > 0) {
          // querying non-existing field in subcommons is meaningless, total count should be zero
          wantedFields.forEach((f) => {
            delete histograms[f];
          });
        }
      }
      return histograms;
    }).catch(() => []);
  }

  obtainAllCommonsAggsData = (filtersApplied) => {
    const promiseArray = [];
    const n = Object.keys(config.subcommons).length;
    for (let j = 0; j < n; j += 1) {
      promiseArray.push(
        this.obtainSubcommonsAggsData(config.subcommons[j], filtersApplied),
      );
    }
    const thisCommonsName = 'ImmPort';
    promiseArray.push(
      this.obtainSubcommonsAggsData({
        URL: '/',
        name: thisCommonsName,
      }, filtersApplied),
    );
    return Promise.all(promiseArray);
  }

  initializeData = () => {
    const promiseArray = [];
    Object.values(config.subcommons).forEach((subcommons) => {
      promiseArray.push(
        this.getFieldsOnTypeFromCommons(subcommons.URL),
      );
    });
    promiseArray.push(this.getFieldsOnTypeFromCommons('/'));
    Promise.all(promiseArray).then(() => {
      this.refreshAggregations(null, () => {
        this.setState({ loading: false });
      });
    });
  }

  refreshAggregations = (filtersApplied, callback) => {
    let filters = Object.assign({}, filtersApplied);
    if (filtersApplied === null || typeof filtersApplied === 'undefined') {
      filters = {};
    }

    return this.obtainAllCommonsAggsData(filters).then((subcommonsAggsData) => {
      const combinedAggsData = flattenHistograms(subcommonsAggsData);

      // refresh charts
      const chartData = this.buildCharts(combinedAggsData,
        config.dataExplorerConfig.charts, filters);

      // refresh filters
      const tabs = buildFilterTabsByCombinedAggsData(combinedAggsData);

      this.setState({
        chartData,
        loading: false,
        tabs,
      });

      if (callback) callback();
    });
  }

  handleFilterChange(filtersApplied) {
    this.refreshAggregations(filtersApplied);
    this.setState({ filter: filtersApplied });
  }

  validateFilterForSubCommons(filtersApplied, subcommonsConfig) {
    const subcommonsURL = subcommonsConfig.URL;
    const filtersAppliedReduced = Object.assign({}, filtersApplied);
    const queryableFields = this.state.queryableFieldsForEachSubcommons[subcommonsURL];
    Object.keys(filtersApplied).forEach((field) => {
      if (!queryableFields.includes(field)) {
        delete filtersAppliedReduced[field];
      }
    });
    return filtersAppliedReduced;
  }

  downloadSubcommonsData(subcommonsConfig, filtersApplied) {
    const subcommonsURL = subcommonsConfig.URL;
    const subcommonsName = subcommonsConfig.name;
    const datasetIsSelected = this.isDatasetSelected(filtersApplied, subcommonsName);
    if (!datasetIsSelected) {
      return [];
    }
    const filtersAppliedReduced = this.validateFilterForSubCommons(
      filtersApplied, subcommonsConfig);

    // FIXME: type is "subject", and fields are all from fieldMapping config.
    // Need a future refactoring task to remove lots of hardcodings from this file.
    const type = 'subject';
    const fields = config.dataExplorerConfig.fieldMapping
      .map(e => e.field)
      .filter(f => this.state.queryableFieldsForEachSubcommons[subcommonsURL].includes(f));
    const queryBody = { type, fields };
    if (filtersAppliedReduced) queryBody.filter = getGQLFilter(filtersAppliedReduced);
    return fetchWithCredsAndTimeout({
      path: `${subcommonsURL}${flatModelDownloadRelativePath}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryBody),
    }, 3000).then(response => (response.data ? response.data
      .map(d => ({ ...d, dataset: subcommonsName })) : []));
  }

  downloadData = () => {
    this.setState({ isDownloadingData: true });
    const promiseArray = [];
    const n = Object.keys(config.subcommons).length;
    for (let j = 0; j < n; j += 1) {
      promiseArray.push(
        this.downloadSubcommonsData(config.subcommons[j], this.state.filter),
      );
    }
    const thisCommonsName = 'ImmPort';
    promiseArray.push(
      this.downloadSubcommonsData({
        URL: '/',
        name: thisCommonsName,
      }, this.state.filter),
    );
    Promise.all(promiseArray).then((res) => {
      const allData = res.reduce((acc, cur) => acc.concat(cur), []);
      console.log(allData);
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'text/json' });
      const filename = 'clinical.json';
      FileSaver.saveAs(blob, filename);
      this.setState({ isDownloadingData: false });
    });
  }

  render() {
    return (
      <React.Fragment>
        <div id='def-spinner' className={this.state.loading ? 'visible' : 'hidden'} >
          <Spinner />
        </div>
        <div className='explorer'>
          <div className='explorer__filters'>
            {
              this.state.tabs && <FilterGroup
                tabs={this.state.tabs}
                filterConfig={config.dataExplorerConfig.filterConfig}
                onFilterChange={e => this.handleFilterChange(e)}
              />
            }
          </div>
          <div className='explorer__visualizations'>
            {
              this.state.isUserLoggedIn || (<div className='explorer-visualization__login-msg'>Login to see more data. </div>)
            }
            <Button
              className='explorer-visualization__download-button'
              label={`Downlaod Data (${this.state.totalSubjects})`}
              onClick={this.downloadData}
              isPending={this.state.isDownloadingData}
            />
            {
              this.state.chartData.countItems && this.state.chartData.countItems.length > 0 && (
                <div className='explorer-visualization__summary-cards'>
                  <DataSummaryCardGroup summaryItems={this.state.chartData.countItems} connected />
                </div>
              )
            }
            {
              this.state.chartData.summaries && this.state.chartData.summaries.length > 0 && (
                <div className='explorer-visualization__charts'>
                  {this.getSummaryChart()}
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
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Explorer;
