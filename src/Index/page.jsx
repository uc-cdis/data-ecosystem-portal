import React from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import Introduction from '../components/Introduction';
import { ReduxIndexButtonBar, ReduxIndexBarChart, ReduxIndexCounts } from './reduxer';
import dictIcons from '../img/icons';
import { components } from '../params';
import getProjectNodeCounts from './utils';
import { breakpoints } from '../localconf';
import BacteriaGraphic from '../img/bacteria-image.svg';
import AnalysisGraphic from '../img/analysis.svg';
import './page.less';

class IndexPageComponent extends React.Component {
  componentDidMount() {
    getProjectNodeCounts((res) => {
      // If Peregrine returns unauthorized, need to redirect to `/login` page
      if (res.needLogin) {
        this.props.history.push('/login');
      }
    });
  }

  render() {
    return (
      <div className='index-page'>
        <div className='index-page__top'>
          <div className='index-page__introduction'>
            <Introduction data={components.index.introduction} dictIcons={dictIcons} />
            <MediaQuery query={`(max-width: ${breakpoints.tablet}px)`}>
              <ReduxIndexCounts />
            </MediaQuery>
          </div>
          <div className='index-page__graphics'>
            <BacteriaGraphic id='index-page__bacteria-graphic' />
            <AnalysisGraphic id='index-page__analysis-graphic' />
          </div>
        </div>
        <ReduxIndexButtonBar {...this.props} />
      </div>
    );
  }
}

IndexPageComponent.propTypes = {
  history: PropTypes.object.isRequired,
};

const IndexPage = IndexPageComponent;

export default IndexPage;
