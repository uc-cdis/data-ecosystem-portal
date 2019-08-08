import React from 'react';
import PropTypes from 'prop-types';
import DatasetBrowserWrapper from './DatasetBrowserWrapper';
// import ExplorerVisualization from './ExplorerVisualization';
import DatasetBrowserFilter from './DatasetBrowserFilter';
// import ExplorerTopMessageBanner from './ExplorerTopMessageBanner';
import { capitalizeFirstLetter } from '../utils';
// import {
//   GuppyConfigType,
//   FilterConfigType,
//   TableConfigType,
//   ButtonConfigType,
//   ChartConfigType,
// } from './configTypeDef';
// import './DatasetBrowser.css';

class DatasetBrowser extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      aggsData: {},
      filter: {},
    };
  }

  handleReceiveNewAggsData = (newAggsData) => {
    this.setState({ aggsData: newAggsData });
  };

  render() {
    return (
      <div className='guppy-data-explorer'>
        <div className='ndef-page-title'>
          Datasets Browser
        </div>
        <DatasetBrowserWrapper
          filterConfig={this.props.filterConfig}
          guppyConfig={{ type: this.props.guppyConfig.dataType, ...this.props.guppyConfig }}
          onReceiveNewAggsData={this.handleReceiveNewAggsData}
          onFilterChange={this.handleFilterChange}
          rawDataFields={this.props.tableConfig.fields}
          accessibleFieldCheckList={this.props.guppyConfig.accessibleFieldCheckList}>
          <DatasetBrowserFilter
            className='guppy-dataset-browser__filter'
            guppyConfig={this.props.guppyConfig}
            getAccessButtonLink={this.props.getAccessButtonLink}
            tierAccessLevel={this.props.tierAccessLevel}
            tierAccessLimit={this.props.tierAccessLimit}/> 
        </DatasetBrowserWrapper>
      </div>
    );
  }
}

DatasetBrowser.propTypes = {
  // guppyConfig: GuppyConfigType.isRequired,
  // filterConfig: FilterConfigType.isRequired,
  // tableConfig: TableConfigType.isRequired,
  // chartConfig: ChartConfigType.isRequired,
  // buttonConfig: ButtonConfigType.isRequired,
  // nodeCountTitle: PropTypes.string,
  // history: PropTypes.object.isRequired,
  // tierAccessLevel: PropTypes.string.isRequired,
  // tierAccessLimit: PropTypes.number.isRequired,
  // getAccessButtonLink: PropTypes.string,
};

DatasetBrowser.defaultProps = {
  nodeCountTitle: undefined,
  getAccessButtonLink: undefined,
};

export default DatasetBrowser;
