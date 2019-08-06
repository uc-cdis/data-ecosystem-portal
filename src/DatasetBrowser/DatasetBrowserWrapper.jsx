import React from 'react';
import PropTypes from 'prop-types';
// import {
//   askDatasetBrowserForRawData,
//   downloadDataFromDatasetBrowser,
//   askDatasetBrowserForTotalCounts,
//   getAllFieldsFromDatasetBrowser,
//   getAccessibleResources,
// } from '../Utils/queries';
// import { ENUM_ACCESSIBILITY } from '../Utils/const';

/**
 * Wrapper that connects to DatasetBrowser server,
 * and pass filter, aggs, and data to children components
 * Input props:
 *   - filterConfig: configuration for ConnectedFilter component
 *   - guppyConfig: DatasetBrowser server config
 *   - onFilterChange: callback that takes filter as argument, will be
 * called everytime filter changes
 *   - onReceiveNewAggsData: callback that takes aggregation results
 * as argument, will be called everytime aggregation results updated
 *
 * This wrapper will pass following data (filters, aggs, configs) to children components via prop:
 *   - aggsData: the aggregation results, format:
 *         {
 *             // for text aggregation
 *            [field]: { histogram: [{key: 'v1', count: 42}, {key: 'v2', count: 19}, ...] },
 *             // for numeric aggregation
 *            [field]: { histogram: [{key: [1, 83], count: 100}] },
 *            ...
 *         }
 *   - filter: the filters, format:
 *         {
 *            [field]: { selectedValues: ['v1', 'v2', ...] },  // for text filter
 *            [field]: { upperBound: 1, lowerBound: 83 },  // for range filter
 *            ...
 *         }
 *   - filterConfig: configuration for ConnectedFilter component
 *   - rawData: raw data records filtered (with offset, size, and sort applied)
 *   - totalCount: total count of raw data records
 *
 */
class DatasetBrowserWrapper extends React.Component {
  constructor(props) {
    super(props);
    this.filter = {}; // to avoid asynchronizations, we store another filter as private var
    this.state = {
      aggsData: {},
      filter: {},
      rawData: [],
      totalCount: 0,
      allFields: [],
      rawDataFields: [],
      accessibleFieldObject: undefined,
      unaccessibleFieldObject: undefined,
      // accessibility: ENUM_ACCESSIBILITY.ALL,
    };
  }

  componentDidMount() {
    // getAllFieldsFromDatasetBrowser(
    //   this.props.guppyConfig.path,
    //   this.props.guppyConfig.type,
    // ).then((fields) => {
    //   const rawDataFields = (this.props.rawDataFields && this.props.rawDataFields.length > 0)
    //     ? this.props.rawDataFields : fields;
    //   this.setState({
    //     allFields: fields,
    //     rawDataFields,
    //   }, () => {
    //     this.getDataFromDatasetBrowser(this.state.rawDataFields, undefined, true);
    //   });
    // });
    // if (typeof this.props.accessibleFieldCheckList !== 'undefined') {
    //   getAccessibleResources(
    //     this.props.guppyConfig.path,
    //     this.props.guppyConfig.type,
    //     this.props.accessibleFieldCheckList,
    //   ).then(({ accessibleFieldObject, unaccessibleFieldObject }) => {
    //     this.setState({
    //       accessibleFieldObject,
    //       unaccessibleFieldObject,
    //     });
    //   });
    // }
  }

  /**
   * This function get data with current filter (if any),
   * and update this.state.rawData and this.state.totalCount
   * @param {string[]} fields
   * @param {string[]} fields
   * @param {object} sort
   * @param {bool} updateDataWhenReceive
   * @param {number} offset
   * @param {number} size
   */
  getDataFromDatasetBrowser(fields, sort, updateDataWhenReceive, offset, size) {
    if (!fields || fields.length === 0) {
      return Promise.resolve({ data: [], totalCount: 0 });
    }
    return askDatasetBrowserForRawData(
      this.props.guppyConfig.path,
      this.props.guppyConfig.type,
      fields,
      this.filter,
      sort,
      offset,
      size,
      this.state.accessibility,
    ).then((res) => {
      if (!res || !res.data) {
        throw new Error(`Error getting raw ${this.props.guppyConfig.type} data from DatasetBrowser server ${this.props.guppyConfig.path}.`);
      }
      const parsedData = res.data[this.props.guppyConfig.type];
      const totalCount = res.data._aggregation[this.props.guppyConfig.type]._totalCount;
      if (updateDataWhenReceive) {
        this.setState({
          rawData: parsedData,
          totalCount,
        });
      }
      return {
        data: parsedData,
        totalCount,
      };
    });
  }

  handleReceiveNewAggsData(aggsData) {
    if (this.props.onReceiveNewAggsData) {
      this.props.onReceiveNewAggsData(aggsData, this.filter);
    }
    this.setState({ aggsData });
  }

