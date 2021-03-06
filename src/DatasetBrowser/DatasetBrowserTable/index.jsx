/* eslint no-console: 0 */
import React from 'react';
import PropTypes from 'prop-types';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import { capitalizeFirstLetter } from '../../utils';
import './DatasetBrowserTable.css';
import IconicLink from '../../components/buttons/IconicLink';
import LockIcon from '../../img/icons/lock.svg';
import dictIcons from '../../img/icons/index';

function truncateTextIfNecessary(text) {
  if (!text || text.length < 405) {
    return text;
  }
  return `${text.slice(0, 405)}...`;
}

class DatasetBrowserTable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pageSize: props.defaultPageSize,
      currentPage: 0,
      filteredData: this.props.filteredData,
      paginatedData: this.props.filteredData,
    };
  }

  getWidthForColumn = (field) => { // hardcode column width
    if (field === 'link') {
      return 80;
    } else if (field === 'dataset_name'
    || field === 'supported_data_resource'
    || field === 'research_focus') {
      return 200;
    }
    return 400;
  }

  updateData = (filteredData) => {
    const paginatedData = this.makePaginatedData(
      { page: 0, pageSize: 10, sorted: [] }
      , filteredData);
    this.setState({ filteredData, paginatedData });
  }

  makePaginatedData = (state, filteredData) => {
    const size = state.pageSize;
    const offset = state.page * state.pageSize;
    const sort = state.sorted.map(i => ({
      [i.id]: i.desc ? 'desc' : 'asc',
    }));
    let sortedData = filteredData;

    if (sort.length > 0) {
      const propertyToSortBy = Object.keys(sort[0])[0];
      const sortDirection = sort[0][propertyToSortBy];
      const modifier = (sortDirection === 'desc') ? 1 : -1;
      sortedData = filteredData.sort((a, b) => {
        if (a[propertyToSortBy] < b[propertyToSortBy]) {
          return -1 * modifier;
        }
        if (a[propertyToSortBy] > b[propertyToSortBy]) {
          return 1 * modifier;
        }
        return 0;
      });
    }

    return sortedData.slice(offset, offset + size);
  }

  paginate = (state) => {
    const paginatedData = this.makePaginatedData(state, this.state.filteredData);
    this.setState({ paginatedData });
  };

  render() {
    if (!this.props.tableConfig.fields || this.props.tableConfig.fields.length === 0) return null;
    const columnsConfig = this.props.tableConfig.fields.map((field) => {
      const fieldMappingEntry = this.props.guppyConfig.fieldMapping
        && this.props.guppyConfig.fieldMapping.find(i => i.field === field);
      const name = fieldMappingEntry ? fieldMappingEntry.name : capitalizeFirstLetter(field);
      return {
        Header: name,
        accessor: field,
        render: ({ row }) => (
          <button onClick={e => this.handleButtonClick(e, row)}>Click Me</button>
        ),
        minWidth: this.getWidthForColumn(field),
        Cell: row => (field === 'link' ?
          <IconicLink
            link={row.value}
            className='dataset-browser-link'
            buttonClassName='dataset-browser-link-button'
            icon='exit'
            dictIcons={dictIcons}
            iconColor='#606060'
            target='_blank'
            isExternal
          />
          : <div><span title={row.value}>{truncateTextIfNecessary(row.value)}</span></div>),
      };
    });
    const { totalCount } = this.props;
    const { pageSize } = this.state;
    const totalPages = Math.floor(totalCount / pageSize) + ((totalCount % pageSize === 0) ? 0 : 1);
    const SCROLL_SIZE = 10000;
    const visiblePages = Math.min(totalPages, Math.round((SCROLL_SIZE / pageSize) + 0.49));
    const start = (this.state.currentPage * this.state.pageSize) + 1;
    const end = Math.min((this.state.currentPage + 1) * this.state.pageSize, totalCount);
    const loginMessage = this.props.isUserLoggedIn ? '' : 'Log in to see even more data.';
    return (
      <div className={`dataset-browser-table ${this.props.className}`}>
        {(this.props.isLocked) ? <React.Fragment />
          : <p className='dataset-browser-table__description'>
            {`Showing ${start} - ${end} of ${totalCount} matching datasets. ${loginMessage}`}
          </p> }
        <ReactTable
          columns={columnsConfig}
          manual
          data={(this.props.isLocked || !this.state.paginatedData) ? [] : this.state.paginatedData}
          showPageSizeOptions={!this.props.isLocked}
          // eslint-disable-next-line max-len
          pages={(this.props.isLocked) ? 0 : visiblePages} // Total number of pages, don't show 10000+ records in table
          loading={this.state.loading}
          onFetchData={this.paginate}
          defaultPageSize={this.props.defaultPageSize}
          className={'-striped -highlight '}
          minRows={3} // make room for no data component
          resizable={false}
          NoDataComponent={() => (this.props.isLocked ? (
            <div className='rt-noData'>
              <LockIcon width={30} />
              <p>You only have access to summary data</p>
            </div>
          ) : (
            <div className='rt-noData'>No data to display</div>
          ))}
        />
      </div>
    );
  }
}

DatasetBrowserTable.propTypes = {
  filteredData: PropTypes.array,
  totalCount: PropTypes.number.isRequired,
  isLocked: PropTypes.bool.isRequired,
  className: PropTypes.string,
  defaultPageSize: PropTypes.number,
  tableConfig: PropTypes.object.isRequired,
  guppyConfig: PropTypes.object.isRequired,
  isUserLoggedIn: PropTypes.bool,
};

DatasetBrowserTable.defaultProps = {
  filteredData: [],
  className: '',
  defaultPageSize: 10,
  isUserLoggedIn: false,
};

export default DatasetBrowserTable;
