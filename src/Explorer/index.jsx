/* eslint no-underscore-dangle: 0 */
/* eslint no-console: 0 */
import React from 'react';
import _ from 'lodash';
import FilterGroup from '@gen3/ui-component/dist/components/filters/FilterGroup';
import FilterList from '@gen3/ui-component/dist/components/filters/FilterList';
import { getGQLFilter } from '@gen3/guppy/dist/components/Utils/queries';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import PercentageStackedBarChart from '@gen3/ui-component/dist/components/charts/PercentageStackedBarChart';
import { config, components } from '../params';
import ExplorerTable from './ExplorerTable/';
import DataSummaryCardGroup from '../components/cards/DataSummaryCardGroup/.';
import './Explorer.less';
import { fetchWithCredsAndTimeout, fetchUser } from '../actions';
import { capitalizeFirstLetter } from '../utils';
import { flatModelDownloadRelativePath, flatModelQueryRelativePath } from '../localconf';
import getReduxStore from '../reduxStore';
import Spinner from '../components/Spinner';
import phenotypeNameMapping from './phenotypeNameMapping';

function checkIfFiltersApply(filtersApplied, row) {
  const attributes = Object.keys(filtersApplied);
  for (let i = 0; i < attributes.length; i += 1) {
    const property = attributes[i];
    if (!row[property]) {
      return false;
    }
    let value = row[property];
    if (Array.isArray(value) && value.length === 1) {
      value = row[property][0];
    }
    const filtersApplyMatch = _.isEqual(filtersApplied[property].selectedValues, value);
    const filtersApplyContains = filtersApplied[property].selectedValues.find(
      x => _.isEqual(x, value),
    );
    const filtersApply = filtersApplyMatch || filtersApplyContains;
    if (!filtersApply) {
      return false;
    }
  }
  return true;
}

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