  handleFilterChange(filter, accessibility) {
    if (this.props.onFilterChange) {
      this.props.onFilterChange(filter);
    }
    this.filter = filter;
    this.setState({
      filter,
      accessibility,
    }, () => {
      this.getDataFromDatasetBrowser(this.state.rawDataFields, undefined, true);
    });
  }

  /**
   * Fetch data from DatasetBrowser server.
   * This function will update this.state.rawData and this.state.totalCount
   */
  handleFetchAndUpdateRawData({ offset = 0, size = 20, sort = [] }) {
    return this.getDataFromDatasetBrowser(this.state.rawDataFields, sort, true, offset, size);
  }

  /**
   * Download all data from DatasetBrowser server and return raw data
   * This function uses current filter argument
   */
  handleDownloadRawData(sort) {
    return downloadDataFromDatasetBrowser(
      this.props.guppyConfig.path,
      this.props.guppyConfig.type,
      this.state.totalCount,
      {
        fields: this.state.rawDataFields,
        sort: sort || [],
        filter: this.state.filter,
        accessibility: this.state.accessibility,
      },
    );
  }

  /**
   * Download all data from DatasetBrowser server and return raw data
   * For only given fields
   * This function uses current filter argument
   */
  handleDownloadRawDataByFields({ fields, sort = [] }) {
    let targetFields = fields;
    if (typeof fields === 'undefined') {
      targetFields = this.state.rawDataFields;
    }
    return downloadDataFromDatasetBrowser(
      this.props.guppyConfig.path,
      this.props.guppyConfig.type,
      this.state.totalCount,
      {
        fields: targetFields,
        sort,
        filter: this.state.filter,
        accessibility: this.state.accessibility,
      },
    );
  }

  /**
   * Get total count from other es type, with filter
   * @param {string} type
   * @param {object} filter
   */
  handleAskDatasetBrowserForTotalCounts(type, filter) {
    return askDatasetBrowserForTotalCounts(
      this.props.guppyConfig.path,
      type, filter,
      this.state.accessibility,
    );
  }

  /**
   * Get raw data from other es type, with filter
   * @param {string} type
   * @param {object} filter
   * @param {string[]} fields
   */
  handleDownloadRawDataByTypeAndFilter(type, filter, fields) {
    return askDatasetBrowserForTotalCounts(
      this.props.guppyConfig.path,
      type,
      filter,
      this.state.accessibility,
    )
      .then(count => downloadDataFromDatasetBrowser(
        this.props.guppyConfig.path,
        type,
        count,
        {
          fields,
          filter,
        },
      ));
  }

  handleAccessLevelUpdate(accessLevel) {
    this.setState({ accessibility: accessLevel });
  }

  render() {
    return (
      <React.Fragment>
        {
          React.Children.map(this.props.children, child => React.cloneElement(child, {
            // pass data to children
            aggsData: this.state.aggsData,
            filter: this.state.filter,
            filterConfig: this.props.filterConfig,
            rawData: this.state.rawData, // raw data (with current filter applied)
            totalCount: this.state.totalCount, // total count of raw data (current filter applied)
            fetchAndUpdateRawData: this.handleFetchAndUpdateRawData.bind(this),
            downloadRawData: this.handleDownloadRawData.bind(this),
            downloadRawDataByFields: this.handleDownloadRawDataByFields.bind(this),
            allFields: this.state.allFields,
            accessibleFieldObject: this.state.accessibleFieldObject,
            unaccessibleFieldObject: this.state.unaccessibleFieldObject,

            // a callback function which return total counts for any type, with any filter
            getTotalCountsByTypeAndFilter: this.handleAskDatasetBrowserForTotalCounts.bind(this),
            downloadRawDataByTypeAndFilter: this.handleDownloadRawDataByTypeAndFilter.bind(this),

            // below are just for ConnectedFilter component
            onReceiveNewAggsData: this.handleReceiveNewAggsData.bind(this),
            onFilterChange: this.handleFilterChange.bind(this),
            guppyConfig: this.props.guppyConfig,
            onUpdateAccessLevel: this.handleAccessLevelUpdate.bind(this),
          }))
        }
      </React.Fragment>
    );
  }
}

DatasetBrowserWrapper.propTypes = {
  guppyConfig: PropTypes.shape({
    path: PropTypes.string,
    type: PropTypes.string,
  }).isRequired,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]).isRequired,
  filterConfig: PropTypes.shape({
    tabs: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string,
      fields: PropTypes.arrayOf(PropTypes.string),
    })),
  }).isRequired,
  rawDataFields: PropTypes.arrayOf(PropTypes.string).isRequired,
  onReceiveNewAggsData: PropTypes.func,
  onFilterChange: PropTypes.func,
  accessibleFieldCheckList: PropTypes.arrayOf(PropTypes.string),
};

DatasetBrowserWrapper.defaultProps = {
  onReceiveNewAggsData: () => {},
  onFilterChange: () => {},
  accessibleFieldCheckList: undefined,
};

export default DatasetBrowserWrapper;