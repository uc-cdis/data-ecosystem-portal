import React from 'react';
import SummaryChartGroup from '@gen3/ui-component/dist/components/charts/SummaryChartGroup';
import PercentageStackedBarChart from '@gen3/ui-component/dist/components/charts/PercentageStackedBarChart';
import DataSummaryCardGroup from '../../components/cards/DataSummaryCardGroup';
import { components } from '../../params';

class ExplorerCharts extends React.Component {
  constructor(props) {
    super(props);
  }

  buildChartData = (aggsData, chartConfig, filter) => {
    console.log('aggsData: ', aggsData);
    return { summaries: [], stackedBarCharts: [] };
    const summaries = [];
    const countItems = [];
    const stackedBarCharts = [];
    countItems.push({
      label: 'zoop1',
      value: 5,
    });
    Object.keys(chartConfig).forEach((field) => {
      if (!aggsData || !aggsData[field] || !aggsData[field].histogram) return;
      const { histogram } = aggsData[field];
      switch (chartConfig[field].chartType) {
      case 'count':
        countItems.push({
          label: chartConfig[field].title,
          value: filter[field] ? filter[field].selectedValues.length
            : aggsData[field].histogram.length,
        });
        break;
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

  render() {
    console.log('aggsData: ', this.props.aggData);
    const chartData = this.buildChartData(this.props.aggsData, this.props.chartConfig, this.props.filter);
    const barChartColor = components.categorical2Colors ? components.categorical2Colors[0] : null;


    return (
      <React.Fragment>
        <div className='guppy-explorer-visualization__charts'>
          <SummaryChartGroup
            summaries={chartData.summaries}
            lockMessage={"This chart is currently locked."}
            barChartColor={barChartColor}
            useCustomizedColorMap={!!components.categorical9Colors}
            customizedColorMap={components.categorical9Colors || []}
          />
          {
            chartData.stackedBarCharts.map((chart, i) => (
              <PercentageStackedBarChart
                key={i}
                data={chart.data}
                title={chart.title}
                width='100%'
                lockMessage={"This chart is currently locked."}
                useCustomizedColorMap={!!components.categorical9Colors}
                customizedColorMap={components.categorical9Colors || []}
              />
            ),
            )
          }
        </div>
      </React.Fragment>
    );
  }
}

ExplorerCharts.defaultProps = {
  totalCount: 0,
  aggsData: {},
  filter: {},
  fetchAndUpdateRawData: () => {},
  downloadRawDataByFields: () => {},
  downloadRawData: () => {},
  getTotalCountsByTypeAndFilter: () => {},
  downloadRawDataByTypeAndFilter: () => {},
  rawData: [],
  allFields: [],
  accessibleFieldObject: {},
  className: '',
  chartConfig: {},
  tableConfig: {},
  buttonConfig: {},
  heatMapConfig: {},
  guppyConfig: {}
}

export default ExplorerCharts;