function buildFilterTabsByCombinedAggsData(combinedAggsData) {
  const result = config.dataExplorerConfig.filterConfig.tabs.map((t, i) => {
    const sections = t.fields.map((field) => {
      const options = combinedAggsData[field].histogram.map(h => ({
        text: h.key,
        count: h.count,
        filterType: 'singleSelect',
        disabled: h.disabled,
      }));
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
      rawData: [],
      filteredData: [],
      paginatedData: [],
      chartData: { },
      datasetsCount: 0,
      loading: true,
      isUserLoggedIn: false,
      queryableFieldsForEachSubcommons: {},
    };
    this.filterGroupRef = React.createRef();
    this.tableRef = React.createRef();
  }

  componentWillMount() {
    this.initializeData();
    getReduxStore().then((store) => {
      store.dispatch(fetchUser).then((response) => {
        this.setState({ isUserLoggedIn: !!response.user.username });
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

    const outerThis = this;

    return fetchWithCredsAndTimeout({
      path: subcommonsURL + flatModelQueryRelativePath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query),
    }, 3000).then((result) => {
      const fieldsFromCommons = result.data.data.__type.fields.map(x => x.name);
      const queryableFieldsForEachSubcommons = outerThis.state.queryableFieldsForEachSubcommons;
      queryableFieldsForEachSubcommons[subcommonsURL] = fieldsFromCommons;
      outerThis.setState({ queryableFieldsForEachSubcommons });
      return fieldsFromCommons;
    }).catch(() => {
      console.log('Failed to retrieve schema / field list from ', subcommonsURL);
      return [];
    });
  }

  obtainSubcommonsData = async (subcommonsConfig) => {
    const subcommonsURL = subcommonsConfig.URL;
    const subcommonsName = subcommonsConfig.name;
    const fieldsFromConfig = config.dataExplorerConfig.tableConfig.fields;
    const fieldsFromCommons = await this.getFieldsOnTypeFromCommons(subcommonsURL);
    const fieldIntersection = fieldsFromConfig.filter(x => fieldsFromCommons.includes(x));
    const neededFields = phenotypeNameMapping[subcommonsURL]
      ? fieldIntersection.concat(phenotypeNameMapping[subcommonsURL]) : fieldIntersection;

    const queryObject = {
      type: 'subject',
      fields: neededFields,
    };

    return fetchWithCredsAndTimeout({
      path: subcommonsURL + flatModelDownloadRelativePath,
      method: 'POST',
      body: JSON.stringify(queryObject),
    }, 3000).then((result) => {
      const reformatted = [];
      if (!result || !result.data || result.status !== 200) {
        return [];
      }
      const subjects = result.data;
      for (let j = 0; j < subjects.length; j += 1) {
        const subject = subjects[j];
        subject.dataset = subcommonsName;
        subject.phenotype = subject[phenotypeNameMapping[subcommonsURL]];
        reformatted.push(subject);
      }
      return reformatted;
    }).catch(() => []);
  }

  obtainAllCommonsData = () => {
    const promiseArray = [];
    const n = Object.keys(config.subcommons).length;
    for (let j = 0; j < n; j += 1) {
      promiseArray.push(
        this.obtainSubcommonsData(config.subcommons[j]),
      );
    }
    promiseArray.push(
      this.obtainSubcommonsData({
        URL: '/',
        name: 'Immport',
      }),
    );
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
      label: 'Supported Data Resources', // this.props.nodeCountTitle,
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

    delete filtersAppliedReduced.dataset;

    // construct query fields list
    const filterFields = config.dataExplorerConfig.filterConfig.tabs.reduce((acc, cur) => acc.concat(cur.fields), []).filter(f => f !== 'dataset');
    let wantedFields = filterFields.slice();
    const queryableFields = this.state.queryableFieldsForEachSubcommons[subcommonsURL];
    if (typeof queryableFields !== 'undefined') {
      wantedFields = wantedFields.filter(x => queryableFields.includes(x));
    }

    // check if filter contains non-queryable fields
    const nonQueryableFields = _.difference(filterFields, queryableFields);
    const nonQueryableFieldsInFilterApplied = _.intersection(
      Object.keys(filtersAppliedReduced), nonQueryableFields);
    if (nonQueryableFieldsInFilterApplied && nonQueryableFieldsInFilterApplied.length > 0) {
      // trying to query aggregation from subcommons using a non-queryable field
      // is meaningless, so let's just skip the query and return empty set
      return [];
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

      // add those non-queryable fields with 'N/A' as values
      nonQueryableFields.forEach((f) => {
        histograms[f] = {};
        histograms[f].histogram = [{
          key: 'N/A',
          count: histograms._totalCount,
          disabled: true,
        }];
      });
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
    promiseArray.push(
      this.obtainSubcommonsAggsData({
        URL: '/',
        name: 'Immport',
      }, filtersApplied),
    );
    return Promise.all(promiseArray);
  }

  initializeData = () => {
    this.allData = [];
    this.obtainAllCommonsData().then((subCommonsData) => {
      const data = subCommonsData.filter(x => typeof x !== 'undefined').flat();
      if (data.length > 0) {
        this.allData = this.allData.concat(data);
      }

      this.setState({
        filteredData: this.allData,
        rawData: this.allData,
      });

      this.tableRef.current.updateData(this.allData);

      return this.refreshAggregations();
    }).catch((err) => {
      console.log('Failed to initialize data: ', err);
      this.setState({ loading: false });
    });
  }

  refreshAggregations = (filtersApplied) => {
    let filters = Object.assign({}, filtersApplied);
    if (typeof filtersApplied === 'undefined') {
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
    });

    this.refreshAggregations(filtersApplied);

    this.tableRef.current.updateData(filteredData);
  }

  render() {
    const totalCount = this.state.filteredData.length;
    const barChartColor = components.categorical2Colors ? components.categorical2Colors[0] : null;

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
              this.state.chartData.countItems && this.state.chartData.countItems.length > 0 && (
                <div className='explorer-visualization__summary-cards'>
                  <DataSummaryCardGroup summaryItems={this.state.chartData.countItems} connected />
                </div>
              )
            }
            {
              this.state.chartData.summaries && this.state.chartData.summaries.length > 0 && (
                <div className='explorer-visualization__charts'>
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
              tableConfig={config.dataExplorerConfig.tableConfig}
              filteredData={this.state.filteredData}
              totalCount={totalCount}
              guppyConfig={config.dataExplorerConfig}
              isLocked={false}
              loading={this.state.loading}
              isUserLoggedIn={this.state.isUserLoggedIn}
            />
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default Explorer;
